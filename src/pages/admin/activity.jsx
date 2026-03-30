import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { FiActivity, FiUser, FiBookOpen, FiClock, FiRefreshCw, FiCheckCircle } from 'react-icons/fi';
import { getToken, getUser, isHROrAbove, employeesAPI, coursesAPI, activityAPI } from '../../lib/api';
import { Layout, Loading, StatCard, Badge, SearchBar, useToast } from '../../components/components';

const TYPE_COLOR = { complete: 'green', submit: 'brand', start: 'blue', cert: 'orange', admin: 'amber', quiz: 'teal' };

export default function Activity() {
  const router = useRouter();
  const [activity, setActivity]   = useState([]);
  const [employees, setEmployees] = useState([]);
  const [courses, setCourses]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const { showToast, ToastComponent } = useToast();

  const loadActivity = useCallback(() => {
    setLoading(true);
    Promise.all([
      employeesAPI.getAll().catch(() => []),
      coursesAPI.getAll().catch(() => []),
      activityAPI.getRecent(50, typeFilter || null).catch(() => []),
    ]).then(([e, c, acts]) => {
      setEmployees(e);
      setCourses(c);
      setActivity(acts || []);
    }).finally(() => setLoading(false));
  }, [typeFilter]);

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return; }
    const u = getUser();
    if (!isHROrAbove(u?.role)) { router.push('/dashboard'); return; }
    loadActivity();
  }, [loadActivity]);

  const filtered = activity.filter(a => {
    const q = search.toLowerCase();
    return !search || a.user.toLowerCase().includes(q) || a.action.toLowerCase().includes(q) || (a.detail || '').toLowerCase().includes(q);
  });

  const activeToday = activity.filter(a => a.time.includes('min') || a.time.includes('hour')).length;
  const completions = activity.filter(a => a.type === 'complete').length;

  return (
    <Layout>
      {ToastComponent}
      {loading ? <Loading /> : (
        <>
          <div className="page-header-block">
            <div className="page-header-left">
              <h1 className="page-header-title">Activity</h1>
              <p className="page-header-desc">Live feed of learner activity across the platform.</p>
            </div>
            <div className="page-header-right">
              <SearchBar value={search} onChange={setSearch} placeholder="Search activity…" />
              <select className="form-select" style={{ width: 'auto' }} value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}>
                <option value="">All Types</option>
                <option value="complete">Completions</option>
                <option value="submit">Submissions</option>
                <option value="quiz">Quizzes</option>
                <option value="cert">Certificates</option>
                <option value="start">Enrollments</option>
                <option value="admin">Admin Actions</option>
              </select>
              <button className="btn btn-ghost btn-sm" onClick={loadActivity}>
                <FiRefreshCw size={14} /> Refresh
              </button>
            </div>
          </div>
          <div className="stats-row">
            <StatCard label="Active Today" value={activeToday} sub="Actions in last 24h" color="green" icon={<FiActivity size={18} />} />
            <StatCard label="Total Employees" value={employees.length} sub="Registered users" color="brand" icon={<FiUser size={18} />} />
            <StatCard label="Total Courses" value={courses.length} sub="Published & drafts" color="blue" icon={<FiBookOpen size={18} />} />
            <StatCard label="Completions" value={completions} sub="Course completions" color="orange" icon={<FiCheckCircle size={18} />} />
          </div>

          <div className="section-heading"><h2>Recent Activity</h2></div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>User</th><th>Action</th><th>Detail</th><th>Time</th><th>Type</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    No activity found.
                  </td></tr>
                ) : filtered.map(a => (
                  <tr key={a.id}>
                    <td><div className="user-cell"><div className="user-cell-avatar">{a.user.split(' ').map(w => w[0]).join('').slice(0, 2)}</div>{a.user}</div></td>
                    <td className="td-bold">{a.action}</td>
                    <td className="td-muted">{a.detail || '—'}</td>
                    <td className="td-muted"><FiClock size={12} style={{ marginRight: 4 }} />{a.time}</td>
                    <td><Badge color={TYPE_COLOR[a.type] || 'gray'}>{a.type}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Layout>
  );
}
