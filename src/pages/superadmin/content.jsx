import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { FiUploadCloud, FiVideo, FiFileText, FiTrash2, FiEye, FiPlus, FiCheck } from 'react-icons/fi';
import {
  getToken, getUser, isSuperAdmin,
  coursesAPI, lessonsAPI, filesAPI,
} from '../../lib/api';
import { Layout, Loading, Modal, FormField, Input, Textarea, Select, Button, useToast, Badge } from '../../components/components';

function UploadZone({ label, accept, icon: Icon, onFile, uploading, done }) {
  const [drag, setDrag] = useState(false);
  const handleDrop = (e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); };
  return (
    <div
      className={`upload-zone ${drag ? 'dragging' : ''} ${done ? 'done' : ''}`}
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
    >
      {done ? <FiCheck size={28} color="var(--green)" /> : <Icon size={28} color={drag ? 'var(--brand)' : 'var(--text-dim)'} />}
      <div className="upload-zone-label">{done ? 'Uploaded!' : uploading ? 'Uploading…' : label}</div>
      {!done && !uploading && (
        <>
          <div className="upload-zone-sub">Drag & drop or click to browse</div>
          <label className="btn btn-secondary btn-sm">
            Browse
            <input type="file" accept={accept} style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; if (f) onFile(f); }} />
          </label>
        </>
      )}
      {uploading && <div className="spinner" style={{ marginTop: 8 }} />}
    </div>
  );
}

