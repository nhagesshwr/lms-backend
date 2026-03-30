import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  FiUser, FiLogOut, FiSearch, FiX, FiAlertTriangle,
  FiCheck, FiInfo, FiMenu, FiBell,
  FiChevronRight, FiAlertCircle, FiMoreVertical, FiTrendingUp, FiTrendingDown,
} from 'react-icons/fi';
import {
  authAPI, getUser, canViewEmployees, canManageDepartments,
  isSuperAdmin, isHROrAbove, isManager, notificationsAPI, mockNotifications,
} from '../lib/api';

// ─── Sidebar (extracted to Sidebar.jsx) ──────────────────────────────────────────────
import { Sidebar } from './Sidebar';
export { Sidebar };

// ─── Navbar / TopBar (extracted to Navbar.jsx) ───────────────────────────────────────
import { Navbar } from './Navbar';
// TopBar is kept as an alias so existing pages don't break
export { Navbar };
export const TopBar = Navbar;


// ─── Layout ───────────────────────────────────────────────────────────────────
// Sidebar + page-wrapper owned by _app.jsx. Layout = Navbar + page content only.
export function Layout({ children, title, subtitle, actions }) {
  return (
    <>
      <Navbar title={title} subtitle={subtitle} actions={actions} />
      <div className="page-content fade-up">
        {children}
      </div>
    </>
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
      <div className="stat-card-left">
        {trend && (
          <div className={`stat-trend ${trendUp ? 'up' : 'down'}`}>
            <FiTrendingUp size={10} />
            {trend}
          </div>
        )}
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
      {icon && <div className="stat-card-icon-wrap">{icon}</div>}
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
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${size ? `modal-${size}` : ''}`}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose}><FiX size={14} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body
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

// ─── Action Menu ──────────────────────────────────────────────────────────────
export function ActionMenu({ options }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, right: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleClose = () => setOpen(false);
    window.addEventListener('click', handleClose);
    window.addEventListener('scroll', handleClose, true);
    return () => {
      window.removeEventListener('click', handleClose);
      window.removeEventListener('scroll', handleClose, true);
    };
  }, [open]);

  return (
    <>
      <button ref={buttonRef} className="btn btn-ghost btn-sm" style={{ padding: '6px' }} onClick={(e) => {
        e.stopPropagation();
        setOpen(!open);
      }}>
        <FiMoreVertical size={16} />
      </button>
      {open && mounted && createPortal(
        <div 
          className="action-menu-dropdown" 
          style={{ top: coords.top, right: coords.right }}
          onClick={(e) => e.stopPropagation()}
        >
          {options.map((opt, i) => (
            <button key={i} className={`action-menu-item ${opt.danger ? 'danger' : ''}`} onClick={(e) => { e.stopPropagation(); setOpen(false); opt.onClick(); }} style={opt.color && !opt.danger ? { '--item-color': opt.color } : {}}>
              {opt.icon && <span className="action-menu-icon" style={opt.color ? { color: opt.color } : {}}>{opt.icon}</span>}
              <span className="action-menu-label" style={opt.color ? { color: opt.color } : {}}>{opt.label}</span>
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

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
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const Icon = type === 'success' ? FiCheck : type === 'error' ? FiAlertTriangle : FiInfo;

  if (!mounted) return null;

  return createPortal(
    <div className={`toast ${type}`} onClick={onClose}>
      <Icon size={15} />
      <span>{message}</span>
      <FiX size={13} className="toast-close-icon" />
    </div>,
    document.body
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
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!open || !mounted) return null;

  return createPortal(
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
    </div>,
    document.body
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
