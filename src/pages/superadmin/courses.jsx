import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { FiBookOpen, FiPlus, FiEdit2, FiTrash2, FiEye, FiEyeOff, FiSearch, FiGlobe, FiUserPlus, FiX, FiCheck } from 'react-icons/fi';
import { getToken, getUser, isSuperAdmin, isHROrAbove, coursesAPI, employeesAPI, enrollmentsAPI, API_URL } from '../../lib/api';
import {
  Layout, Loading, Button, Modal, FormField, Input, Textarea, Select,
  SearchBar, Badge, Tabs, StatCard, useToast, ConfirmModal, ActionMenu,
} from '../../components/components';

// ─── Assign Course Modal ───────────────────────────────────────────────────────
function AssignCourseModal({ course, onClose, showToast }) {
  const [employees, setEmployees]     = useState([]);
  const [loadingEmps, setLoadingEmps] = useState(true);
  const [search, setSearch]           = useState('');
  const [selected, setSelected]       = useState([]); // list of employee ids
  const [assigning, setAssigning]     = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropRef = useRef(null);

  useEffect(() => {
    employeesAPI.getAll()
      .then(setEmployees)
      .catch(() => showToast('Could not load employees', 'error'))
      .finally(() => setLoadingEmps(false));
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropdownOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = employees.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.email.toLowerCase().includes(search.toLowerCase()) ||
    (e.role || '').toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectedEmployees = employees.filter(e => selected.includes(e.id));

  const handleAssign = async () => {
    if (selected.length === 0) { showToast('Select at least one user', 'error'); return; }
    setAssigning(true);
    let ok = 0, fail = 0;
    for (const empId of selected) {
      try {
        await enrollmentsAPI.assign(empId, course.id);
        ok++;
      } catch {
        fail++;
      }
    }
    setAssigning(false);
    if (ok > 0) showToast(`Enrolled ${ok} user${ok > 1 ? 's' : ''} in "${course.title}"!`);
    if (fail > 0) showToast(`${fail} user${fail > 1 ? 's' : ''} already enrolled or failed.`, 'error');
    onClose();
  };

  return (
    <Modal
      title={`Assign Course — ${course.title}`}
      open={true}
      onClose={onClose}
      size="md"
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: 'auto' }}>
            {selected.length} user{selected.length !== 1 ? 's' : ''} selected
          </span>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAssign} disabled={assigning || selected.length === 0}>
            {assigning ? 'Assigning…' : `Assign to ${selected.length || ''} User${selected.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Selected chips */}
        {selectedEmployees.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {selectedEmployees.map(e => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px 4px 10px', background: 'var(--brand)', color: '#fff', borderRadius: 20, fontSize: '0.8rem', fontWeight: 500 }}>
                <span>{e.name}</span>
                <button onClick={() => toggle(e.id)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
                  <FiX size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Searchable dropdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: 400 }}>

          {/* Search bar */}
          <div ref={dropRef} style={{ position: 'relative' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <FiSearch size={14} style={{ position: 'absolute', left: 12, color: 'var(--text-dim)', pointerEvents: 'none' }} />
              <input
                style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', background: 'var(--bg-white)' }}
                placeholder="Search by name, email or role…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* User List area - pushes the height */}
          <div style={{ flex: 1, border: '1.5px solid var(--border)', borderRadius: 10, overflowY: 'auto', background: 'var(--bg-white)', maxHeight: 320 }}>
              {loadingEmps ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading users…</div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No users found</div>
              ) : filtered.map(emp => {
                const isSelected = selected.includes(emp.id);
                const initials = emp.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
                return (
                  <div
                    key={emp.id}
                    onClick={() => toggle(emp.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', cursor: 'pointer', background: isSelected ? 'var(--bg-soft)' : 'transparent', transition: '0.15s', borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-soft)'; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                  >
                    {/* Avatar */}
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: `hsl(${emp.id * 67 % 360},70%,75%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', color: '#fff', flexShrink: 0 }}>
                      {initials}
                    </div>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text)' }}>{emp.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.email} · {emp.role}</div>
                    </div>
                    {/* Checkbox */}
                    <div style={{ width: 20, height: 20, borderRadius: 5, border: `2px solid ${isSelected ? 'var(--brand)' : 'var(--border)'}`, background: isSelected ? 'var(--brand)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: '0.15s' }}>
                      {isSelected && <FiCheck size={12} color="#fff" strokeWidth={3} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
          Users already enrolled in this course will be skipped automatically.
        </p>
      </div>
    </Modal>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function SuperAdminCourses() {
  const router = useRouter();
  const [courses, setCourses]   = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch]     = useState('');
  const [tab, setTab]           = useState('all');
  const [loading, setLoading]   = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm]         = useState({ title: '', description: '', category: '' });
  const [thumbFile, setThumbFile] = useState(null);   // File object for thumbnail
  const [thumbPreview, setThumbPreview] = useState(null); // local object URL
  const [saving, setSaving]     = useState(false);
  const [editCourse, setEditCourse] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [confirm, setConfirm]   = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [assignCourse, setAssignCourse] = useState(null);
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return; }
    const u = getUser();
    if (!isHROrAbove(u?.role)) { router.push('/dashboard'); return; }
    loadCourses();
  }, []);

  useEffect(() => {
    let list = courses;
    if (search) { const q = search.toLowerCase(); list = list.filter(c => c.title.toLowerCase().includes(q)); }
    if (tab === 'published') list = list.filter(c => c.is_published);
    if (tab === 'draft')     list = list.filter(c => !c.is_published);
    setFiltered(list);
  }, [search, tab, courses]);

  const loadCourses = async () => {
    setLoading(true);
    try { setCourses(await coursesAPI.getAllWithLessons()); }
    catch (err) { showToast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { title: form.title, description: form.description, ...(form.category ? { category: form.category } : {}) };
      const created = await coursesAPI.create(payload);
      // Upload thumbnail if a file was selected
      if (thumbFile && created?.id) {
        try {
          const fd = new FormData();
          fd.append('file', thumbFile);
          await fetch(`${API_URL}/courses/${created.id}/upload-thumbnail`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${getToken()}` },
            body: fd
          });
        } catch { /* non-critical */ }
      }
      showToast('Course created!');
      setShowCreate(false);
      setForm({ title: '', description: '', category: '' });
      setThumbFile(null);
      setThumbPreview(null);
      loadCourses();
    } catch (err) { showToast(err.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleEditSave = async (e) => {
    e.preventDefault(); setSavingEdit(true);
    try {
      await coursesAPI.update(editCourse.id, editForm);
      showToast('Course updated!'); setEditCourse(null); loadCourses();
    } catch (err) { showToast(err.message, 'error'); }
    finally { setSavingEdit(false); }
  };

  const handleToggle = async (c) => {
    try {
      if (c.is_published) await coursesAPI.unpublish(c.id); else await coursesAPI.publish(c.id);
      showToast(`Course ${c.is_published ? 'unpublished' : 'published'}.`); loadCourses();
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await coursesAPI.delete(confirm.id); showToast('Course deleted.'); setConfirm(null); loadCourses(); }
    catch (err) { showToast(err.message, 'error'); }
    finally { setDeleting(false); }
  };

  const published = courses.filter(c => c.is_published).length;
  const tabs = [
    { id: 'all', label: 'All', count: courses.length },
    { id: 'published', label: 'Published', count: published },
    { id: 'draft', label: 'Draft', count: courses.length - published },
  ];

  return (
    <Layout>
      {ToastComponent}
      {loading ? <Loading /> : (
        <>
          <div className="page-header-block">
            <div className="page-header-left">
              <h1 className="page-header-title">Courses</h1>
              <p className="page-header-desc">Create, manage, and publish all courses on the platform.</p>
            </div>
            <div className="page-header-right">
              <Tabs tabs={tabs} active={tab} onChange={setTab} />
              <SearchBar value={search} onChange={setSearch} placeholder="Search courses…" />
              <Button icon={<FiPlus size={14} />} onClick={() => setShowCreate(true)}>New Course</Button>
            </div>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Course</th><th>Lessons</th><th>Status</th><th>Created</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.length === 0
                  ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No courses found</td></tr>
                  : filtered.map(c => (
                  <tr key={c.id} onClick={() => router.push(`/courses/${c.id}`)} style={{ cursor: 'pointer' }} className="table-row-hover">
                    <td>
                      <div className="course-cell">
                        <div className="course-cell-thumb" style={{ background: `hsl(${c.id * 67 % 360},70%,94%)` }}>
                          {c.title?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div className="course-cell-title">{c.title}</div>
                          <div className="course-cell-desc">{(c.description || 'No description').slice(0, 50)}{c.description?.length > 50 ? '…' : ''}</div>
                        </div>
                      </div>
                    </td>
                    <td className="td-muted">{c.lessons?.length || 0} lessons</td>
                    <td><Badge color={c.is_published ? 'green' : 'amber'}>{c.is_published ? 'Published' : 'Draft'}</Badge></td>
                    <td className="td-muted">{new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <ActionMenu options={[
                        { label: 'View Course',  icon: <FiEye />,      color: 'var(--brand)',  onClick: () => router.push(`/courses/${c.id}`) },
                        { label: 'Assign Users', icon: <FiUserPlus />, color: 'var(--teal)',   onClick: () => setAssignCourse(c) },
                        { label: 'Edit Info',    icon: <FiEdit2 />,    color: '#8b5cf6',       onClick: () => { setEditCourse(c); setEditForm({ title: c.title, description: c.description || '', thumbnail_url: c.thumbnail_url || '' }); } },
                        { label: c.is_published ? 'Unpublish' : 'Publish', icon: c.is_published ? <FiEyeOff /> : <FiGlobe />, color: c.is_published ? 'var(--orange)' : 'var(--green)', onClick: () => handleToggle(c) },
                        { label: 'Delete',       icon: <FiTrash2 />,   danger: true,           onClick: () => setConfirm(c) },
                      ]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Assign Course Modal */}
      {assignCourse && (
        <AssignCourseModal
          course={assignCourse}
          onClose={() => setAssignCourse(null)}
          showToast={showToast}
        />
      )}

      <Modal title="Create Course" open={showCreate} onClose={() => { setShowCreate(false); setThumbFile(null); setThumbPreview(null); }}
        footer={<><button className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button><button form="create-course" type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create'}</button></>}
      >
        <form id="create-course" onSubmit={handleCreate}>
          <FormField label="Course Title"><Input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} required placeholder="e.g. React Advanced Patterns" /></FormField>
          <FormField label="Description"><Textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="What will learners achieve?" /></FormField>
          <FormField label="Thumbnail Image">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {thumbPreview && (
                <div style={{ position: 'relative', width: '100%', height: 140, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <img src={thumbPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button type="button" onClick={() => { setThumbFile(null); setThumbPreview(null); }}
                    style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', borderRadius: '50%', width: 26, height: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}
                  >✕</button>
                </div>
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: '1.5px dashed var(--border)', borderRadius: 10, cursor: 'pointer', background: 'var(--bg-soft)', transition: '0.2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--brand)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <span style={{ fontSize: '1.4rem' }}>🖼️</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  {thumbFile ? thumbFile.name : 'Click to upload image (JPG, PNG, WebP · max 5MB)'}
                </span>
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: 'none' }}
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) { setThumbFile(f); setThumbPreview(URL.createObjectURL(f)); }
                  }}
                />
              </label>
            </div>
          </FormField>
          <FormField label="Category">
            <Select value={form.category || ''} onChange={e => setForm(f => ({...f, category: e.target.value}))}>
              <option value="">— Select Category —</option>
              {['MFT', 'ServiceNow', 'SAP', 'Frontend', 'Backend', 'UI/UX', 'AWS', 'Testing', 'HR', 'Other'].map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </Select>
          </FormField>
        </form>
      </Modal>

      <Modal title="Edit Course" open={!!editCourse} onClose={() => setEditCourse(null)}
        footer={<><button className="btn btn-ghost" onClick={() => setEditCourse(null)}>Cancel</button><button form="edit-course" type="submit" className="btn btn-primary" disabled={savingEdit}>{savingEdit ? 'Saving…' : 'Save'}</button></>}
      >
        <form id="edit-course" onSubmit={handleEditSave}>
          <FormField label="Course Title"><Input value={editForm.title || ''} onChange={e => setEditForm(f => ({...f, title: e.target.value}))} required /></FormField>
          <FormField label="Description"><Textarea value={editForm.description || ''} onChange={e => setEditForm(f => ({...f, description: e.target.value}))} /></FormField>
          <FormField label="Thumbnail URL"><Input value={editForm.thumbnail_url || ''} onChange={e => setEditForm(f => ({...f, thumbnail_url: e.target.value}))} /></FormField>
          <FormField label="Category">
            <Select value={editForm.category || ''} onChange={e => setEditForm(f => ({...f, category: e.target.value}))}>
              <option value="">— Select Category —</option>
              {['MFT', 'ServiceNow', 'SAP', 'Frontend', 'Backend', 'UI/UX', 'AWS', 'Testing', 'HR', 'Other'].map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </Select>
          </FormField>
        </form>
      </Modal>

      <ConfirmModal open={!!confirm} danger title="Delete Course" message={`Delete "${confirm?.title}"? All lessons and content will be permanently removed.`} onConfirm={handleDelete} onCancel={() => setConfirm(null)} loading={deleting} />
    </Layout>
  );
}
