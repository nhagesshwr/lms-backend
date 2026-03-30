import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { FiUploadCloud, FiVideo, FiFileText, FiTrash2, FiEye, FiCheck } from 'react-icons/fi';
import {
  getToken, getUser, isSuperAdmin,
  coursesAPI, filesAPI,
} from '../../lib/api';
import { Layout, Loading, Modal, useToast, Badge, SearchBar, EmptyState, Select } from '../../components/components';

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
  const [loading, setLoading] = useState(true);
  const [allLessons, setAllLessons] = useState([]);
  const [search, setSearch] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  
  // Manage Content Modal
  const [manageModal, setManageModal] = useState(false);
  const [curLesson, setCurLesson] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [uploadingV, setUploadingV] = useState(false);
  const [uploadingP, setUploadingP] = useState(false);
  const [videoUploaded, setVideoUploaded] = useState(false);
  const [pdfUploaded, setPdfUploaded] = useState(false);
  
  const { showToast, ToastComponent } = useToast();

  const loadData = async () => {
    try {
      const courses = await coursesAPI.getAllWithLessons();
      const rows = [];
      courses.forEach(c => {
        (c.lessons || []).forEach(l => {
          rows.push({
            ...l,
            courseTitle: c.title,
            courseIsPublished: c.is_published,
          });
        });
      });
      setAllLessons(rows);
    } catch (err) {
      // ignore empty
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return; }
    const u = getUser();
    if (!isSuperAdmin(u?.role)) { router.push('/dashboard'); return; }
    loadData();
  }, []);

  const openManageModal = async (lesson) => {
    setCurLesson(lesson);
    setFileInfo(null);
    setVideoUploaded(false);
    setPdfUploaded(false);
    setManageModal(true);
    
    // Fetch live signed URLs for previewing if they exist
    filesAPI.getFiles(lesson.id).then(setFileInfo).catch(() => setFileInfo({}));
  };

  const closeManageModal = () => {
    setManageModal(false);
    setCurLesson(null);
    loadData(); // refresh table statuses
  };

  const handleVideoUpload = async (file) => {
    setUploadingV(true);
    try {
      await filesAPI.uploadVideo(curLesson.id, file);
      showToast('Video uploaded successfully!');
      setVideoUploaded(true);
      const info = await filesAPI.getFiles(curLesson.id).catch(() => ({}));
      setFileInfo(info);
    } catch (err) { showToast(err.message, 'error'); }
    finally { setUploadingV(false); }
  };

  const handlePDFUpload = async (file) => {
    setUploadingP(true);
    try {
      await filesAPI.uploadPDF(curLesson.id, file);
      showToast('PDF uploaded successfully!');
      setPdfUploaded(true);
      const info = await filesAPI.getFiles(curLesson.id).catch(() => ({}));
      setFileInfo(info);
    } catch (err) { showToast(err.message, 'error'); }
    finally { setUploadingP(false); }
  };

  const handleDeleteVideo = async () => {
    try { await filesAPI.deleteVideo(curLesson.id); showToast('Video removed.'); setVideoUploaded(false); setFileInfo(f => ({ ...f, video_url: null })); }
    catch (err) { showToast(err.message, 'error'); }
  };

  const handleDeletePDF = async () => {
    try { await filesAPI.deletePDF(curLesson.id); showToast('PDF removed.'); setPdfUploaded(false); setFileInfo(f => ({ ...f, pdf_url: null })); }
    catch (err) { showToast(err.message, 'error'); }
  };

  const uniqueCourses = Array.from(new Set(allLessons.map(l => l.courseTitle))).sort();

  const filtered = allLessons.filter(l => {
    const matchSearch = l.title.toLowerCase().includes(search.toLowerCase()) || 
                        l.courseTitle.toLowerCase().includes(search.toLowerCase());
    const matchCourse = filterCourse ? l.courseTitle === filterCourse : true;
    return matchSearch && matchCourse;
  });

  return (
    <Layout>
      {ToastComponent}
      <div className="page-header-block">
        <div className="page-header-left">
          <h1 className="page-header-title">Content Manager</h1>
          <p className="page-header-desc">Manage files and instructional materials across all lessons.</p>
        </div>
        <div className="page-header-right" style={{ gap: 12 }}>
          <Select value={filterCourse} onChange={e => setFilterCourse(e.target.value)} style={{ width: 220 }}>
            <option value="">All Courses</option>
            {uniqueCourses.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
          <SearchBar value={search} onChange={e => setSearch(e.target.value)} placeholder="Search lessons..." />
        </div>
      </div>

      {loading ? <Loading /> : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Lesson</th>
                <th>Course</th>
                <th>Video Status</th>
                <th>PDF Status</th>
                <th style={{ width: 120, textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '60px 0' }}>
                    <EmptyState title="No content found" subtitle="Upload videos or PDFs to your created course lessons." icon={<FiUploadCloud />} />
                  </td>
                </tr>
              ) : (
                filtered.map(lesson => (
                  <tr key={lesson.id}>
                    <td className="td-bold">{lesson.order}. {lesson.title}</td>
                    <td className="td-muted">{lesson.courseTitle}</td>
                    <td>
                      {(lesson.video_url || (videoUploaded && curLesson?.id === lesson.id)) ? 
                        <Badge color="green">Ready</Badge> : 
                        <Badge color="gray">Missing</Badge>
                      }
                    </td>
                    <td>
                      {(lesson.pdf_url || (pdfUploaded && curLesson?.id === lesson.id)) ? 
                        <Badge color="green">Ready</Badge> : 
                        <Badge color="gray">Missing</Badge>
                      }
                    </td>
                    <td onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openManageModal(lesson)}>
                        <FiUploadCloud size={14} /> Upload
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal title={curLesson ? `Manage Content - ${curLesson.title}` : 'Manage Content'} open={manageModal} onClose={closeManageModal}
        footer={<button className="btn btn-primary" onClick={closeManageModal} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>Done</button>}
      >
        {curLesson && (
          <>
            <div className="grid-2" style={{ marginBottom: 24, gap: 24 }}>
              <div className="upload-section">
                <div className="upload-section-header">
                  <FiVideo size={16} color="var(--brand)" />
                  <span>Video (.mp4 · max 50MB)</span>
                  {fileInfo?.video_url && <button className="icon-btn danger sm" onClick={handleDeleteVideo} style={{ marginLeft: 'auto' }}><FiTrash2 size={12} /></button>}
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
                  <video controls src={fileInfo.video_url} className="video-preview" style={{ marginTop: 12, width: '100%', borderRadius: 8 }} />
                )}
              </div>

              <div className="upload-section">
                <div className="upload-section-header">
                  <FiFileText size={16} color="var(--teal)" />
                  <span>PDF Document (max 10MB)</span>
                  {fileInfo?.pdf_url && <button className="icon-btn danger sm" onClick={handleDeletePDF} style={{ marginLeft: 'auto' }}><FiTrash2 size={12} /></button>}
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
                  <a href={fileInfo.pdf_url} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ marginTop: 12, width: '100%', justifyContent: 'center' }}>
                    <FiEye size={13} /> Preview PDF
                  </a>
                )}
              </div>
            </div>
            <div className="content-tip" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: 'var(--text-muted)', background: 'var(--green-bg)', border: '1px solid var(--green-border)', borderRadius: 'var(--r)', padding: '10px 14px' }}>
              <FiCheck size={14} color="var(--green)" />
              Signed URLs expire in 1 hour. Auto-fetches dynamically.
            </div>
          </>
        )}
      </Modal>
    </Layout>
  );
}
