import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/router';
import { 
  FiMessageCircle, FiX, FiMinus, FiSearch, FiSend, FiLock, 
  FiPaperclip, FiMoreHorizontal, FiMaximize2, FiChevronDown, FiAlertCircle
} from 'react-icons/fi';
import { 
  getToken, getUser, employeesAPI, API_URL, 
  notificationsAPI 
} from '../lib/api';

// Symmetric E2EE helpers (Sync with messages.jsx logic)
const E2EE_KEY = "LMS_SECURE_VAULT_KEY_2026";
const encryptMessage = (text) => {
  try {
    const utf8 = unescape(encodeURIComponent(text));
    const encrypted = utf8.split('').map((char, i) => 
      String.fromCharCode(char.charCodeAt(0) ^ E2EE_KEY.charCodeAt(i % E2EE_KEY.length))
    ).join('');
    return "E2EE~" + btoa(encrypted);
  } catch(e) { return text; }
};
const decryptMessage = (encoded) => {
  if (!encoded || !encoded.startsWith("E2EE~")) return encoded;
  try {
    const text = atob(encoded.replace("E2EE~", ""));
    const decrypted = text.split('').map((char, i) => 
      String.fromCharCode(char.charCodeAt(0) ^ E2EE_KEY.charCodeAt(i % E2EE_KEY.length))
    ).join('');
    return decodeURIComponent(escape(decrypted));
  } catch (e) { return encoded; }
};