export default function SuperAdminContent() {
  const router = useRouter();
  const [courses, setCourses]   = useState([]);
  const [lessons, setLessons]   = useState([]);
  const [selCourse, setSelCourse] = useState('');
  const [selLesson, setSelLesson] = useState('');
  const [fileInfo, setFileInfo] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [uploadingV, setUploadingV] = useState(false);
  const [uploadingP, setUploadingP] = useState(false);
  const [videoUploaded, setVideoUploaded] = useState(false);
  const [pdfUploaded, setPdfUploaded]     = useState(false);
  const [showAddLesson, setShowAddLesson] = useState(false);
  const [lForm, setLForm]       = useState({ title: '', description: '', order: 1, duration_minutes: '' });
  const [savingL, setSavingL]   = useState(false);
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return; }
    const u = getUser();
    if (!isSuperAdmin(u?.role)) { router.push('/dashboard'); return; }
    coursesAPI.getAll().then(setCourses).catch(() => setCourses([])).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selCourse) { setLessons([]); setSelLesson(''); return; }
    lessonsAPI.getByCourse(selCourse).then(ls => {
      const sorted = [...ls].sort((a, b) => (a.order || 0) - (b.order || 0));
      setLessons(sorted);
    }).catch(() => setLessons([]));
  }, [selCourse]);

  useEffect(() => {
    if (!selLesson) { setFileInfo(null); setVideoUploaded(false); setPdfUploaded(false); return; }
    filesAPI.getFiles(selLesson).then(setFileInfo).catch(() => setFileInfo({}));
  }, [selLesson]);

  const handleVideoUpload = async (file) => {
    setUploadingV(true);
    try {
      await filesAPI.uploadVideo(selLesson, file);
      showToast('Video uploaded successfully!');
      setVideoUploaded(true);
      const info = await filesAPI.getFiles(selLesson).catch(() => ({}));
      setFileInfo(info);
    } catch (err) { showToast(err.message, 'error'); }
    finally { setUploadingV(false); }
  };

  const handlePDFUpload = async (file) => {
    setUploadingP(true);
    try {
      await filesAPI.uploadPDF(selLesson, file);
      showToast('PDF uploaded successfully!');
      setPdfUploaded(true);
      const info = await filesAPI.getFiles(selLesson).catch(() => ({}));
      setFileInfo(info);
    } catch (err) { showToast(err.message, 'error'); }
    finally { setUploadingP(false); }
  };

  const handleDeleteVideo = async () => {
    try { await filesAPI.deleteVideo(selLesson); showToast('Video removed.'); setVideoUploaded(false); setFileInfo(f => ({ ...f, video_url: null })); }
    catch (err) { showToast(err.message, 'error'); }
  };

  const handleDeletePDF = async () => {
    try { await filesAPI.deletePDF(selLesson); showToast('PDF removed.'); setPdfUploaded(false); setFileInfo(f => ({ ...f, pdf_url: null })); }
    catch (err) { showToast(err.message, 'error'); }
  };

  const handleAddLesson = async (e) => {
    e.preventDefault(); setSavingL(true);
    try {
      const lPayload = { title: lForm.title, order: parseInt(lForm.order) || lessons.length + 1 };
      if (lForm.description) lPayload.description = lForm.description;
      if (lForm.duration_minutes) lPayload.duration_minutes = parseInt(lForm.duration_minutes);
      await lessonsAPI.add(selCourse, lPayload);
      showToast('Lesson added!'); setShowAddLesson(false); setLForm({ title: '', description: '', order: 1, duration_minutes: '' });
      const ls = await lessonsAPI.getByCourse(selCourse);
      setLessons([...ls].sort((a, b) => (a.order || 0) - (b.order || 0)));
    } catch (err) { showToast(err.message, 'error'); }
    finally { setSavingL(false); }
  };

  return (
    <Layout title="Content Manager" subtitle="Upload videos, PDFs, and manage course content">
      {ToastComponent}
      {loading ? <Loading /> : (
        <div className="content-manager">
          <div className="content-sidebar">
            <div className="content-step">
              <div className="step-num">1</div>
              <div className="step-body">
                <div className="step-label">Select Course</div>
                <Select value={selCourse} onChange={e => { setSelCourse(e.target.value); setSelLesson(''); }}>
                  <option value="">— Choose a course —</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </Select>
              </div>
            </div>

            {selCourse && (
              <div className="content-step">
                <div className="step-num">2</div>
                <div className="step-body">
                  <div className="step-label-row">
                    <div className="step-label">Select Lesson</div>
                    <button className="btn btn-ghost btn-sm" onClick={() => setShowAddLesson(true)}><FiPlus size={13} /> Add</button>
                  </div>
                  {lessons.length === 0
                    ? <div className="step-empty">No lessons yet — add one above</div>
                    : lessons.map(l => (
                      <div key={l.id} className={`lesson-select-item ${selLesson === String(l.id) ? 'active' : ''}`} onClick={() => setSelLesson(String(l.id))}>
                        <span className="lesson-order">{l.order}</span>
                        <span className="lesson-title-sm">{l.title}</span>
                        {l.duration_minutes && <span className="lesson-dur">{l.duration_minutes}m</span>}
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
          </div>

          <div className="content-main">
            {!selLesson ? (
              <div className="content-empty-state">
                <FiUploadCloud size={48} color="var(--text-dim)" />
                <h3>Select a lesson to manage content</h3>
                <p>Choose a course and lesson from the panel on the left</p>
              </div>
            ) : (
              <>
                <div className="content-lesson-header">
                  <h2>Lesson Content</h2>
                  <div className="content-file-status">
                    {fileInfo?.video_url ? <Badge color="green">Video Ready</Badge> : <Badge color="gray">No Video</Badge>}
                    {fileInfo?.pdf_url ? <Badge color="green">PDF Ready</Badge> : <Badge color="gray">No PDF</Badge>}
                  </div>
                </div>

                <div className="grid-2" style={{ marginBottom: 24 }}>
                  <div className="upload-section">
                    <div className="upload-section-header">
                      <FiVideo size={16} color="var(--brand)" />
                      <span>Video (.mp4 · max 50MB)</span>
                      {fileInfo?.video_url && <button className="icon-btn danger sm" onClick={handleDeleteVideo}><FiTrash2 size={12} /></button>}
                    </div>
                    <UploadZone
                      label="Upload Video"
                      accept="video/*"
                      icon={FiVideo}
                      onFile={handleVideoUpload}
                      uploading={uploadingV}
                      done={videoUploaded || !!fileInfo?.video_url}
                    />
                    {fileInfo?.video_url && (
                      <video controls src={fileInfo.video_url} className="video-preview" />
                    )}
                  </div>

                  <div className="upload-section">
                    <div className="upload-section-header">
                      <FiFileText size={16} color="var(--teal)" />
                      <span>PDF Document (max 10MB)</span>
                      {fileInfo?.pdf_url && <button className="icon-btn danger sm" onClick={handleDeletePDF}><FiTrash2 size={12} /></button>}
                    </div>
                    <UploadZone
                      label="Upload PDF"
                      accept=".pdf"
                      icon={FiFileText}
                      onFile={handlePDFUpload}
                      uploading={uploadingP}
                      done={pdfUploaded || !!fileInfo?.pdf_url}
                    />
                    {fileInfo?.pdf_url && (
                      <a href={fileInfo.pdf_url} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ marginTop: 8 }}>
                        <FiEye size={13} /> Preview PDF
                      </a>
                    )}
                  </div>
                </div>

                <div className="content-tip">
                  <FiCheck size={14} color="var(--green)" />
                  Signed URLs expire in 1 hour. The system auto-fetches fresh URLs when learners access content.
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <Modal title="Add Lesson" open={showAddLesson} onClose={() => setShowAddLesson(false)}
        footer={<><button className="btn btn-ghost" onClick={() => setShowAddLesson(false)}>Cancel</button><button form="add-lesson" type="submit" className="btn btn-primary" disabled={savingL}>{savingL ? 'Adding…' : 'Add Lesson'}</button></>}
      >
        <form id="add-lesson" onSubmit={handleAddLesson}>
          <FormField label="Lesson Title"><Input value={lForm.title} onChange={e => setLForm(f => ({...f, title: e.target.value}))} required placeholder="e.g. Introduction to Hooks" /></FormField>
          <FormField label="Description"><Textarea value={lForm.description} onChange={e => setLForm(f => ({...f, description: e.target.value}))} /></FormField>
          <div className="grid-2">
            <FormField label="Order"><Input type="number" value={lForm.order} onChange={e => setLForm(f => ({...f, order: e.target.value}))} min={1} /></FormField>
            <FormField label="Duration (minutes)"><Input type="number" value={lForm.duration_minutes} onChange={e => setLForm(f => ({...f, duration_minutes: e.target.value}))} placeholder="30" /></FormField>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
