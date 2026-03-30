import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import {
  FiBookOpen, FiCheckCircle, FiClock,
  FiMail, FiBriefcase, FiUser, FiPlus, FiX,
} from 'react-icons/fi';
import {
  getToken, getUser, isManagerOrAbove,
  employeesAPI, departmentsAPI, coursesAPI,
  enrollmentsAPI,
} from '../../lib/api';
import {
  Layout, Loading, Badge, RoleChip, Modal, FormField,
  Select, useToast,
} from '../../components/components';

// ─── Tiny SVG pie/donut chart (no lib needed) ─────────────────────────────────
function DonutChart({ pct = 0, size = 110, stroke = 14, color = '#6366f1', label, sub }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="var(--border)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease' }} />
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
          style={{ transform: 'rotate(90deg)', transformOrigin: 'center', fill: 'var(--text)', fontWeight: 700, fontSize: size * 0.2 }}>
          {pct}%
        </text>
      </svg>
      {label && <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{label}</div>}
      {sub   && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
  );
}

// ─── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ pct, color = 'var(--brand)' }) {
  return (
    <div style={{ height: 6, background: 'var(--border)', borderRadius: 99, overflow: 'hidden', minWidth: 120 }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99,
        transition: 'width 0.5s ease' }} />
    </div>
  );
}

