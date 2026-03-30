/**
 * Navbar.jsx — Standalone top navigation bar.
 * - Real-time notifications via WebSocket (ws://.../notifications/ws/{token})
 * - Polls notificationsAPI on mount then receives WS push events
 * - Notification bell badge auto-increments on new push
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FiBell, FiUser, FiLogOut, FiMessageSquare, FiAward, FiVideo, FiInfo } from 'react-icons/fi';
import { authAPI, getUser, getToken, notificationsAPI, API_BASE } from '../lib/api';

// Close dropdown when clicking outside
function useOutsideClick(ref, handler) {
  useEffect(() => {
    function listener(e) {
      if (!ref.current || ref.current.contains(e.target)) return;
      handler();
    }
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, [ref, handler]);
}

function UserInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
}

const TYPE_ICON = {
  message:     <FiMessageSquare size={14} />,
  certificate: <FiAward size={14} />,
  live_class:  <FiVideo size={14} />,
  enrollment:  <FiInfo size={14} />,
};

const TYPE_COLOR = {
  message:     '#6366f1',
  certificate: '#f59e0b',
  live_class:  '#10b981',
  enrollment:  '#3b82f6',
};

export function Navbar({ title, subtitle, actions }) {
  const router = useRouter();

  const [notifs,     setNotifs]     = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUser,   setShowUser]   = useState(false);
  const [userName,   setUserName]   = useState('');
  const [userInits,  setUserInits]  = useState('');

  const notifRef = useRef(null);
  const userRef  = useRef(null);
  const wsRef    = useRef(null);
  const pingRef  = useRef(null);

  useOutsideClick(notifRef, () => setShowNotifs(false));
  useOutsideClick(userRef,  () => setShowUser(false));

  const loadNotifs = useCallback(() => {
    notificationsAPI.getAll().then(setNotifs).catch(() => {});
  }, []);

  useEffect(() => {
    const u = getUser();
    setUserName(u?.name?.split(' ')[0] || '');
    setUserInits(UserInitials(u?.name || ''));

    // Initial load
    loadNotifs();

    // Connect WebSocket for real-time push
    const token = getToken();
    if (token) {
      const wsUrl = API_BASE.replace(/^http/, 'ws') + `/notifications/ws?token=${token}`;
      
      const connect = () => {
        const socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === 'refresh_notifications') {
              loadNotifs();
              return;
            }
            setNotifs(prev => {
              // Prevent duplicate
              if (prev.find(n => n.id === payload.id)) return prev;
              return [payload, ...prev];
            });
          } catch {}
        };

        socket.onclose = () => {
          // Auto-reconnect after 3 seconds
          setTimeout(connect, 3000);
        };

        // Send ping every 30s to keep alive
        pingRef.current = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send('ping');
          }
        }, 30000);
      };

      connect();
    }

    // Poll every 60s as fallback
    const pollInterval = setInterval(loadNotifs, 60000);

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (pingRef.current) clearInterval(pingRef.current);
      clearInterval(pollInterval);
    };
  }, []);

  const unread = notifs.filter(n => !n.read).length;

  const handleMarkAllRead = () => {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleLogout = () => {
    authAPI.logout();
    router.push('/login');
  };

  return (
    <header className="navbar">
      {/* ── Left: intentionally empty — page names live in the content area ── */}
      <div className="navbar-left" />

      {/* ── Right: actions + bell + user ── */}
      <div className="navbar-right">
        {actions && <div className="navbar-actions">{actions}</div>}

        {/* Notifications */}
        <div className="nav-notif-wrap" ref={notifRef}>
          <button
            className={`nav-notif-btn ${showNotifs ? 'active' : ''}`}
            onClick={() => setShowNotifs(v => !v)}
            title="Notifications"
          >
            <FiBell size={18} />
            {unread > 0 && <span className="nav-notif-badge">{unread > 9 ? '9+' : unread}</span>}
          </button>

          {showNotifs && (
            <div className="nav-notif-dropdown">
              <div className="nav-notif-header">
                <span className="nav-notif-title">Notifications</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {unread > 0 && (
                    <span className="nav-notif-count">{unread} new</span>
                  )}
                  {unread > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      style={{ fontSize: '0.72rem', color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}
                    >
                      Mark all read
                    </button>
                  )}
                </div>
              </div>
              <div className="nav-notif-list">
                {notifs.length === 0 ? (
                  <div className="nav-notif-empty">You're all caught up 🎉</div>
                ) : notifs.map(n => (
                  <div 
                    key={n.id} 
                    className={`nav-notif-item ${!n.read ? 'unread' : ''}`}
                    onClick={() => {
                      if (n.type === 'message' && n.userId) {
                        window.dispatchEvent(new CustomEvent('open_chat_thread', { detail: { userId: n.userId } }));
                        setShowNotifs(false);
                      }
                    }}
                    style={{ cursor: n.type === 'message' ? 'pointer' : 'default' }}
                  >
                    <div
                      className="nav-notif-dot"
                      style={{
                        background: n.read ? 'transparent' : (TYPE_COLOR[n.type] || 'var(--brand)'),
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 5
                      }}
                    />
                    <div className="nav-notif-content">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: TYPE_COLOR[n.type] || 'var(--brand)' }}>
                          {n.icon || TYPE_ICON[n.type] || '🔔'}
                        </span>
                        <div className="nav-notif-msg">{n.message}</div>
                      </div>
                      <div className="nav-notif-time">{n.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User chip */}
        <div className="nav-user-wrap" ref={userRef}>
          <button
            className={`nav-user-chip ${showUser ? 'active' : ''}`}
            onClick={() => setShowUser(v => !v)}
          >
            <div className="nav-user-avatar">{userInits}</div>
            <span className="nav-user-name">{userName}</span>
          </button>

          {showUser && (
            <div className="nav-user-dropdown">
              <Link href="/profile" className="nav-user-item" onClick={() => setShowUser(false)}>
                <FiUser size={14} />
                <span>My Account</span>
              </Link>
              <div className="nav-user-divider" />
              <button className="nav-user-item danger" onClick={handleLogout}>
                <FiLogOut size={14} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
