import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { FiUsers, FiCalendar, FiPlus } from 'react-icons/fi';
import { getToken, studyGroupsAPI, mockStudyGroups } from '../../lib/api';
import { Layout, Loading, Badge, Tabs, useToast } from '../../components/components';

function GroupCard({ group, onJoin, onLeave }) {
  const pct = Math.round((group.members / group.maxMembers) * 100);
  return (
    <div className="group-card">
      <div className="group-avatar">{group.avatar}</div>
      <div className="group-name">{group.name}</div>
      <div className="group-course">{group.course}</div>
      <div className="group-meta">
        <div className="group-meta-item"><FiUsers size={12} /> {group.members}/{group.maxMembers} members</div>
        <div className="group-meta-item"><FiCalendar size={12} /> Next: {new Date(group.nextSession).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
      </div>
      <div className="group-capacity-bar">
        <div className="group-capacity-fill" style={{ width: `${pct}%` }} />
      </div>
      {group.joined ? (
        <button className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'center', marginTop: 12 }} onClick={() => onLeave(group)}>
          Leave Group
        </button>
      ) : (
        <button className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center', marginTop: 12 }} onClick={() => onJoin(group)} disabled={group.members >= group.maxMembers}>
          {group.members >= group.maxMembers ? 'Full' : 'Join Group'}
        </button>
      )}
    </div>
  );
}

export default function StudyGroups() {
  const router = useRouter();
  const [groups, setGroups] = useState([]);
  const [tab, setTab]       = useState('all');
  const [loading, setLoading] = useState(true);
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return; }
    studyGroupsAPI.getAll().then(setGroups).catch(() => setGroups(mockStudyGroups)).finally(() => setLoading(false));
  }, []);

  const handleJoin = async (g) => {
    await studyGroupsAPI.join(g.id).catch(() => {});
    setGroups(gs => gs.map(x => x.id === g.id ? { ...x, joined: true, members: x.members + 1 } : x));
    showToast(`Joined "${g.name}"!`);
  };
  const handleLeave = async (g) => {
    await studyGroupsAPI.leave(g.id).catch(() => {});
    setGroups(gs => gs.map(x => x.id === g.id ? { ...x, joined: false, members: x.members - 1 } : x));
    showToast(`Left "${g.name}"`);
  };

  const filtered = tab === 'mine' ? groups.filter(g => g.joined) : groups;
  const tabs = [
    { id: 'all',  label: 'All Groups', count: groups.length },
    { id: 'mine', label: 'My Groups',  count: groups.filter(g => g.joined).length },
  ];

  return (
    <Layout title="Study Groups" subtitle="Collaborate and learn with your peers">
      {ToastComponent}
      {loading ? <Loading /> : (
        <>
          <Tabs tabs={tabs} active={tab} onChange={setTab} />
          <div className="grid-3">
            {filtered.map(g => <GroupCard key={g.id} group={g} onJoin={handleJoin} onLeave={handleLeave} />)}
          </div>
        </>
      )}
    </Layout>
  );
}