export function FloatingChat() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [reply, setReply] = useState('');
  const [search, setSearch] = useState('');
  const [position, setPosition] = useState({ x: 30, y: 30 });
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null); // useState so button renders after login

  const ws = useRef(null);
  const currentUserRef = useRef(null); // keep ref for use inside closures
  const scrollRef = useRef(null);

  // 1. Initial Load & WS
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    const user = getUser();
    currentUserRef.current = user;
    setCurrentUser(user);

    // Fetch initial state
    setLoading(true);
    Promise.all([
      employeesAPI.getAll().then(setUsers).catch(() => {}),
      fetch(`${API_URL}/messages/`, { headers: { Authorization: `Bearer ${token}` }})
        .then(res => res.ok ? res.json() : [])
        .then(setMessages)
        .catch(() => {})
    ]).finally(() => setLoading(false));

    // WS Connection
    const wsUrl = API_URL.replace(/^http/, 'ws') + `/messages/ws?token=${token}`;
    ws.current = new WebSocket(wsUrl);
    ws.current.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        setMessages(prev => {
          if (prev.find(m => m.id === payload.id)) return prev;
          return [...prev, payload];
        });
      } catch {}
    };

    return () => { if (ws.current) ws.current.close(); };
  }, [router.pathname === '/login' ? null : 1]);

  // 2. Group threads & contacts (Define before useEffect dependencies)
  const threads = useMemo(() => {
    const mapped = {};
    messages.forEach(m => {
      const otherId = m.is_mine ? m.receiver_id : m.sender_id;
      if (!mapped[otherId]) mapped[otherId] = { unread: 0, messages: [], lastTime: m.time };
      mapped[otherId].messages.push(m);
      if (new Date(m.time) > new Date(mapped[otherId].lastTime)) mapped[otherId].lastTime = m.time;
      if (!m.is_mine && m.unread) mapped[otherId].unread++;
    });
    return mapped;
  }, [messages]);

  const contacts = useMemo(() => {
    const result = [];
    Object.keys(threads).forEach(id => {
      let u = users.find(x => x.id === parseInt(id));
      if (!u && threads[id].messages.length > 0) {
        const any = threads[id].messages[0];
        const isMine = any.sender_id === currentUserRef.current?.id;
        u = { 
          id: parseInt(id), 
          name: isMine ? any.to_name || "Unknown" : any.from_name || "Unknown", 
          role: isMine ? any.to_role || "User" : any.from_role || "User" 
        };
      }
      if (u) result.push({ ...u, thread: threads[id] });
    });

    if (search.trim()) {
      const s = search.toLowerCase();
      users.forEach(u => {
        if (u.id === currentUserRef.current?.id) return;
        if (!result.find(x => x.id === u.id) && (u.name.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s))) {
          result.push({ ...u, thread: { messages: [], unread: 0 } });
        }
      });
    }
    return result.sort((a,b) => new Date(b.thread?.lastTime || 0) - new Date(a.thread?.lastTime || 0));
  }, [users, threads, search]);

  useEffect(() => {
    const handleOpenThread = (e) => {
      const { userId } = e.detail;
      const u = users.find(x => x.id === userId);
      if (u) {
        setSelectedUser(u);
        setIsOpen(true);
      } else {
        const thread = threads[userId];
        if (thread && thread.messages.length > 0) {
          const any = thread.messages[0];
          const isMine = any.sender_id === currentUserRef.current?.id;
          setSelectedUser({ 
            id: userId, 
            name: isMine ? any.to_name : any.from_name,
            role: isMine ? any.to_role : any.from_role
          });
          setIsOpen(true);
        }
      }
    };
    window.addEventListener('open_chat_thread', handleOpenThread);
    return () => window.removeEventListener('open_chat_thread', handleOpenThread);
  }, [users, threads]);

  useEffect(() => {
    if (selectedUser && threads[selectedUser.id]?.unread > 0) {
      const timer = setTimeout(() => {
        fetch(`${API_URL}/messages/read-thread/${selectedUser.id}`, { 
          method: 'PUT', headers: { Authorization: `Bearer ${getToken()}` } 
        }).then(res => {
          if (res.ok) {
            setMessages(prev => prev.map(m => (m.sender_id === selectedUser.id && !m.is_mine) ? { ...m, unread: false } : m));
          }
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [selectedUser, threads]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedUser, messages]);


  // Dragging Logic
  const handleMouseDown = (e) => {
    if (e.target.closest('.no-drag')) return;
    setIsDragging(true);
    const initialPos = { x: position.x, y: position.y };
    const startX = e.clientX + position.x;
    const startY = e.clientY + position.y;
    
    const onMouseMove = (moveEvent) => {
      setPosition({
        x: Math.max(0, startX - moveEvent.clientX),
        y: Math.max(0, startY - moveEvent.clientY)
      });
    };
    const onMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleSend = async () => {
    if (!reply.trim() || !selectedUser) return;
    const body = encryptMessage(reply);
    setReply('');
    try {
      await fetch(`${API_URL}/messages/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ receiver_id: selectedUser.id, content: body })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const totalUnread = Object.values(threads).reduce((acc, t) => acc + t.unread, 0);

  // Don't render until we know the user is logged in (avoids showing widget on login page)
  if (!currentUser) return null;

  return (
    <div className="floating-chat-container" style={{
      position: 'fixed',
      bottom: position.y,
      right: position.x,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      transition: isDragging ? 'none' : 'bottom 0.2s, right 0.2s, transform 0.2s',
      pointerEvents: 'none' /* Only children have pointer events */
    }}>
      {/* ── Chat Panel ── */}
      {isOpen && (
        <div className="chat-panel" style={{
          width: 380,
          height: 520,
          background: 'var(--bg-white)',
          borderRadius: 16,
          boxShadow: '0 20px 80px rgba(0,0,0,0.25), 0 0 1px rgba(0,0,0,0.1)',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          marginBottom: 16,
          animation: 'chatZoomIn 0.3s cubic-bezier(0.19, 1, 0.22, 1)',
          pointerEvents: 'auto'
        }}>
          {/* Header */}
          <div onMouseDown={handleMouseDown} style={{ background: 'var(--brand)', color: '#fff', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: isDragging ? 'grabbing' : 'grab', userSelect: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {selectedUser ? (
                <button onClick={() => setSelectedUser(null)} className="no-drag" style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', padding: 4 }}>
                   <FiChevronDown style={{ transform: 'rotate(90deg)' }} size={18} />
                </button>
              ) : (
                <div style={{ background: 'rgba(255,255,255,0.2)', padding: 6, borderRadius: '50%', display: 'flex' }}>
                   <FiMessageCircle size={14} />
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 800, fontSize: '0.85rem', letterSpacing: '0.01em' }}>{selectedUser ? selectedUser.name : 'Messaging'}</span>
                {!selectedUser && <span style={{ fontSize: '0.65rem', opacity: 0.8, fontWeight: 500 }}>Active conversations</span>}
              </div>
            </div>
            <div className="no-drag" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <FiMinus style={{ cursor: 'pointer', opacity: 0.8 }} onClick={() => setIsOpen(false)} />
              <FiX style={{ cursor: 'pointer', opacity: 0.8 }} onClick={() => { setIsOpen(false); setSelectedUser(null); }} />
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative' }}>
            {selectedUser ? (
              /* ── Thread View ── */
              <>
                <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'rgba(99,102,241,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    {selectedUser.role} · <FiLock size={10} style={{ verticalAlign: 'middle', marginTop: -2 }} /> E2EE
                  </div>
                </div>
                <div style={{ flex: 1, padding: '20px 16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {threads[selectedUser.id]?.messages.length === 0 && (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>
                       <FiAlertCircle size={24} style={{ marginBottom: 8, opacity: 0.5 }} />
                       <p style={{ fontSize: '0.8rem' }}>Start a secure conversation with {selectedUser.name}</p>
                    </div>
                  )}
                  {threads[selectedUser.id]?.messages.map((m, i) => {
                    const isMe = m.sender_id === currentUserRef.current?.id;
                    const content = decryptMessage(m.content);
                    return (
                      <div key={m.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '85%', position: 'relative' }}>
                        <div style={{ 
                          padding: '10px 14px', 
                          borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                          background: isMe ? 'var(--brand)' : 'var(--bg-soft)',
                          color: isMe ? '#fff' : 'var(--text)',
                          fontSize: '0.86rem',
                          lineHeight: 1.5,
                          boxShadow: isMe ? '0 4px 15px rgba(99,102,241,0.2)' : 'none',
                          fontWeight: 500
                        }}>
                          {content}
                        </div>
                        <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)', marginTop: 4, textAlign: isMe ? 'right' : 'left', fontWeight: 600 }}>
                          {new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={scrollRef} />
                </div>
                {/* Input block */}
                <div style={{ padding: '12px 16px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg-white)' }}>
                  <div style={{ display: 'flex', gap: 10, background: 'var(--bg-soft)', borderRadius: 24, padding: '4px 6px 4px 14px', alignItems: 'center', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)', border: '1px solid var(--border)' }}>
                    <input 
                      style={{ flex: 1, background: 'none', border: 'none', padding: '10px 0', fontSize: '0.88rem', outline: 'none', color: 'var(--text)' }}
                      placeholder="Type a message..."
                      value={reply}
                      onChange={e => setReply(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSend()}
                    />
                    <button 
                      onClick={handleSend} 
                      disabled={!reply.trim()}
                      style={{ 
                        background: reply.trim() ? 'var(--brand)' : 'var(--border-dark)', 
                        color: '#fff', border: 'none', borderRadius: '50%', 
                        width: 34, height: 34, display: 'flex', alignItems: 'center', 
                        justifyContent: 'center', cursor: 'pointer', transition: '0.2s',
                        boxShadow: reply.trim() ? '0 4px 12px rgba(99,102,241,0.3)' : 'none'
                      }}>
                      <FiSend size={16} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* ── Contacts List ── */
              <>
                <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-white)' }}>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <FiSearch size={14} color="var(--text-dim)" style={{ position: 'absolute', left: 12 }} />
                    <input 
                      style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 10, border: '1px solid var(--border)', fontSize: '0.88rem', outline: 'none', background: 'var(--bg-soft)', transition: '0.2s' }} 
                      placeholder="Search for people..." 
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      onFocus={e => e.target.style.borderColor = 'var(--brand)'}
                      onBlur={e => e.target.style.borderColor = 'var(--border)'}
                    />
                  </div>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-white)' }}>
                  {contacts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-dim)' }}>
                       <FiSearch size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
                       <p style={{ fontSize: '0.85rem' }}>No results found</p>
                    </div>
                  ) : contacts.map(c => {
                    const lastMsg = c.thread.messages[c.thread.messages.length - 1];
                    const initials = c.name.split(' ').map(x => x[0]).join('').slice(0,2).toUpperCase();
                    return (
                      <div 
                        key={c.id} 
                        onClick={() => setSelectedUser(c)}
                        style={{ display: 'flex', gap: 14, padding: '14px 18px', borderBottom: '1px solid rgba(0,0,0,0.03)', cursor: 'pointer', transition: '0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.04)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 800, flexShrink: 0, boxShadow: '0 4px 10px rgba(99,102,241,0.2)' }}>
                          {initials}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>{c.name}</span>
                            {lastMsg && <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 500 }}>{new Date(lastMsg.time).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                             {lastMsg ? decryptMessage(lastMsg.content) : c.role}
                          </div>
                        </div>
                        {c.thread.unread > 0 && (
                          <div style={{ alignSelf: 'center', minWidth: 20, height: 20, borderRadius: 10, background: 'var(--brand)', color: '#fff', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', padding: '0 6px', marginLeft: 8 }}>
                            {c.thread.unread}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Toggle Launcher Circle ── */}
      <div 
        className="chat-launcher"
        onMouseDown={handleMouseDown}
        onClick={() => !isDragging && setIsOpen(!isOpen)}
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'var(--brand)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 12px 32px rgba(99,102,241,0.45)',
          cursor: isDragging ? 'grabbing' : 'pointer',
          position: 'relative',
          pointerEvents: 'auto',
          transform: isOpen ? 'scale(0.95)' : 'scale(1)',
          transition: 'transform 0.2s, background 0.2s'
        }}
        onMouseEnter={e => {
          if (!isOpen) e.currentTarget.style.transform = 'scale(1.1)';
        }}
        onMouseLeave={e => {
          if (!isOpen) e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        {isOpen ? <FiChevronDown size={28} /> : <FiMessageCircle size={30} />}
        
        {totalUnread > 0 && !isOpen && (
          <div style={{ 
            position: 'absolute', top: -2, right: -2, 
            minWidth: 24, height: 24, padding: '0 4px',
            borderRadius: 12, background: 'var(--red)', border: '2.5px solid #fff',
            color: '#fff', fontSize: '0.75rem', fontWeight: 900,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(225,29,72,0.3)',
            animation: 'pulse 2s infinite'
          }}>
            {totalUnread > 9 ? '9+' : totalUnread}
          </div>
        )}
        
        {/* Hover label like LinkedIn */}
        <div className="launcher-tooltip" style={{
          position: 'absolute', right: 80, 
          background: 'rgba(15,23,42,0.9)', 
          backdropFilter: 'blur(8px)',
          color: '#fff', padding: '8px 14px', borderRadius: 10, 
          fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap', 
          opacity: 0, pointerEvents: 'none', transition: '0.3s',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          Messaging
        </div>
      </div>

      <style jsx global>{`
        .chat-launcher:hover .launcher-tooltip {
          opacity: 1;
          right: 76px;
        }
        @keyframes chatZoomIn {
          from { opacity: 0; transform: scale(0.9) translateY(40px); transform-origin: bottom right; }
          to   { opacity: 1; transform: scale(1)   translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}
