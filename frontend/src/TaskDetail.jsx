import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  User,
  Zap,
  RefreshCw,
} from 'lucide-react';
import { API_URL } from './apiConfig';
import './App.css';

const STEPS = [
  { id: 'accepted',    label: 'Accepted',    emoji: '✅' },
  { id: 'in_progress', label: 'In Progress', emoji: '⚡' },
  { id: 'submitted',   label: 'Submitted',   emoji: '📤' },
  { id: 'completed',   label: 'Completed',   emoji: '🎉' },
];

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  const fetchTask = async () => {
    try {
      const res = await fetch(`${API_URL}/tasks/detail/${id}`, { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 404) throw new Error('Task not found.');
        throw new Error(`Failed to load task (${res.status})`);
      }
      setTask(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadProfile = async () => {
    try {
      const res = await fetch(`${API_URL}/api/user/profile`, { credentials: 'include' });
      if (res.ok) setUserProfile(await res.json());
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
  };

  useEffect(() => {
    fetchTask();
    loadProfile();
  }, [id]);

  const handleStatusUpdate = async (newStatus) => {
    setUpdateLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/tasks/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Update failed');
      }
      fetchTask();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdateLoading(false);
    }
  };

  /* ── Loading ── */
  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', gap: '1rem' }}>
      <div style={{
        width: 52, height: 52,
        background: 'linear-gradient(135deg, var(--primary), var(--accent))',
        borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 24px var(--primary-glow)', animation: 'pulse 1.5s ease-in-out infinite',
      }}>
        <Zap size={24} color="white" />
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading task details…</p>
    </div>
  );

  /* ── Error ── */
  if (error && !task) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', gap: '1rem' }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%', background: 'var(--danger-soft)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <AlertCircle size={28} color="var(--danger)" />
      </div>
      <div>
        <h2 style={{ margin: '0 0 0.5rem', color: 'var(--text-primary)', fontWeight: 800 }}>Task Not Found</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>{error}</p>
      </div>
      <Link to="/dashboard" className="btn-primary" style={{ textDecoration: 'none' }}>
        ← Back to Dashboard
      </Link>
    </div>
  );

  const currentStepIndex = STEPS.findIndex(s =>
    s.id === (task.status === 'pending' ? 'accepted' : task.status)
  );

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Not set';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isPastDeadline = task.deadline && new Date(task.deadline) < new Date();
  const isCreator = userProfile && task.creator_id === userProfile.id;
  const isLocked = task.status === 'completed' || task.status === 'cancelled';

  return (
    <div className="task-detail-layout">
      {/* Back Button */}
      <div className="task-detail-header">
        <button onClick={() => navigate(-1)} className="back-btn">
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
      </div>

      <div className="task-detail-grid">
        {/* ── Main Column ── */}
        <div className="task-main-column">

          {/* Title Card */}
          <div className="task-card main-info-card">
            <div className="task-header-row">
              <h1>{task.title}</h1>
              <span className={`status-badge status-${task.status.replace('_', '')}`} style={{ flexShrink: 0 }}>
                {task.status.replace('_', ' ')}
              </span>
            </div>

            <div className="task-meta-info">
              <div className="meta-item">
                <Calendar size={15} />
                <span style={{ color: isPastDeadline ? '#dc2626' : undefined, fontWeight: isPastDeadline ? 600 : 400 }}>
                  {isPastDeadline ? '⚠ Overdue · ' : 'Due: '}
                  {formatDate(task.deadline)}
                </span>
              </div>
              {task.subject && (
                <div className="meta-item">
                  <span className="subject-tag">
                    <Briefcase size={13} style={{ marginRight: 5 }} />
                    {task.subject}
                  </span>
                </div>
              )}
              <div className="meta-item">
                <Clock size={15} />
                <span>Created {formatDate(task.created_at)}</span>
              </div>
            </div>

            <div className="task-description-section">
              <h3>Description</h3>
              <p>{task.description || 'No description provided for this task.'}</p>
            </div>

            {task.attachment_url && (
              <div className="task-description-section" style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem' }}>
                <h3>Attachment</h3>
                <a href={task.attachment_url} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
                  📄 View / Download Attachment
                </a>
              </div>
            )}

            {/* Progress bar inside main card */}
            <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Progress</span>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.02em' }}>{task.progress || 0}%</span>
              </div>
              <div style={{ height: 8, background: 'var(--bg-subtle)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${task.progress || 0}%`,
                  borderRadius: 999,
                  background: task.status === 'completed'
                    ? 'linear-gradient(90deg, var(--success), #34d399)'
                    : 'linear-gradient(90deg, var(--primary), var(--accent))',
                  transition: 'width 0.5s ease',
                  boxShadow: '0 1px 6px var(--primary-glow)',
                }} />
              </div>
            </div>
          </div>

          {/* Workflow Steps Card */}
          <div className="task-card workflow-card">
            <h3 style={{ margin: '0 0 2rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Workflow Progress
            </h3>
            <div className="workflow-steps">
              {STEPS.map((step, index) => {
                const isCompleted = index < currentStepIndex || task.status === 'completed';
                const isActive = index === currentStepIndex && task.status !== 'completed';

                return (
                  <div key={step.id} className={`step-item ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}>
                    <div className="step-circle">
                      {isCompleted ? <CheckCircle2 size={16} /> : <span>{index + 1}</span>}
                    </div>
                    <span className="step-label">{step.label}</span>
                    <div className="step-line" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div className="task-sidebar-column">

          {/* Status Update Card */}
          <div className="task-card status-update-card">
            <h4>Update Status</h4>
            {!task.accepted ? (
              <div style={{
                padding: '1rem', borderRadius: 'var(--radius-md)',
                background: 'var(--primary-soft)', color: 'var(--primary)',
                fontSize: '0.82rem', fontWeight: 600, textAlign: 'center',
                lineHeight: 1.5, border: '1px dashed var(--primary-soft)'
              }}>
                <Clock size={16} style={{ marginBottom: '0.5rem', display: 'block', margin: '0 auto 0.5rem' }} />
                Waiting for someone to accept this assignment...
              </div>
            ) : isLocked ? (
              <div style={{
                padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)',
                background: task.status === 'completed' ? 'var(--success-soft)' : 'var(--danger-soft)',
                color: task.status === 'completed' ? '#10b981' : '#ef4444',
                fontSize: '0.82rem', fontWeight: 600, textAlign: 'center',
              }}>
                {task.status === 'completed' ? '🎉 Task completed & locked' : '🚫 Task cancelled'}
              </div>
            ) : (
              <>
                <select
                  value={task.status === 'pending' ? 'accepted' : task.status}
                  onChange={(e) => handleStatusUpdate(e.target.value)}
                  disabled={updateLoading}
                  className="status-dropdown"
                >
                  <option value="pending" disabled>Pending</option>
                  {STEPS
                    .filter(s => s.id !== 'completed' || isCreator)
                    .map(s => (
                      <option key={s.id} value={s.id}>{s.emoji} {s.label}</option>
                    ))}
                  <option value="cancelled">❌ Cancelled</option>
                </select>
                {updateLoading && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.6rem', fontSize: '0.78rem', color: 'var(--primary)' }}>
                    <RefreshCw size={13} style={{ animation: 'spin 0.8s linear infinite' }} />
                    Updating…
                  </div>
                )}
                {error && (
                  <div className="error-message" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
                    ⚠ {error}
                  </div>
                )}
                {!isCreator && (
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.75rem', lineHeight: 1.5 }}>
                    Only the task creator can mark it as <strong>Completed</strong>.
                  </p>
                )}
              </>
            )}
          </div>

          {/* Assignee Card */}
          <div className="task-card user-card">
            <h4>Assigned To</h4>
            <div className="user-info">
              <div className="user-avatar">
                {task.assignee_name ? task.assignee_name.charAt(0).toUpperCase() : <User size={18} />}
              </div>
              <div className="user-text">
                <p className="user-name">{task.assignee_name || 'Not yet assigned'}</p>
                <p className="user-email">{task.assignee_email || '—'}</p>
              </div>
            </div>
          </div>

          {/* Creator Card */}
          <div className="task-card user-card">
            <h4>Posted By</h4>
            <div className="user-info">
              <div className="user-avatar creator">
                {task.creator_name ? task.creator_name.charAt(0).toUpperCase() : <User size={18} />}
              </div>
              <div className="user-text">
                <p className="user-name">
                  {task.creator_name}
                  {isCreator && (
                    <span style={{ marginLeft: '0.4rem', fontSize: '0.68rem', background: 'var(--primary-soft)', color: 'var(--primary)', padding: '0.1rem 0.5rem', borderRadius: 999, fontWeight: 700 }}>
                      You
                    </span>
                  )}
                </p>
                <p className="user-email">{task.creator_email}</p>
              </div>
            </div>
          </div>

          {/* Task Meta Card */}
          <div className="task-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>
              Details
            </h4>
            {[
              { label: 'Task ID', value: `#${task.id}` },
              { label: 'Deadline', value: formatDate(task.deadline), highlight: isPastDeadline },
              { label: 'Progress', value: `${task.progress || 0}%` },
            ].map(({ label, value, highlight }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
                <span style={{ fontSize: '0.825rem', fontWeight: 700, color: highlight ? '#dc2626' : 'var(--text-primary)' }}>{value}</span>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
