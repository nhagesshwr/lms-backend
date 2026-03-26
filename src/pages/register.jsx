import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiAlertCircle, FiChevronDown } from 'react-icons/fi';
import { authAPI } from '../lib/api';

const ROLES = [
  { value: 'employee',   label: 'Employee — Regular learner' },
  { value: 'manager',    label: 'Manager — Team lead' },
  { value: 'hr_admin',   label: 'HR Admin — Manage courses & staff' },
  { value: 'super_admin',label: 'Super Admin — Full platform access' },
];

export default function Register() {
  const router = useRouter();
  const [form, setForm]       = useState({ name: '', email: '', password: '', role: 'employee' });
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      await authAPI.register(form);
      await authAPI.login({ email: form.email, password: form.password });
      router.push('/');
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
            {['Create your account', 'Access your courses', 'Track your progress', 'Earn certificates'].map((s, i) => (
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

          <h1 className="auth-card-title">Create account</h1>
          <p className="auth-card-sub">Fill in your details to get started</p>

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
                <input className="form-input" type="text" name="name" value={form.name} onChange={handle} placeholder="John Smith" required autoComplete="name" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-wrap">
                <span className="input-icon"><FiMail size={15} /></span>
                <input className="form-input" type="email" name="email" value={form.email} onChange={handle} placeholder="you@company.com" required autoComplete="email" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-wrap">
                <span className="input-icon"><FiLock size={15} /></span>
                <input className="form-input input-pad-right" type={showPwd ? 'text' : 'password'} name="password" value={form.password} onChange={handle} placeholder="Minimum 6 characters" required autoComplete="new-password" />
                <span className="input-icon-right" onClick={() => setShowPwd(v => !v)}>
                  {showPwd ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                </span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-select" name="role" value={form.role} onChange={handle}>
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>

            <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading}>
              {loading ? <><span className="btn-spinner" /> Creating account…</> : 'Create Account'}
            </button>
          </form>

          <div className="auth-switch">
            Already have an account?{' '}
            <Link href="/login" className="auth-link">Sign in</Link>
          </div>

          <div className="auth-tagline">Attitude Determines Altitude</div>
        </div>
      </div>
    </div>
  );
}
