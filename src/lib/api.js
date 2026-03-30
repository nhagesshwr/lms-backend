/**
 * LMS API layer
 * Live APIs connected to backend
 */

export const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
export const API_URL = API_BASE;
const TIMEOUT = 90_000;

// ─── Token / User helpers ─────────────────────────────────────────────────────
export const getToken    = () => typeof window !== 'undefined' ? localStorage.getItem('lms_token')  : null;
export const setToken    = (t) => localStorage.setItem('lms_token', t);
export const removeToken = () => localStorage.removeItem('lms_token');

export const getUser = () => {
  if (typeof window === 'undefined') return null;
  try { const u = localStorage.getItem('lms_user'); return u ? JSON.parse(u) : null; } catch { return null; }
};
export const setUser    = (u) => localStorage.setItem('lms_user', JSON.stringify(u));
export const removeUser = () => localStorage.removeItem('lms_user');

export const wakeUpServer = () =>
  fetch(`${API_BASE}/`, { signal: AbortSignal.timeout(35_000) }).catch(() => {});

// ─── Parse FastAPI errors robustly ───────────────────────────────────────────
function parseErrorDetail(detail) {
  if (!detail) return null;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map(e => {
      const field = e.loc ? e.loc.filter(l => l !== 'body').join('.') : '';
      return field ? `${field}: ${e.msg}` : e.msg;
    }).join('; ');
  }
  if (typeof detail === 'object') return JSON.stringify(detail);
  return String(detail);
}

// ─── Core JSON request ────────────────────────────────────────────────────────
async function request(endpoint, options = {}) {
  const token   = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      signal: AbortSignal.timeout(TIMEOUT),
    });
  } catch (err) {
    const isTimeout = err.name === 'TimeoutError' || err.name === 'AbortError';
    throw new Error(
      isTimeout
        ? 'Request timed out. The server may be waking up — please retry in a moment.'
        : 'Cannot connect. Check your internet connection and try again.'
    );
  }

  if (!res.ok) {
    let msg = `Server error (${res.status})`;
    try {
      const d = await res.json();
      msg = parseErrorDetail(d.detail) || msg;
    } catch { /* response wasn't JSON */ }
    throw new Error(msg);
  }

  const text = await res.text();
  if (!text || text.trim() === '') return null;
  try { return JSON.parse(text); }
  catch { throw new Error('Invalid response from server'); }
}

// ─── File upload (multipart) ──────────────────────────────────────────────────
async function uploadFile(lessonId, type, file) {
  const token   = getToken();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const fd = new FormData();
  fd.append('file', file);

  let res;
  try {
    let endpoint = `/lessons/${lessonId}/upload-pdf`;
    if (type === 'video') endpoint = `/lessons/${lessonId}/upload-video`;
    else if (type === 'assignment') endpoint = `/lessons/assignments/${lessonId}/document`;

    res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers,
      body: fd,
      signal: AbortSignal.timeout(120_000),
    });
  } catch (err) {
    throw new Error(`Upload failed: ${err.message}`);
  }

  if (!res.ok) {
    let msg = `Upload error (${res.status})`;
    try { const d = await res.json(); msg = parseErrorDetail(d.detail) || msg; } catch {}
    throw new Error(msg);
  }

  const text = await res.text();
  if (!text || text.trim() === '') return { success: true };
  try { return JSON.parse(text); } catch { return { success: true }; }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
async function loginRequest(data) {
  const body = JSON.stringify({
    email: data.email,
    password: data.password,
  });

  let res;
  try {
    res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      body: body,
      signal: AbortSignal.timeout(TIMEOUT),
    });
  } catch (err) {
    throw new Error('Cannot connect. Check your internet connection.');
  }

  if (!res.ok) {
    let msg = `Server error (${res.status})`;
    try { const d = await res.json(); msg = parseErrorDetail(d.detail) || msg; } catch {}
    throw new Error(msg);
  }

  const text = await res.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { throw new Error('Invalid response from server'); }
}

