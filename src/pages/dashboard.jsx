import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { FiBookOpen, FiUsers, FiLayers, FiClock, FiArrowRight, FiCheckCircle, FiActivity, FiPlusCircle } from 'react-icons/fi';
import { getToken, getUser, coursesAPI, employeesAPI, departmentsAPI, canViewEmployees, isHROrAbove, isSuperAdmin } from '../lib/api';
import { Layout, StatCard, Loading, RoleChip, Badge } from '../components/components';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser]             = useState(null);
  const [stats, setStats]           = useState(null);
  const [recentCourses, setCourses] = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return; }
    const u = getUser();
    if (!u) { router.push('/login'); return; }
    // Redirect employees to their own dashboard
    if (u.role === 'employee') { router.push('/employee/dashboard'); return; }
    if (u.role === 'super_admin') { router.push('/superadmin/overview'); return; }
    setUser(u);
    loadData(u);
  }, []);

  const loadData = async (u) => {
    try {
      const courses = await coursesAPI.getAll().catch(() => []);
      const [emps, depts] = await Promise.all([
        employeesAPI.getAll().catch(() => []),
        departmentsAPI.getAll().catch(() => []),
      ]);
      setStats({ courses: courses.length, published: courses.filter(c => c.is_published).length, employees: emps.length, departments: depts.length });
      setCourses(courses.slice(0, 6));
    } finally { setLoading(false); }
  };

  if (!user) return null;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const quickLinks = [
    { label: 'Manage Users',    href: '/employees',    icon: FiUsers },
    { label: 'All Courses',     href: '/courses',      icon: FiBookOpen },
    { label: 'Departments',     href: '/departments',  icon: FiLayers },
    { label: 'View Activity',   href: '/admin/activity', icon: FiActivity },
  ];

  return (
    <Layout title={`${greeting}, ${user.name?.split(' ')[0]}!`} subtitle="HR Admin overview — manage courses, teams, and activity.">
      {loading ? <Loading /> : (
        <>
          <div className="stats-row">
            <StatCard label="Total Courses" value={stats.courses} sub={`${stats.published} published`} color="brand" icon={<FiBookOpen size={18} />} />
            <StatCard label="Employees" value={stats.employees} sub="Active members" color="blue" icon={<FiUsers size={18} />} />
            <StatCard label="Departments" value={stats.departments} sub="Active teams" color="green" icon={<FiLayers size={18} />} />
            <StatCard label="Platform Status" value="Live" sub="All systems OK" color="orange" icon={<FiCheckCircle size={18} />} />
          </div>

          <div className="grid-2" style={{ marginBottom: 28 }}>
            <div className="card">
              <div className="section-heading" style={{ marginBottom: 14 }}><h2>Quick Actions</h2></div>
              <div className="quick-links-grid">
                {quickLinks.map(q => (
                  <Link key={q.label} href={q.href}>
                    <div className="quick-link-btn">
                      <q.icon size={18} color="var(--brand)" />
                      <span>{q.label}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="section-heading" style={{ marginBottom: 14 }}>
                <h2>Recent Courses</h2>
                <Link href="/courses"><button className="btn btn-ghost btn-sm">View all <FiArrowRight size={12} /></button></Link>
              </div>
              {recentCourses.slice(0, 4).map(c => (
                <Link key={c.id} href={`/courses/${c.id}`}>
                  <div className="course-list-row">
                    <div className="course-list-dot" style={{ background: c.is_published ? 'var(--green)' : 'var(--amber)' }} />
                    <div className="course-list-title">{c.title}</div>
                    <Badge color={c.is_published ? 'green' : 'amber'}>{c.is_published ? 'Live' : 'Draft'}</Badge>
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
