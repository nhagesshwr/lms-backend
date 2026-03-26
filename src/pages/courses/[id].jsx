import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  FiArrowLeft, FiBookOpen, FiClock, FiEdit2, FiTrash2,
  FiPlus, FiUploadCloud, FiFilm, FiFileText, FiEye,
  FiCheckCircle, FiPlay, FiHelpCircle, FiLock, FiUsers,
} from 'react-icons/fi';
import {
  getToken, getUser, coursesAPI, lessonsAPI, filesAPI,
  canManageCourses, quizzesAPI, progressAPI,
} from '../../lib/api';
import {
  Layout, Button, Modal, FormField, Input, Textarea, Select,
  Loading, EmptyState, useToast, ConfirmModal, Tabs, QuizWidget, Badge,
} from '../../components/components';

export default function CourseDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [user, setUser]     = useState(null);
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]       = useState('lessons');
  const [showLesson, setShowLesson] = useState(false);
  const [editLesson, setEditLesson] = useState(null);
  const [lForm, setLForm] = useState({ title: '', description: '', order: '', duration_minutes: '' });
  const [savingL, setSavingL] = useState(false);
  const [confirmL, setConfirmL] = useState(null);
  const [deletingL, setDeletingL] = useState(false);
  const [fileLesson, setFileLesson] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [showFile, setShowFile] = useState(false);
  const [uploadingV, setUploadingV] = useState(false);
  const [uploadingP, setUploadingP] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', description: '', thumbnail_url: '' });
  const [savingE, setSavingE] = useState(false);
  const [viewLesson, setViewLesson] = useState(null);
  const [viewFile, setViewFile] = useState(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [completed, setCompleted] = useState({});
  const { showToast, ToastComponent } = useToast();

  const [enrolled, setEnrolled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  // Doubt Section inside same file for speed
  const DoubtSection = ({ lessonId, user, showToast }) => {
    const [doubts, setDoubts] = useState([]);
    const [text, setText] = useState('');
    const [ansText, setAnsText] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      if (lessonId) loadDoubts();
    }, [lessonId]);

    const loadDoubts = async () => {
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:8000/api/doubts/lesson/${lessonId}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (res.ok) setDoubts(await res.json());
      } catch (err) {}
      finally { setLoading(false); }
    };

    const askDoubt = async () => {
      if (!text.trim()) return;
      try {
        const res = await fetch(`http://localhost:8000/api/doubts/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify({ lesson_id: lessonId, text })
        });
        if (res.ok) { setText(''); loadDoubts(); showToast('Question posted!'); }
      } catch (err) { showToast('Error posting', 'error'); }
    };

    const answerDoubt = async (dId) => {
      const resp = ansText[dId];
      if (!resp?.trim()) return;
      try {
        const res = await fetch(`http://localhost:8000/api/doubts/${dId}/answer`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify({ answer: resp })
        });
        if (res.ok) { setAnsText(a => ({...a, [dId]: ''})); loadDoubts(); showToast('Answered!'); }
      } catch (err) { showToast('Error answering', 'error'); }
    };

    return (
      <div className="card" style={{ marginTop: 24 }}>
        <h3 style={{ marginBottom: 16 }}>Q&A / Doubts</h3>
        {loading ? <Loading size="sm" /> : <>
          <div className="doubts-list" style={{ marginBottom: 20 }}>
            {doubts.length === 0 ? <p style={{ color: 'var(--text-dim)' }}>No questions yet.</p> : doubts.map(d => (
              <div key={d.id} style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 8, marginBottom: 12 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{d.username || 'User'} <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8 }}>asked:</span></div>
                <div style={{ marginTop: 4 }}>{d.text}</div>
                {d.is_answered ? (
                  <div style={{ marginTop: 8, padding: 8, background: 'var(--brand-bg)', borderRadius: 4, borderLeft: '3px solid var(--brand)', fontSize: '0.9rem' }}>
                    <strong>Manager:</strong> {d.answer}
                  </div>
                ) : user?.role === 'manager' || user?.role === 'hr_admin' ? (
                  <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                    <input className="form-input" style={{ flex: 1 }} placeholder="Answer this doubt..." value={ansText[d.id] || ''} onChange={e => setAnsText(a => ({...a, [d.id]: e.target.value}))} />
                    <button className="btn btn-primary btn-sm" onClick={() => answerDoubt(d.id)}>Reply</button>
                  </div>
                ) : (
                  <div style={{ marginTop: 8, fontSize: '0.8rem', color: 'var(--orange)' }}>Awaiting response...</div>
                )}
              </div>
            ))}
          </div>
        </>}
        {user?.role === 'employee' && (
           <div style={{ display: 'flex', gap: 8 }}>
             <input className="form-input" style={{ flex: 1 }} placeholder="Ask a question..." value={text} onChange={e => setText(e.target.value)} />
             <button className="btn btn-secondary" onClick={askDoubt}>Ask</button>
           </div>
        )}
      </div>
    );
  };


  useEffect(() => {
    if (!getToken()) { router.push('/login'); return; }
    setUser(getUser());
  }, []);

  useEffect(() => { if (id) loadCourse(); }, [id]);

  const loadCourse = async () => {
    setLoading(true);
    try {
      const data = await coursesAPI.getById(id);
      setCourse(data);
      setEditForm({ title: data.title, description: data.description || '', thumbnail_url: data.thumbnail_url || '', category: data.category || '' });
      
      const u = getUser();
      if (u && u.role === 'employee') {
        const res = await fetch(`http://localhost:8000/api/enrollments/status/${id}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (res.ok) {
           const en = await res.json();
           setEnrolled(en.enrolled);
           if (en.enrolled && en.progress) {
              const compParams = {};
              en.progress.forEach(p => { if (p.completed) compParams[p.lesson_id] = true; });
              setCompleted(compParams);
           }
        }
      } else {
        setEnrolled(true); // admins don't need to enroll to view
      }

    } catch (err) { showToast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      const res = await fetch(`http://localhost:8000/api/enrollments/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ course_id: parseInt(id) })
      });
      if (res.ok) {
        setEnrolled(true);
        showToast('Enrolled successfully!');
      } else {
        showToast('Failed to enroll', 'error');
      }
    } catch (err) {
      showToast('Error getting enrolled', 'error');
    } finally {
      setEnrolling(false);
    }
  };

  const openLesson = async (lesson) => {
    setViewLesson(lesson); setViewFile(null); setQuiz(null); setShowQuiz(false); setLoadingFile(true);
    try { setViewFile(await filesAPI.getFiles(lesson.id)); } catch { setViewFile({}); } finally { setLoadingFile(false); }
    try { setQuiz(await quizzesAPI.getByLesson(lesson.id)); } catch { setQuiz(null); }
  };

  const markComplete = async (lessonId) => {
    await progressAPI.complete(lessonId).catch(() => {});
    setCompleted(c => ({ ...c, [lessonId]: true }));
    showToast('Lesson marked complete!');
  };

  const canManage = canManageCourses(user?.role);
  const sorted    = [...(course?.lessons || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
  const totalMins = sorted.reduce((s, l) => s + (l.duration_minutes || 0), 0);

  const openAdd = () => {
    setLForm({ title: '', description: '', order: sorted.length + 1, duration_minutes: '' });
    setEditLesson(null); setShowLesson(true);
  };

  const openEditL = (l) => {
    setLForm({ title: l.title, description: l.description || '', order: l.order, duration_minutes: l.duration_minutes || '' });
    setEditLesson(l); setShowLesson(true);
  };

  const saveLesson = async (e) => {
    e.preventDefault(); setSavingL(true);
    const payload = { title: lForm.title };
    if (lForm.description) payload.description = lForm.description;
    payload.order = parseInt(lForm.order) || 1;
    if (lForm.duration_minutes) payload.duration_minutes = parseInt(lForm.duration_minutes);
    try {
      if (editLesson) await lessonsAPI.update(editLesson.id, payload);
      else await lessonsAPI.add(id, payload);
      showToast(editLesson ? 'Lesson updated!' : 'Lesson added!');
      setShowLesson(false); loadCourse();
    } catch (err) { showToast(err.message, 'error'); }
    finally { setSavingL(false); }
  };

  const deleteLesson = async () => {
    setDeletingL(true);
    try {
      await lessonsAPI.delete(confirmL.id);
      showToast('Lesson deleted'); setConfirmL(null); loadCourse();
      if (viewLesson?.id === confirmL.id) setViewLesson(null);
    } catch (err) { showToast(err.message, 'error'); }
    finally { setDeletingL(false); }
  };

  const openFiles = async (lesson) => {
    setFileLesson(lesson); setFileInfo(null); setShowFile(true);
    try { setFileInfo(await filesAPI.getFiles(lesson.id)); } catch { setFileInfo({}); }
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return; setUploadingV(true);
    try { await filesAPI.uploadVideo(fileLesson.id, file); showToast('Video uploaded!'); setFileInfo(await filesAPI.getFiles(fileLesson.id)); }
    catch (err) { showToast(err.message, 'error'); } finally { setUploadingV(false); }
  };

  const handlePDFUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return; setUploadingP(true);
    try { await filesAPI.uploadPDF(fileLesson.id, file); showToast('PDF uploaded!'); setFileInfo(await filesAPI.getFiles(fileLesson.id)); }
    catch (err) { showToast(err.message, 'error'); } finally { setUploadingP(false); }
  };

  const saveEdit = async (e) => {
    e.preventDefault(); setSavingE(true);
    try { await coursesAPI.update(id, editForm); showToast('Course updated!'); setShowEdit(false); loadCourse(); }
    catch (err) { showToast(err.message, 'error'); } finally { setSavingE(false); }
  };

  if (!user || loading) return <Layout><Loading /></Layout>;
  if (!course) return null;

  return (
    <Layout>
      {ToastComponent}
      <div className="course-detail-header">
        <button className="btn btn-ghost btn-sm" onClick={() => router.back()}><FiArrowLeft size={14} /> Back</button>
        <div style={{ display: 'flex', gap: 8 }}>
          {canManage && <Button variant="secondary" size="sm" icon={<FiUsers size={13} />} onClick={() => {
            const email = prompt("Enter the email of the employee you want to assign this course to:");
            if (email) {
              fetch(`http://localhost:8000/api/enrollments/assign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
                body: JSON.stringify({ course_id: parseInt(id), user_email: email })
              }).then(r => r.ok ? showToast('Course assigned!') : showToast('Failed to assign', 'error'));
            }
          }}>Assign Course</Button>}
          {canManage && <Button variant="secondary" size="sm" icon={<FiEdit2 size={13} />} onClick={() => setShowEdit(true)}>Edit Course</Button>}
        </div>
      </div>

      <div className="course-hero">
        <div className="course-hero-thumb">
          {course.thumbnail_url ? <img src={course.thumbnail_url} alt={course.title} className="course-hero-img" /> : <div className="course-hero-letter">{course.title?.[0]?.toUpperCase()}</div>}
        </div>
        <div className="course-hero-info">
          <Badge color={course.is_published ? 'green' : 'amber'} style={{ marginBottom: 8 }}>{course.is_published ? 'Published' : 'Draft'}</Badge>
          <h1 className="course-hero-title">{course.title}</h1>
          <p className="course-hero-desc">{course.description || 'No description provided.'}</p>
          <div className="course-hero-stats">
            <span className="course-stat-chip"><FiBookOpen size={13} /> {sorted.length} lessons</span>
            {totalMins > 0 && <span className="course-stat-chip"><FiClock size={13} /> {Math.floor(totalMins/60) > 0 ? `${Math.floor(totalMins/60)}h ` : ''}{totalMins%60 > 0 ? `${totalMins%60}m` : ''}</span>}
            <span className="course-stat-chip"><FiCheckCircle size={13} /> {Object.keys(completed).length}/{sorted.length} done</span>
          </div>
        </div>
      </div>

      <Tabs tabs={[{ id: 'lessons', label: 'Lessons', count: sorted.length }, { id: 'about', label: 'About' }]} active={tab} onChange={setTab} />

      {tab === 'about' && (
        <div className="card">
          <h2 style={{ marginBottom: 12, fontSize: '1rem' }}>About this Course</h2>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.8 }}>{course.description || 'No description.'}</p>
          <div style={{ marginTop: 16, fontSize: '0.82rem', color: 'var(--text-dim)' }}>Created {new Date(course.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </div>
      )}

      {tab === 'lessons' && (
        <div className="lesson-layout">
          <div className="lesson-list-panel">
            {canManage && <button className="btn btn-primary btn-sm" onClick={openAdd} style={{ width: '100%', justifyContent: 'center', marginBottom: 16 }}><FiPlus size={14} /> Add Lesson</button>}
            {sorted.length === 0
              ? <EmptyState icon={<FiBookOpen size={24} />} title="No lessons yet" description={canManage ? 'Add the first lesson.' : 'Check back soon.'} />
              : sorted.map((lesson, idx) => (
                <div key={lesson.id} className={`lesson-row ${viewLesson?.id === lesson.id ? 'active' : ''} ${completed[lesson.id] ? 'done' : ''}`} onClick={() => openLesson(lesson)}>
                  <div className="lesson-row-num">
                    {completed[lesson.id] ? <FiCheckCircle size={15} color="var(--green)" /> : viewLesson?.id === lesson.id ? <FiPlay size={13} color="var(--brand)" /> : <span>{idx + 1}</span>}
                  </div>
                  <div className="lesson-row-info">
                    <div className="lesson-row-title">{lesson.title}</div>
                    {lesson.duration_minutes && <div className="lesson-row-dur"><FiClock size={11} /> {lesson.duration_minutes}m</div>}
                  </div>
                  {canManage && (
                    <div className="lesson-row-actions">
                      <button className="icon-btn sm" onClick={e => { e.stopPropagation(); openFiles(lesson); }}><FiUploadCloud size={13} /></button>
                      <button className="icon-btn sm" onClick={e => { e.stopPropagation(); openEditL(lesson); }}><FiEdit2 size={13} /></button>
                      <button className="icon-btn sm danger" onClick={e => { e.stopPropagation(); setConfirmL(lesson); }}><FiTrash2 size={13} /></button>
                    </div>
                  )}
                </div>
              ))
            }
          </div>

          {!canManage && (
            <div className="lesson-viewer-panel">
              {!enrolled ? (
                <div className="viewer-placeholder">
                  <FiLock size={44} color="var(--text-dim)" />
                  <h3>You are not enrolled in this course</h3>
                  <p>Enroll to get access to all lessons and materials.</p>
                  <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={handleEnroll} disabled={enrolling}>
                    {enrolling ? 'Enrolling...' : 'Enroll Now'}
                  </button>
                </div>
              ) : !viewLesson ? (
                <div className="viewer-placeholder"><FiPlay size={44} color="var(--text-dim)" /><h3>Select a lesson to begin</h3><p>Click any lesson on the left</p></div>
              ) : (
                <>
                  <div className="viewer-header">
                    <h2 className="viewer-title">{viewLesson.title}</h2>
                    {!completed[viewLesson.id]
                      ? <button className="btn btn-success btn-sm" onClick={() => markComplete(viewLesson.id)}><FiCheckCircle size={13} /> Mark Complete</button>
                      : <Badge color="green">Completed</Badge>
                    }
                  </div>
                  {loadingFile ? <div className="viewer-loading"><div className="spinner" /></div> : (
                    <>
                      {viewFile?.video_url
                        ? <div className="viewer-video-wrap"><video controls src={viewFile.video_url} className="viewer-video" /></div>
                        : <div className="viewer-no-video"><FiFilm size={32} color="var(--text-dim)" /><span>No video for this lesson</span></div>
                      }
                      {quiz && (
                        <div className="viewer-quiz-section">
                          <div className="viewer-quiz-label"><FiHelpCircle size={15} color="var(--brand)" /><span>Knowledge Check</span></div>
                          {!showQuiz
                            ? <button className="btn btn-secondary" onClick={() => setShowQuiz(true)}><FiHelpCircle size={14} /> Take Quiz ({quiz.questions.length} questions)</button>
                            : <QuizWidget quiz={quiz} onComplete={r => showToast(`Quiz done! Score: ${r.score}%`)} />
                          }
                        </div>
                      )}
                      {viewFile?.pdf_url && (
                        <div className="viewer-pdf-section">
                          <div className="viewer-pdf-label"><FiFileText size={15} color="var(--teal)" /><span>Reading Material</span></div>
                          <a href={viewFile.pdf_url} target="_blank" rel="noreferrer" className="btn btn-secondary"><FiFileText size={14} /> Open PDF</a>
                        </div>
                      )}
                      {!viewFile?.video_url && !viewFile?.pdf_url && (
                        <div className="viewer-empty-content"><FiLock size={24} color="var(--text-dim)" /><p>No content for this lesson</p></div>
                      )}
                      
                      <DoubtSection lessonId={viewLesson.id} user={user} showToast={showToast} />
                    </>
                  )}
                </>
              )}
            </div>
          )}
          {canManage && (
            <div className="lesson-viewer-panel">
               {!viewLesson ? (
                <div className="viewer-placeholder"><FiPlay size={44} color="var(--text-dim)" /><h3>Manager View</h3><p>Select a lesson on the left to review content or answer doubts.</p></div>
              ) : (
                <>
                  <div className="viewer-header">
                    <h2 className="viewer-title">{viewLesson.title} — Review</h2>
                  </div>
                   <DoubtSection lessonId={viewLesson.id} user={user} showToast={showToast} />
                </>
              )}
            </div>
          )}
        </div>
      )}

      <Modal title={editLesson ? 'Edit Lesson' : 'Add Lesson'} open={showLesson} onClose={() => setShowLesson(false)}
        footer={<><button className="btn btn-ghost" onClick={() => setShowLesson(false)}>Cancel</button><button form="lesson-form" type="submit" className="btn btn-primary" disabled={savingL}>{savingL ? 'Saving…' : editLesson ? 'Save' : 'Add'}</button></>}
      >
        <form id="lesson-form" onSubmit={saveLesson}>
          <FormField label="Lesson Title"><Input value={lForm.title} onChange={e => setLForm(f => ({...f, title: e.target.value}))} required placeholder="e.g. Introduction to Hooks" autoFocus /></FormField>
          <FormField label="Description"><Textarea value={lForm.description} onChange={e => setLForm(f => ({...f, description: e.target.value}))} /></FormField>
          <div className="grid-2">
            <FormField label="Order"><Input type="number" value={lForm.order} onChange={e => setLForm(f => ({...f, order: e.target.value}))} min={1} /></FormField>
            <FormField label="Duration (min)"><Input type="number" value={lForm.duration_minutes} onChange={e => setLForm(f => ({...f, duration_minutes: e.target.value}))} placeholder="30" /></FormField>
          </div>
        </form>
      </Modal>

      <Modal title={`Files — ${fileLesson?.title}`} open={showFile} onClose={() => setShowFile(false)} size="lg">
        {fileInfo === null ? <Loading message="Loading files…" /> : (
          <div className="grid-2">
            <div className="file-section">
              <div className="file-section-label"><FiFilm size={15} color="var(--brand)" /> Video</div>
              {fileInfo.video_url
                ? <><video controls src={fileInfo.video_url} className="file-video-preview" /><button className="btn btn-danger btn-sm" onClick={async () => { try { await filesAPI.deleteVideo(fileLesson.id); showToast('Video removed.'); setFileInfo(f => ({...f, video_url: null})); } catch(e){showToast(e.message,'error');} }}><FiTrash2 size={12} /> Remove</button></>
                : <div className="file-upload-zone"><FiFilm size={24} color="var(--text-dim)" /><span>No video uploaded</span><label className="btn btn-primary btn-sm">{uploadingV ? 'Uploading…' : 'Upload Video'}<input type="file" accept="video/*" style={{display:'none'}} onChange={handleVideoUpload} disabled={uploadingV} /></label><span className="upload-hint">MP4 · max 50MB</span></div>
              }
            </div>
            <div className="file-section">
              <div className="file-section-label"><FiFileText size={15} color="var(--teal)" /> PDF</div>
              {fileInfo.pdf_url
                ? <><a href={fileInfo.pdf_url} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm"><FiEye size={13} /> Preview PDF</a><button className="btn btn-danger btn-sm" onClick={async () => { try { await filesAPI.deletePDF(fileLesson.id); showToast('PDF removed.'); setFileInfo(f => ({...f, pdf_url: null})); } catch(e){showToast(e.message,'error');} }}><FiTrash2 size={12} /> Remove</button></>
                : <div className="file-upload-zone"><FiFileText size={24} color="var(--text-dim)" /><span>No PDF uploaded</span><label className="btn btn-primary btn-sm">{uploadingP ? 'Uploading…' : 'Upload PDF'}<input type="file" accept=".pdf" style={{display:'none'}} onChange={handlePDFUpload} disabled={uploadingP} /></label><span className="upload-hint">PDF only · max 10MB</span></div>
              }
            </div>
          </div>
        )}
      </Modal>

      <Modal title="Edit Course" open={showEdit} onClose={() => setShowEdit(false)}
        footer={<><button className="btn btn-ghost" onClick={() => setShowEdit(false)}>Cancel</button><button form="edit-course-form" type="submit" className="btn btn-primary" disabled={savingE}>{savingE ? 'Saving…' : 'Save'}</button></>}
      >
        <form id="edit-course-form" onSubmit={saveEdit}>
          <FormField label="Title"><Input value={editForm.title} onChange={e => setEditForm(f => ({...f, title: e.target.value}))} required /></FormField>
          <FormField label="Description"><Textarea value={editForm.description} onChange={e => setEditForm(f => ({...f, description: e.target.value}))} /></FormField>
          <FormField label="Thumbnail URL"><Input value={editForm.thumbnail_url} onChange={e => setEditForm(f => ({...f, thumbnail_url: e.target.value}))} placeholder="https://…" /></FormField>
          <FormField label="Category">
            <Select value={editForm.category || ''} onChange={e => setEditForm(f => ({...f, category: e.target.value}))}>
              <option value="">— Select Category —</option>
              {['MFT', 'ServiceNow', 'SAP', 'Frontend', 'Backend', 'UI/UX', 'AWS', 'Testing', 'HR', 'Other'].map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </Select>
          </FormField>
        </form>
      </Modal>

      <ConfirmModal open={!!confirmL} danger title="Delete Lesson" message={`Delete "${confirmL?.title}"?`} onConfirm={deleteLesson} onCancel={() => setConfirmL(null)} loading={deletingL} />
    </Layout>
  );
}
