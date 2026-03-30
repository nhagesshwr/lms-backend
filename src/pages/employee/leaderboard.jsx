import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { FiTrendingUp, FiArrowUp, FiArrowDown, FiMinus, FiZap, FiAward, FiBookOpen } from 'react-icons/fi';
import { getToken, getUser, leaderboardAPI } from '../../lib/api';
import { Layout, Loading, Tabs, StatCard, EmptyState } from '../../components/components';

const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' };

function LeaderRow({ entry, isSelf }) {
  const change = entry.change;
  return (
    <div className={`leaderboard-row-full ${isSelf ? 'self-row' : ''}`}>
      <div className={`leaderboard-rank-full ${entry.rank <= 3 ? `top${entry.rank}` : ''}`}>
        {MEDAL[entry.rank] || `#${entry.rank}`}
      </div>
      <div className="leaderboard-avatar-full" style={{ background: isSelf ? 'linear-gradient(135deg, var(--brand), var(--brand-dark))' : undefined }}>
        {entry.avatar}
      </div>
      <div className="leaderboard-info-full">
        <div className="lb-name">{entry.name}{isSelf && <span className="lb-you-tag">You</span>}</div>
        <div className="lb-dept">{entry.department}</div>
      </div>
      <div className="lb-stats">
        <div className="lb-stat"><FiZap size={12} color="var(--orange)" /> {entry.streak}d streak</div>
        <div className="lb-stat"><FiBookOpen size={12} color="var(--brand)" /> {entry.courses} courses</div>
      </div>
      <div className="lb-xp-wrap">
        <div className="lb-xp">{entry.xp.toLocaleString()} XP</div>
        <div className={`lb-change ${change > 0 ? 'up' : change < 0 ? 'down' : 'same'}`}>
          {change > 0 ? <FiArrowUp size={11} /> : change < 0 ? <FiArrowDown size={11} /> : <FiMinus size={11} />}
          {Math.abs(change) > 0 ? Math.abs(change) : '—'}
        </div>
      </div>
    </div>
  );
}

export default function Leaderboard() {
  const router = useRouter();
  const [data, setData]   = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [tab, setTab]     = useState('all');
  const [loading, setLoading] = useState(true);
  const user = getUser();

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return; }
    const u = getUser();
    if (u?.role !== 'employee') { router.push('/dashboard'); return; }
    Promise.all([
      leaderboardAPI.getAll().catch(() => []),
      leaderboardAPI.getMyRank().catch(() => null),
    ]).then(([d, r]) => { setData(d); setMyRank(r); }).finally(() => setLoading(false));
  }, []);

  const tabs = [
    { id: 'all',        label: 'All Time' },
    { id: 'weekly',     label: 'This Week' },
    { id: 'department', label: 'My Department' },
  ];

  return (
    <Layout>
      {loading ? <Loading /> : (
        <>
          <div className="page-header-block">
            <div className="page-header-left">
              <h1 className="page-header-title">Leaderboard</h1>
              <p className="page-header-desc">See how you stack up against your colleagues.</p>
            </div>
            <div className="page-header-right">
              <Tabs tabs={tabs} active={tab} onChange={setTab} />
            </div>
          </div>
          <div className="stats-row">
            <StatCard label="Your Rank" value={myRank ? `#${myRank.rank}` : '—'} sub="Global ranking" color="brand" icon={<FiTrendingUp size={18} />} />
            <StatCard label="Your XP" value={myRank ? myRank.xp.toLocaleString() : '—'} sub="Experience points" color="orange" icon={<FiZap size={18} />} />
            <StatCard label="Your Streak" value={myRank ? `${myRank.streak} days` : '—'} sub="Consecutive days" color="green" icon={<FiAward size={18} />} />
            <StatCard label="Participants" value={data.length} sub="Active learners" color="blue" icon={<FiBookOpen size={18} />} />
          </div>

          {data.length === 0 ? (
            <EmptyState 
              icon={<FiAward size={32} />} 
              title="No rankings yet" 
              description="Be the first to complete a lesson and climb the leaderboard!" 
            />
          ) : (
            <div className="table-wrapper">
              <div className="leaderboard-header-row">
                <span>Rank</span><span>Learner</span><span>Stats</span><span style={{ textAlign: 'right' }}>XP</span>
              </div>
              {data.map(entry => (
                <LeaderRow key={entry.rank} entry={entry} isSelf={entry.name === user?.name} />
              ))}
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
