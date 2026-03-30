import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  FiPlus, FiEdit2, FiTrash2, FiVideo, FiUsers,
  FiCalendar, FiClock, FiLink, FiRadio, FiChevronDown,
} from 'react-icons/fi';
import {
  getToken, getUser, liveClassesAPI, coursesAPI, employeesAPI,
  isManagerOrAbove, isHROrAbove,
} from '../../lib/api';
import {
  Layout, Loading, Modal, FormField, Input, Select, Textarea,
  ConfirmModal, Badge, useToast, ActionMenu,
} from '../../components/components';

const MEET_PLATFORMS = [
  { value: 'Zoom', label: '📹 Zoom' },
  { value: 'Google Meet', label: '📲 Google Meet' },
  { value: 'Teams', label: '💼 Microsoft Teams' },
  { value: 'Webex', label: '🌐 Webex' },
  { value: 'Other', label: '🔗 Other Link' },
];

const STATUS_OPTIONS = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'live',     label: '🔴 Live Now' },
  { value: 'ended',    label: 'Ended' },
];

const AUDIENCE_OPTIONS = [
  { value: 'all',      label: 'All Employees' },
  { value: 'course',   label: 'Course Enrollees' },
  { value: 'selected', label: 'Selected Employees' },
];

const emptyForm = {
  title: '', description: '', instructor: '',
  date: '', time: '', duration: 60, capacity: 30, status: 'upcoming',
  meet_title: 'Zoom', meet_url: '',
  audience_type: 'all', course_id: '', employee_ids: [],
};

function StatusBadge({ status }) {
  const map = { live: 'red', upcoming: 'blue', ended: 'gray' };
  return <Badge color={map[status] || 'gray'}>{status === 'live' ? '🔴 Live' : status}</Badge>;
}

function LiveClassRow({ cls, onEdit, onDelete, currentUser, showActions }) {
  const isCreatorOrAdmin = currentUser && (cls.created_by === currentUser.id || isHROrAbove(currentUser.role));

  return (
    <tr>
      <td>
        <div style={{ fontWeight: 600 }}>{cls.title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
          {cls.instructor || '—'} · {cls.duration} min
        </div>
      </td>
      <td>
        <StatusBadge status={cls.status} />
      </td>
      <td style={{ fontSize: 13 }}>
        {cls.date ? `${cls.date} · ${cls.time || ''}` : '—'}
      </td>
      <td style={{ fontSize: 13 }}>
        {cls.meet_title && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <FiLink size={12} /> {cls.meet_title}
          </span>
        )}
        {cls.meet_url && (
          <a href={cls.meet_url} target="_blank" rel="noreferrer"
            style={{ fontSize: 11, color: 'var(--brand)', textDecoration: 'underline' }}
            onClick={e => e.stopPropagation()}>
            Open link
          </a>
        )}
      </td>
      <td style={{ fontSize: 13 }}>
        {cls.enrolled}/{cls.capacity}
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{cls.audience_type}</div>
      </td>
      {showActions && (
        <td onClick={e => e.stopPropagation()}>
          {isCreatorOrAdmin && (
            <ActionMenu options={[
              { label: 'Edit Class', icon: <FiEdit2 />, onClick: () => onEdit(cls) },
              { label: 'Delete', icon: <FiTrash2 />, danger: true, onClick: () => onDelete(cls) },
            ]} />
          )}
        </td>
      )}
    </tr>
  );
}

