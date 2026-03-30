import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiAlertCircle, FiCheckCircle, FiClock } from 'react-icons/fi';
import { authAPI } from '../lib/api';

export default function Register() {
  const router = useRouter();
  const [form, setForm]         = useState({ name: '', email: '', password: '' });
  const [showPwd, setShowPwd]     = useState(false);
  const [error, setError]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Full name is required.'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      await authAPI.register({ name: form.name, email: form.email, password: form.password });
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-left-bg" />
        <div className="auth-left-inner">
          <div className="auth-brand">
            <div className="auth-brand-icon">L</div>
            <span className="auth-brand-name">Bryte</span>
          </div>
          <div className="auth-left-headline">Start your <span>learning</span> journey today.</div>
          <p className="auth-left-sub">
            Join your team on Bryte — access courses, track your progress,
            earn certificates and collaborate with colleagues.
          </p>
          <div className="auth-steps">
            {[
              'Create your account',
              'Admin review & role assignment',
              'Receive email confirmation',
              'Log in and access courses',
            ].map((s, i) => (
              <div key={i} className="auth-step">
                <div className="auth-step-num">{i + 1}</div>
                <div className="auth-step-label">{s}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card">
          <div className="auth-card-logo">
            <div className="auth-brand-icon sm">L</div>
            <span className="auth-brand-name">Bryte</span>
          </div>

          {submitted ? (
            /* ── Success Screen (Awaiting Approval) ── */
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
              }}>
                <FiClock size={32} color="#f59e0b" />
              </div>

              <h1 className="auth-card-title" style={{ fontSize: '1.4rem', marginBottom: 8 }}>
                Registration Submitted! ⏳
              </h1>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 20 }}>
                Thank you for registering. Your account is currently <strong>pending admin approval</strong>.
              </p>

              {/* Status notice */}
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, padding: '14px 18px',
                background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12,
                marginBottom: 24, textAlign: 'left',
              }}>
                <FiAlertCircle size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
                <div style={{ fontSize: '0.8rem', color: '#92400e', lineHeight: 1.6 }}>
                  <strong>Awaiting Role Assignment:</strong><br />
                  A Super Admin needs to review your request and assign your role. You will receive an <strong>email notification</strong> once your account is activated.
                </div>
              </div>

              <Link href="/login">
                <button className="btn btn-primary btn-lg btn-full">
                  Return to Login
                </button>
              </Link>
              
              <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 20 }}>
                You cannot log in until your role has been assigned.
              </p>
            </div>
          ) : (
            /* ── Registration Form ── */
            <>
              <h1 className="auth-card-title">Create account</h1>
              <p className="auth-card-sub">Submit your details for admin approval</p>

              {error && (
                <div className="auth-error">
                  <FiAlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={submit}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <div className="input-wrap">
                    <span className="input-icon"><FiUser size={15} /></span>
                    <input
                      className="form-input"
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handle}
                      placeholder="John Smith"
                      required
                      autoComplete="name"
                      autoFocus
                    />
                  </div>
                </div>

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

                <div className="form-group">
                  <label className="form-label">Password</label>
                  <div className="input-wrap">
                    <span className="input-icon"><FiLock size={15} /></span>
                    <input
                      className="form-input input-pad-right"
                      type={showPwd ? 'text' : 'password'}
                      name="password"
                      value={form.password}
                      onChange={handle}
                      placeholder="Minimum 6 characters"
                      required
                      autoComplete="new-password"
                    />
                    <span className="input-icon-right" onClick={() => setShowPwd(v => !v)}>
                      {showPwd ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                    </span>
                  </div>
                </div>

                {/* Info notice */}
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px',
                  background: '#fffbeb', border: '1px solid #fde68a',
                  borderRadius: 10, marginBottom: 16, fontSize: '0.78rem', color: '#92400e',
                }}>
                  <FiClock size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>Your account will be created in a <strong>pending</strong> state. You can only log in after a Super Admin assigns your role.</span>
                </div>

                <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading}>
                  {loading ? <><span className="btn-spinner" /> Submitting…</> : 'Submit Registration'}
                </button>
              </form>

              <div className="auth-switch">
                Already have an account?{' '}
                <Link href="/login" className="auth-link">Sign in</Link>
              </div>

              <div className="auth-tagline">Attitude Determines Altitude</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
