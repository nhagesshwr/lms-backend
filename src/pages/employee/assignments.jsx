import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { FiClipboard, FiAlertCircle, FiCheckCircle, FiClock, FiFileText, FiCode, FiEdit3, FiBarChart2 } from 'react-icons/fi';
import { getToken, assignmentsAPI, mockAssignments } from '../../lib/api';
import { Layout, Loading, Tabs, Badge, SearchBar, useToast } from '../../components/components';

const TYPE_ICONS = { quiz: FiBarChart2, project: FiCode, exercise: FiEdit3, assessment: FiFileText, report: FiFileText };
const TYPE_COLORS = { quiz: 'var(--brand-bg)', project: 'var(--teal-bg)', exercise: 'var(--orange-bg)', assessment: 'var(--violet-bg)', report: 'var(--emerald-bg)' };
const TYPE_ICON_COLORS = { quiz: 'var(--brand)', project: 'var(--teal)', exercise: 'var(--orange)', assessment: 'var(--violet)', report: 'var(--emerald)' };

function AssignmentCard({ a, onSubmit }) {
  const Icon = TYPE_ICONS[a.type] || FiClipboard;
  const statusBadge = {
    overdue:   <Badge color="red">Overdue</Badge>,
    due_today: <Badge color="amber">Due Today</Badge>,
    upcoming:  <Badge color="blue">Upcoming</Badge>,
    submitted: <Badge color="green">Submitted</Badge>,
    graded:    <Badge color="violet">Graded · {a.grade}%</Badge>,
  }[a.status];

  return (
    <div className={`assignment-card-full ${a.status}`}>
      <div className="assignment-type-icon" style={{ background: TYPE_COLORS[a.type] }}>
        <Icon size={20} color={TYPE_ICON_COLORS[a.type]} />
      </div>
      <div className="assignment-info">
        <div className="assignment-title">{a.title}</div>
        <div className="assignment-course">{a.course}</div>
        <div className="assignment-due-row">
          <FiClock size={12} />
          <span>{a.status === 'overdue' ? 'Was due' : 'Due'} {new Date(a.due).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>
      </div>
      <div className="assignment-right">
        {statusBadge}
        <div className="assignment-points">+{a.points} pts</div>
        {(a.status === 'upcoming' || a.status === 'overdue' || a.status === 'due_today') && (
          <button className="btn btn-primary btn-sm" onClick={() => onSubmit(a)}>Submit</button>
        )}
      </div>
    </div>
  );
}

export default function Assignments() {
  const router = useRouter();
  const [assignments, setAssignments] = useState([]);
  const [tab, setTab]     = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return; }
    assignmentsAPI.getMy().then(setAssignments).catch(() => setAssignments(mockAssignments)).finally(() => setLoading(false));
  }, []);

  const handleSubmit = (a) => showToast(`"${a.title}" submitted successfully!`, 'success');

  const filtered = (() => {
    let list = tab === 'all' ? assignments : assignments.filter(a => a.status === tab);
    if (search) { const q = search.toLowerCase(); list = list.filter(a => a.title.toLowerCase().includes(q) || a.course.toLowerCase().includes(q)); }
    return list;
  })();

  const counts = {
    overdue:   assignments.filter(a => a.status === 'overdue').length,
    due_today: assignments.filter(a => a.status === 'due_today').length,
    submitted: assignments.filter(a => a.status === 'submitted').length,
    graded:    assignments.filter(a => a.status === 'graded').length,
  };

  const tabs = [
    { id: 'all', label: 'All', count: assignments.length },
    { id: 'overdue', label: 'Overdue', count: counts.overdue },
    { id: 'due_today', label: 'Due Today', count: counts.due_today },
    { id: 'upcoming', label: 'Upcoming', count: assignments.filter(a => a.status === 'upcoming').length },
    { id: 'graded', label: 'Graded', count: counts.graded },
  ];

  return (
    <Layout title="Assignments" subtitle="Track and submit your course assignments">
      {ToastComponent}
      {loading ? <Loading /> : (
        <>
          <div className="toolbar">
            <Tabs tabs={tabs} active={tab} onChange={setTab} />
            <SearchBar value={search} onChange={setSearch} placeholder="Search assignments…" />
          </div>
          <div className="assignments-list">
            {filtered.length === 0
              ? <div className="empty-state card"><div className="es-icon"><FiClipboard size={28} /></div><h3>No assignments</h3></div>
              : filtered.map(a => <AssignmentCard key={a.id} a={a} onSubmit={handleSubmit} />)
            }
          </div>
        </>
      )}
    </Layout>
  );
}
