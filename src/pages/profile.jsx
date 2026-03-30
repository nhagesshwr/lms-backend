import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { FiUser, FiMail, FiShield, FiSave, FiAlertCircle } from 'react-icons/fi';
import { getToken, getUser, setUser, authAPI, getRoleLabel } from '../lib/api';
import { Layout, Button, FormField, Input, Loading, useToast, Modal } from '../components/components';

export default function Profile() {
  const router = useRouter();
  const [user, setUserData] = useState(null);
  const [form, setForm]     = useState({ name: '', email: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [savingPassword, setSavingPassword] = useState(false);
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return; }
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const u = await authAPI.me();
      setUserData(u);
      setForm({ name: u.name, email: u.email });
    } catch (err) {
      showToast(err.message, 'error');
      // If /me fails, fallback to local storage
      const local = getUser();
      if (local) {
        setUserData(local);
        setForm({ name: local.name, email: local.email || '' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await authAPI.updateProfile(form);
      showToast('Profile updated successfully!');
      setUserData(updated);
      // Update local storage too
      const local = getUser();
      setUser({ ...local, ...updated });
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast('New passwords do not match.', 'error');
      return;
    }
    setSavingPassword(true);
    try {
      await authAPI.changePassword({ 
        current_password: passwordForm.oldPassword, 
        new_password: passwordForm.newPassword 
      });
      showToast('Password updated successfully!');
      setShowPasswordModal(false);
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) return <Layout><Loading /></Layout>;

  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  const roleLabel = getRoleLabel(user?.role);
  const AVATAR_COLORS = ['#6366f1', '#0891b2', '#059669', '#d97706', '#7c3aed'];
  const avatarBg = AVATAR_COLORS[initials.length % AVATAR_COLORS.length];

  return (
    <Layout title="My Account" subtitle="Manage your personal information and preferences.">
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div className="grid-2" style={{ gridTemplateColumns: '300px 1fr' }}>
          {/* Left Side: Avatar & Role */}
          <div className="card" style={{ textAlign: 'center', height: 'fit-content' }}>
            <div style={{ 
              width: 100, height: 100, borderRadius: '50%', margin: '0 auto 20px',
              background: `linear-gradient(135deg, ${avatarBg}, var(--brand-dark))`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2.4rem', fontWeight: 800, color: '#fff',
              boxShadow: '0 8px 30px rgba(99, 102, 241, 0.2)'
            }}>
              {initials}
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 4 }}>{user?.name}</h2>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              <FiShield size={14} />
              <span>{roleLabel}</span>
            </div>
            
            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '20px 0' }} />
            
            <div style={{ textAlign: 'left', fontSize: '0.82rem', color: 'var(--text-dim)', background: 'var(--bg-soft)', padding: 12, borderRadius: 'var(--r-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <FiAlertCircle size={14} />
                <strong>Role Permissions</strong>
              </div>
              <p>Your account has {user?.role?.replace('_', ' ')} level access. Contact your administrator to request role changes.</p>
            </div>
          </div>

          {/* Right Side: Form */}
          <div className="card">
            <div className="section-heading" style={{ marginBottom: 20 }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FiUser size={18} color="var(--brand)" /> 
                Profile Settings
              </h2>
            </div>
            
            <form onSubmit={handleUpdate}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <FormField label="Full Name" hint="How your name will appear across the platform.">
                  <Input 
                    value={form.name} 
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Enter your full name"
                    required
                  />
                </FormField>

                <FormField label="Email Address" hint="Used for login and notifications.">
                  <div style={{ position: 'relative' }}>
                    <Input 
                      type="email"
                      value={form.email} 
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="email@example.com"
                      required
                      style={{ paddingLeft: 38 }}
                    />
                    <FiMail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                  </div>
                </FormField>

                <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button 
                    type="submit" 
                    icon={<FiSave size={16} />} 
                    disabled={saving || (form.name === user?.name && form.email === user?.email)}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </form>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '32px 0' }} />

            <div className="section-heading" style={{ marginBottom: 14 }}>
               <h2 style={{ fontSize: '1rem', color: 'var(--red)' }}>Security</h2>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 16 }}>
              Update your password or manage active sessions.
            </p>
            <Button variant="secondary" size="sm" onClick={() => setShowPasswordModal(true)}>Change Password</Button>
          </div>
        </div>
      </div>

      <Modal 
        title="Change Password" 
        open={showPasswordModal} 
        onClose={() => setShowPasswordModal(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowPasswordModal(false)}>Cancel</Button>
            <Button onClick={handleChangePassword} disabled={savingPassword}>
              {savingPassword ? 'Updating...' : 'Update Password'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleChangePassword}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <FormField label="Current Password">
              <Input 
                type="password" 
                value={passwordForm.oldPassword} 
                onChange={e => setPasswordForm(f => ({ ...f, oldPassword: e.target.value }))}
                placeholder="••••••••"
                required
              />
            </FormField>
            <FormField label="New Password">
              <Input 
                type="password" 
                value={passwordForm.newPassword} 
                onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </FormField>
            <FormField label="Confirm New Password">
              <Input 
                type="password" 
                value={passwordForm.confirmPassword} 
                onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))}
                placeholder="••••••••"
                required
              />
            </FormField>
          </div>
        </form>
      </Modal>

      {ToastComponent}
    </Layout>
  );
}