export const authAPI = {
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: async (data) => {
    const res = await loginRequest(data);
    if (res?.access_token) {
      setToken(res.access_token);
      setUser({ name: res.name, role: res.role, id: res.id || null });
    }
    return res;
  },
  me:     () => request('/auth/me'),
  updateProfile: (data) => request('/auth/me', { method: 'PUT', body: JSON.stringify(data) }),
  changePassword: (data) => request('/auth/change-password', { method: 'POST', body: JSON.stringify(data) }),
  forgotPassword: (data) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify(data) }),
  resetPassword: (data) => request('/auth/reset-password', { method: 'POST', body: JSON.stringify(data) }),
  assignRole: (employeeId, role, departmentId) => request(`/auth/assign-role/${employeeId}`, { method: 'PUT', body: JSON.stringify({ role, department_id: departmentId || null }) }),
  logout: () => { removeToken(); removeUser(); },
};

// ─── Employees ────────────────────────────────────────────────────────────────
export const employeesAPI = {
  create:          (data)     => request('/employees/',                 { method: 'POST',   body: JSON.stringify(data) }),
  getAll:          ()         => request('/employees/'),
  getAdmins:       ()         => request('/employees/admins'),
  getById:         (id)       => request(`/employees/${id}`),
  getByDepartment: (deptId)   => request(`/employees/department/${deptId}`),
  update:          (id, data) => request(`/employees/${id}`,            { method: 'PUT',    body: JSON.stringify(data) }),
  delete:          (id)       => request(`/employees/${id}`,            { method: 'DELETE' }),
};

// ─── Departments ──────────────────────────────────────────────────────────────
export const departmentsAPI = {
  create:  (data)     => request('/departments/',      { method: 'POST',   body: JSON.stringify(data) }),
  getAll:  ()         => request('/departments/'),
  getById: (id)       => request(`/departments/${id}`),
  update:  (id, data) => request(`/departments/${id}`, { method: 'PUT',    body: JSON.stringify(data) }),
  delete:  (id)       => request(`/departments/${id}`, { method: 'DELETE' }),
};

// ─── Courses ──────────────────────────────────────────────────────────────────
export const coursesAPI = {
  create:          (data)     => request('/courses/',                { method: 'POST',   body: JSON.stringify(data) }),
  getPublished:    ()         => request('/courses/'),
  getAll:          ()         => request('/courses/all'),
  getAllWithLessons: ()       => request('/courses/all/with_lessons'),
  getById:         (id)       => request(`/courses/${id}`),
  update:          (id, data) => request(`/courses/${id}`,           { method: 'PUT',    body: JSON.stringify(data) }),
  publish:         (id)       => request(`/courses/${id}/publish`,   { method: 'POST' }),
  unpublish:       (id)       => request(`/courses/${id}/unpublish`, { method: 'POST' }),
  delete:          (id)       => request(`/courses/${id}`,           { method: 'DELETE' }),
};

// ─── Lessons ──────────────────────────────────────────────────────────────────
export const lessonsAPI = {
  add:         (courseId, data) => request(`/courses/${courseId}/lessons`,  { method: 'POST', body: JSON.stringify(data) }),
  getByCourse: (courseId)       => request(`/courses/${courseId}/lessons`),
  update:      (lessonId, data) => request(`/courses/lessons/${lessonId}`,  { method: 'PUT',  body: JSON.stringify(data) }),
  delete:      (lessonId)       => request(`/courses/lessons/${lessonId}`,  { method: 'DELETE' }),
};

