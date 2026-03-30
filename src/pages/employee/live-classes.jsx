import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { FiVideo, FiClock, FiUsers, FiCalendar, FiRadio, FiExternalLink, FiLink } from 'react-icons/fi';
import { getToken, getUser, liveClassesAPI } from '../../lib/api';
import { Layout, Loading, Tabs, Badge, useToast, EmptyState } from '../../components/components';

const PLATFORM_ICON = { Zoom: '📹', 'Google Meet': '📲', Teams: '💼', Webex: '🌐' };

function LiveClassCard({ cls }) {
  const isLive     = cls.status === 'live';
  const isUpcoming = cls.status === 'upcoming';
  const isEnded    = cls.status === 'ended';
  const pct        = cls.capacity > 0 ? Math.round((cls.enrolled / cls.capacity) * 100) : 0;
  const icon       = PLATFORM_ICON[cls.meet_title] || '🔗';

  const dateLabel = cls.date
    ? new Date(cls.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
    : '—';

  return (
    <div className={`live-card-full ${isLive ? 'is-live' : ''}`}>
      <div className="live-card-header-row">
        <div className="live-card-meta-left">
          {isLive     && <div className="live-indicator"><FiRadio size={12} /> LIVE</div>}
          {isUpcoming && <Badge color="blue">Upcoming</Badge>}
          {isEnded    && <Badge color="gray">Ended</Badge>}
        </div>
        <div className="live-duration"><FiClock size={12} /> {cls.duration || 60} min</div>
      </div>

      <div className="live-card-body-content">
        <h3 className="live-card-title-full">{cls.title}</h3>

        {cls.description && (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 8px' }}>
            {cls.description}
          </p>
        )}

        {cls.instructor && (
          <div className="live-card-instructor">by {cls.instructor}</div>
        )}

        <div className="live-card-details">
          {cls.date && (
            <div className="live-detail-item">
              <FiCalendar size={13} /> {dateLabel}{cls.time ? ` · ${cls.time}` : ''}
            </div>
          )}
          <div className="live-detail-item">
            <FiUsers size={13} /> {cls.enrolled}/{cls.capacity} enrolled
          </div>
          {cls.meet_title && (
            <div className="live-detail-item">
              <span>{icon}</span> {cls.meet_title}
            </div>
          )}
        </div>

        {cls.capacity > 0 && (
          <>
            <div className="live-capacity-bar">
              <div className="live-capacity-fill"
                style={{ width: `${pct}%`, background: pct >= 90 ? 'var(--red)' : 'var(--brand)' }} />
            </div>
            <div className="live-capacity-label">{cls.capacity - cls.enrolled} spots remaining</div>
          </>
        )}
      </div>

      <div className="live-card-footer-row">
        {/* Live — Join Now */}
        {isLive && cls.meet_url && (
          <a href={cls.meet_url} target="_blank" rel="noreferrer"
            className="btn btn-danger" style={{ flex: 1, justifyContent: 'center' }}>
            <FiRadio size={14} /> Join Now
          </a>
        )}
        {isLive && !cls.meet_url && (
          <button className="btn btn-danger" style={{ flex: 1 }} disabled>
            <FiRadio size={14} /> Link Not Set
          </button>
        )}

        {/* Upcoming — show link if available, else "You're Registered" */}
        {isUpcoming && cls.meet_url && (
          <a href={cls.meet_url} target="_blank" rel="noreferrer"
            className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>
            <FiExternalLink size={13} /> View Invite Link
          </a>
        )}
        {isUpcoming && !cls.meet_url && (
          <button className="btn btn-ghost" style={{ flex: 1 }} disabled>
            ✅ You're Registered
          </button>
        )}

        {/* Ended */}
        {isEnded && (
          <button className="btn btn-ghost" style={{ flex: 1 }} disabled>
            Recording Coming Soon
          </button>
        )}
      </div>
    </div>
  );
}

export default function LiveClasses() {
  const router = useRouter();
  const [classes, setClasses]   = useState([]);
  const [tab, setTab]           = useState('all');
  const [loading, setLoading]   = useState(true);
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return; }
    const u = getUser();
    if (u?.role !== 'employee') { router.push('/dashboard'); return; }

    // Use getMy() so the employee only sees classes they're assigned to.
    // Fall back to getAll() if getMy returns nothing/error.
    liveClassesAPI.getMy()
      .then(data => setClasses(data || []))
      .catch(() => liveClassesAPI.getAll().then(setClasses).catch(() => setClasses([])))
      .finally(() => setLoading(false));
  }, []);

  const filtered = tab === 'all' ? classes : classes.filter(c => c.status === tab);

  const tabs = [
    { id: 'all',      label: 'All Classes', count: classes.length },
    { id: 'live',     label: 'Live Now',    count: classes.filter(c => c.status === 'live').length },
    { id: 'upcoming', label: 'Upcoming',    count: classes.filter(c => c.status === 'upcoming').length },
    { id: 'ended',    label: 'Ended',       count: classes.filter(c => c.status === 'ended').length },
  ];

  return (
    <Layout>
      {ToastComponent}
      {loading ? <Loading /> : (
        <>
          <div className="page-header-block">
            <div className="page-header-left">
              <h1 className="page-header-title">Live Classes</h1>
              <p className="page-header-desc">Your scheduled live instructor-led sessions.</p>
            </div>
            <div className="page-header-right">
              <Tabs tabs={tabs} active={tab} onChange={setTab} />
            </div>
          </div>
          {filtered.length === 0 ? (
            <EmptyState
              icon={<FiVideo size={36} />}
              title="No live classes yet"
              description="Your manager or HR will schedule sessions and you'll see them here."
            />
          ) : (
            <div className="grid-3">
              {filtered.map(cls => <LiveClassCard key={cls.id} cls={cls} />)}
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
