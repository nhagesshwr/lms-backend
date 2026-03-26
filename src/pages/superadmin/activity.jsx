import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { FiActivity, FiUser, FiBookOpen, FiClock, FiFilter, FiRefreshCw } from 'react-icons/fi';
import { getToken, getUser, isSuperAdmin, employeesAPI, coursesAPI } from '../../lib/api';
import { Layout, Loading, StatCard, Badge, SearchBar, useToast } from '../../components/components';

const ALL_ACTIVITY = [
  { id: 1, user: 'Sidhu Mohan', role: 'employee', action: 'Completed lesson', detail: 'Custom Hooks & Context API — React Advanced', time: '2 min ago', type: 'complete', dept: 'Engineering' },
  { id: 2, user: 'Priya Sharma', role: 'hr_admin', action: 'Created course', detail: 'TypeScript Advanced Patterns', time: '12 min ago', type: 'admin', dept: 'HR' },
  { id: 3, user: 'Ravi Kumar', role: 'employee', action: 'Submitted assignment', detail: 'CSS Grid Layout Exercise — 95/100', time: '30 min ago', type: 'submit', dept: 'Product' },
  { id: 4, user: 'Ananya Singh', role: 'hr_admin', action: 'Uploaded video', detail: 'Lesson 4 — Node.js Fundamentals', time: '1 hour ago', type: 'upload', dept: 'HR' },
  { id: 5, user: 'Meera Patel', role: 'employee', action: 'Joined study group', detail: 'Frontend Dev Squad', time: '2 hours ago', type: 'group', dept: 'Marketing' },
  { id: 6, user: 'Arjun Nair', role: 'employee', action: 'Earned certificate', detail: 'JavaScript Fundamentals', time: '3 hours ago', type: 'cert', dept: 'Sales' },
  { id: 7, user: 'Kavya Reddy', role: 'employee', action: 'Completed course', detail: 'CSS Mastery — 100%', time: '5 hours ago', type: 'complete', dept: 'HR' },
  { id: 8, user: 'Vikram Das', role: 'manager', action: 'Assigned course', detail: 'Node.js Fundamentals → 6 employees', time: '6 hours ago', type: 'admin', dept: 'Finance' },
  { id: 9, user: 'Priya Sharma', role: 'hr_admin', action: 'Added employee', detail: 'Rohan Mehta — Engineering dept', time: '1 day ago', type: 'admin', dept: 'HR' },
  { id: 10, user: 'Sidhu Mohan', role: 'employee', action: 'Took quiz', detail: 'React Hooks Basics — 80%', time: '1 day ago', type: 'quiz', dept: 'Engineering' },
];

const TYPE_COLOR = { complete: 'green', submit: 'brand', upload: 'blue', group: 'violet', cert: 'orange', admin: 'amber', quiz: 'teal', start: 'blue' };

export default function SuperAdminActivity() {
  const router = useRouter();
  const [employees, setEmployees] = useState([]);
  const [courses, setCourses]     = useState([]);
  const [search, setSearch]       = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading]     = useState(true);
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return; }
    const u = getUser();
    if (!isSuperAdmin(u?.role)) { router.push('/dashboard'); return; }
    Promise.all([employeesAPI.getAll().catch(() => []), coursesAPI.getAll().catch(() => [])]).then(([e, c]) => { setEmployees(e); setCourses(c); }).finally(() => setLoading(false));
  }, []);

  const filtered = ALL_ACTIVITY.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = !search || a.user.toLowerCase().includes(q) || a.action.toLowerCase().includes(q) || a.detail.toLowerCase().includes(q);
    const matchType   = !typeFilter || a.type === typeFilter;
    return matchSearch && matchType;
  });

  const activeToday = ALL_ACTIVITY.filter(a => a.time.includes('min') || a.time.includes('hour')).length;

  return (
    <Layout title="Platform Activity" subtitle="Complete audit trail — every user action, everywhere">
      {ToastComponent}
      {loading ? <Loading /> : (
        <>
          <div className="stats-row">
            <StatCard label="Events Today" value={activeToday} sub="Actions tracked" color="brand" icon={<FiActivity size={18} />} trend="+12 vs yesterday" trendUp />
            <StatCard label="Active Users" value={employees.length || 8} sub="Registered accounts" color="blue" icon={<FiUser size={18} />} />
            <StatCard label="Courses" value={courses.length || 12} sub="All courses" color="green" icon={<FiBookOpen size={18} />} />
            <StatCard label="This Hour" value={filtered.filter(a => a.time.includes('min')).length} sub="Recent actions" color="orange" icon={<FiClock size={18} />} />
          </div>

          <div className="toolbar">
            <div className="toolbar-left">
              <SearchBar value={search} onChange={setSearch} placeholder="Search activity…" />
              <select className="form-select" style={{ width: 'auto' }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                <option value="">All Types</option>
                <option value="complete">Completions</option>
                <option value="submit">Submissions</option>
                <option value="upload">Uploads</option>
                <option value="admin">Admin Actions</option>
                <option value="cert">Certificates</option>
                <option value="quiz">Quizzes</option>
              </select>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => showToast('Activity refreshed!')}><FiRefreshCw size={14} /> Refresh</button>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>User</th><th>Role</th><th>Action</th><th>Detail</th><th>Dept</th><th>Time</th><th>Type</th></tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id}>
                    <td><div className="user-cell"><div className="user-cell-avatar">{a.user.split(' ').map(w=>w[0]).join('')}</div>{a.user}</div></td>
                    <td><Badge color={a.role === 'super_admin' ? 'brand' : a.role === 'hr_admin' ? 'blue' : a.role === 'manager' ? 'green' : 'gray'}>{a.role.replace('_',' ')}</Badge></td>
                    <td className="td-bold">{a.action}</td>
                    <td className="td-muted" style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.detail}</td>
                    <td className="td-muted">{a.dept}</td>
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