// ─── Files ────────────────────────────────────────────────────────────────────
export const filesAPI = {
  uploadVideo: (lessonId, file) => uploadFile(lessonId, 'video', file),
  uploadPDF:   (lessonId, file) => uploadFile(lessonId, 'pdf',   file),
  getVideoURL: (lessonId)       => request(`/lessons/${lessonId}/video`),
  getPDFURL:   (lessonId)       => request(`/lessons/${lessonId}/pdf`),
  getFiles:    (lessonId)       => request(`/lessons/${lessonId}/files`),
  deleteVideo: (lessonId)       => request(`/lessons/${lessonId}/video`, { method: 'DELETE' }),
  deletePDF:   (lessonId)       => request(`/lessons/${lessonId}/pdf`,   { method: 'DELETE' }),
};

// ─── Enrollments ─────────────────────────────────────────────────────────────
export const enrollmentsAPI = {
  enroll:          (courseId) => request('/enrollments/enroll', { method: 'POST', body: JSON.stringify({ course_id: courseId }) }),
  assign:          (employeeId, courseId) => request('/enrollments/assign', { method: 'POST', body: JSON.stringify({ employee_id: employeeId, course_id: courseId }) }),
  unenroll:        (courseId) => request(`/enrollments/unenroll/${courseId}`, { method: 'DELETE' }),
  adminUnenroll:   (employeeId, courseId) => request(`/enrollments/admin/unenroll/${employeeId}/${courseId}`, { method: 'DELETE' }),
  getMy:           () => request('/enrollments/my'),
  getEnrolled:     (courseId) => request(`/enrollments/course/${courseId}/employees`),
  getByEmployee:   (employeeId) => request(`/enrollments/employee/${employeeId}`),
  completeLesson:  (lessonId, courseId) => request(`/enrollments/complete-lesson?lesson_id=${lessonId}&course_id=${courseId}`, { method: 'POST' }),
  checkStatus:     (courseId) => request(`/enrollments/check/${courseId}`),
};


export const mockAssignments = [
  { id: 1, title: 'React Final Project', course: 'Advanced React Patterns', status: 'due_today', due: '2026-03-26T23:59:00Z', points: 100 },
  { id: 2, title: 'K8s Cluster Setup', course: 'Kubernetes Foundations', status: 'overdue', due: '2026-03-20T23:59:00Z', points: 50 },
  { id: 3, title: 'CSS Grid Challenge', course: 'Advanced CSS Techniques', status: 'graded', due: '2026-03-15T23:59:00Z', points: 20 }
];

