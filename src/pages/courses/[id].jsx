import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import {
  FiArrowLeft, FiBookOpen, FiClock, FiEdit2, FiTrash2,
  FiPlus, FiUploadCloud, FiFilm, FiFileText, FiEye,
  FiCheckCircle, FiPlay, FiHelpCircle, FiLock, FiUsers,
  FiSearch, FiX, FiCheck, FiClipboard, FiAward, FiSend
} from 'react-icons/fi';
import {
  getToken, getUser, coursesAPI, lessonsAPI, filesAPI,
  canManageCourses, canAssignCourses, quizzesAPI, progressAPI,
  employeesAPI, enrollmentsAPI, assignmentsAPI, certificatesAPI,
  messagesAPI
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

  const [draggedLesson, setDraggedLesson] = useState(null);
  const [dragOverLesson, setDragOverLesson] = useState(null);
  const stripRef = useRef(null);

  const [showAddQuiz, setShowAddQuiz] = useState(false);
  const [qForm, setQForm] = useState({ lesson_id: '', title: '', pass_score: 70, questions: [{ text: '', options: ['', '', '', ''], correct_index: 0 }] });
  const [savingQ, setSavingQ] = useState(false);

  const [showAddAssig, setShowAddAssig] = useState(false);
  const [aForm, setAForm] = useState({ title: '', description: '', points: 100, assignment_type: 'exercise', due_date: '' });
  const [savingA, setSavingA] = useState(false);
  const [aFile, setAFile] = useState(null);

  const [enrolled, setEnrolled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollRequestSent, setEnrollRequestSent] = useState(false);
  const [showAssign, setShowAssign] = useState(false); // assign course modal
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [hasCert, setHasCert] = useState(false);
  const [isGeneratingCert, setIsGeneratingCert] = useState(false);
  const [progPct, setProgPct] = useState(0);

  // Load persisted enroll request state on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && id) {
      const key = `enroll_req_${id}_${getUser()?.id || getUser()?.name}`;
      if (localStorage.getItem(key) === 'pending') setEnrollRequestSent(true);
    }
  }, [id]);

  // ── Assign Course Modal ──────────────────────────────────────────────────────
  const AssignCourseModal = ({ onClose }) => {
    const [employees, setEmployees]       = useState([]);
    const [loadingEmps, setLoadingEmps]   = useState(true);
    const [search, setSearch]             = useState('');
    const [selected, setSelected]         = useState([]);
    const [assigning, setAssigning]       = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropRef = useRef(null);

    useEffect(() => {
      employeesAPI.getAll()
        .then(setEmployees)
        .catch(() => showToast('Could not load employees', 'error'))
        .finally(() => setLoadingEmps(false));
    }, []);

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

    const toggle = (empId) =>
      setSelected(prev => prev.includes(empId) ? prev.filter(x => x !== empId) : [...prev, empId]);

    const selectedEmps = employees.filter(e => selected.includes(e.id));

    const handleAssign = async () => {
      if (selected.length === 0) { showToast('Select at least one user', 'error'); return; }
      setAssigning(true);
      let ok = 0, fail = 0;
      for (const empId of selected) {
        try { await enrollmentsAPI.assign(empId, parseInt(id)); ok++; }
        catch { fail++; }
      }
      setAssigning(false);
      if (ok > 0) showToast(`Enrolled ${ok} user${ok > 1 ? 's' : ''} successfully!`);
      if (fail > 0) showToast(`${fail} already enrolled or failed.`, 'error');
      onClose();
      // Reload students list if we are admin
      if (canManageCourses(getUser()?.role)) {
         enrollmentsAPI.getEnrolled(id).then(setEnrolledStudents).catch(()=>{});
      }
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: 400 }}>
          {/* Selected chips */}
          {selectedEmps.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {selectedEmps.map(e => (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'var(--brand)', color: '#fff', borderRadius: 20, fontSize: '0.8rem', fontWeight: 500 }}>
                  <span>{e.name}</span>
                  <button onClick={() => toggle(e.id)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
                    <FiX size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Search Bar */}
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
              const isSel = selected.includes(emp.id);
              const initials = emp.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
              return (
                <div
                  key={emp.id}
                  onClick={() => toggle(emp.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', cursor: 'pointer', background: isSel ? 'var(--bg-soft)' : 'transparent', transition: '0.15s', borderBottom: '1px solid var(--border)' }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: `hsl(${emp.id * 67 % 360},70%,75%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', color: '#fff', flexShrink: 0 }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text)' }}>{emp.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.email} · {emp.role}</div>
                  </div>
                  <div style={{ width: 20, height: 20, borderRadius: 5, border: `2px solid ${isSel ? 'var(--brand)' : 'var(--border)'}`, background: isSel ? 'var(--brand)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {isSel && <FiCheck size={12} color="#fff" strokeWidth={3} />}
                  </div>
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>Already-enrolled users will be skipped automatically.</p>
        </div>
      </Modal>
    );
  };

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
        try {
          const en = await enrollmentsAPI.checkStatus(id);
          setEnrolled(en.enrolled);
          setHasCert(en.has_certificate);
          setProgPct(en.progress_pct);
          if (en.enrolled && en.progress) {
             const compParams = {};
             en.progress.forEach(p => { if (p.completed) compParams[p.lesson_id] = true; });
             setCompleted(compParams);
          }
        } catch(e) {}
      } else {
        setEnrolled(true); // admins don't need to enroll to view
        setHasCert(false);
        setProgPct(0);
      }

    } catch (err) { showToast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      // Fetch all super_admin + hr_admin users
      const admins = await employeesAPI.getAdmins().catch(() => []);
      if (!admins || admins.length === 0) {
        showToast('No admins found to notify. Please contact your HR team.', 'error');
        setEnrolling(false);
        return;
      }

      const u = getUser();
      const courseName = course?.title || `Course #${id}`;
      const message = `📚 Enrollment Request\n\nEmployee "${u?.name || 'An employee'}" has requested to be enrolled in the course: "${courseName}".\n\nPlease review and assign/enroll them at your earliest convenience.`;

      // Send message to every admin
      let sent = 0;
      for (const admin of admins) {
        try {
          await messagesAPI.send(admin.id, message);
          sent++;
        } catch (e) {
          // skip if this admin send fails
        }
      }

      if (sent > 0) {
        // Persist request so page refresh keeps the state
        const key = `enroll_req_${id}_${u?.id || u?.name}`;
        localStorage.setItem(key, 'pending');
        setEnrollRequestSent(true);
        showToast(`Enrollment request sent to ${sent} admin${sent > 1 ? 's' : ''}! They will enroll you shortly. 📩`);
      } else {
        showToast('Could not reach any admins. Please try again.', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Error sending enrollment request', 'error');
    } finally {
      setEnrolling(false);
    }
  };

  const saveQuiz = async (e) => {
    e.preventDefault();
    if (!qForm.lesson_id) return showToast('Please select a lesson to attach the quiz to.', 'warning');
    if (qForm.questions.length === 0) return showToast('Add at least one question', 'warning');
    setSavingQ(true);
    try {
      const payload = {
        title: qForm.title,
        pass_score: parseInt(qForm.pass_score) || 70,
        questions: qForm.questions.map((q, i) => ({
          text: q.text,
          options: q.options,
          correct_index: parseInt(q.correct_index),
          order: i
        }))
      };
      await quizzesAPI.create(qForm.lesson_id, payload);
      showToast('Quiz successfully created!');
      setShowAddQuiz(false);
      loadCourse();
    } catch (err) {
      showToast(err.message || 'Error creating quiz', 'error');
    } finally { setSavingQ(false); }
  };

  const saveAssignment = async (e) => {
    e.preventDefault();
    setSavingA(true);
    try {
      const payload = { ...aForm, course_id: parseInt(id), points: parseInt(aForm.points) || 100 };
      if (payload.due_date) {
        payload.due_date = new Date(payload.due_date).toISOString();
      } else {
        delete payload.due_date;
      }
      const created = await assignmentsAPI.create(payload);
      if (aFile) {
        showToast('Assignment created, uploading document...');
        await assignmentsAPI.uploadDocument(created.id, aFile);
      }
      showToast('Assignment successfully added!');
      setShowAddAssig(false);
      setAFile(null);
    } catch (err) {
      showToast(err.message || 'Error creating assignment', 'error');
    } finally { setSavingA(false); }
  };

  const openLesson = async (lesson) => {
    setViewLesson(lesson); setViewFile(null); setQuiz(null); setShowQuiz(false); setLoadingFile(true);
    try { setViewFile(await filesAPI.getFiles(lesson.id)); } catch { setViewFile({}); } finally { setLoadingFile(false); }
    try { setQuiz(await quizzesAPI.getByLesson(lesson.id)); } catch { setQuiz(null); }
  };

  const markComplete = async (lessonId) => {
    try {
      const res = await enrollmentsAPI.completeLesson(lessonId, id);
      setCompleted(c => ({ ...c, [lessonId]: true }));
      if (res && res.progress_pct !== undefined) {
        setProgPct(res.progress_pct);
      }
      showToast('Lesson marked complete!');
    } catch (err) {
      showToast(err.message || 'Failed to mark lesson complete', 'error');
    }
  };

  const handleGenerateCert = async () => {
    setIsGeneratingCert(true);
    try {
      await certificatesAPI.generate(id);
      setHasCert(true);
      showToast('Certificate generated successfully!', 'success');
      router.push('/employee/certificates');
    } catch (err) {
      showToast(err.message || 'Failed to generate certificate', 'error');
    } finally {
      setIsGeneratingCert(false);
    }
  };

  const canManage = canManageCourses(user?.role);
  const canAssign = canAssignCourses(user?.role);
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

  const confirmRemoveStudent = async (emp) => {
    if(!confirm(`Remove ${emp.employee_name} from this course?`)) return;
    try {
      await enrollmentsAPI.adminUnenroll(emp.employee_id, course.id);
      showToast('Student removed from course');
      setEnrolledStudents(prev => prev.filter(e => e.employee_id !== emp.employee_id));
    } catch (err) {
      showToast(err.message || 'Failed to remove student', 'error');
    }
  };

  const openFiles = async (lesson) => {
    setFileLesson(lesson); setFileInfo(null); setShowFile(true);
    try { setFileInfo(await filesAPI.getFiles(lesson.id)); } catch { setFileInfo({}); }
  };

  const handleDragStart = (e, lesson) => {
    if (course.is_published) return;
    setDraggedLesson(lesson);
  };
  const handleDragOver = (e, lesson) => {
    e.preventDefault();
    if (course.is_published || !draggedLesson) return;
    setDragOverLesson(lesson);
  };
  const handleDrop = async (e, targetLesson) => {
    e.preventDefault();
    const source = draggedLesson;
    setDraggedLesson(null); setDragOverLesson(null);
    if (course.is_published || !source || source.id === targetLesson.id) return;

    const newList = [...sorted];
    const srcIdx = newList.findIndex(l => l.id === source.id);
    const dstIdx = newList.findIndex(l => l.id === targetLesson.id);
    const [moved] = newList.splice(srcIdx, 1);
    newList.splice(dstIdx, 0, moved);

    setCourse(prev => ({ ...prev, lessons: newList })); // optimistic UI update
    try {
      for (let i = 0; i < newList.length; i++) {
        if (newList[i].order !== i + 1) {
          await lessonsAPI.update(newList[i].id, { order: i + 1 });
        }
      }
      loadCourse(); // reload to get true state
    } catch (err) { showToast('Error saving new order', 'error'); }
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

  const scrollStrip = (dir) => {
    if (stripRef.current) stripRef.current.scrollBy({ left: dir * 180, behavior: 'smooth' });
  };

  return (
    <Layout>
      {ToastComponent}

      {/* Header row */}
      <div className="course-detail-header">
        <button className="btn btn-ghost btn-sm" onClick={() => router.back()}><FiArrowLeft size={14} /> Go Back</button>
        <div style={{ display: 'flex', gap: 8 }}>
          {canAssign && <Button variant="secondary" size="sm" icon={<FiUsers size={13} />} onClick={() => setShowAssign(true)}>Assign Course</Button>}
          {canManage && <Button variant="secondary" size="sm" icon={<FiEdit2 size={13} />} onClick={() => setShowEdit(true)}>Edit Course</Button>}
        </div>
      </div>

      {/* Course title */}
      <div className="course-hero">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 className="course-hero-title">{course.title}</h1>
            <p className="course-hero-desc">{course.description || ''}</p>
          </div>
          {user?.role === 'employee' && enrolled && progPct >= 100 && (
            hasCert
              ? <button className="btn btn-success" style={{ borderRadius: 40, padding: '10px 22px' }} onClick={() => router.push('/employee/certificates')}><FiAward size={16} /> View Certificate</button>
              : <button className="btn btn-primary" style={{ borderRadius: 40, padding: '10px 22px' }} onClick={handleGenerateCert} disabled={isGeneratingCert}><FiAward size={16} /> {isGeneratingCert ? 'Generating...' : 'Get Certificate'}</button>
          )}
          {canManage && (
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="secondary" size="sm" icon={<FiEdit2 size={13} />} onClick={() => setShowEdit(true)}>Edit</Button>
            </div>
          )}
        </div>
      </div>

      {/* ── Admin manage view (tabs + lesson list + viewer) ── */}
      {canManage && (
        <>
          <Tabs
            tabs={[
              { id: 'lessons', label: 'Lessons', count: sorted.length },
              { id: 'about', label: 'About' },
              { id: 'students', label: 'Students', count: enrolledStudents.length },
            ]}
            active={tab}
            onChange={setTab}
          />

          {tab === 'about' && (
            <div className="card">
              <h2 style={{ marginBottom: 12, fontSize: '1rem' }}>About this Course</h2>
              <p style={{ color: 'var(--text-muted)', lineHeight: 1.8 }}>{course.description || 'No description.'}</p>
              <div style={{ marginTop: 16, fontSize: '0.82rem', color: 'var(--text-dim)' }}>Created {new Date(course.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            </div>
          )}

          {tab === 'lessons' && (
            <div className="lesson-layout">
              <div className="lesson-list-panel" style={{ display: 'flex', flexDirection: 'column' }}>
                {sorted.length === 0
                  ? <EmptyState icon={<FiBookOpen size={24} />} title="No lessons yet" description="Add the first lesson below." />
                  : sorted.map((lesson, idx) => {
                      const dProps = !course.is_published ? {
                        draggable: true,
                        onDragStart: e => handleDragStart(e, lesson),
                        onDragOver: e => handleDragOver(e, lesson),
                        onDrop: e => handleDrop(e, lesson),
                      } : {};
                      return (
                        <div key={lesson.id} {...dProps}
                          className={`lesson-row ${viewLesson?.id === lesson.id ? 'active' : ''} ${completed[lesson.id] ? 'done' : ''}`}
                          style={{ border: dragOverLesson?.id === lesson.id ? '1.5px dashed var(--brand)' : '1.5px solid transparent', cursor: !course.is_published ? 'grab' : 'pointer' }}
                          onClick={() => openLesson(lesson)}
                        >
                          <div className="lesson-row-num">
                            {completed[lesson.id] ? <FiCheckCircle size={15} color="var(--green)" /> : viewLesson?.id === lesson.id ? <FiPlay size={13} color="var(--brand)" /> : <span>{idx + 1}</span>}
                          </div>
                          <div className="lesson-row-info">
                            <div className="lesson-row-title">{lesson.title}</div>
                            {lesson.duration_minutes && <div className="lesson-row-dur"><FiClock size={11} /> {lesson.duration_minutes}m</div>}
                          </div>
                          <div className="lesson-row-actions">
                            <button className="icon-btn sm" onClick={e => { e.stopPropagation(); openFiles(lesson); }}><FiUploadCloud size={13} /></button>
                            <button className="icon-btn sm" onClick={e => { e.stopPropagation(); openEditL(lesson); }}><FiEdit2 size={13} /></button>
                            <button className="icon-btn sm danger" onClick={e => { e.stopPropagation(); setConfirmL(lesson); }}><FiTrash2 size={13} /></button>
                          </div>
                        </div>
                      );
                    })
                }
                <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textAlign: 'center', marginBottom: 10 }}>
                    {course.is_published ? 'Unpublish to reorder lessons.' : 'Drag & drop to reorder.'}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                    <button className="btn btn-primary btn-sm" onClick={openAdd} disabled={course.is_published} style={{ justifyContent: 'center' }}><FiPlus size={13} /> {course.is_published ? 'Locked' : 'Lesson'}</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => { setQForm({ lesson_id: sorted.length ? sorted[0].id : '', title: 'Knowledge Check', pass_score: 70, questions: [{ text: '', options: ['', '', '', ''], correct_index: 0 }] }); setShowAddQuiz(true); }} disabled={course.is_published || sorted.length === 0} style={{ justifyContent: 'center' }}><FiHelpCircle size={13} /> Quiz</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => { setAForm({ title: '', description: '', points: 100, assignment_type: 'exercise', due_date: '' }); setAFile(null); setShowAddAssig(true); }} disabled={course.is_published} style={{ justifyContent: 'center' }}><FiClipboard size={13} /> Assignment</button>
                  </div>
                </div>
              </div>
              <div className="lesson-viewer-panel">
                {!viewLesson
                  ? <div className="viewer-placeholder"><FiPlay size={44} color="var(--text-dim)" /><h3>Select a lesson to review</h3><p>Select a lesson on the left to review content or answer doubts.</p></div>
                  : <>
                      <div className="viewer-header"><h2 className="viewer-title">{viewLesson.title} — Review</h2></div>
                      <DoubtSection lessonId={viewLesson.id} user={user} showToast={showToast} />
                    </>
                }
              </div>
            </div>
          )}

          {tab === 'students' && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                <h2 style={{ fontSize: '1.1rem' }}>Enrolled Users</h2>
                {canAssign && <Button variant="primary" size="sm" icon={<FiUsers size={14}/>} onClick={() => setShowAssign(true)}>Assign Course</Button>}
              </div>
              {enrolledStudents.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                  <FiUsers size={32} style={{ opacity: 0.3, marginBottom: 12 }} /><p>No users enrolled yet.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: '0.85rem' }}><th style={{ padding: 12 }}>Name</th><th style={{ padding: 12 }}>Email</th><th style={{ padding: 12 }}>Progress</th><th style={{ padding: 12 }}>Enrolled</th><th style={{ padding: 12 }}>Actions</th></tr></thead>
                    <tbody>
                      {enrolledStudents.map(emp => (
                        <tr key={emp.employee_id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: 12, fontWeight: 500 }}>{emp.employee_name}</td>
                          <td style={{ padding: 12, color: 'var(--text-muted)', fontSize: '0.85rem' }}>{emp.employee_email}</td>
                          <td style={{ padding: 12 }}><Badge color={emp.completed ? 'green' : 'amber'}>{Math.round(emp.progress_pct)}%</Badge></td>
                          <td style={{ padding: 12, color: 'var(--text-muted)', fontSize: '0.85rem' }}>{new Date(emp.enrolled_at).toLocaleDateString()}</td>
                          <td style={{ padding: 12 }}><button className="icon-btn danger" onClick={() => confirmRemoveStudent(emp)}><FiTrash2 size={13} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Employee view — new image-style layout ── */}
      {!canManage && (
        !enrolled ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
            <FiLock size={44} color="var(--text-dim)" style={{ marginBottom: 16 }} />
            <h3 style={{ marginBottom: 8 }}>You are not enrolled in this course</h3>
            {enrollRequestSent ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, fontSize: '0.875rem', color: '#92400e', fontWeight: 600 }}>
                  <FiClock size={15} color="#f59e0b" /> Enrollment request sent — awaiting admin approval
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', margin: 0 }}>An admin will enroll you shortly.</p>
              </div>
            ) : (
              <>
                <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>Request enrollment to get access to all lessons and materials.</p>
                <button className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }} onClick={handleEnroll} disabled={enrolling}>
                  <FiSend size={14} /> {enrolling ? 'Sending request…' : 'Request Enrollment'}
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="cd-layout">
            {/* Left: strip + player + materials */}
            <div className="cd-main">

              {/* Lesson thumbnail strip */}
              <div>
                <div className="cd-strip-header">
                  <span className="cd-strip-title">All Lessons</span>
                </div>
                <div className="cd-strip-grid">
                  {sorted.map((lesson, idx) => {
                    const isLocked = idx > 0 && !completed[sorted[idx - 1].id];
                    const isDone = !!completed[lesson.id];
                    const isActive = viewLesson?.id === lesson.id;
                    return (
                      <div key={lesson.id} style={{ flexShrink: 0, width: 160, cursor: isLocked ? 'not-allowed' : 'pointer' }}
                        onClick={() => isLocked ? showToast('Complete previous lesson first!', 'warning') : openLesson(lesson)}
                      >
                        {/* Image area */}
                        <div style={{
                          width: 160, height: 100, borderRadius: 10,
                          background: `hsl(${(lesson.id * 67) % 360},55%,88%)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          position: 'relative', overflow: 'hidden',
                          border: isActive ? '2.5px solid var(--brand)' : '2.5px solid transparent',
                          transition: 'border-color 0.15s',
                        }}>
                          <span style={{ fontSize: '2.2rem', fontWeight: 800, color: `hsl(${(lesson.id * 67) % 360},55%,45%)`, opacity: 0.7 }}>
                            {lesson.title?.[0]?.toUpperCase()}
                          </span>
                          {/* Play / done badge top-right */}
                          <div style={{
                            position: 'absolute', top: 7, right: 7,
                            width: 22, height: 22, borderRadius: '50%',
                            background: isDone ? 'var(--green)' : 'var(--brand)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                          }}>
                            {isDone
                              ? <FiCheckCircle size={12} color="#fff" />
                              : <FiPlay size={10} color="#fff" style={{ marginLeft: 1 }} />
                            }
                          </div>
                          {isLocked && (
                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}>
                              <FiLock size={18} color="#fff" />
                            </div>
                          )}
                        </div>
                        {/* Label below */}
                        <div style={{ marginTop: 7 }}>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lesson {idx + 1}</div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: isActive ? 'var(--brand)' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 155 }}>{lesson.title}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Video player — only if loading or has video */}
              {(loadingFile || viewFile?.video_url) && viewLesson && (
                <div className="cd-player">
                  {loadingFile ? (
                    <div className="cd-player-skeleton">
                      <div className="cd-player-skeleton-shimmer" />
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
                        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div className="spinner" style={{ borderColor: 'rgba(255,255,255,0.15)', borderTopColor: 'rgba(255,255,255,0.7)', width: 28, height: 28 }} />
                        </div>
                        <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.82rem', fontWeight: 500 }}>Loading…</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="cd-player-title-overlay">
                        <h3>{viewLesson.title}</h3>
                        <p>Lesson {sorted.findIndex(l => l.id === viewLesson.id) + 1}</p>
                      </div>
                      <video
                        controls
                        src={viewFile.video_url}
                        style={{ width: '100%', minHeight: 320, display: 'block', borderRadius: 'var(--r-xl)' }}
                      />
                    </>
                  )}
                </div>
              )}

              {/* No content state — only when loaded and nothing exists */}
              {!loadingFile && viewLesson && !viewFile?.video_url && !viewFile?.pdf_url && (
                <div className="cd-player">
                  <div className="cd-player-placeholder">
                    <FiFilm size={40} />
                    <h3>{viewLesson.title}</h3>
                    <p>No content for this lesson yet</p>
                  </div>
                </div>
              )}

              {/* Mark complete / completed banner */}
              {viewLesson && !loadingFile && !quiz && !completed[viewLesson.id] && (
                <button className="btn btn-success" onClick={() => markComplete(viewLesson.id)} style={{ alignSelf: 'flex-start' }}>
                  <FiCheckCircle size={14} /> Mark Lesson Complete
                </button>
              )}
              {viewLesson && !loadingFile && completed[viewLesson.id] && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'var(--green-bg)', border: '1px solid var(--green-border)', borderRadius: 'var(--r-lg)', color: 'var(--green)', fontWeight: 600, fontSize: '0.875rem' }}>
                  <FiCheckCircle size={16} /> Lesson Completed
                </div>
              )}

              {/* Quiz */}
              {viewLesson && !loadingFile && quiz && (
                <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '16px 20px' }}>
                  <div className="viewer-quiz-label"><FiHelpCircle size={15} color="var(--brand)" /><span>Knowledge Check</span></div>
                  {!showQuiz
                    ? <button className="btn btn-secondary" onClick={() => setShowQuiz(true)}><FiHelpCircle size={14} /> Take Quiz ({quiz.questions.length} questions)</button>
                    : <QuizWidget quiz={quiz} onComplete={async r => {
                        showToast(`Quiz completed! Score: ${r.score}%`);
                        if (r.score >= (quiz.pass_score || 50)) await markComplete(viewLesson.id);
                        else showToast('Score higher to complete this lesson.', 'error');
                      }} />
                  }
                </div>
              )}

              {/* Additional materials (PDF) */}
              {viewLesson && !loadingFile && viewFile?.pdf_url && (
                <div>
                  <div className="cd-materials-header">
                    <span className="cd-materials-title">Additional Materials</span>
                  </div>
                  <a href={viewFile.pdf_url} target="_blank" rel="noreferrer" className="cd-material-card" style={{ textDecoration: 'none' }}>
                    <div className="cd-material-icon"><FiFileText size={20} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="cd-material-name">{viewLesson.title} — Reading Material</div>
                      <div className="cd-material-desc">PDF document attached to this lesson. Click to open in a new tab.</div>
                    </div>
                    <div className="cd-material-action"><FiEye size={16} /></div>
                  </a>
                </div>
              )}
            </div>

            {/* Right: progress sidebar */}
            <div className="cd-sidebar">
              <div className="cd-sidebar-header">
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>Your Progress</div>
                <div style={{ height: 3, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{ height: '100%', width: `${progPct}%`, background: 'var(--brand)', borderRadius: 3, transition: 'width 0.6s ease' }} />
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{progPct}% complete</div>
              </div>

              <div className="cd-accordion">
                {sorted.map((lesson, idx) => {
                  const isLocked = idx > 0 && !completed[sorted[idx - 1].id];
                  const isDone = !!completed[lesson.id];
                  const isActive = viewLesson?.id === lesson.id;
                  return (
                    <div key={lesson.id} className="cd-acc-item">
                      <div
                        className={`cd-acc-row ${isActive ? 'active' : ''} ${isDone ? 'done' : ''} ${isLocked ? 'locked' : ''}`}
                        onClick={() => isLocked ? showToast('Complete previous lesson first!', 'warning') : openLesson(lesson)}
                      >
                        <div className="cd-acc-num">
                          {isDone ? <FiCheckCircle size={13} color="#fff" /> : isLocked ? <FiLock size={11} /> : idx + 1}
                        </div>
                        <span className="cd-acc-label">{lesson.title}</span>
                        <span className="cd-acc-chevron">
                          {isLocked
                            ? <FiLock size={12} color="var(--text-dim)" />
                            : isActive
                              ? <span style={{ fontSize: '0.7rem', color: 'var(--brand)' }}>▲</span>
                              : <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>▷</span>
                          }
                        </span>
                      </div>
                      {/* Expanded panel for active lesson — Q&A / doubts */}
                      {isActive && (
                        <div className="cd-acc-body">
                          <DoubtSection lessonId={lesson.id} user={user} showToast={showToast} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )
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

      {showAssign && <AssignCourseModal onClose={() => setShowAssign(false)} />}
      <ConfirmModal open={!!confirmL} danger title="Delete Lesson" message={`Delete "${confirmL?.title}"?`} onConfirm={deleteLesson} onCancel={() => setConfirmL(null)} loading={deletingL} />

      {/* ─── ADD QUIZ MODAL ─────────────────────────────────────────────────── */}
      <Modal title="Add Quiz" open={showAddQuiz} onClose={() => setShowAddQuiz(false)} size="lg"
        footer={<><button className="btn btn-ghost" onClick={() => setShowAddQuiz(false)}>Cancel</button><button form="quiz-form" type="submit" className="btn btn-primary" disabled={savingQ}>{savingQ ? 'Publishing…' : 'Create Quiz'}</button></>}
      >
        <form id="quiz-form" onSubmit={saveQuiz}>
          <div className="grid-2" style={{ marginBottom: 16 }}>
            <FormField label="Attach to Lesson">
              <Select value={qForm.lesson_id} onChange={e => setQForm({...qForm, lesson_id: e.target.value})} required>
                <option value="">— Select Lesson —</option>
                {sorted.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
              </Select>
            </FormField>
            <FormField label="Passing Score (%)">
              <Input type="number" value={qForm.pass_score} onChange={e => setQForm({...qForm, pass_score: e.target.value})} required min={1} max={100} />
            </FormField>
          </div>
          <FormField label="Quiz Title">
             <Input value={qForm.title} onChange={e => setQForm({...qForm, title: e.target.value})} required placeholder="e.g. End of Module Exam" />
          </FormField>
          <hr style={{ border: 'none', borderBottom: '1px solid var(--border)', margin: '20px 0' }} />
          <h4 style={{ marginBottom: 16 }}>Questions</h4>
          {qForm.questions.map((q, qIndex) => (
             <div key={qIndex} style={{ padding: 16, background: 'var(--bg-soft)', borderRadius: 8, marginBottom: 16, border: '1px solid var(--border)' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                 <strong>Question {qIndex + 1}</strong>
                 {qForm.questions.length > 1 && <button type="button" className="icon-btn sm danger" onClick={() => setQForm(f => ({...f, questions: f.questions.filter((_, i) => i !== qIndex)}))}><FiTrash2 size={12} /></button>}
               </div>
               <FormField><Input placeholder="Question text..." value={q.text} onChange={e => { const n = [...qForm.questions]; n[qIndex].text = e.target.value; setQForm({...qForm, questions: n}); }} required /></FormField>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                 {q.options.map((opt, optIndex) => (
                    <div key={optIndex} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                       <input type="radio" name={`correct-${qIndex}`} checked={q.correct_index === optIndex} onChange={() => { const n = [...qForm.questions]; n[qIndex].correct_index = optIndex; setQForm({...qForm, questions: n}); }} />
                       <Input placeholder={`Option ${optIndex + 1}`} value={opt} onChange={e => { const n = [...qForm.questions]; n[qIndex].options[optIndex] = e.target.value; setQForm({...qForm, questions: n}); }} required />
                    </div>
                 ))}
               </div>
             </div>
          ))}
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setQForm(f => ({...f, questions: [...f.questions, { text: '', options: ['', '', '', ''], correct_index: 0 }]}))}><FiPlus size={13} /> Add Question</button>
        </form>
      </Modal>

      {/* ─── ADD ASSIGNMENT MODAL ───────────────────────────────────────────── */}
      <Modal title="Add Assignment" open={showAddAssig} onClose={() => setShowAddAssig(false)}
        footer={<><button className="btn btn-ghost" onClick={() => setShowAddAssig(false)}>Cancel</button><button form="assignment-form" type="submit" className="btn btn-primary" disabled={savingA}>{savingA ? 'Saving…' : 'Create Assignment'}</button></>}
      >
        <form id="assignment-form" onSubmit={saveAssignment}>
          <FormField label="Assignment Title"><Input value={aForm.title} onChange={e => setAForm({...aForm, title: e.target.value})} required autoFocus /></FormField>
          <FormField label="Description"><Textarea value={aForm.description} onChange={e => setAForm({...aForm, description: e.target.value})} placeholder="Describe the task..." /></FormField>
          <div className="grid-2">
            <FormField label="Points"><Input type="number" value={aForm.points} onChange={e => setAForm({...aForm, points: e.target.value})} min={1} required /></FormField>
            <FormField label="Type">
              <Select value={aForm.assignment_type} onChange={e => setAForm({...aForm, assignment_type: e.target.value})}>
                <option value="exercise">Exercise</option>
                <option value="project">Project</option>
                <option value="report">Report</option>
              </Select>
            </FormField>
          </div>
          <div className="grid-2">
            <FormField label="Due Date (optional)"><Input type="datetime-local" value={aForm.due_date} onChange={e => setAForm({...aForm, due_date: e.target.value})} /></FormField>
            <FormField label="Attach Document (PDF, ZIP, etc)">
               <input type="file" className="form-input" onChange={e => setAFile(e.target.files[0])} style={{ padding: '7px 12px' }} />
            </FormField>
          </div>
        </form>
      </Modal>

    </Layout>
  );
}
