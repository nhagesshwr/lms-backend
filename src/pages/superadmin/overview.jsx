import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  FiUsers, FiBookOpen, FiActivity, FiVideo, FiShield,
  FiTrendingUp, FiCheckCircle, FiPlus, FiSettings, FiDatabase,
} from 'react-icons/fi';
import {
  getToken, getUser, isSuperAdmin, employeesAPI, coursesAPI, departmentsAPI, activityAPI,
} from '../../lib/api';
import { Layout, Loading, StatCard, Badge, RoleChip } from '../../components/components';

const TYPE_COLOR = { complete: 'green', submit: 'brand', start: 'blue', cert: 'orange', admin: 'amber', quiz: 'teal' };

export default function SuperAdminOverview() {
  const router = useRouter();
  const [stats, setStats]       = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return; }
    const u = getUser();
    if (!isSuperAdmin(u?.role)) { router.push('/dashboard'); return; }
    Promise.all([
      employeesAPI.getAll().catch(() => []),
      coursesAPI.getAll().catch(() => []),
      departmentsAPI.getAll().catch(() => []),
      activityAPI.getRecent(5).catch(() => []),
    ]).then(([emps, courses, depts, acts]) => {
      setStats({
        employees:   emps.length,
        courses:     courses.length,
        published:   courses.filter(c => c.is_published).length,
        departments: depts.length,
      });
      setActivity(acts || []);
    }).finally(() => setLoading(false));
  }, []);

  const quickActions = [
    { icon: FiPlus,     label: 'Add Employee',  href: '/superadmin/users' },
    { icon: FiBookOpen, label: 'Create Course',  href: '/superadmin/courses' },
    { icon: FiVideo,    label: 'Upload Content', href: '/superadmin/content' },
    { icon: FiSettings, label: 'Settings',       href: '/superadmin/users' },
  ];

  return (
    <Layout>
      {loading ? <Loading /> : (
        <>
          <div className="page-header-block">
            <h1 className="page-header-title">Platform Overview</h1>
            <p className="page-header-desc">Full platform visibility and control across all teams and courses.</p>
          </div>
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
              {activity.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 24 }}>
                  No activity yet — data will appear as users interact with the platform.
                </p>
              ) : activity.map((a) => (
                <div key={a.id} className="activity-row">
                  <div className="activity-avatar">{a.user.split(' ').map(w => w[0]).join('').slice(0, 2)}</div>
                  <div className="activity-info">
                    <div className="activity-user">{a.user} <RoleChip role={a.role} /></div>
                    <div className="activity-action">{a.action}{a.detail ? ` — ${a.detail}` : ''}</div>
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


