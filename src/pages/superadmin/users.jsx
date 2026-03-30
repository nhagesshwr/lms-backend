import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { FiUsers, FiPlus, FiEdit2, FiTrash2, FiMail, FiSearch, FiShield, FiExternalLink, FiClock } from 'react-icons/fi';
import {
  getToken, getUser, isSuperAdmin,
  employeesAPI, departmentsAPI,
} from '../../lib/api';
import {
  Layout, Loading, Button, Modal, FormField, Input, Select,
  SearchBar, RoleChip, Badge, useToast, ConfirmModal, Tabs, StatCard, ActionMenu,
} from '../../components/components';

const ROLES = ['employee', 'manager', 'hr_admin', 'super_admin'];
const EMPTY_FORM = { name: '', email: '', password: '', role: 'employee', department_id: '' };

export default function SuperAdminUsers() {
  const router = useRouter();
  const [employees, setEmployees] = useState([]);
  const [departments, setDepts]   = useState([]);
  const [filtered, setFiltered]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [tab, setTab]             = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [editEmp, setEditEmp]     = useState(null);
  const [editForm, setEditForm]   = useState({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [confirm, setConfirm]     = useState(null);
  const [deleting, setDeleting]   = useState(false);
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return; }
    const u = getUser();
    if (!isSuperAdmin(u?.role)) { router.push('/dashboard'); return; }
    loadAll();
  }, []);

  useEffect(() => {
    let list = employees;
    if (search) { const q = search.toLowerCase(); list = list.filter(e => e.name?.toLowerCase().includes(q) || e.email?.toLowerCase().includes(q)); }
    if (roleFilter) list = list.filter(e => e.role === roleFilter);
    if (tab !== 'all') list = list.filter(e => e.role === tab);
    setFiltered(list);
  }, [search, roleFilter, tab, employees]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [emps, depts] = await Promise.all([employeesAPI.getAll(), departmentsAPI.getAll()]);
      setEmployees(emps); setDepts(depts);
    } catch (err) { showToast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.department_id) delete payload.department_id;
      else payload.department_id = parseInt(payload.department_id);
      await employeesAPI.create(payload);
      showToast('User created successfully!');
      setShowCreate(false); setForm(EMPTY_FORM); loadAll();
    } catch (err) { showToast(err.message, 'error'); }
    finally { setSaving(false); }
  };

  const openEdit = (emp) => {
    setEditEmp(emp);
    setEditForm({ name: emp.name, email: emp.email, role: emp.role, department_id: emp.department_id || '' });
  };

  const handleEdit = async (e) => {
    e.preventDefault(); setSavingEdit(true);
    try {
      const payload = { name: editForm.name, role: editForm.role };
      if (editForm.department_id) payload.department_id = parseInt(editForm.department_id);
      await employeesAPI.update(editEmp.id, payload);
      showToast('User updated!');
      setEditEmp(null); loadAll();
    } catch (err) { showToast(err.message, 'error'); }
    finally { setSavingEdit(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await employeesAPI.delete(confirm.id);
      showToast('User permanently deleted.'); setConfirm(null); loadAll();
    } catch (err) { showToast(err.message, 'error'); }
    finally { setDeleting(false); }
  };

  const deptName = (id) => departments.find(d => d.id === id)?.name || '—';

  const tabs = [
    { id: 'all', label: 'All Users', count: employees.length },
    { id: 'super_admin', label: 'Super Admin', count: employees.filter(e => e.role === 'super_admin').length },
    { id: 'hr_admin', label: 'HR Admin', count: employees.filter(e => e.role === 'hr_admin').length },
    { id: 'manager', label: 'Manager', count: employees.filter(e => e.role === 'manager').length },
    { id: 'employee', label: 'Employee', count: employees.filter(e => e.role === 'employee').length },
  ];

  const pendingUsers = employees.filter(e => e.is_pending);
  const activeUsers  = filtered.filter(e => !e.is_pending);

  const handleAssignRole = async (target, role, deptId) => {
    setLoading(true); // temporary blocking
    try {
      await authAPI.assignRole(target.id, role, deptId || null);
      showToast(`Role assigned for ${target.name}. User can now log in.`);
      loadAll();
    } catch (err) { showToast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  const initials = (name = '') => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <Layout>
      {ToastComponent}
      {loading ? <Loading /> : (
        <>
          <div className="page-header-block">
            <div className="page-header-left">
              <h1 className="page-header-title">Users</h1>
              <p className="page-header-desc">Manage all platform users and their roles.</p>
            </div>
            <div className="page-header-right">
              <Tabs tabs={tabs} active={tab} onChange={setTab} />
              <SearchBar value={search} onChange={setSearch} placeholder="Search users…" />
              <Button icon={<FiPlus size={14} />} onClick={() => setShowCreate(true)}>Add User</Button>
            </div>
          </div>

          {/* ── Pending Users Section ── */}
          {pendingUsers.length > 0 && (
            <div style={{ marginBottom: 24, borderBottom: '1px solid var(--border)', pb: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <FiClock size={16} color="#f59e0b" />
                <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                  Awaiting Approval ({pendingUsers.length})
                </h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
                {pendingUsers.map(u => (
                  <div key={u.id} style={{
                    padding: '14px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12,
                    display: 'flex', alignItems: 'center', gap: 14
                  }}>
                    <div style={{ 
                      width: 40, height: 40, borderRadius: '50%', background: '#f59e0b', color: '#fff', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13
                    }}>{initials(u.name)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{u.name}</div>
                      <div style={{ fontSize: 12, color: '#92400e' }}>{u.email}</div>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => openEdit(u)}>
                      Assign Role
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>User</th><th>Email</th><th>Role</th><th>Department</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeUsers.length === 0
                  ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No active users found</td></tr>
                  : activeUsers.map(emp => (
                  <tr key={emp.id}
                    onClick={() => router.push(`/users/${emp.id}`)}
                    style={{ cursor: 'pointer' }}
                    title="View details"
                  >
                    <td>
                      <div className="user-cell">
                        <div className="user-cell-avatar">{initials(emp.name)}</div>
                        <span className="user-cell-name">{emp.name}</span>
                      </div>
                    </td>
                    <td className="td-muted">{emp.email}</td>
                    <td><RoleChip role={emp.role} /></td>
                    <td className="td-muted">{deptName(emp.department_id)}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <ActionMenu options={[
                        { label: 'View Profile', icon: <FiExternalLink />, onClick: () => router.push(`/users/${emp.id}`) },
                        { label: 'Edit User', icon: <FiEdit2 />, onClick: () => openEdit(emp) },
                        { label: 'Delete', icon: <FiTrash2 />, danger: true, onClick: () => setConfirm(emp) },
                      ]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Create User Modal */}
      <Modal title="Add New User" open={showCreate} onClose={() => setShowCreate(false)}
        footer={<><button className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button><button form="create-form" type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create User'}</button></>}
      >
        <form id="create-form" onSubmit={handleCreate}>
          <FormField label="Full Name"><Input name="name" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required placeholder="John Smith" /></FormField>
          <FormField label="Email"><Input name="email" type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} required placeholder="john@company.com" /></FormField>
          <FormField label="Password" hint="Minimum 6 characters"><Input name="password" type="password" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} required minLength={6} /></FormField>
          <FormField label="Role">
            <Select value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value}))}>
              {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
            </Select>
          </FormField>
          <FormField label="Department (optional)">
            <Select value={form.department_id} onChange={e => setForm(f => ({...f, department_id: e.target.value}))}>
              <option value="">No Department</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </FormField>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal title="Edit User" open={!!editEmp} onClose={() => setEditEmp(null)}
        footer={<><button className="btn btn-ghost" onClick={() => setEditEmp(null)}>Cancel</button><button form="edit-form" type="submit" className="btn btn-primary" disabled={savingEdit}>{savingEdit ? 'Saving…' : 'Save Changes'}</button></>}
      >
        <form id="edit-form" onSubmit={handleEdit}>
          <FormField label="Full Name"><Input value={editForm.name || ''} onChange={e => setEditForm(f => ({...f, name: e.target.value}))} required /></FormField>
          <FormField label="Email"><Input type="email" value={editForm.email || ''} onChange={e => setEditForm(f => ({...f, email: e.target.value}))} required /></FormField>
          <FormField label="Role">
            <Select value={editForm.role || ''} onChange={e => setEditForm(f => ({...f, role: e.target.value}))}>
              {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
            </Select>
          </FormField>
          <FormField label="Department">
            <Select value={editForm.department_id || ''} onChange={e => setEditForm(f => ({...f, department_id: e.target.value}))}>
              <option value="">No Department</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </FormField>
        </form>
      </Modal>

      <ConfirmModal
        open={!!confirm} danger
        title="Delete User"
        message={`Permanently delete "${confirm?.name}"? This will remove all their courses, progress, and messages. This action cannot be undone.`}
        onConfirm={handleDelete} onCancel={() => setConfirm(null)} loading={deleting}
      />
    </Layout>
  );
}