function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function UserDetail() {
  const router = useRouter();
  const { id }  = router.query;

  const [emp,         setEmp]         = useState(null);
  const [deptName,    setDeptName]    = useState('—');
  const [enrollments, setEnrollments] = useState([]);
  const [allCourses,  setAllCourses]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showAssign,  setShowAssign]  = useState(false);
  const [assignCourseId, setAssignCourseId] = useState('');
  const [assigning,   setAssigning]   = useState(false);
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return; }
    const u = getUser();
    if (!isManagerOrAbove(u?.role)) { router.push('/dashboard'); return; }
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      employeesAPI.getById(id),
      enrollmentsAPI.getByEmployee(id).catch(() => []),
      coursesAPI.getAll().catch(() => []),
      departmentsAPI.getAll().catch(() => []),
    ]).then(([employee, enrs, courses, depts]) => {
      setEmp(employee);
      setEnrollments(enrs || []);
      setAllCourses(courses || []);
      const dept = depts.find(d => d.id === employee?.department_id);
      setDeptName(dept?.name || '—');
    }).catch(() => showToast('Failed to load user data', 'error'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAssign = async () => {
    if (!assignCourseId) { showToast('Select a course first', 'error'); return; }
    setAssigning(true);
    try {
      await enrollmentsAPI.assign(Number(id), Number(assignCourseId));
      showToast('Course assigned!', 'success');
      setShowAssign(false);
      setAssignCourseId('');
      // Reload enrollments
      const enrs = await enrollmentsAPI.getByEmployee(id).catch(() => []);
      setEnrollments(enrs || []);
    } catch (e) {
      showToast(e.message || 'Assignment failed', 'error');
    } finally {
      setAssigning(false);
    }
  };

  // Derived stats
  const total     = enrollments.length;
  const completed = enrollments.filter(e => e.completed).length;
  const inProgress = enrollments.filter(e => !e.completed && e.progress_pct > 0).length;
  const notStarted = enrollments.filter(e => !e.completed && e.progress_pct === 0).length;
  const avgProgress = total > 0
    ? Math.round(enrollments.reduce((sum, e) => sum + (e.progress_pct || 0), 0) / total)
    : 0;
  const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Courses not yet assigned
  const assignedIds = new Set(enrollments.map(e => e.course_id));
  const unassigned  = allCourses.filter(c => !assignedIds.has(c.id));

  if (loading) return (
    <Layout>
      <Loading />
    </Layout>
  );

  if (!emp) return (
    <Layout>
      <p style={{ color: 'var(--text-muted)' }}>User not found.</p>
    </Layout>
  );

  return (
    <Layout>
      {ToastComponent}

      {/* Breadcrumb */}
      <nav className="breadcrumb">
        <button className="breadcrumb-link" onClick={() => router.push('/superadmin/users')}>Users</button>
        <span className="breadcrumb-sep">›</span>
        <span className="breadcrumb-current">{emp.name}</span>
      </nav>

      <div className="page-header-block">
        <h1 className="page-header-title">{emp.name}</h1>
        <p className="page-header-desc">Employee profile &amp; learning progress.</p>
      </div>

      {/* ── Profile header ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--brand), #818cf8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 800, color: '#fff', flexShrink: 0,
          }}>
            {initials(emp.name)}
          </div>

          {/* Info */}
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{emp.name}</h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
              <RoleChip role={emp.role} />
              {emp.is_active
                ? <Badge color="green">Active</Badge>
                : <Badge color="red">Inactive</Badge>}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, marginTop: 10, color: 'var(--text-muted)', fontSize: 13 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <FiMail size={13} /> {emp.email}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <FiBriefcase size={13} /> {deptName}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <FiUser size={13} /> ID: #{emp.id}
              </span>
            </div>
          </div>

          {/* Assign button */}
          <button className="btn btn-primary" onClick={() => setShowAssign(true)}
            style={{ flexShrink: 0 }}>
            <FiPlus size={14} /> Assign Course
          </button>
        </div>
      </div>

      {/* ── Pie charts row ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 700 }}>Learning Overview</h3>
        {total === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            No courses assigned yet. Use "Assign Course" above to get started.
          </p>
        ) : (
          <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap', justifyContent: 'center' }}>
            <DonutChart pct={completionPct} color="#22c55e"
              label="Completion Rate" sub={`${completed} of ${total} courses`} />
            <DonutChart pct={avgProgress} color="#6366f1"
              label="Avg. Progress" sub="across all courses" />
            <DonutChart pct={total > 0 ? Math.round((inProgress / total) * 100) : 0}
              color="#f59e0b" label="In Progress" sub={`${inProgress} active`} />
            <DonutChart pct={total > 0 ? Math.round((notStarted / total) * 100) : 0}
              color="#94a3b8" label="Not Started" sub={`${notStarted} courses`} />
          </div>
        )}
      </div>

      {/* ── Quick stats row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Assigned', value: total, icon: <FiBookOpen size={16} />, color: '#6366f1' },
          { label: 'Completed',      value: completed,  icon: <FiCheckCircle size={16} />, color: '#22c55e' },
          { label: 'In Progress',    value: inProgress, icon: <FiClock size={16} />, color: '#f59e0b' },
          { label: 'Not Started',    value: notStarted, icon: <FiBookOpen size={16} />, color: '#94a3b8' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${s.color}22`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, flexShrink: 0 }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Course table ── */}
      <div className="card">
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>
          Assigned Courses ({total})
        </h3>
        {total === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13, padding: '12px 0' }}>
            No courses assigned yet.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Category</th>
                  <th style={{ minWidth: 160 }}>Progress</th>
                  <th>Enrolled</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map(enr => {
                  const pct   = enr.progress_pct || 0;
                  const color = enr.completed ? '#22c55e' : pct > 0 ? '#6366f1' : '#94a3b8';
                  const status = enr.completed ? 'Completed' : pct > 0 ? 'In Progress' : 'Not Started';
                  const badgeColor = enr.completed ? 'green' : pct > 0 ? 'blue' : 'gray';

                  return (
                    <tr key={enr.enrollment_id}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{enr.course_title}</div>
                        {enr.completed_at && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                            Completed {formatDate(enr.completed_at)}
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {enr.course_category || '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <ProgressBar pct={pct} color={color} />
                          <span style={{ fontSize: 12, fontWeight: 600, color, minWidth: 32 }}>{pct}%</span>
                        </div>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {formatDate(enr.enrolled_at)}
                      </td>
                      <td>
                        <Badge color={badgeColor}>{status}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Assign Course Modal ── */}
      <Modal
        title={`Assign Course to ${emp.name}`}
        open={showAssign}
        onClose={() => setShowAssign(false)}
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={() => setShowAssign(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAssign} disabled={assigning}>
              {assigning ? 'Assigning…' : 'Assign'}
            </button>
          </div>
        }
      >
        {unassigned.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', padding: '8px 0' }}>
            ✅ All available courses are already assigned to this user.
          </p>
        ) : (
          <FormField label="Select Course" hint="Only shows courses not yet assigned">
            <Select value={assignCourseId} onChange={e => setAssignCourseId(e.target.value)}>
              <option value="">— choose a course —</option>
              {unassigned.map(c => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </Select>
          </FormField>
        )}
      </Modal>
    </Layout>
  );
}
