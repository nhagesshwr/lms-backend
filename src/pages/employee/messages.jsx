import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { FiMessageSquare, FiSend, FiSearch } from 'react-icons/fi';
import { getToken, messagesAPI, mockMessages } from '../../lib/api';
import { Layout, Loading, useToast } from '../../components/components';

export default function Messages() {
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [selected, setSelected] = useState(null);
  const [reply, setReply]       = useState('');
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return; }
    messagesAPI.getAll().then(m => { setMessages(m); setSelected(m[0] || null); }).catch(() => { setMessages(mockMessages); setSelected(mockMessages[0]); }).finally(() => setLoading(false));
  }, []);

  const handleSend = async () => {
    if (!reply.trim()) return;
    await messagesAPI.send({ to: selected?.from, body: reply }).catch(() => {});
    showToast('Message sent!');
    setReply('');
  };

  const filtered = messages.filter(m => !search || m.from.toLowerCase().includes(search.toLowerCase()) || m.message.toLowerCase().includes(search.toLowerCase()));
  const unread = messages.filter(m => m.unread).length;

  return (
    <Layout title="Messages" subtitle={`${unread} unread messages`}>
      {ToastComponent}
      {loading ? <Loading /> : (
        <div className="messages-layout">
          <div className="messages-sidebar">
            <div className="messages-search">
              <FiSearch size={14} color="var(--text-dim)" />
              <input className="messages-search-input" placeholder="Search messages…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="messages-list">
              {filtered.map(m => (
                <div key={m.id} className={`msg-item ${m.unread ? 'unread' : ''} ${selected?.id === m.id ? 'active' : ''}`} onClick={() => setSelected(m)}>
                  <div className="msg-avatar">{m.avatar}</div>
                  <div className="msg-content">
                    <div className="msg-from">{m.from}</div>
                    <div className="msg-text">{m.message}</div>
                  </div>
                  <div className="msg-time">{m.time}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="messages-main">
            {selected ? (
              <>
                <div className="messages-thread-header">
                  <div className="msg-avatar">{selected.avatar}</div>
                  <div>
                    <div className="thread-name">{selected.from}</div>
                    <div className="thread-role">{selected.role}</div>
                  </div>
                </div>
                <div className="messages-thread-body">
                  <div className="thread-msg received">
                    <div className="thread-bubble">{selected.message}</div>
                    <div className="thread-time">{selected.time}</div>
                  </div>
                </div>
                <div className="messages-compose">
                  <input
                    className="compose-input"
                    placeholder={`Reply to ${selected.from}…`}
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                  />
                  <button className="btn btn-primary btn-sm" onClick={handleSend} disabled={!reply.trim()}>
                    <FiSend size={14} />
                  </button>
                </div>
              </>
            ) : (
              <div className="messages-empty">
                <FiMessageSquare size={40} color="var(--text-dim)" />
                <p>Select a message to read</p>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
