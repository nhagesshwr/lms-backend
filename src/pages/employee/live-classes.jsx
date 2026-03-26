import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { FiVideo, FiClock, FiUsers, FiCalendar, FiExternalLink, FiRadio } from 'react-icons/fi';
import { getToken, liveClassesAPI, mockLiveClasses } from '../../lib/api';
import { Layout, Loading, Tabs, Badge, useToast } from '../../components/components';

function LiveClassCard({ cls, onEnroll }) {
  const isLive     = cls.status === 'live';
  const isUpcoming = cls.status === 'upcoming';
  const isEnded    = cls.status === 'ended';
  const pct        = Math.round((cls.enrolled / cls.capacity) * 100);

  return (
    <div className={`live-card-full ${isLive ? 'is-live' : ''}`}>
      <div className="live-card-header-row">
        <div className="live-card-meta-left">
          {isLive && <div className="live-indicator"><FiRadio size={12} /> LIVE</div>}
          {!isLive && !isEnded && <Badge color="blue">Upcoming</Badge>}
          {isEnded && <Badge color="gray">Ended</Badge>}
        </div>
        <div className="live-duration"><FiClock size={12} /> {cls.duration} min</div>
      </div>
      <div className="live-card-body-content">
        <h3 className="live-card-title-full">{cls.title}</h3>
        <div className="live-card-instructor">by {cls.instructor} · {cls.course}</div>
        <div className="live-card-details">
          <div className="live-detail-item"><FiCalendar size={13} /> {new Date(cls.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} · {cls.time}</div>
          <div className="live-detail-item"><FiUsers size={13} /> {cls.enrolled}/{cls.capacity} enrolled</div>
        </div>
        <div className="live-capacity-bar">
          <div className="live-capacity-fill" style={{ width: `${pct}%`, background: pct >= 90 ? 'var(--red)' : 'var(--brand)' }} />
        </div>
        <div className="live-capacity-label">{cls.capacity - cls.enrolled} spots remaining</div>
      </div>
      <div className="live-card-footer-row">
        {isLive && <a href={cls.meetLink} className="btn btn-danger" style={{ flex: 1, justifyContent: 'center' }}><FiRadio size={14} /> Join Now</a>}
        {isUpcoming && <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => onEnroll(cls)}>Enroll</button>}
        {isEnded && <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} disabled>Recording Coming Soon</button>}
      </div>
    </div>
  );
}

export default function LiveClasses() {
  const router = useRouter();
  const [classes, setClasses] = useState([]);
  const [tab, setTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return; }
    liveClassesAPI.getAll().then(setClasses).catch(() => setClasses(mockLiveClasses)).finally(() => setLoading(false));
  }, []);

  const handleEnroll = async (cls) => {
    await liveClassesAPI.enroll(cls.id).catch(() => {});
    showToast(`Enrolled in "${cls.title}"!`, 'success');
  };

  const filtered = tab === 'all' ? classes : classes.filter(c => c.status === tab);
  const tabs = [
    { id: 'all', label: 'All Classes', count: classes.length },
    { id: 'live', label: 'Live Now', count: classes.filter(c => c.status === 'live').length },
    { id: 'upcoming', label: 'Upcoming', count: classes.filter(c => c.status === 'upcoming').length },
    { id: 'ended', label: 'Ended', count: classes.filter(c => c.status === 'ended').length },
  ];

  return (
    <Layout title="Live Classes" subtitle="Join live instructor-led sessions">
      {ToastComponent}
      {loading ? <Loading /> : (
        <>
          <Tabs tabs={tabs} active={tab} onChange={setTab} />
          <div className="grid-3">
            {filtered.map(cls => <LiveClassCard key={cls.id} cls={cls} onEnroll={handleEnroll} />)}
          </div>
        </>
      )}
    </Layout>
  );
}
