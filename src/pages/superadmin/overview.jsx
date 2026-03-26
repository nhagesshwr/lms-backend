import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  FiUsers, FiBookOpen, FiActivity, FiVideo, FiShield,
  FiTrendingUp, FiCheckCircle, FiPlus, FiSettings, FiDatabase,
} from 'react-icons/fi';
import {
  getToken, getUser, isSuperAdmin, employeesAPI, coursesAPI, departmentsAPI,
} from '../../lib/api';
import { Layout, Loading, StatCard, Badge, RoleChip } from '../../components/components';

const RECENT_ACTIONS = [
  { user: 'Priya Sharma', role: 'hr_admin', action: 'Created course "TypeScript Advanced"', time: '5 min ago' },
  { user: 'System', role: 'system', action: 'Auto-published 3 completed lessons', time: '1 hour ago' },
  { user: 'Ravi Kumar', role: 'employee', action: 'Completed CSS Mastery', time: '2 hours ago' },
  { user: 'Ananya Singh', role: 'hr_admin', action: 'Added 5 new employees to Engineering dept', time: '3 hours ago' },
  { user: 'Admin', role: 'super_admin', action: 'Updated system settings', time: '1 day ago' },
];

export default function SuperAdminOverview() {
  const router = useRouter();
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return; }
    const u = getUser();
    if (!isSuperAdmin(u?.role)) { router.push('/dashboard'); return; }
    Promise.all([
      employeesAPI.getAll().catch(() => []),
      coursesAPI.getAll().catch(() => []),
      departmentsAPI.getAll().catch(() => []),
    ]).then(([emps, courses, depts]) => {
      setStats({
        employees:    emps.length,
        courses:      courses.length,
        published:    courses.filter(c => c.is_published).length,
        departments:  depts.length,
      });
    }).finally(() => setLoading(false));
  }, []);

  const quickActions = [
    { icon: FiPlus,     label: 'Add Employee',  href: '/superadmin/users' },
    { icon: FiBookOpen, label: 'Create Course',  href: '/superadmin/courses' },
    { icon: FiVideo,    label: 'Upload Content', href: '/superadmin/content' },
    { icon: FiSettings, label: 'Settings',       href: '/superadmin/users' },
  ];

  return (
    <Layout title="Super Admin Overview" subtitle="Full platform visibility and control">
      {loading ? <Loading /> : (
        <>
          <div className="admin-hero">
            <div className="admin-hero-title">Platform Overview</div>
            <div className="admin-hero-sub">Real-time metrics across your entire LMS deployment</div>
            <div className="admin-actions-grid">
              {quickActions.map(a => (
                <Link key={a.label} href={a.href}>
                  <div className="admin-action-btn">
                    <div className="admin-action-icon"><a.icon size={16} /></div>
                    {a.label}
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="stats-row">
            <StatCard label="Total Employees" value={stats?.employees || 0} sub="All roles" color="brand" icon={<FiUsers size={18} />} trend="+4 this month" trendUp />
            <StatCard label="Total Courses" value={stats?.courses || 0} sub={`${stats?.published || 0} published`} color="blue" icon={<FiBookOpen size={18} />} />
            <StatCard label="Departments" value={stats?.departments || 0} sub="Active teams" color="green" icon={<FiDatabase size={18} />} />
            <StatCard label="Platform Health" value="100%" sub="All systems nominal" color="orange" icon={<FiShield size={18} />} />
          </div>

          <div className="grid-2">
            <div className="card">
              <div className="section-heading" style={{ marginBottom: 16 }}>
                <h2>Recent Admin Actions</h2>
                <Link href="/superadmin/activity"><button className="btn btn-ghost btn-sm">View All</button></Link>
              </div>
              {RECENT_ACTIONS.map((a, i) => (
                <div key={i} className="activity-row">
                  <div className="activity-avatar">{a.user.split(' ').map(w => w[0]).join('').slice(0,2)}</div>
                  <div className="activity-info">
                    <div className="activity-user">{a.user} <RoleChip role={a.role} /></div>
                    <div className="activity-action">{a.action}</div>
                  </div>
                  <div className="activity-time">{a.time}</div>
                </div>
              ))}
            </div>

            <div className="card">
              <div className="section-heading" style={{ marginBottom: 16 }}>
                <h2>Quick Links</h2>
              </div>
              {[
                { icon: FiUsers,     label: 'Manage Users',      sub: 'Add, edit, delete employees',    href: '/superadmin/users' },
                { icon: FiBookOpen,  label: 'Manage Courses',     sub: 'Create and publish courses',    href: '/superadmin/courses' },
                { icon: FiVideo,     label: 'Upload Content',     sub: 'Videos, PDFs, thumbnails',      href: '/superadmin/content' },
                { icon: FiActivity,  label: 'View Activity',      sub: 'Platform-wide learner feed',    href: '/superadmin/activity' },
              ].map(q => (
                <Link key={q.label} href={q.href}>
                  <div className="quick-link-row">
                    <div className="quick-link-icon"><q.icon size={16} /></div>
                    <div className="quick-link-info">
                      <div className="quick-link-label">{q.label}</div>
                      <div className="quick-link-sub">{q.sub}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
