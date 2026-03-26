import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  FiGrid, FiBookOpen, FiUsers, FiLayers, FiUser,
  FiLogOut, FiSearch, FiX, FiAlertTriangle,
  FiCheck, FiInfo, FiMenu, FiBell, FiAward,
  FiActivity, FiMessageSquare, FiCompass,
  FiBarChart2, FiClipboard, FiVideo, FiTrendingUp,
  FiChevronRight, FiAlertCircle,
} from 'react-icons/fi';
import {
  authAPI, getUser, canViewEmployees, canManageDepartments,
  isSuperAdmin, isHROrAbove, notificationsAPI, mockNotifications,
} from '../lib/api';

// ─── Sidebar ──────────────────────────────────────────────────────────────────
export function Sidebar({ collapsed, onToggle }) {
  const router = useRouter();
  const path   = router.pathname;
  const [notifications, setNotifications] = useState([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    notificationsAPI.getAll().then(setNotifications).catch(() => {});
  }, []);

  const employeeNav = [
    { href: '/employee/dashboard',    Icon: FiGrid,        label: 'Dashboard' },
    { href: '/employee/my-courses',   Icon: FiBookOpen,    label: 'My Courses' },
    { href: '/employee/assignments',  Icon: FiClipboard,   label: 'Assignments' },
    { href: '/employee/live-classes', Icon: FiVideo,       label: 'Live Classes' },
    { href: '/employee/explore',      Icon: FiCompass,     label: 'Explore' },
    { href: '/employee/leaderboard',  Icon: FiTrendingUp,  label: 'Leaderboard' },
    { href: '/employee/certificates', Icon: FiAward,       label: 'Certificates' },
    { href: '/employee/messages',     Icon: FiMessageSquare, label: 'Messages' },
    { href: '/employee/study-groups', Icon: FiUsers,       label: 'Study Groups' },
    { href: '/employee/progress',     Icon: FiBarChart2,   label: 'Progress' },
  ];

  const hrNav = [
    { href: '/dashboard',    Icon: FiGrid,     label: 'Overview' },
    { href: '/employees',    Icon: FiUsers,    label: 'Users' },
    { href: '/courses',      Icon: FiBookOpen, label: 'Courses' },
    { href: '/departments',  Icon: FiLayers,   label: 'Departments' },
    { href: '/admin/activity', Icon: FiActivity, label: 'Activity' },
  ];

  const superNav = [
    { href: '/superadmin/overview',   Icon: FiGrid,      label: 'Overview' },
    { href: '/superadmin/users',      Icon: FiUsers,     label: 'Users' },
    { href: '/superadmin/courses',    Icon: FiBookOpen,  label: 'Courses' },
    { href: '/superadmin/content',    Icon: FiVideo,     label: 'Content' },
    { href: '/superadmin/activity',   Icon: FiActivity,  label: 'Activity' },
  ];

  // Derive synchronously
  const user = typeof window !== 'undefined' ? getUser() : null;
  const role = user?.role;
  
  let navItems = employeeNav;
  let navLabel = 'MAIN';
  if (role === 'super_admin') { navItems = superNav; navLabel = 'SUPER ADMIN'; }
  else if (role === 'hr_admin' || role === 'manager') { navItems = hrNav; navLabel = 'ADMIN'; }

  if (!isClient) {
    // Return empty sidebar on server to perfectly match and avoid hydration errors,
    // or just return the skeleton.
    return <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}><div className="sidebar-header"></div></aside>;
  }

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo-wrap">
          <div className="sidebar-logo-img-box">
            <img src="/bryte.png" alt="Bryte" className="sidebar-logo-img" />
          </div>
        </div>
        <button className="sidebar-toggle-btn" onClick={onToggle}>
          <FiMenu size={16} />
        </button>
      </div>

      <nav className="sidebar-nav">
        {!collapsed && <div className="nav-section-label">{navLabel}</div>}
        {navItems.map(({ href, Icon, label }) => {
          const active = path === href || path.startsWith(href + '/');
          return (
            <Link key={href} href={href} className={`nav-item ${active ? 'active' : ''}`}>
              <span className="nav-icon"><Icon size={17} /></span>
              {!collapsed && <span className="nav-label">{label}</span>}
              {active && !collapsed && <span className="nav-active-dot" />}
            </Link>
          );
        })}
      </nav>


    </aside>
  );
}

