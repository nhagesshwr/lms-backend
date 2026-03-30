import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  FiLayers, FiPlus, FiEdit2, FiTrash2, FiUsers,
} from 'react-icons/fi';
import {
  getToken, getUser, departmentsAPI, canManageDepartments, canViewDepartments,
} from '../../lib/api';
import {
  Layout, Button, Modal, FormField, Input, Loading,
  EmptyState, useToast, ConfirmModal, StatCard, SearchBar, ActionMenu,
} from '../../components/components';

export default function Departments() {
  const router = useRouter();
  const [user, setUser]               = useState(null);
  const [departments, setDepts]       = useState([]);
  const [filtered, setFiltered]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [showCreate, setShowCreate]   = useState(false);
  const [form, setForm]               = useState({ name: '' });
  const [saving, setSaving]           = useState(false);
  const [editDept, setEditDept]       = useState(null);
  const [editForm, setEditForm]       = useState({ name: '' });
  const [savingEdit, setSavingEdit]   = useState(false);
  const [confirm, setConfirm]         = useState(null);
  const [deleting, setDeleting]       = useState(false);
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return; }
    const u = getUser();
    if (!canViewDepartments(u?.role)) { router.push('/dashboard'); return; }
    setUser(u);
    loadDepts();
  }, []);

  useEffect(() => {
    if (!search) { setFiltered(departments); return; }
    const q = search.toLowerCase();
    setFiltered(departments.filter(d => d.name?.toLowerCase().includes(q)));
  }, [search, departments]);

  const loadDepts = async () => {
    setLoading(true);
    try {
      setDepts(await departmentsAPI.getAll());
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await departmentsAPI.create({ name: form.name });
      showToast('Department created!');
      setShowCreate(false);
      setForm({ name: '' });
      loadDepts();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (dept) => {
    setEditDept(dept);
    setEditForm({ name: dept.name });
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setSavingEdit(true);
    try {
      await departmentsAPI.update(editDept.id, editForm);
      showToast('Department updated!');
      setEditDept(null);
      loadDepts();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await departmentsAPI.delete(confirm.id);
      showToast('Department deleted.');
      setConfirm(null);
      loadDepts();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const canManage = canManageDepartments(user?.role);
  const totalEmployees = departments.reduce((s, d) => s + (d.employees?.length || 0), 0);

  return (
    <Layout>
      {ToastComponent}
      {loading ? <Loading /> : (
        <>
          <div className="page-header-block">
            <div className="page-header-left">
              <h1 className="page-header-title">Departments</h1>
              <p className="page-header-desc">Organise your teams and workforce structure.</p>
            </div>
            <div className="page-header-right">
              <SearchBar value={search} onChange={setSearch} placeholder="Search departments…" />
              {canManage && (
                <Button icon={<FiPlus size={14} />} onClick={() => setShowCreate(true)}>
                  New Department
                </Button>
              )}
            </div>
          </div>
          <div className="stats-row">
            <StatCard label="Total Departments" value={departments.length} sub="Active teams" color="brand" icon={<FiLayers size={18} />} />
            <StatCard label="Total Employees" value={totalEmployees} sub="Across all departments" color="blue" icon={<FiUsers size={18} />} />
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<FiLayers size={28} />}
              title="No departments yet"
              description={canManage ? 'Create your first department to get started.' : 'No departments have been set up yet.'}
              action={canManage && (
                <Button onClick={() => setShowCreate(true)} icon={<FiPlus size={14} />}>
                  Create Department
                </Button>
              )}
            />
          ) : (
            <div className="grid-3">
              {filtered.map(dept => (
                <div key={dept.id} className="dept-card">
                  <div className="dept-card-header">
                    <div className="dept-icon">
                      {dept.name?.[0]?.toUpperCase()}
                    </div>
                    {canManage && (
                      <div style={{ marginLeft: 'auto' }} onClick={e => e.stopPropagation()}>
                        <ActionMenu options={[
                          { label: 'Edit Department', icon: <FiEdit2 />, onClick: () => openEdit(dept) },
                          { label: 'Delete', icon: <FiTrash2 />, danger: true, onClick: () => setConfirm(dept) },
                        ]} />
                      </div>
                    )}
                  </div>
                  <div className="dept-name">{dept.name}</div>
                  <div className="dept-meta">
                    <FiUsers size={13} />
                    <span>{dept.employees?.length || 0} member{dept.employees?.length !== 1 ? 's' : ''}</span>
                  </div>
                  {dept.employees && dept.employees.length > 0 && (
                    <div className="dept-avatars">
                      {dept.employees.slice(0, 5).map((emp, i) => (
                        <div key={i} className="dept-avatar-chip" title={emp.name}>
                          {emp.name?.split(' ').map(w => w[0]).join('').slice(0, 2)}
                        </div>
                      ))}
                      {dept.employees.length > 5 && (
                        <div className="dept-avatar-chip more">+{dept.employees.length - 5}</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Create Modal */}
      <Modal
        title="Create Department"
        open={showCreate}
        onClose={() => setShowCreate(false)}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
            <button form="create-dept" type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Creating…' : 'Create'}
            </button>
          </>
        }
      >
        <form id="create-dept" onSubmit={handleCreate}>
          <FormField label="Department Name">
            <Input
              value={form.name}
              onChange={e => setForm({ name: e.target.value })}
              required
              placeholder="e.g. Engineering, Marketing…"
              autoFocus
            />
          </FormField>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        title="Edit Department"
        open={!!editDept}
        onClose={() => setEditDept(null)}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setEditDept(null)}>Cancel</button>
            <button form="edit-dept" type="submit" className="btn btn-primary" disabled={savingEdit}>
              {savingEdit ? 'Saving…' : 'Save Changes'}
            </button>
          </>
        }
      >
        <form id="edit-dept" onSubmit={handleEdit}>
          <FormField label="Department Name">
            <Input
              value={editForm.name}
              onChange={e => setEditForm({ name: e.target.value })}
              required
              autoFocus
            />
          </FormField>
        </form>
      </Modal>

      <ConfirmModal
        open={!!confirm}
        danger
        title="Delete Department"
        message={`Delete "${confirm?.name}"? Employees in this department will be unassigned.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirm(null)}
        loading={deleting}
      />
    </Layout>
  );
}
