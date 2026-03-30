import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import {
  FiUsers, FiCalendar, FiPlus, FiX, FiCheck, FiClock,
  FiLock, FiUnlock, FiSearch, FiBell, FiTrash2, FiBookOpen,
  FiShield, FiAlertCircle, FiMessageCircle,
} from 'react-icons/fi';
import { getToken, getUser } from '../../lib/api';
import { Layout, Loading, Tabs, useToast, EmptyState, Modal, FormField, Input, Textarea } from '../../components/components';

// ─── LocalStorage helpers ─────────────────────────────────────────────────────
const STORAGE_KEY = 'lms_study_groups_v2';

function loadGroups() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveGroups(groups) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
}

function generateId() {
  return `grp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?';
}

// ─── GroupCard component ──────────────────────────────────────────────────────
function GroupCard({ group, currentUser, onRequestJoin, onLeave, onApprove, onReject, onDelete, onOpen }) {
  const isOwner   = group.ownerId === currentUser?.id || group.ownerName === currentUser?.name;
  const isMember  = group.members.some(m => m.id === currentUser?.id || m.name === currentUser?.name);
  const pendingReq = group.joinRequests?.find(r => r.userId === currentUser?.id || r.userName === currentUser?.name);
  const pendingCount = group.joinRequests?.filter(r => r.status === 'pending').length || 0;
  const pct = Math.min(100, Math.round((group.members.length / (group.maxMembers || 10)) * 100));

  return (
    <div className="sg-card" onClick={() => onOpen && onOpen(group)}>
      {/* Avatar */}
      <div className="sg-card-header">
        <div className="sg-avatar" style={{ background: group.color || 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
          {getInitials(group.name)}
        </div>
        <div className="sg-card-badges">
          {isOwner && <span className="sg-badge owner"><FiShield size={10} /> Owner</span>}
          {group.isPrivate && <span className="sg-badge private"><FiLock size={10} /> Private</span>}
          {!group.isPrivate && <span className="sg-badge public"><FiUnlock size={10} /> Open</span>}
          {isOwner && pendingCount > 0 && (
            <span className="sg-badge requests" style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }}>
              <FiBell size={10} /> {pendingCount} request{pendingCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <div className="sg-name">{group.name}</div>
      <div className="sg-topic">{group.topic || 'General Study'}</div>
      {group.description && <div className="sg-desc">{group.description}</div>}

      <div className="sg-meta">
        <span className="sg-meta-item"><FiUsers size={11} />{group.members.length}/{group.maxMembers || 10} members</span>
        {group.schedule && <span className="sg-meta-item"><FiCalendar size={11} />{group.schedule}</span>}
        <span className="sg-meta-item"><FiBookOpen size={11} />by {group.ownerName}</span>
      </div>

      <div className="sg-bar-wrap">
        <div className="sg-bar"><div className="sg-bar-fill" style={{ width: `${pct}%`, background: pct >= 90 ? 'var(--red)' : pct >= 70 ? 'var(--amber)' : 'var(--brand)' }} /></div>
        <span className="sg-bar-label">{pct}% full</span>
      </div>

      {/* Actions */}
      <div className="sg-actions" onClick={e => e.stopPropagation()}>
        {isOwner ? (
          <button className="btn btn-secondary btn-sm sg-action-btn danger" onClick={() => onDelete(group)}>
            <FiTrash2 size={12} /> Delete Group
          </button>
        ) : isMember ? (
          <button className="btn btn-secondary btn-sm sg-action-btn" onClick={() => onLeave(group)}>
            <FiX size={12} /> Leave Group
          </button>
        ) : pendingReq?.status === 'pending' ? (
          <button className="btn btn-secondary btn-sm sg-action-btn" disabled>
            <FiClock size={12} /> Request Pending…
          </button>
        ) : pendingReq?.status === 'rejected' ? (
          <button className="btn btn-secondary btn-sm sg-action-btn" disabled style={{ color: 'var(--red)' }}>
            <FiX size={12} /> Request Declined
          </button>
        ) : group.members.length >= (group.maxMembers || 10) ? (
          <button className="btn btn-secondary btn-sm sg-action-btn" disabled>Full</button>
        ) : (
          <button className="btn btn-primary btn-sm sg-action-btn" onClick={() => onRequestJoin(group)}>
            {group.isPrivate ? <><FiLock size={12} /> Request to Join</> : <><FiUsers size={12} /> Join Group</>}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Group Detail / Requests Modal ───────────────────────────────────────────
function GroupDetailModal({ group, currentUser, onClose, onApprove, onReject, onLeave, onDelete }) {
  if (!group) return null;
  const isOwner  = group.ownerId === currentUser?.id || group.ownerName === currentUser?.name;
  const isMember = group.members.some(m => m.id === currentUser?.id || m.name === currentUser?.name);
  const pending  = (group.joinRequests || []).filter(r => r.status === 'pending');

  return (
    <Modal title={group.name} open={true} onClose={onClose} size="md">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Info */}
        <div className="sg-detail-info">
          <div className="sg-detail-row">
            <span className="sg-detail-label">Topic</span>
            <span className="sg-detail-value">{group.topic || 'General Study'}</span>
          </div>
          <div className="sg-detail-row">
            <span className="sg-detail-label">Owner</span>
            <span className="sg-detail-value">{group.ownerName}</span>
          </div>
          <div className="sg-detail-row">
            <span className="sg-detail-label">Members</span>
            <span className="sg-detail-value">{group.members.length} / {group.maxMembers || 10}</span>
          </div>
          {group.schedule && (
            <div className="sg-detail-row">
              <span className="sg-detail-label">Schedule</span>
              <span className="sg-detail-value">{group.schedule}</span>
            </div>
          )}
          {group.description && (
            <div className="sg-detail-row" style={{ flexDirection: 'column', gap: 4 }}>
              <span className="sg-detail-label">Description</span>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{group.description}</span>
            </div>
          )}
        </div>

        {/* Current Members */}
        <div>
          <div className="sg-section-title"><FiUsers size={14} /> Current Members</div>
          <div className="sg-members-list">
            {group.members.map((m, i) => (
              <div key={i} className="sg-member-row">
                <div className="sg-member-avatar">{getInitials(m.name)}</div>
                <div className="sg-member-name">{m.name} {m.name === group.ownerName && <span style={{ fontSize: '0.7rem', color: 'var(--brand)', fontWeight: 700 }}>Owner</span>}</div>
                <div className="sg-member-joined">{m.joinedAt ? new Date(m.joinedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Join Requests (Owner only) */}
        {isOwner && pending.length > 0 && (
          <div>
            <div className="sg-section-title" style={{ color: 'var(--red)' }}>
              <FiBell size={14} /> Pending Requests ({pending.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pending.map((req, i) => (
                <div key={i} className="sg-request-row">
                  <div className="sg-member-avatar">{getInitials(req.userName)}</div>
                  <div style={{ flex: 1 }}>
                    <div className="sg-member-name">{req.userName}</div>
                    {req.message && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>"{req.message}"</div>}
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 2 }}>{new Date(req.requestedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="sg-req-btn approve" onClick={() => onApprove(group.id, req)}>
                      <FiCheck size={13} /> Approve
                    </button>
                    <button className="sg-req-btn reject" onClick={() => onReject(group.id, req)}>
                      <FiX size={13} /> Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Past Requests (Owner only) */}
        {isOwner && (group.joinRequests || []).filter(r => r.status !== 'pending').length > 0 && (
          <div>
            <div className="sg-section-title" style={{ color: 'var(--text-muted)' }}>Request History</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(group.joinRequests || []).filter(r => r.status !== 'pending').map((req, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div className="sg-member-avatar" style={{ width: 28, height: 28, fontSize: '0.65rem' }}>{getInitials(req.userName)}</div>
                  <div style={{ flex: 1, fontSize: '0.82rem', color: 'var(--text)' }}>{req.userName}</div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: req.status === 'approved' ? 'var(--green)' : 'var(--red)', background: req.status === 'approved' ? 'var(--green-bg)' : 'var(--red-bg)', padding: '2px 8px', borderRadius: 20 }}>
                    {req.status === 'approved' ? '✓ Approved' : '✕ Declined'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
          {!isOwner && isMember && (
            <button className="btn btn-secondary btn-sm" onClick={() => { onLeave(group); onClose(); }}>
              <FiX size={12} /> Leave Group
            </button>
          )}
          {isOwner && (
            <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }} onClick={() => { onDelete(group); onClose(); }}>
              <FiTrash2 size={12} /> Delete Group
            </button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Request to Join Modal ────────────────────────────────────────────────────
function RequestJoinModal({ group, onClose, onSubmit }) {
  const [message, setMessage] = useState('');
  if (!group) return null;
  return (
    <Modal title={`Join "${group.name}"`} open={true} onClose={onClose} size="sm"
      footer={
        <>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={() => onSubmit(message)}>
            {group.isPrivate ? 'Send Request' : 'Join Now'}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {group.isPrivate && (
          <div style={{ display: 'flex', gap: 10, padding: 12, background: 'var(--brand-bg)', borderRadius: 8, border: '1px solid var(--brand-border)' }}>
            <FiLock size={16} color="var(--brand)" style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text)', lineHeight: 1.6 }}>
              This is a private group. The owner will review your request and let you in.
            </p>
          </div>
        )}
        <FormField label="Message to owner (optional)">
          <Textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Hi! I'm interested in joining your study group because..."
            style={{ minHeight: 80 }}
          />
        </FormField>
      </div>
    </Modal>
  );
}

// ─── Create Group Modal ───────────────────────────────────────────────────────
const COLORS = [
  'linear-gradient(135deg, #6366f1, #8b5cf6)',
  'linear-gradient(135deg, #0ea5e9, #6366f1)',
  'linear-gradient(135deg, #f59e0b, #ef4444)',
  'linear-gradient(135deg, #10b981, #0ea5e9)',
  'linear-gradient(135deg, #ec4899, #8b5cf6)',
  'linear-gradient(135deg, #f97316, #eab308)',
];

function CreateGroupModal({ onClose, onCreated, currentUser }) {
  const [form, setForm] = useState({
    name: '', topic: '', description: '', maxMembers: 10, schedule: '', isPrivate: false, color: COLORS[0]
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!form.name.trim()) { setError('Group name is required.'); return; }
    setSaving(true);
    const newGroup = {
      id: generateId(),
      name: form.name.trim(),
      topic: form.topic.trim(),
      description: form.description.trim(),
      maxMembers: parseInt(form.maxMembers) || 10,
      schedule: form.schedule.trim(),
      isPrivate: form.isPrivate,
      color: form.color,
      ownerId: currentUser?.id,
      ownerName: currentUser?.name || 'You',
      createdAt: new Date().toISOString(),
      members: [{ id: currentUser?.id, name: currentUser?.name || 'You', joinedAt: new Date().toISOString() }],
      joinRequests: [],
    };
    const all = loadGroups();
    all.push(newGroup);
    saveGroups(all);
    onCreated(all);
    setSaving(false);
    onClose();
  };

  return (
    <Modal
      title="Create Study Group"
      open={true}
      onClose={onClose}
      size="md"
      footer={
        <>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={handleCreate} disabled={saving}>
            {saving ? 'Creating…' : 'Create Group'}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, background: 'var(--red-bg)', border: '1px solid var(--red-border)', borderRadius: 8, fontSize: '0.875rem', color: 'var(--red)' }}>
            <FiAlertCircle size={14} /> {error}
          </div>
        )}
        {/* Color picker */}
        <FormField label="Group Colour">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setForm(f => ({ ...f, color: c }))}
                style={{
                  width: 32, height: 32, borderRadius: '50%', background: c, border: form.color === c ? '3px solid #000' : '3px solid transparent',
                  cursor: 'pointer', transition: 'border 0.15s',
                }}
              />
            ))}
          </div>
        </FormField>

        <FormField label="Group Name *">
          <Input value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setError(''); }} placeholder="e.g. Frontend Dev Squad" autoFocus />
        </FormField>
        <div className="grid-2">
          <FormField label="Topic / Course">
            <Input value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))} placeholder="e.g. React, AWS, Python…" />
          </FormField>
          <FormField label="Max Members">
            <Input type="number" value={form.maxMembers} onChange={e => setForm(f => ({ ...f, maxMembers: e.target.value }))} min={2} max={50} />
          </FormField>
        </div>
        <FormField label="Schedule (optional)">
          <Input value={form.schedule} onChange={e => setForm(f => ({ ...f, schedule: e.target.value }))} placeholder="e.g. Saturdays 4 PM, Daily at 7 PM…" />
        </FormField>
        <FormField label="Description (optional)">
          <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What will this group study? What's the goal?" style={{ minHeight: 80 }} />
        </FormField>

        {/* Private toggle */}
        <div
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-soft)', borderRadius: 8, cursor: 'pointer', border: '1px solid var(--border)' }}
          onClick={() => setForm(f => ({ ...f, isPrivate: !f.isPrivate }))}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: '0.875rem', color: 'var(--text)' }}>
              {form.isPrivate ? <FiLock size={14} color="var(--brand)" /> : <FiUnlock size={14} color="var(--text-dim)" />}
              {form.isPrivate ? 'Private Group' : 'Open Group'}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {form.isPrivate ? 'Members must request to join. You approve or decline.' : 'Anyone can join instantly.'}
            </div>
          </div>
          <div style={{
            width: 40, height: 22, borderRadius: 11, background: form.isPrivate ? 'var(--brand)' : 'var(--border)',
            position: 'relative', transition: 'background 0.2s', flexShrink: 0
          }}>
            <div style={{
              position: 'absolute', top: 3, left: form.isPrivate ? 21 : 3,
              width: 16, height: 16, borderRadius: '50%', background: '#fff',
              transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function StudyGroups() {
  const router = useRouter();
  const [user, setUser]         = useState(null);
  const [groups, setGroups]     = useState([]);
  const [tab, setTab]           = useState('all');
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [openGroup, setOpenGroup]   = useState(null);
  const [joinTarget, setJoinTarget] = useState(null);
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return; }
    const u = getUser();
    if (!u) { router.push('/login'); return; }
    if (u.role !== 'employee') { router.push('/dashboard'); return; }
    setUser(u);
    setGroups(loadGroups());
    setLoading(false);
  }, []);

  // ── derived lists ──────────────────────────────────────────────────────────
  const myGroups = groups.filter(g =>
    g.members.some(m => m.id === user?.id || m.name === user?.name) ||
    g.ownerId === user?.id || g.ownerName === user?.name
  );
  const ownedGroups = groups.filter(g => g.ownerId === user?.id || g.ownerName === user?.name);
  const totalPending = ownedGroups.reduce((s, g) => s + (g.joinRequests?.filter(r => r.status === 'pending').length || 0), 0);

  const filtered = (tab === 'mine' ? myGroups : groups).filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    (g.topic || '').toLowerCase().includes(search.toLowerCase())
  );

  // ── handlers ───────────────────────────────────────────────────────────────
  const handleCreated = (updatedGroups) => {
    setGroups(updatedGroups);
    showToast('Study group created! 🎉');
  };

  const handleRequestJoin = (group) => {
    setJoinTarget(group);
  };

  const submitJoinRequest = (message) => {
    const group = joinTarget;
    setJoinTarget(null);
    const all = loadGroups();
    const idx = all.findIndex(g => g.id === group.id);
    if (idx === -1) return;

    if (!group.isPrivate) {
      // Instant join for open groups
      all[idx].members.push({ id: user?.id, name: user?.name || 'Me', joinedAt: new Date().toISOString() });
      saveGroups(all);
      setGroups([...all]);
      showToast(`Joined "${group.name}"! 🎉`);
    } else {
      // Request to join private group
      if (!all[idx].joinRequests) all[idx].joinRequests = [];
      const existing = all[idx].joinRequests.find(r => r.userId === user?.id || r.userName === user?.name);
      if (existing) { showToast('You already have a pending request.', 'warning'); return; }
      all[idx].joinRequests.push({
        userId: user?.id,
        userName: user?.name || 'You',
        message,
        requestedAt: new Date().toISOString(),
        status: 'pending',
      });
      saveGroups(all);
      setGroups([...all]);
      showToast(`Join request sent to "${group.name}"!`);
    }
  };

  const handleLeave = (group) => {
    const all = loadGroups();
    const idx = all.findIndex(g => g.id === group.id);
    if (idx === -1) return;
    all[idx].members = all[idx].members.filter(m => m.id !== user?.id && m.name !== user?.name);
    saveGroups(all);
    setGroups([...all]);
    showToast(`Left "${group.name}".`);
  };

  const handleDelete = (group) => {
    if (!confirm(`Delete "${group.name}"? This cannot be undone.`)) return;
    const all = loadGroups().filter(g => g.id !== group.id);
    saveGroups(all);
    setGroups(all);
    showToast(`Group "${group.name}" deleted.`);
  };

  const handleApprove = (groupId, req) => {
    const all = loadGroups();
    const idx = all.findIndex(g => g.id === groupId);
    if (idx === -1) return;
    const reqIdx = all[idx].joinRequests.findIndex(r => r.userId === req.userId && r.userName === req.userName);
    if (reqIdx === -1) return;
    all[idx].joinRequests[reqIdx].status = 'approved';
    // Add to members
    all[idx].members.push({ id: req.userId, name: req.userName, joinedAt: new Date().toISOString() });
    saveGroups(all);
    setGroups([...all]);
    // Update openGroup reference
    if (openGroup?.id === groupId) setOpenGroup({ ...all[idx] });
    showToast(`${req.userName} approved! ✓`);
  };

  const handleReject = (groupId, req) => {
    const all = loadGroups();
    const idx = all.findIndex(g => g.id === groupId);
    if (idx === -1) return;
    const reqIdx = all[idx].joinRequests.findIndex(r => r.userId === req.userId && r.userName === req.userName);
    if (reqIdx === -1) return;
    all[idx].joinRequests[reqIdx].status = 'rejected';
    saveGroups(all);
    setGroups([...all]);
    if (openGroup?.id === groupId) setOpenGroup({ ...all[idx] });
    showToast(`${req.userName}'s request declined.`, 'warning');
  };

  const tabs = [
    { id: 'all',  label: 'All Groups',  count: groups.length },
    { id: 'mine', label: 'My Groups',   count: myGroups.length },
  ];

  if (loading) return <Layout><Loading /></Layout>;

  return (
    <Layout title="Study Groups">
      {ToastComponent}

      {/* Pending requests alert banner */}
      {totalPending > 0 && (
        <div className="sg-alert-banner" onClick={() => setTab('mine')}>
          <FiBell size={16} color="var(--amber)" />
          <span>You have <strong>{totalPending} pending join request{totalPending > 1 ? 's' : ''}</strong> for your groups. Click to review.</span>
        </div>
      )}

      {/* Page header */}
      <div className="sg-page-header">
        <div>
          <h1 className="page-header-title" style={{ marginBottom: 4 }}>Study Groups</h1>
          <p className="page-header-desc">Collaborate with peers, share knowledge, and grow together.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <FiPlus size={14} /> Create Group
        </button>
      </div>

      {/* Search + Tabs */}
      <div className="sg-toolbar">
        <Tabs tabs={tabs} active={tab} onChange={setTab} />
        <div className="sg-search-wrap">
          <FiSearch size={14} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
          <input
            className="sg-search-input"
            placeholder="Search groups or topics…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Grid */}
      <div className="sg-grid">
        {/* "Create Group" prompt card in My Groups tab when empty owned */}
        {tab === 'mine' && ownedGroups.length === 0 && filtered.length === 0 && (
          <div style={{ gridColumn: '1 / -1' }}>
            <EmptyState
              icon={<FiUsers size={32} />}
              title="You haven't joined or created any groups yet"
              description="Create your own study group or browse All Groups to find one to join."
            />
          </div>
        )}

        {tab === 'all' && filtered.length === 0 && (
          <div style={{ gridColumn: '1 / -1' }}>
            <EmptyState
              icon={<FiUsers size={32} />}
              title="No study groups found"
              description={search ? 'Try a different search term.' : 'Be the first! Create a study group for others to join.'}
            />
          </div>
        )}

        {filtered.map(g => (
          <GroupCard
            key={g.id}
            group={g}
            currentUser={user}
            onRequestJoin={handleRequestJoin}
            onLeave={handleLeave}
            onDelete={handleDelete}
            onApprove={handleApprove}
            onReject={handleReject}
            onOpen={setOpenGroup}
          />
        ))}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <CreateGroupModal
          currentUser={user}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}

      {/* Group Detail / Requests Modal */}
      {openGroup && (
        <GroupDetailModal
          group={groups.find(g => g.id === openGroup.id) || openGroup}
          currentUser={user}
          onClose={() => setOpenGroup(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          onLeave={handleLeave}
          onDelete={handleDelete}
        />
      )}

      {/* Request to Join modal */}
      {joinTarget && (
        <RequestJoinModal
          group={joinTarget}
          onClose={() => setJoinTarget(null)}
          onSubmit={submitJoinRequest}
        />
      )}
    </Layout>
  );
}
