import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { FiBookOpen, FiPlus, FiEdit2, FiTrash2, FiEye, FiEyeOff, FiSearch } from 'react-icons/fi';
import { getToken, getUser, isSuperAdmin, coursesAPI } from '../../lib/api';
import {
  Layout, Loading, Button, Modal, FormField, Input, Textarea, Select,
  SearchBar, Badge, Tabs, StatCard, useToast, ConfirmModal,
} from '../../components/components';

export default function SuperAdminCourses() {
  const router = useRouter();
  const [courses, setCourses]   = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch]     = useState('');
  const [tab, setTab]           = useState('all');
  const [loading, setLoading]   = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm]         = useState({ title: '', description: '', thumbnail_url: '' });
  const [saving, setSaving]     = useState(false);
  const [editCourse, setEditCourse] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [confirm, setConfirm]   = useState(null);
  const [deleting, setDeleting] = useState(false);
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return; }
    const u = getUser();
    if (!isSuperAdmin(u?.role)) { router.push('/dashboard'); return; }
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
    try { setCourses(await coursesAPI.getAll()); }
    catch (err) { showToast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await coursesAPI.create({ title: form.title, description: form.description, ...(form.thumbnail_url ? { thumbnail_url: form.thumbnail_url } : {}), ...(form.category ? { category: form.category } : {}) });
      showToast('Course created!'); setShowCreate(false); setForm({ title: '', description: '', thumbnail_url: '', category: '' }); loadCourses();
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
    <Layout title="Courses" subtitle="Create, manage, and publish all courses">
      {ToastComponent}
      {loading ? <Loading /> : (
        <>
          <div className="stats-row">
            <StatCard label="Total Courses" value={courses.length} sub="All courses" color="brand" icon={<FiBookOpen size={18} />} />
            <StatCard label="Published" value={published} sub="Live for learners" color="green" icon={<FiEye size={18} />} />
            <StatCard label="Drafts" value={courses.length - published} sub="Pending publish" color="amber" icon={<FiEyeOff size={18} />} />
          </div>

          <div className="toolbar">
            <Tabs tabs={tabs} active={tab} onChange={setTab} />
            <div className="toolbar-right">
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
                  <tr key={c.id}>
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
                    <td>
                      <div className="action-btns">
                        <Link href={`/courses/${c.id}`}><button className="icon-btn" title="View"><FiEye size={14} /></button></Link>
                        <button className="icon-btn" onClick={() => { setEditCourse(c); setEditForm({ title: c.title, description: c.description || '', thumbnail_url: c.thumbnail_url || '' }); }} title="Edit"><FiEdit2 size={14} /></button>
                        <button className="icon-btn" onClick={() => handleToggle(c)} title={c.is_published ? 'Unpublish' : 'Publish'}>
                          {c.is_published ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                        </button>
                        <button className="icon-btn danger" onClick={() => setConfirm(c)} title="Delete"><FiTrash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Modal title="Create Course" open={showCreate} onClose={() => setShowCreate(false)}
        footer={<><button className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button><button form="create-course" type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create'}</button></>}
      >
        <form id="create-course" onSubmit={handleCreate}>
          <FormField label="Course Title"><Input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} required placeholder="e.g. React Advanced Patterns" /></FormField>
          <FormField label="Description"><Textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="What will learners achieve?" /></FormField>
          <FormField label="Thumbnail URL (optional)"><Input value={form.thumbnail_url} onChange={e => setForm(f => ({...f, thumbnail_url: e.target.value}))} placeholder="https://…" /></FormField>
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
