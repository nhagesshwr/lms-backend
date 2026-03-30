import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { FiUsers, FiPlus, FiEdit2, FiTrash2, FiMail, FiSearch, FiBriefcase, FiClock, FiCheckCircle, FiShield } from 'react-icons/fi';
import { getToken, getUser, employeesAPI, departmentsAPI, canManageEmployees, canViewEmployees, isManager, authAPI } from '../../lib/api';
import {
  Layout, Button, Modal, FormField, Input, Select,
  SearchBar, Loading, EmptyState, RoleChip, useToast, ConfirmModal, ActionMenu,
} from '../../components/components';

export default function Employees() {
  const router = useRouter();
  const [user, setUser]           = useState(null);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepts]   = useState([]);
  const [filtered, setFiltered]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'employee', department_id: '' });
  const [saving, setSaving] = useState(false);

  const [editEmp, setEditEmp]   = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', role: '', department_id: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  const [confirm, setConfirm]   = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [assignTarget, setAssignTarget] = useState(null);
  const [assignRole, setAssignRole]     = useState('employee');
  const [assignDept, setAssignDept]     = useState('');
  const [assigning, setAssigning]       = useState(false);

  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return; }
    const u = getUser();
    if (!canViewEmployees(u?.role)) { router.push('/dashboard'); return; }
    setUser(u); loadAll(u);
  }, []);

  useEffect(() => {
    let list = employees;
    if (search) { const q = search.toLowerCase(); list = list.filter(e => e.name?.toLowerCase().includes(q) || e.email?.toLowerCase().includes(q)); }
    if (roleFilter) list = list.filter(e => e.role === roleFilter);
    if (deptFilter) list = list.filter(e => String(e.department_id) === deptFilter);
    setFiltered(list);
  }, [search, roleFilter, deptFilter, employees]);

  const loadAll = async (u) => {
    setLoading(true);
    try {
      const [emps, depts] = await Promise.all([employeesAPI.getAll(), departmentsAPI.getAll()]);
      // Manager only sees their own department's team
      const visibleEmps = isManager(u?.role) && u?.department_id
        ? emps.filter(e => e.department_id === u.department_id)
        : emps;
      setEmployees(visibleEmps); setDepts(depts);
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
      showToast('Employee created!');
      setShowCreate(false);
      setForm({ name: '', email: '', password: '', role: 'employee', department_id: '' });
      loadAll(user);
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
      showToast('Employee updated!'); setEditEmp(null); loadAll(user);
    } catch (err) { showToast(err.message, 'error'); }
    finally { setSavingEdit(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await employeesAPI.delete(confirm.id); showToast('Employee removed'); setConfirm(null); loadAll(user); }
    catch (err) { showToast(err.message, 'error'); }
    finally { setDeleting(false); }
  };

  const getDeptName = (id) => departments.find(d => d.id === id)?.name || '—';
  const canManage   = canManageEmployees(user?.role);
  const isManagerRole = isManager(user?.role);
  const initials    = (name) => name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

  const pendingUsers = employees.filter(e => e.is_pending);
  const activeEmps   = filtered.filter(e => !e.is_pending);

  const handleAssignRole = async () => {
    if (!assignTarget) return;
    setAssigning(true);
    try {
      await authAPI.assignRole(assignTarget.id, assignRole, assignDept || null);
      showToast(`Role "${assignRole}" assigned to ${assignTarget.name}! Email sent. ✓`);
      setAssignTarget(null);
      loadAll(user);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setAssigning(false);
    }
  };

  const AVATAR_COLORS = ['#c0392b','#1a3560','#0d9e6e','#4361ee','#c07a00','#7b2d8b'];
  const avatarColor   = (id) => AVATAR_COLORS[id % AVATAR_COLORS.length];

  return (
    <Layout>
      <div className="page-header-block">
        <div className="page-header-left">
          <h1 className="page-header-title">{isManagerRole ? 'My Team' : 'Employees'}</h1>
          <p className="page-header-desc">
            {isManagerRole
              ? `${employees.length} member${employees.length !== 1 ? 's' : ''} in your team`
              : `${employees.length} team member${employees.length !== 1 ? 's' : ''} in your organisation`}
          </p>
        </div>
        <div className="page-header-right">
          <SearchBar value={search} onChange={setSearch} placeholder="Search name or email…" />
          <Select style={{ width: 150 }} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
            <option value="">All Roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="hr_admin">HR Admin</option>
            <option value="manager">Manager</option>
            <option value="employee">Employee</option>
          </Select>
          <Select style={{ width: 170 }} value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
          {canManage && (
            <Button icon={<FiPlus size={15} />} onClick={() => setShowCreate(true)}>Add Employee</Button>
          )}
        </div>
      </div>

      {/* ── Pending Users Banner (admin only) ── */}
      {canManage && pendingUsers.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <FiClock size={16} color="#f59e0b" />
            <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              New Users — Awaiting Approval (Blocked)
            </h2>
            <span style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 20, padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700 }}>
              {pendingUsers.length} pending
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pendingUsers.map(emp => (
              <div key={emp.id} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12,
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '0.8rem', color: '#fff',
                }}>{initials(emp.name)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text)' }}>{emp.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <FiMail size={11} />{emp.email}
                  </div>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#92400e', background: '#fef3c7', padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>
                  Awaiting role
                </span>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => { setAssignTarget(emp); setAssignRole('employee'); setAssignDept(''); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <FiShield size={13} /> Assign Role
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? <Loading /> : activeEmps.length === 0 ? (
        <EmptyState
          icon={<FiUsers size={28} />}
          title="No employees found"
          description="Try adjusting your filters."
        />
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Role</th>
                <th>Department</th>
                <th>Email</th>
                {canManage && <th style={{ width: 100 }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {activeEmps.map(emp => (
                <tr key={emp.id}
                  onClick={() => router.push(`/users/${emp.id}`)}
                  style={{ cursor: 'pointer' }}
                  title="View profile"
                >
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                        background: avatarColor(emp.id),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: '0.8rem', color: '#fff',
                      }}>
                        {initials(emp.name)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text)' }}>{emp.name}</div>
                        <div style={{ fontSize: '0.73rem', color: 'var(--text-dim)' }}>ID #{emp.id}</div>
                      </div>
                    </div>
                  </td>
                  <td><RoleChip role={emp.role} /></td>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      <FiBriefcase size={13} />{getDeptName(emp.department_id)}
                    </span>
                  </td>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      <FiMail size={13} />{emp.email}
                    </span>
                  </td>
                  {canManage && (
                    <td onClick={e => e.stopPropagation()}>
                      <ActionMenu options={[
                        { label: 'Edit', icon: <FiEdit2 />, onClick: () => openEdit(emp) },
                        { label: 'Delete', icon: <FiTrash2 />, danger: true, onClick: () => setConfirm(emp) },
                      ]} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      <Modal title="Add Employee" open={showCreate} onClose={() => setShowCreate(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? 'Creating…' : 'Add Employee'}</Button>
          </>
        }
      >
        <form onSubmit={handleCreate}>
          <FormField label="Full Name *"><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Smith" required /></FormField>
          <FormField label="Email *"><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@company.com" required /></FormField>
          <FormField label="Password *"><Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={6} placeholder="Min. 6 characters" /></FormField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <FormField label="Role">
              <Select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="hr_admin">HR Admin</option>
                <option value="super_admin">Super Admin</option>
              </Select>
            </FormField>
            <FormField label="Department">
              <Select value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}>
                <option value="">— None —</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
            </FormField>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal title="Edit Employee" open={!!editEmp} onClose={() => setEditEmp(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditEmp(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={savingEdit}>{savingEdit ? 'Saving…' : 'Save Changes'}</Button>
          </>
        }
      >
        <form onSubmit={handleEdit}>
          <FormField label="Full Name *"><Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} required /></FormField>
          <FormField label="Email *"><Input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} required /></FormField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <FormField label="Role">
              <Select value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="hr_admin">HR Admin</option>
                <option value="super_admin">Super Admin</option>
              </Select>
            </FormField>
            <FormField label="Department">
              <Select value={editForm.department_id} onChange={e => setEditForm(f => ({ ...f, department_id: e.target.value }))}>
                <option value="">— None —</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
            </FormField>
          </div>
        </form>
      </Modal>

      {/* Assign Role Modal */}
      {assignTarget && (
        <Modal
          title={`Assign Role — ${assignTarget.name}`}
          open={true}
          onClose={() => setAssignTarget(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setAssignTarget(null)}>Cancel</Button>
              <Button onClick={handleAssignRole} disabled={assigning}>
                {assigning ? 'Assigning…' : 'Assign Role & Notify'}
              </Button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
              background: 'var(--brand-bg)', border: '1px solid var(--brand-border)', borderRadius: 10,
            }}>
              <FiMail size={15} color="var(--brand)" />
              <span style={{ fontSize: '0.82rem', color: 'var(--text)' }}>
                An email will be sent to <strong>{assignTarget.email}</strong> confirming their role.
              </span>
            </div>
            <FormField label="Role *">
              <Select value={assignRole} onChange={e => setAssignRole(e.target.value)}>
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="hr_admin">HR Admin</option>
                <option value="super_admin">Super Admin</option>
              </Select>
            </FormField>
            <FormField label="Department (optional)">
              <Select value={assignDept} onChange={e => setAssignDept(e.target.value)}>
                <option value="">— None —</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
            </FormField>
          </div>
        </Modal>
      )}

      <ConfirmModal open={!!confirm} title="Delete Employee"
        message={`Permanently delete "${confirm?.name}"? This will remove all their enrollments, certificates, and messages. This cannot be undone.`}
        onConfirm={handleDelete} onCancel={() => setConfirm(null)} loading={deleting} />

      {ToastComponent}
    </Layout>
  );
}
