import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  FiBookOpen, FiArrowRight, FiClock, FiZap, FiAlertCircle,
  FiCalendar, FiAward, FiTrendingUp,
} from 'react-icons/fi';
import {
  getToken, getUser, coursesAPI, progressAPI, assignmentsAPI,
  leaderboardAPI, mockProgress, mockAssignments,
} from '../../lib/api';
import {
  Layout, Loading, StatCard, StreakCard, ProgressRing, Badge,
} from '../../components/components';
import CourseModernCard from '../../components/CourseModernCard';

export default function EmployeeDashboard() {
  const router = useRouter();
  const [user, setUser]           = useState(null);
  const [courses, setCourses]     = useState([]);
  const [progress, setProgress]   = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [myRank, setMyRank]       = useState(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return; }
    const u = getUser();
    if (!u) { router.push('/login'); return; }
    setUser(u);
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [c, p, a, r] = await Promise.all([
        coursesAPI.getPublished().catch(() => []),
        progressAPI.getMy().catch(() => mockProgress),
        assignmentsAPI.getMy().catch(() => mockAssignments),
        leaderboardAPI.getMyRank().catch(() => null),
      ]);
      setCourses(c.slice(0, 3));
      setProgress(p);
      setAssignments(a.filter(x => x.status === 'overdue' || x.status === 'due_today').slice(0, 3));
      setMyRank(r);
    } finally {
      setLoading(false);
    }
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const overdue = assignments.filter(a => a.status === 'overdue').length;
  const totalProgress = progress.length
    ? Math.round(progress.reduce((s, p) => s + p.progress, 0) / progress.length)
    : 0;
  const hoursThisWeek = progress.reduce((s, p) => s + Math.round(p.watchedMinutes / 60 * 10) / 10, 0);

  if (loading) return <Layout><Loading /></Layout>;

  return (
    <Layout
      title={`${greeting}, ${user?.name?.split(' ')[0]}! 👋`}
      subtitle={overdue > 0 ? `You have ${overdue} overdue assignment${overdue > 1 ? 's' : ''} — action needed!` : `You're on a 12-day streak — keep going!`}
    >
      <StreakCard streak={12} hoursThisWeek={parseFloat(hoursThisWeek.toFixed(1)) || 8.4} dailyGoalMin={28} dailyGoalTotal={45} />

      <div className="stats-row">
        <StatCard label="Active Courses" value={progress.length || 4} sub="2 near completion" color="brand" icon={<FiBookOpen size={18} />} trend="+3 this month" trendUp />
        <StatCard label="Avg Progress" value={`${totalProgress || 62}%`} sub="Across all courses" color="blue" icon={<FiTrendingUp size={18} />} trend="+8% this week" trendUp />
        <StatCard label="Assignments Due" value={assignments.length || 3} sub={overdue > 0 ? `${overdue} overdue — urgent!` : 'All on track'} color={overdue > 0 ? 'orange' : 'green'} icon={<FiAlertCircle size={18} />} />
        <StatCard label="Certificates" value={7} sub="1 in progress" color="violet" icon={<FiAward size={18} />} trend="+2 this month" trendUp />
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-main">
          <div className="section-heading">
            <h2>Continue Learning</h2>
            <Link href="/employee/my-courses">
              <button className="btn btn-ghost btn-sm">View all <FiArrowRight size={13} /></button>
            </Link>
          </div>

          <div className="grid-3">
            {progress.slice(0, 3).map((p) => (
              <CourseModernCard
                key={p.courseId}
                course={{ id: p.courseId, title: p.title }}
                progress={p.progress}
                onClick={() => router.push(`/courses/${p.courseId}`)}
              />
            ))}
          </div>

          <div className="section-heading" style={{ marginTop: 28 }}>
            <h2>Your Progress Overview</h2>
            <Link href="/employee/progress">
              <button className="btn btn-ghost btn-sm">Details <FiArrowRight size={13} /></button>
            </Link>
          </div>
          <div className="progress-overview-grid">
            {progress.map((p) => (
              <div key={p.courseId} className="progress-overview-item">
                <div className="poi-top">
                  <div className="poi-info">
                    <div className="poi-title">{p.title}</div>
                    <div className="poi-meta">{p.completed}/{p.lessons} lessons</div>
                  </div>
                  <ProgressRing value={p.progress} size={48} />
                </div>
                <div className="progress-full-bar">
                  <div className="progress-full-fill" style={{ width: `${p.progress}%`, background: p.progress >= 80 ? 'var(--emerald)' : p.progress >= 50 ? 'var(--brand)' : 'var(--orange)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-aside">
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="aside-header">
              <FiAlertCircle size={16} color="var(--red)" />
              <span className="aside-title">Upcoming Deadlines</span>
              {overdue > 0 && <Badge color="red">{overdue} overdue</Badge>}
            </div>
            {mockAssignments.filter(a => a.status !== 'graded').slice(0, 4).map(a => (
              <div key={a.id} className="deadline-item">
                <div className="deadline-info">
                  <div className="deadline-title">{a.title}</div>
                  <div className="deadline-course">{a.course}</div>
                  <div className={`deadline-due ${a.status}`}>
                    {a.status === 'overdue' ? 'Overdue' : a.status === 'due_today' ? 'Due today' : `Due ${new Date(a.due).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                  </div>
                </div>
                <div className="deadline-points">+{a.points}pts</div>
              </div>
            ))}
            <Link href="/employee/assignments">
              <button className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: 8, justifyContent: 'center' }}>
                View All Assignments <FiArrowRight size={12} />
              </button>
            </Link>
          </div>

          {myRank && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="aside-header">
                <FiZap size={16} color="var(--orange)" />
                <span className="aside-title">Your Ranking</span>
              </div>
              <div className="rank-display">
                <div className="rank-number">#{myRank.rank}</div>
                <div className="rank-info">
                  <div className="rank-xp">{myRank.xp.toLocaleString()} XP</div>
                  <div className="rank-streak">{myRank.streak} day streak 🔥</div>
                </div>
              </div>
              <Link href="/employee/leaderboard">
                <button className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: 8, justifyContent: 'center' }}>
                  Full Leaderboard <FiArrowRight size={12} />
                </button>
              </Link>
            </div>
          )}

          <div className="card">
            <div className="aside-header">
              <FiCalendar size={16} color="var(--brand)" />
              <span className="aside-title">Upcoming Classes</span>
            </div>
            <div className="upcoming-class-item">
              <div className="uc-time">Today · 3:00 PM</div>
              <div className="uc-title">Advanced CSS Techniques</div>
              <div className="uc-instructor">Priya Sharma</div>
              <Badge color="red">Live Now</Badge>
            </div>
            <div className="upcoming-class-item">
              <div className="uc-time">Tomorrow · 10:00 AM</div>
              <div className="uc-title">React Performance Deep Dive</div>
              <div className="uc-instructor">Mihail Georgescu</div>
            </div>
            <Link href="/employee/live-classes">
              <button className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: 8, justifyContent: 'center' }}>
                All Classes <FiArrowRight size={12} />
              </button>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
