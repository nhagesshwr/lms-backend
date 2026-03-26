import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { FiBookOpen, FiPlus, FiClock, FiEdit2, FiTrash2, FiEye, FiEyeOff, FiUploadCloud } from 'react-icons/fi';
import { getToken, getUser, coursesAPI, canManageCourses } from '../../lib/api';
import {
  Layout, PageHeader, Button, Modal, FormField, Input, Textarea, Select,
  SearchBar, Loading, EmptyState, useToast, ConfirmModal,
} from '../../components/components';
import CourseModernCard from '../../components/CourseModernCard';

export default function Courses() {
  const router = useRouter();
  const [user, setUser]         = useState(null);
  const [courses, setCourses]   = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', thumbnail_url: '' });
  const [saving, setSaving] = useState(false);

  const [confirm, setConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return; }
    const u = getUser();
    setUser(u);
    loadCourses(u);
  }, []);

  useEffect(() => {
    let list = courses;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c => c.title.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q));
    }
    if (filterStatus === 'published') list = list.filter(c => c.is_published);
    if (filterStatus === 'draft')     list = list.filter(c => !c.is_published);
    setFiltered(list);
  }, [search, filterStatus, courses]);

  const loadCourses = async (u) => {
    setLoading(true);
    try {
      const list = canManageCourses(u?.role) ? await coursesAPI.getAll() : await coursesAPI.getPublished();
      setCourses(list);
    } catch (err) { showToast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { title: form.title, description: form.description };
      if (form.thumbnail_url) payload.thumbnail_url = form.thumbnail_url;
      if (form.category) payload.category = form.category;
      await coursesAPI.create(payload);
      showToast('Course created successfully!');
      setShowCreate(false);
      setForm({ title: '', description: '', thumbnail_url: '', category: '' });
      loadCourses(user);
    } catch (err) { showToast(err.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleToggle = async (course) => {
    try {
      if (course.is_published) await coursesAPI.unpublish(course.id);
      else await coursesAPI.publish(course.id);
      showToast(`Course ${course.is_published ? 'unpublished' : 'published'}`);
      loadCourses(user);
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await coursesAPI.delete(confirm.id);
      showToast('Course deleted');
      setConfirm(null);
      loadCourses(user);
    } catch (err) { showToast(err.message, 'error'); }
    finally { setDeleting(false); }
  };

  const canManage = canManageCourses(user?.role);
  const published = courses.filter(c => c.is_published).length;
  const drafts    = courses.filter(c => !c.is_published).length;

  return (
    <Layout>
      <PageHeader
        title="Courses"
        subtitle="Manage and browse your learning content"
        actions={canManage && (
          <Button icon={<FiPlus size={15} />} onClick={() => setShowCreate(true)}>
            New Course
          </Button>
        )}
      />

      {/* Mini stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'All', count: courses.length, val: 'all' },
          { label: 'Published', count: published, val: 'published' },
          { label: 'Drafts', count: drafts, val: 'draft' },
        ].map(({ label, count, val }) => (
          <button key={val}
            onClick={() => setFilterStatus(val)}
            style={{
              padding: '7px 16px', borderRadius: 'var(--r-sm)',
              border: filterStatus === val ? '1.5px solid var(--brand)' : '1.5px solid var(--border)',
              background: filterStatus === val ? 'var(--brand-bg)' : 'var(--bg-white)',
              color: filterStatus === val ? 'var(--brand)' : 'var(--text-muted)',
              fontSize: '0.84rem', fontWeight: 600, cursor: 'pointer',
              transition: 'var(--transition)',
            }}>
            {label} <span style={{ opacity: 0.6, fontWeight: 400, marginLeft: 4 }}>{count}</span>
          </button>
        ))}
      </div>

      <div className="toolbar">
        <SearchBar value={search} onChange={setSearch} placeholder="Search courses…" />
        <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
          {filtered.length} course{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {loading ? <Loading /> : filtered.length === 0 ? (
        <EmptyState
          icon={<FiBookOpen size={28} />}
          title="No courses found"
          description={search ? 'Try a different search term.' : 'No courses available yet.'}
          action={canManage && (
            <Button icon={<FiPlus size={14} />} onClick={() => setShowCreate(true)}>
              Create First Course
            </Button>
          )}
        />
      ) : (
        <div className="grid-3">
          {filtered.map(course => (
            <div key={course.id} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <CourseModernCard
                course={course}
                onClick={() => router.push(`/courses/${course.id}`)}
              />

              {canManage && (
                <div className="course-actions" style={{ padding: '0 10px 15px', marginTop: -10 }}>
                  <Button variant="secondary" size="sm"
                    icon={course.is_published ? <FiEyeOff size={13} /> : <FiEye size={13} />}
                    onClick={(e) => { e.stopPropagation(); handleToggle(course); }}>
                    {course.is_published ? 'Unpublish' : 'Publish'}
                  </Button>
                  <Link href={`/courses/${course.id}`} style={{ marginLeft: 'auto', display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" icon={<FiEdit2 size={13} />}>Edit</Button>
                  </Link>
                  <Button variant="danger" size="sm" icon={<FiTrash2 size={13} />}
                    onClick={(e) => { e.stopPropagation(); setConfirm(course); }} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal title="Create New Course" open={showCreate} onClose={() => setShowCreate(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving} icon={<FiUploadCloud size={14} />}>
              {saving ? 'Creating…' : 'Create Course'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreate}>
          <FormField label="Course Title *">
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Python for Beginners" required />
          </FormField>
          <FormField label="Description">
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Brief course overview…" />
          </FormField>
          <FormField label="Thumbnail URL" hint="Optional — paste an image URL for the course cover">
            <Input value={form.thumbnail_url} onChange={e => setForm(f => ({ ...f, thumbnail_url: e.target.value }))}
              placeholder="https://…" />
          </FormField>
          <FormField label="Category" hint="Tech field or category">
            <Select value={form.category || ''} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              <option value="">— Select Category —</option>
              {['MFT', 'ServiceNow', 'SAP', 'Frontend', 'Backend', 'UI/UX', 'AWS', 'Testing', 'HR', 'Other'].map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </Select>
          </FormField>
        </form>
      </Modal>

      <ConfirmModal open={!!confirm} title="Delete Course"
        message={`Are you sure you want to delete "${confirm?.title}"? All lessons and content will be permanently removed.`}
        onConfirm={handleDelete} onCancel={() => setConfirm(null)} loading={deleting} />

      {ToastComponent}
    </Layout>
  );
}