// ─── TopBar ──────────────────────────────────────────────────────────────────
export function TopBar({ title, subtitle, actions }) {
  const router = useRouter();
  const [notifs, setNotifs] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUser, setShowUser]     = useState(false);
  const [userName, setUserName]     = useState('');
  const [initials, setInitials]     = useState('');
  const [greeting, setGreeting]     = useState('');
  const unread = notifs.filter(n => !n.read).length;

  const handleLogout = () => {
    authAPI.logout();
    router.push('/login');
  };

  useEffect(() => {
    notificationsAPI.getAll().then(setNotifs).catch(() => {});
  }, []);

  useEffect(() => {
    const user = getUser();
    const name = user?.name || '';
    setUserName(name.split(' ')[0] || '');
    setInitials(
      name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    );
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening');
  }, []);

  return (
    <div className="topbar-new">
      <div className="topbar-left">
        <h1 className="topbar-title">{title || (greeting ? `${greeting}, ${userName}!` : '')}</h1>
        {subtitle && <p className="topbar-sub">{subtitle}</p>}
      </div>
      <div className="topbar-right">
        {actions}
        <div className="notif-wrap">
          <button className="notif-btn" onClick={() => setShowNotifs(v => !v)}>
            <FiBell size={18} />
            {unread > 0 && <span className="notif-badge">{unread}</span>}
          </button>
          {showNotifs && (
            <div className="notif-dropdown">
              <div className="notif-header">
                <span>Notifications</span>
                {unread > 0 && <span className="notif-unread-count">{unread} new</span>}
              </div>
              {notifs.map(n => (
                <div key={n.id} className={`notif-item ${!n.read ? 'unread' : ''}`}>
                  <div className="notif-dot" />
                  <div className="notif-content">
                    <div className="notif-msg">{n.message}</div>
                    <div className="notif-time">{n.time}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="topbar-user-wrap">
          <div className="topbar-user-chip" onClick={() => setShowUser(v => !v)} style={{ cursor: 'pointer' }}>
            <div className="topbar-avatar">{initials}</div>
            {userName}
          </div>
          {showUser && (
            <div className="user-dropdown">
              <Link href="/profile" className="user-dropdown-item">
                <FiUser size={15} />
                <span>My Account</span>
              </Link>
              <div className="user-dropdown-item danger" onClick={handleLogout}>
                <FiLogOut size={15} />
                <span>Logout</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────
export function Layout({ children, title, subtitle, actions }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="page-wrapper">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(v => !v)} />
      <main className={`main-content fade-up ${collapsed ? 'main-content-wide' : ''}`}>
        <TopBar title={title} subtitle={subtitle} actions={actions} />
        {children}
      </main>
    </div>
  );
}

// ─── Page Header (legacy compat) ──────────────────────────────────────────────
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="topbar">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="topbar-actions">{actions}</div>}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, color = 'brand', icon, trend, trendUp }) {
  return (
    <div className={`stat-card ${color}`}>
      <div className="stat-card-header">
        <div className={`stat-icon ${color}`}>{icon}</div>
        {trend && (
          <div className={`stat-trend ${trendUp ? 'up' : 'down'}`}>
            <FiTrendingUp size={11} />
            {trend}
          </div>
        )}
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

// ─── XP Bar ───────────────────────────────────────────────────────────────────
export function XPBar({ current, total, label }) {
  const pct = Math.min(100, Math.round((current / total) * 100));
  return (
    <div className="xp-bar-wrap">
      {label && <div className="xp-bar-label">{label}</div>}
      <div className="xp-bar-track">
        <div className="xp-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="xp-bar-nums">{current}/{total}</div>
    </div>
  );
}

// ─── Progress Ring ────────────────────────────────────────────────────────────
export function ProgressRing({ value, size = 60, color = 'var(--brand)' }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ - (value / 100) * circ;
  return (
    <svg width={size} height={size} className="progress-ring">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={5} />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={5}
        strokeDasharray={circ} strokeDashoffset={dash}
        strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text x="50%" y="52%" textAnchor="middle" dominantBaseline="middle"
        fontSize={size * 0.22} fontWeight="700" fill="var(--text)">{value}%</text>
    </svg>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────
export function Button({ children, variant = 'primary', size, icon, className = '', ...props }) {
  const cls = ['btn', `btn-${variant}`, size ? `btn-${size}` : '', className].filter(Boolean).join(' ');
  return (
    <button className={cls} {...props}>
      {icon && <span className="btn-icon">{icon}</span>}
      {children}
    </button>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export function Modal({ title, open, onClose, children, footer, size }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${size ? `modal-${size}` : ''}`}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose}><FiX size={14} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// ─── Form helpers ─────────────────────────────────────────────────────────────
export function FormField({ label, hint, error, children }) {
  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      {children}
      {hint && !error && <span className="form-hint">{hint}</span>}
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}
export const Input    = ({ className = '', ...p }) => <input    className={`form-input ${className}`}    {...p} />;
export const Select   = ({ className = '', children, ...p }) => <select className={`form-select ${className}`} {...p}>{children}</select>;
export const Textarea = ({ className = '', ...p }) => <textarea className={`form-textarea ${className}`} {...p} />;

// ─── Search bar ───────────────────────────────────────────────────────────────
export function SearchBar({ value, onChange, placeholder = 'Search…' }) {
  return (
    <div className="search-bar">
      <span className="search-icon"><FiSearch size={14} /></span>
      <input
        className="search-input"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
export function Toast({ message, type, onClose }) {
  const Icon = type === 'success' ? FiCheck : type === 'error' ? FiAlertTriangle : FiInfo;
  return (
    <div className={`toast ${type}`} onClick={onClose}>
      <Icon size={15} />
      <span>{message}</span>
      <FiX size={13} className="toast-close-icon" />
    </div>
  );
}

export function useToast() {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const showToast = (message, type = 'success') => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ message, type });
    timerRef.current = setTimeout(() => setToast(null), 4000);
  };

  const ToastComponent = toast ? (
    <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
  ) : null;

  return { showToast, ToastComponent };
}

// ─── Loading ──────────────────────────────────────────────────────────────────
export function Loading({ message = 'Loading…' }) {
  return (
    <div className="loading-center">
      <div className="spinner" />
      <p>{message}</p>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="empty-state">
      <div className="es-icon">{icon}</div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────
export const Badge = ({ children, color = 'gray' }) => (
  <span className={`badge badge-${color}`}>{children}</span>
);

// ─── Role Chip ────────────────────────────────────────────────────────────────
export function RoleChip({ role }) {
  const map = { super_admin: ['Super Admin', 'brand'], hr_admin: ['HR Admin', 'blue'], manager: ['Manager', 'green'], employee: ['Employee', 'gray'] };
  const [label, color] = map[role] || [role, 'gray'];
  return <Badge color={color}>{label}</Badge>;
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────
export function ConfirmModal({ open, title, message, onConfirm, onCancel, loading, danger }) {
  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal modal-sm">
        <div className="modal-header">
          <h2 className="modal-title">{title || 'Confirm Action'}</h2>
          <button className="modal-close" onClick={onCancel}><FiX size={14} /></button>
        </div>
        <div className="modal-body">
          <div className="confirm-icon-wrap">
            <FiAlertCircle size={28} color={danger ? 'var(--red)' : 'var(--amber)'} />
          </div>
          <p className="confirm-msg">{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onCancel} disabled={loading}>Cancel</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={loading}>
            {loading ? 'Processing…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="tabs">
      {tabs.map(({ id, label, count }) => (
        <button
          key={id}
          className={`tab-btn ${active === id ? 'active' : ''}`}
          onClick={() => onChange(id)}
        >
          {label}
          {count !== undefined && <span className="tab-count">{count}</span>}
        </button>
      ))}
    </div>
  );
}

// ─── Quiz Component ───────────────────────────────────────────────────────────
export function QuizWidget({ quiz, onComplete }) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [current, setCurrent] = useState(0);

  const q = quiz.questions[current];
  const total = quiz.questions.length;

  const select = (qId, opt) => {
    if (submitted) return;
    setAnswers(a => ({ ...a, [qId]: opt }));
  };

  const submit = () => {
    const correct = quiz.questions.filter(q => answers[q.id] === q.correct).length;
    const score = Math.round((correct / total) * 100);
    setResult({ correct, total, score, passed: score >= 70 });
    setSubmitted(true);
    if (onComplete) onComplete({ correct, total, score });
  };

  if (submitted && result) {
    return (
      <div className="quiz-result">
        <div className={`quiz-score-circle ${result.passed ? 'pass' : 'fail'}`}>
          {result.score}%
        </div>
        <h3 className="quiz-result-title">{result.passed ? 'Passed!' : 'Try Again'}</h3>
        <p className="quiz-result-sub">{result.correct}/{result.total} correct answers</p>
        <button className="btn btn-primary" onClick={() => { setSubmitted(false); setAnswers({}); setCurrent(0); setResult(null); }}>
          Retake Quiz
        </button>
      </div>
    );
  }

  return (
    <div className="quiz-widget">
      <div className="quiz-header">
        <div className="quiz-title">{quiz.title}</div>
        <div className="quiz-progress-txt">Question {current + 1} of {total}</div>
      </div>
      <div className="quiz-progress-bar">
        <div className="quiz-progress-fill" style={{ width: `${((current) / total) * 100}%` }} />
      </div>
      <div className="quiz-question">{q.text}</div>
      <div className="quiz-options">
        {q.options.map((opt, i) => (
          <button
            key={i}
            className={`quiz-option ${answers[q.id] === i ? 'selected' : ''}`}
            onClick={() => select(q.id, i)}
          >
            <span className="quiz-option-letter">{String.fromCharCode(65 + i)}</span>
            {opt}
          </button>
        ))}
      </div>
      <div className="quiz-nav">
        {current > 0 && (
          <button className="btn btn-ghost" onClick={() => setCurrent(c => c - 1)}>Back</button>
        )}
        {current < total - 1 ? (
          <button className="btn btn-primary" onClick={() => setCurrent(c => c + 1)} disabled={answers[q.id] === undefined}>
            Next
          </button>
        ) : (
          <button className="btn btn-primary" onClick={submit} disabled={answers[q.id] === undefined}>
            Submit Quiz
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Course Card ──────────────────────────────────────────────────────────────
export function CourseCard({ course, onClick, progress }) {
  const colors = ['#6366f1', '#0891b2', '#059669', '#dc2626', '#d97706', '#7c3aed'];
  const fallbacks = [
    'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=400&q=80', // coding
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=400&q=80', // laptop workspace
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=400&q=80', // code on screen
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=400&q=80', // teamwork
    'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=400&q=80', // tech diagram
    'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=400&q=80'  // modern office
  ];
  
  const idValue = course.id || 1;
  const color = colors[idValue % colors.length];
  const defaultThumb = fallbacks[idValue % fallbacks.length];
  const thumbUrl = course.thumbnail_url || defaultThumb;

  return (
    <div className="course-card-new" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div className="course-thumb-new" style={{ background: `linear-gradient(135deg, ${color}22, ${color}44)` }}>
        <img src={thumbUrl} alt={course.title} className="course-thumb-img" />
        {course.is_published === false && <div className="course-draft-badge">Draft</div>}
      </div>
      <div className="course-card-body">
        <div className="course-category-tag" style={{ color }}>{course.category || 'Course'}</div>
        <h3 className="course-card-title">{course.title}</h3>
        <p className="course-card-desc">{course.description || 'No description provided.'}</p>
        {progress !== undefined && (
          <div className="course-progress-wrap">
            <div className="course-progress-bar">
              <div className="course-progress-fill" style={{ width: `${progress}%`, background: color }} />
            </div>
            <span className="course-progress-txt" style={{ color }}>{progress}%</span>
          </div>
        )}
        <div className="course-card-meta">
          <span className="course-lesson-count">{course.lessons?.length || 0} lessons</span>
          {course.is_published !== undefined && (
            <span className={`badge ${course.is_published ? 'badge-green' : 'badge-amber'}`}>
              {course.is_published ? 'Published' : 'Draft'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Streak Card ──────────────────────────────────────────────────────────────
export function StreakCard({ streak, hoursThisWeek, dailyGoalMin, dailyGoalTotal }) {
  return (
    <div className="streak-banner">
      <div className="streak-item">
        <div className="streak-icon-wrap orange">🔥</div>
        <div>
          <div className="streak-val">{streak}</div>
          <div className="streak-lbl">Day Streak</div>
        </div>
      </div>
      <div className="streak-divider" />
      <div className="streak-item">
        <div className="streak-icon-wrap blue">⏱</div>
        <div>
          <div className="streak-val">{hoursThisWeek}h</div>
          <div className="streak-lbl">This Week</div>
        </div>
      </div>
      <div className="streak-divider" />
      <div className="streak-item">
        <ProgressRing value={Math.round((dailyGoalMin / dailyGoalTotal) * 100)} size={52} />
        <div>
          <div className="streak-val">{dailyGoalMin}/{dailyGoalTotal}m</div>
          <div className="streak-lbl">Daily Goal</div>
        </div>
      </div>
    </div>
  );
}

// ─── Server Status Banner ─────────────────────────────────────────────────────
export function ServerStatusBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShow(false), 8000);
    return () => clearTimeout(timer);
  }, []);
  if (!show) return null;
  return (
    <div className="status-banner">
      <div className="spinner-sm" />
      <span>Waking up the server — this may take up to 30 seconds on first load.</span>
      <button onClick={() => setShow(false)}><FiX size={13} /></button>
    </div>
  );
}
