import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { FiActivity, FiUser, FiBookOpen, FiClock, FiCheckCircle } from 'react-icons/fi';
import { getToken, getUser, isHROrAbove, employeesAPI, coursesAPI, mockProgress } from '../../lib/api';
import { Layout, Loading, StatCard, Badge } from '../../components/components';

const MOCK_ACTIVITY = [
  { id: 1, user: 'Sidhu Mohan', action: 'Completed lesson', detail: 'Custom Hooks — React Advanced', time: '2 min ago', type: 'complete' },
  { id: 2, user: 'Priya Sharma', action: 'Submitted assignment', detail: 'CSS Grid Layout Exercise', time: '15 min ago', type: 'submit' },
  { id: 3, user: 'Ravi Kumar', action: 'Started course', detail: 'Node.js Fundamentals', time: '1 hour ago', type: 'start' },
  { id: 4, user: 'Ananya Singh', action: 'Earned certificate', detail: 'JavaScript Fundamentals', time: '3 hours ago', type: 'cert' },
  { id: 5, user: 'Meera Patel', action: 'Joined study group', detail: 'Frontend Dev Squad', time: '5 hours ago', type: 'group' },
  { id: 6, user: 'Arjun Nair', action: 'Completed course', detail: 'CSS Mastery', time: '1 day ago', type: 'complete' },
  { id: 7, user: 'Kavya Reddy', action: 'Took quiz', detail: 'React Hooks Basics — 90%', time: '1 day ago', type: 'quiz' },
  { id: 8, user: 'Vikram Das', action: 'Enrolled in course', detail: 'SQL Foundations', time: '2 days ago', type: 'start' },
];

const ACTION_COLOR = { complete: 'green', submit: 'brand', start: 'blue', cert: 'orange', group: 'violet', quiz: 'teal' };

export default function Activity() {
  const router = useRouter();
  const [employees, setEmployees] = useState([]);
  const [courses, setCourses]     = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return; }
    const u = getUser();
    if (!isHROrAbove(u?.role)) { router.push('/dashboard'); return; }
    Promise.all([
      employeesAPI.getAll().catch(() => []),
      coursesAPI.getAll().catch(() => []),
    ]).then(([e, c]) => { setEmployees(e); setCourses(c); }).finally(() => setLoading(false));
  }, []);

  const activeToday = MOCK_ACTIVITY.filter(a => a.time.includes('min') || a.time.includes('hour')).length;

  return (
    <Layout title="Activity" subtitle="Live feed of learner activity across the platform">
      {loading ? <Loading /> : (
        <>
          <div className="stats-row">
            <StatCard label="Active Today" value={activeToday} sub="Learners online" color="green" icon={<FiActivity size={18} />} trend="+3 vs yesterday" trendUp />
            <StatCard label="Total Employees" value={employees.length || 8} sub="Registered users" color="brand" icon={<FiUser size={18} />} />
            <StatCard label="Total Courses" value={courses.length || 12} sub="Published & drafts" color="blue" icon={<FiBookOpen size={18} />} />
            <StatCard label="Completions Today" value={2} sub="Courses completed" color="orange" icon={<FiCheckCircle size={18} />} />
          </div>

          <div className="section-heading"><h2>Recent Activity</h2></div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Action</th>
                  <th>Detail</th>
                  <th>Time</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_ACTIVITY.map(a => (
                  <tr key={a.id}>
                    <td><div className="user-cell"><div className="user-cell-avatar">{a.user.split(' ').map(w => w[0]).join('')}</div>{a.user}</div></td>
                    <td className="td-bold">{a.action}</td>
                    <td className="td-muted">{a.detail}</td>
                    <td className="td-muted"><FiClock size={12} style={{ marginRight: 4 }} />{a.time}</td>
                    <td><Badge color={ACTION_COLOR[a.type] || 'gray'}>{a.type}</Badge></td>
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
