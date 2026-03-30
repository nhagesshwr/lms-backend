import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { FiActivity, FiUser, FiBookOpen, FiClock, FiRefreshCw } from 'react-icons/fi';
import { getToken, getUser, isSuperAdmin, employeesAPI, coursesAPI, activityAPI } from '../../lib/api';
import { Layout, Loading, StatCard, Badge, SearchBar, RoleChip, useToast } from '../../components/components';

const TYPE_COLOR = { complete: 'green', submit: 'brand', start: 'blue', cert: 'orange', admin: 'amber', quiz: 'teal', upload: 'blue', group: 'violet' };

export default function SuperAdminActivity() {
  const router = useRouter();
  const [activity, setActivity]     = useState([]);
  const [employees, setEmployees]   = useState([]);
  const [courses, setCourses]       = useState([]);
  const [search, setSearch]         = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading]       = useState(true);
  const { showToast, ToastComponent } = useToast();

  const loadActivity = useCallback(() => {
    setLoading(true);
    Promise.all([
      employeesAPI.getAll().catch(() => []),
      coursesAPI.getAll().catch(() => []),
      activityAPI.getRecent(100, typeFilter || null).catch(() => []),
    ]).then(([e, c, acts]) => {
      setEmployees(e);
      setCourses(c);
      setActivity(acts || []);
    }).finally(() => setLoading(false));
  }, [typeFilter]);

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return; }
    const u = getUser();
    if (!isSuperAdmin(u?.role)) { router.push('/dashboard'); return; }
    loadActivity();
  }, [loadActivity]);

  const filtered = activity.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = !search || a.user.toLowerCase().includes(q) || a.action.toLowerCase().includes(q) || (a.detail || '').toLowerCase().includes(q);
    return matchSearch;
  });

  const activeToday = activity.filter(a => a.time.includes('min') || a.time.includes('hour')).length;

  return (
    <Layout>
      {ToastComponent}
      {loading ? <Loading /> : (
        <>
          <div className="page-header-block">
            <div className="page-header-left">
              <h1 className="page-header-title">Platform Activity</h1>
              <p className="page-header-desc">Complete audit trail — every user action, everywhere.</p>
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

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>User</th><th>Role</th><th>Action</th><th>Detail</th><th>Time</th><th>Type</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    No activity found.
                  </td></tr>
                ) : filtered.map(a => (
                  <tr key={a.id}>
                    <td><div className="user-cell"><div className="user-cell-avatar">{a.user.split(' ').map(w => w[0]).join('').slice(0, 2)}</div>{a.user}</div></td>
                    <td><RoleChip role={a.role} /></td>
                    <td className="td-bold">{a.action}</td>
                    <td className="td-muted" style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.detail || '—'}</td>
                    <td className="td-muted"><FiClock size={11} style={{ marginRight: 4 }} />{a.time}</td>
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
