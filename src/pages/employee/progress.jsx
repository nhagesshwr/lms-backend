import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { FiBarChart2, FiClock, FiCheckCircle, FiBookOpen } from 'react-icons/fi';
import { getToken, getUser, progressAPI } from '../../lib/api';
import { Layout, Loading, StatCard, ProgressRing } from '../../components/components';

function ProgressCard({ p }) {
  const color = p.progress >= 80 ? 'var(--emerald)' : p.progress >= 50 ? 'var(--brand)' : 'var(--orange)';
  return (
    <div className="progress-card">
      <div className="progress-card-header">
        <div className="progress-card-info">
          <div className="progress-course-title">{p.title}</div>
          <div className="progress-meta">
            {p.completed}/{p.lessons} lessons · Last accessed {new Date(p.lastAccessed).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </div>
        </div>
        <ProgressRing value={p.progress} size={60} color={color} />
      </div>
      <div className="progress-full-bar">
        <div className="progress-full-fill" style={{ width: `${p.progress}%`, background: `linear-gradient(90deg, ${color}, ${color}aa)` }} />
      </div>
      <div className="progress-stats-row">
        <div className="progress-stat"><strong>{Math.round(p.watchedMinutes / 60 * 10) / 10}h</strong> watched</div>
        <div className="progress-stat"><strong>{Math.round((p.totalMinutes - p.watchedMinutes) / 60 * 10) / 10}h</strong> remaining</div>
        <div className="progress-stat"><strong>{p.lessons - p.completed}</strong> lessons left</div>
        <div className="progress-stat"><strong>{p.progress}%</strong> complete</div>
      </div>
    </div>
  );
}

export default function Progress() {
  const router = useRouter();
  const [data, setData]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return; }
    const u = getUser();
    if (u?.role !== 'employee') { router.push('/dashboard'); return; }
    progressAPI.getMy().then(setData).catch(() => setData(mockProgress)).finally(() => setLoading(false));
  }, []);

  const totalHours = data.reduce((s, p) => s + p.watchedMinutes, 0) / 60;
  const totalLessons = data.reduce((s, p) => s + p.completed, 0);
  const avgProgress = data.length ? Math.round(data.reduce((s, p) => s + p.progress, 0) / data.length) : 0;
  const completed   = data.filter(p => p.progress === 100).length;

  return (
    <Layout title="My Progress" subtitle="Track your learning journey across all courses">
      {loading ? <Loading /> : (
        <>
          <div className="stats-row">
            <StatCard label="Avg Progress" value={`${avgProgress}%`} sub="Across all courses" color="brand" icon={<FiBarChart2 size={18} />} />
            <StatCard label="Hours Learned" value={`${Math.round(totalHours * 10) / 10}h`} sub="Total watch time" color="blue" icon={<FiClock size={18} />} />
            <StatCard label="Lessons Done" value={totalLessons} sub="Across all courses" color="green" icon={<FiCheckCircle size={18} />} />
            <StatCard label="Completed" value={completed} sub="Courses finished" color="orange" icon={<FiBookOpen size={18} />} />
          </div>

          <div className="section-heading"><h2>Course Breakdown</h2></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[...data].sort((a, b) => b.progress - a.progress).map(p => <ProgressCard key={p.courseId} p={p} />)}
          </div>
        </>
      )}
    </Layout>
  );
}