export default function ManageLiveClasses() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [classes, setClasses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [delTarget, setDelTarget] = useState(null);
  const [empSearch, setEmpSearch] = useState('');
  const { showToast, ToastComponent } = useToast();

  const load = () =>
    liveClassesAPI.getAll()
      .then(setClasses)
      .catch(() => showToast('Failed to load classes', 'error'))
      .finally(() => setLoading(false));

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return; }
    const u = getUser();
    setCurrentUser(u);
    if (!isManagerOrAbove(u?.role)) { router.push('/dashboard'); return; }
    load();
    coursesAPI.getAll().then(setCourses).catch(() => {});
    employeesAPI.getAll().then(setEmployees).catch(() => {});
  }, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowForm(true); };
  const openEdit   = (cls) => {
    setEditing(cls);
    setForm({
      title: cls.title || '', description: cls.description || '',
      instructor: cls.instructor || '',
      date: cls.date || '', time: cls.time || '',
      duration: cls.duration || 60, capacity: cls.capacity || 30,
      status: cls.status || 'upcoming',
      meet_title: cls.meet_title || 'Zoom', meet_url: cls.meet_url || '',
      audience_type: cls.audience_type || 'all',
      course_id: cls.course_id || '',
      employee_ids: [],
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { showToast('Title is required', 'error'); return; }
    if (!form.meet_url.trim()) { showToast('Meeting link is required', 'error'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        course_id: form.course_id ? Number(form.course_id) : null,
        duration: Number(form.duration),
        capacity: Number(form.capacity),
        employee_ids: form.employee_ids,
      };
      if (editing) {
        await liveClassesAPI.update(editing.id, payload);
        showToast('Live class updated!', 'success');
      } else {
        await liveClassesAPI.create(payload);
        showToast('Live class created!', 'success');
      }
      setShowForm(false);
      load();
    } catch (e) {
      showToast(e.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await liveClassesAPI.delete(delTarget.id);
      showToast('Deleted', 'success');
      setDelTarget(null);
      load();
    } catch (e) {
      showToast(e.message || 'Delete failed', 'error');
    }
  };

  const toggleEmp = (id) => {
    setForm(f => ({
      ...f,
      employee_ids: f.employee_ids.includes(id)
        ? f.employee_ids.filter(x => x !== id)
        : [...f.employee_ids, id],
    }));
  };

  const filteredEmps = employees.filter(e =>
    `${e.name} ${e.email}`.toLowerCase().includes(empSearch.toLowerCase())
  );

  const hasActionAccess = isHROrAbove(currentUser?.role) || classes.some(c => c.created_by === currentUser?.id);

  return (
    <Layout>
      {ToastComponent}

      {/* Page header */}
      <div className="page-header-block">
        <div className="page-header-left">
          <h1 className="page-header-title">Live Classes</h1>
          <p className="page-header-desc">Schedule and manage live instructor-led sessions.</p>
        </div>
        <div className="page-header-right">
          <button className="btn btn-primary" onClick={openCreate}>
            <FiPlus size={15} /> Schedule Live Class
          </button>
        </div>
      </div>

      {loading ? <Loading /> : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Session</th>
                <th>Status</th>
                <th><FiCalendar size={12} style={{ marginRight: 4 }} />Date & Time</th>
                <th><FiLink size={12} style={{ marginRight: 4 }} />Meeting</th>
                <th><FiUsers size={12} style={{ marginRight: 4 }} />Audience</th>
                {hasActionAccess && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {classes.length === 0
                ? <tr><td colSpan={hasActionAccess ? 6 : 5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No live classes yet. Schedule one!</td></tr>
                : classes.map(cls => (
                    <LiveClassRow key={cls.id} cls={cls}
                      onEdit={openEdit} onDelete={setDelTarget} currentUser={currentUser} showActions={hasActionAccess} />
                  ))
              }
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        title={editing ? 'Edit Live Class' : 'Schedule Live Class'}
        open={showForm}
        onClose={() => setShowForm(false)}
        size="lg"
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create'}
            </button>
          </div>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          {/* Title — full width */}
          <div style={{ gridColumn: '1 / -1' }}>
            <FormField label="Session Title *">
              <Input placeholder="e.g. React Hooks Deep Dive"
                value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </FormField>
          </div>

          {/* Description — full width */}
          <div style={{ gridColumn: '1 / -1' }}>
            <FormField label="Description">
              <Textarea rows={2} placeholder="What will be covered…"
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </FormField>
          </div>

          <FormField label="Instructor Name">
            <Input placeholder="e.g. John Doe"
              value={form.instructor} onChange={e => setForm(f => ({ ...f, instructor: e.target.value }))} />
          </FormField>

          <FormField label="Status">
            <Select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </FormField>

          <FormField label="Date">
            <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </FormField>

          <FormField label="Time">
            <Input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
          </FormField>

          <FormField label="Duration (minutes)">
            <Input type="number" min={15} value={form.duration}
              onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} />
          </FormField>

          <FormField label="Capacity (max attendees)">
            <Input type="number" min={1} value={form.capacity}
              onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} />
          </FormField>

          {/* Meeting platform + link — full width */}
          <div style={{ gridColumn: '1 / -1' }}>
            <FormField label="Meeting Platform *">
              <Select value={form.meet_title} onChange={e => setForm(f => ({ ...f, meet_title: e.target.value }))}>
                {MEET_PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </Select>
            </FormField>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <FormField label="Meeting Link / URL *" hint="Paste your Zoom, Meet, Teams, or any invite link">
              <Input type="url" placeholder="https://zoom.us/j/..." value={form.meet_url}
                onChange={e => setForm(f => ({ ...f, meet_url: e.target.value }))} />
            </FormField>
          </div>

          {/* Audience — full width */}
          <div style={{ gridColumn: '1 / -1' }}>
            <FormField label="Audience">
              <Select value={form.audience_type}
                onChange={e => setForm(f => ({ ...f, audience_type: e.target.value, employee_ids: [] }))}>
                {AUDIENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </FormField>
          </div>

          {/* Course picker (audience = course) */}
          {form.audience_type === 'course' && (
            <div style={{ gridColumn: '1 / -1' }}>
              <FormField label="Select Course" hint="All employees enrolled in this course will be notified">
                <Select value={form.course_id}
                  onChange={e => setForm(f => ({ ...f, course_id: e.target.value }))}>
                  <option value="">— choose a course —</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </Select>
              </FormField>
            </div>
          )}

          {/* Employee picker (audience = selected) */}
          {form.audience_type === 'selected' && (
            <div style={{ gridColumn: '1 / -1' }}>
              <FormField label={`Select Employees (${form.employee_ids.length} selected)`}>
                <Input placeholder="Search employees…" value={empSearch}
                  onChange={e => setEmpSearch(e.target.value)}
                  style={{ marginBottom: 8 }} />
                <div style={{
                  maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '4px 0',
                }}>
                  {filteredEmps.map(emp => (
                    <label key={emp.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 12px', cursor: 'pointer',
                      background: form.employee_ids.includes(emp.id) ? 'var(--bg-hover)' : 'transparent',
                    }}>
                      <input type="checkbox"
                        checked={form.employee_ids.includes(emp.id)}
                        onChange={() => toggleEmp(emp.id)} />
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{emp.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{emp.email}</div>
                      </div>
                    </label>
                  ))}
                  {filteredEmps.length === 0 &&
                    <div style={{ padding: 16, color: 'var(--text-muted)', textAlign: 'center', fontSize: 13 }}>
                      No employees found
                    </div>
                  }
                </div>
              </FormField>
            </div>
          )}
        </div>
      </Modal>

      {/* Delete confirm */}
      <ConfirmModal
        open={!!delTarget}
        danger
        title="Delete Live Class"
        message={`Are you sure you want to delete "${delTarget?.title}"?`}
        onConfirm={handleDelete}
        onCancel={() => setDelTarget(null)}
      />
    </Layout>
  );
}