export const assignmentsAPI = {
  create:      (data) => request('/assignments/', { method: 'POST', body: JSON.stringify(data) }),
  getAll:      () => request('/assignments/all'),
  getMy:       () => request('/assignments/my'),
  getByCourse: (courseId) => request(`/assignments/course/${courseId}`),
  getById:     (id) => request(`/assignments/${id}`),
  update:      (id, data) => request(`/assignments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete:      (id) => request(`/assignments/${id}`, { method: 'DELETE' }),
  submit:      (id, text) => request(`/assignments/${id}/submit`, { method: 'POST', body: JSON.stringify({ submission_text: text }) }),
  getSubmissions: (id) => request(`/assignments/${id}/submissions`),
  grade:       (id, employeeId, grade, feedback) => request(`/assignments/${id}/grade/${employeeId}`, { method: 'POST', body: JSON.stringify({ grade, feedback }) }),
  uploadDocument: (id, file) => uploadFile(id, 'assignment', file)
};

// ─── Certificates ─────────────────────────────────────────────────────────────
export const mockCertificates = [
  { id: 1, title: 'React Professional Cert', course: 'Advanced React Patterns', status: 'issued', issuedAt: '2026-02-15T00:00:00Z', credentialId: 'CERT-REACT-9921', progress: 100 },
  { id: 2, title: 'K8s Base Cert', course: 'Kubernetes Foundations', status: 'in_progress', progress: 85 }
];

export const certificatesAPI = {
  getMy:    () => request('/certificates/my'),
  getAll:   () => request('/certificates/all'),
  issue:    (employeeId, courseId) => request(`/certificates/issue/${employeeId}/${courseId}`, { method: 'POST' }),
  generate: (courseId) => request(`/certificates/generate/${courseId}`, { method: 'POST' }),
  get:      (id) => request(`/certificates/${id}`),
  revoke:   (id) => request(`/certificates/${id}`, { method: 'DELETE' }),
  download: (id) => Promise.resolve({ url: `/api/certificates/download/${id}` }) // Usually handled via stream or special route
};

export const mockMessages = [
  { id: 1, from: 'Alice Admin', role: 'HR Manager', message: 'Hello! Please complete your onboarding course.', time: '10:00 AM', avatar: 'AA', unread: true },
  { id: 2, from: 'Bob Manager', role: 'Engineering Lead', message: 'Great job on finishing the React deep dive!', time: 'Yesterday', avatar: 'BM', unread: false }
];

export const messagesAPI = {
  getAll:    () => request('/messages/'),
  send:     (receiverId, content) => request('/messages/', { method: 'POST', body: JSON.stringify({ receiver_id: receiverId, content }) }),
  markRead: (id) => request(`/messages/${id}/read`, { method: 'PUT' }),
  markThreadRead: (senderId) => request(`/messages/read-thread/${senderId}`, { method: 'PUT' }),
};

// ─── Doubts ───────────────────────────────────────────────────────────────────
export const doubtsAPI = {
  getByLesson: (lessonId) => request(`/doubts/lesson/${lessonId}`),
  ask:         (lessonId, question) => request(`/doubts/lesson/${lessonId}`, { method: 'POST', body: JSON.stringify({ question }) }),
  answer:      (doubtId, answer) => request(`/doubts/${doubtId}/answer`, { method: 'POST', body: JSON.stringify({ answer }) }),
};

// ─── Quizzes ──────────────────────────────────────────────────────────────────
export const quizzesAPI = {
  create:      (lessonId, data) => request(`/quizzes/lesson/${lessonId}`, { method: 'POST', body: JSON.stringify(data) }),
  getByLesson: (lessonId) => request(`/quizzes/lesson/${lessonId}`),
  delete:      (lessonId) => request(`/quizzes/lesson/${lessonId}`, { method: 'DELETE' }),
  submit:      (quizId, answers) => request(`/quizzes/${quizId}/submit`, { method: 'POST', body: JSON.stringify({ answers }) }),
  getAttempts: (quizId) => request(`/quizzes/${quizId}/attempts`),
};

// ─── Mock Data for features not in backend yet (Live Classes, Leaderboard, Study Groups)
export const mockLiveClasses = [];
export const liveClassesAPI = {
  getAll:      ()         => request('/live-classes/'),
  getMy:       ()         => request('/live-classes/my'),
  getById:     (id)       => request(`/live-classes/${id}`),
  create:      (data)     => request('/live-classes/', { method: 'POST', body: JSON.stringify(data) }),
  update:      (id, data) => request(`/live-classes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete:      (id)       => request(`/live-classes/${id}`, { method: 'DELETE' }),
  getAudience: (id)       => request(`/live-classes/${id}/audience`),
};

export const leaderboardAPI = {
  getAll: () => request('/leaderboard/'),
  getMyRank: () => request('/leaderboard/me'),
};

export const mockStudyGroups = [
  { id: 1, name: 'Frontend Dev Squad', course: 'React Advanced', members: 8, maxMembers: 10, nextSession: '2026-03-22', avatar: 'FD', joined: true }
];
export const studyGroupsAPI = {
  getAll: () => Promise.resolve(mockStudyGroups),
  join: () => Promise.resolve({ success: true })
};

export const mockProgress = [
  { courseId: 'c1', title: 'Kubernetes Foundations', progress: 85, lessons: 12, completed: 10, watchedMinutes: 320, totalMinutes: 400, lastAccessed: '2026-03-22T10:00:00Z', thumbnail: 'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=600&q=80' },
  { courseId: 'c2', title: 'Advanced React Patterns', progress: 40, lessons: 8, completed: 3, watchedMinutes: 120, totalMinutes: 300, lastAccessed: '2026-03-21T15:30:00Z', thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600&q=80' },
  { courseId: 'c3', title: 'System Design Interview', progress: 10, lessons: 20, completed: 2, watchedMinutes: 45, totalMinutes: 450, lastAccessed: '2026-03-20T09:15:00Z', thumbnail: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&q=80' }
];

export const progressAPI = {
  getMy: async () => {
    // Adapter mapping our enrollment backend to old frontend progress mock structure
    const data = await enrollmentsAPI.getMy();
    return data.map(e => ({
      courseId: e.course_id,
      title: e.course?.title || '',
      progress: e.progress_pct,
      lessons: e.course?.lessons?.length || 0,
      completed: Math.round((e.progress_pct / 100) * (e.course?.lessons?.length || 0)),
      watchedMinutes: e.lesson_progress?.reduce((s, lp) => s + (lp.watched_seconds / 60), 0) || 0,
      totalMinutes: e.course?.lessons?.reduce((s, l) => s + (l.duration_minutes || 0), 0) || 0,
      lastAccessed: e.completed_at || e.enrolled_at || new Date().toISOString()
    }));
  }
};

export const notificationsAPI = {
  getAll: () => request('/notifications/'),
  markRead: (id) => Promise.resolve(), // extend later
};

// ─── Activity ─────────────────────────────────────────────────────────────────
export const activityAPI = {
  getRecent: (limit = 20, type = null) => {
    const params = new URLSearchParams({ limit });
    if (type) params.append('type', type);
    return request(`/activity/recent?${params.toString()}`);
  },
};

// ─── Role helpers ─────────────────────────────────────────────────────────────
export const ROLES = { SUPER_ADMIN: 'super_admin', HR_ADMIN: 'hr_admin', MANAGER: 'manager', EMPLOYEE: 'employee' };
export const isSuperAdmin         = (role) => role === 'super_admin';
export const isHROrAbove          = (role) => ['super_admin', 'hr_admin'].includes(role);
export const isManager            = (role) => role === 'manager';
export const isManagerOrAbove     = (role) => ['super_admin', 'hr_admin', 'manager'].includes(role);

// Courses: super_admin & hr_admin can create/edit/delete; manager can view & assign only
export const canManageCourses     = (role) => ['super_admin', 'hr_admin'].includes(role);
export const canAssignCourses     = (role) => ['super_admin', 'hr_admin', 'manager'].includes(role);

// Employees: super_admin & hr_admin can create/edit/delete; manager can view their team only
export const canManageEmployees   = (role) => ['super_admin', 'hr_admin'].includes(role);
export const canViewEmployees     = (role) => ['super_admin', 'hr_admin', 'manager'].includes(role);

// Departments: super_admin & hr_admin can create/edit/delete; manager can view only
export const canManageDepartments = (role) => ['super_admin', 'hr_admin'].includes(role);
export const canViewDepartments   = (role) => ['super_admin', 'hr_admin', 'manager'].includes(role);

// Enrollments: super_admin = all, hr_admin = assign, manager = assign team, employee = self
export const canAssignEnrollments = (role) => ['super_admin', 'hr_admin', 'manager'].includes(role);

// Quizzes & Assignments: super_admin & hr_admin can create; employee can attempt/submit
export const canManageQuizzes     = (role) => ['super_admin', 'hr_admin'].includes(role);
export const canManageAssignments = (role) => ['super_admin', 'hr_admin'].includes(role);

// Certificates: super_admin & hr_admin can issue/revoke
export const canManageCertificates = (role) => ['super_admin', 'hr_admin'].includes(role);

export const getRoleLabel         = (role) => ({ super_admin: 'Super Admin', hr_admin: 'HR Admin', manager: 'Manager', employee: 'Employee' }[role] || role);
