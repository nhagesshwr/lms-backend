import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { FiMail, FiLock, FiEye, FiEyeOff, FiAlertCircle, FiBookOpen, FiUsers, FiAward, FiTrendingUp } from 'react-icons/fi';
import { authAPI, getToken, getUser } from '../lib/api';
import BookArrowAnimation from '../components/BookArrowAnimation';

const FEATURES = [
  { icon: FiBookOpen,   label: 'Structured Courses',    desc: 'Rich video & PDF lessons with quizzes' },
  { icon: FiUsers,      label: 'Team Management',       desc: 'Departments, roles & employee tracking' },
  { icon: FiAward,      label: 'Progress & Certificates', desc: 'Quizzes, streaks & earned certifications' },
  { icon: FiTrendingUp, label: 'Performance Reports',   desc: 'Analytics, leaderboards & insights' },
];

export async function getServerSideProps({ res }) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  return { props: {} };
}

export default function Login() {
  const router = useRouter();
  const [form, setForm]       = useState({ email: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const [sliding, setSliding] = useState(false);
  const [checking, setChecking] = useState(true);

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotLoading(true);
    try {
      await authAPI.forgotPassword(forgotEmail);
      setForgotSuccess(true);
    } catch (err) {
      setForgotError(err.message || 'Failed to send reset email.');
    } finally {
      setForgotLoading(false);
    }
  };

  // ── Auth guard: redirect already-logged-in users ──────────────────────────
  useEffect(() => {
    const token = getToken();
    const user  = getUser();
    if (token && user) {
      const dest =
        user.role === 'super_admin' ? '/superadmin/overview'
        : user.role === 'hr_admin' || user.role === 'manager' ? '/dashboard'
        : '/employee/dashboard';
      router.replace(dest);
    } else {
      setChecking(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Cinematic overlay states
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [fadeOverlay, setFadeOverlay] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setSliding(true);
      setTimeout(() => {
        setActiveFeature(i => (i + 1) % FEATURES.length);
        setSliding(false);
      }, 400);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authAPI.login(form);
      
      // Trigger cinematic overlay
      setShowSuccessOverlay(true);
      setTimeout(() => {
        setFadeOverlay(true);
        setTimeout(() => {
          router.push('/');
        }, 1000); // Route after fade out
      }, 5500); // Show globe animation for 5.5s
      
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please try again.');
      setLoading(false);
    }
  };

  if (checking) return null; // avoid flash of login UI while checking auth

  return (
    <>
      {showSuccessOverlay && (
        <div className={`login-success-overlay ${fadeOverlay ? 'fade-out' : 'fade-in'}`}>
          <div className="lso-content">
             <div className="lso-icon-wrap animate-0">
               <BookArrowAnimation />
             </div>
             <div className="lso-logo-wrap animate-1">
                <Image src="/arohak-logo.png" alt="Arohak Logo" width={240} height={75} style={{ objectFit: 'contain' }} priority />
             </div>
             <h2 className="lso-title animate-2">Welcome to Bryte</h2>
             <h3 className="lso-title-sub animate-3">A learning management system</h3>
             <p className="lso-subtitle animate-4">product by arohak</p>
          </div>
        </div>
      )}

      {!showSuccessOverlay && (
        <div className="auth-page">
          <div className="auth-top-logo">
            <Image src="/arohak-logo.png" alt="Arohak Logo" width={150} height={45} style={{ objectFit: 'contain' }} priority />
          </div>

          <div className="auth-left">
            <div className="auth-left-bg" />
            <div className="auth-left-inner">
              <div className="auth-left-headline">
                Elevate your team&apos;s <span>learning</span> journey.
              </div>
              <p className="auth-left-sub">
                A unified platform for structured courses, real-time progress tracking,
                and powerful HR tools — built for modern teams.
              </p>
              <div className="auth-feature-slider">
                <div className={`auth-feature-slide${sliding ? ' slide-out' : ' slide-in'}`}>
                  {(() => {
                    const { icon: Icon, label, desc } = FEATURES[activeFeature];
                    return (
                      <div className="auth-feature-item">
                        <div className="auth-feature-icon"><Icon size={20} /></div>
                        <div>
                          <div className="auth-feature-label">{label}</div>
                          <div className="auth-feature-desc">{desc}</div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <div className="auth-feature-dots">
                  {FEATURES.map((_, i) => (
                    <span
                      key={i}
                      className={`auth-feature-dot${i === activeFeature ? ' active' : ''}`}
                      onClick={() => { setSliding(true); setTimeout(() => { setActiveFeature(i); setSliding(false); }, 400); }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="auth-right">
            <div className="auth-card">
              <div className="auth-card-logo">
                <div className="auth-brand-icon sm">L</div>
                <span className="auth-brand-name">Bryte</span>
              </div>

              <h1 className="auth-card-title">Welcome back</h1>
              <p className="auth-card-sub">Sign in to your Bryte account</p>

              {error && (
                <div className="auth-error">
                  <FiAlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={submit}>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <div className="input-wrap">
                    <span className="input-icon"><FiMail size={15} /></span>
                    <input
                      className="form-input"
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handle}
                      placeholder="you@company.com"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="form-group" style={{ position: 'relative' }}>
                  <label className="form-label">Password</label>
                  <div className="input-wrap">
                    <span className="input-icon"><FiLock size={15} /></span>
                    <input
                      className="form-input input-pad-right"
                      type={showPwd ? 'text' : 'password'}
                      name="password"
                      value={form.password}
                      onChange={handle}
                      placeholder="Enter your password"
                      required
                      autoComplete="current-password"
                    />
                    <span className="input-icon-right" onClick={() => setShowPwd(v => !v)}>
                      {showPwd ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right', marginTop: '8px' }}>
                    <button type="button" onClick={() => setShowForgot(true)} style={{ background: 'none', border: 'none', color: 'var(--brand)', fontSize: '0.85rem', cursor: 'pointer', padding: 0 }}>Forgot password?</button>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading}>
                  {loading
                    ? <><span className="btn-spinner" /> Signing in…</>
                    : 'Sign In'
                  }
                </button>
              </form>

              <div className="auth-switch">
                Don&apos;t have an account?{' '}
                <Link href="/register" className="auth-link">Create account</Link>
              </div>

              <div className="auth-tagline">Attitude Determines Altitude</div>
            </div>
          </div>
        </div>
      )}

      {showForgot && (
        <div className="modal-overlay">
          <div className="modal modal-sm formContent">
            <div className="modal-header">
              <h2 className="modal-title">Reset Password</h2>
              <button className="modal-close" onClick={() => setShowForgot(false)}><FiEyeOff size={14} style={{opacity: 0}} /></button>
            </div>
            <div className="modal-body">
              {forgotSuccess ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <FiBookOpen size={32} color="var(--brand)" style={{ marginBottom: 12 }} />
                  <p>Reset link sent!</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: 8 }}>Please check your email inbox for instructions to reset your password.</p>
                  <button className="btn btn-primary" style={{ width: '100%', marginTop: 24 }} onClick={() => setShowForgot(false)}>Close</button>
                </div>
              ) : (
                <form onSubmit={handleForgotSubmit}>
                  {forgotError && <div className="form-error" style={{ marginBottom: 16 }}>{forgotError}</div>}
                  <div className="form-group" style={{ marginBottom: 24 }}>
                    <label className="form-label">Email Address</label>
                    <input
                      className="form-input"
                      type="email"
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                  <div className="modal-footer" style={{ borderTop: 'none', padding: 0, marginTop: 12 }}>
                    <button type="button" className="btn btn-ghost" onClick={() => setShowForgot(false)} disabled={forgotLoading}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={forgotLoading}>
                      {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
