import React, { useEffect, useState } from 'react';
import {
  Users,
  LayoutDashboard,
  CheckSquare,
  FileText,
  GitMerge,
  User,
  PlusCircle,
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  HelpCircle,
  Trash2,
  Zap,
  LogOut,
  TrendingUp,
  AlertCircle,
  Moon,
  Sun,
} from 'lucide-react';
import { Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from './context/ThemeContext.jsx';
import './App.css';

export default function Profile({ onLogout }) {
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState('');
  const [newTask, setNewTask] = useState({ title: '', description: '', subject: '', deadline: '', attachment: null });
  const [postLoading, setPostLoading] = useState(false);
  const [showPostForm, setShowPostForm] = useState(false);

  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname.split('/').pop();

  const [userProfile, setUserProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);

  const fetchTasks = async () => {
    let endpoint = '/tasks/dashboard';
    if (currentPath === 'my-tasks') endpoint = '/tasks/mine';
    if (currentPath === 'posted-requests') endpoint = '/tasks/posted';
    if (currentPath === 'active-workflows') endpoint = '/tasks/active';
    if (currentPath === 'market') endpoint = '/tasks';
    // For the main dashboard (!currentPath), we use '/tasks/dashboard' per user request.

    try {
      const res = await fetch(endpoint, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load tasks');
      const data = await res.json();
      setTasks(data);
    } catch (err) {
      setError(err.message || 'Could not fetch tasks');
    }
  };

  const loadProfile = async () => {
    setProfileLoading(true);
    try {
      const res = await fetch('/api/user/profile', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load profile');
      const data = await res.json();
      setUserProfile(data);
      setEditName(data.name || '');
    } catch (err) {
      console.error(err);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleUpdateName = async () => {
    if (!editName.trim()) { setError('Name cannot be empty'); return; }
    setUpdateLoading(true);
    setError('');
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: editName }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to update profile');
      }
      setUserProfile({ ...userProfile, name: editName });
      setIsEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdateLoading(false);
    }
  };

  useEffect(() => {
    if (!userProfile) loadProfile();
  }, [userProfile]);

  useEffect(() => {
    if (currentPath !== 'profile') fetchTasks();
  }, [currentPath]);

  const computeStats = () => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
    const failed = tasks.filter((t) => t.status === 'cancelled' || t.status === 'failed').length;
    const activeTasks = tasks.filter(t => ['in_progress', 'completed', 'pending'].includes(t.status));
    const avgProgress = activeTasks.length > 0
      ? Math.round(activeTasks.reduce((acc, t) => acc + (t.progress || 0), 0) / activeTasks.length)
      : 0;
    return { total, completed, inProgress, failed, avgProgress };
  };

  const { total, completed, inProgress, failed, avgProgress } = computeStats();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      onLogout();
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  const handlePostAssignment = async (e) => {
    e.preventDefault();
    setError('');
    if (!newTask.title.trim()) { setError('Title is required'); return; }
    setPostLoading(true);
    try {
      let attachmentUrl = null;
      if (newTask.attachment) {
        const formData = new FormData();
        formData.append('attachment', newTask.attachment);
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });
        if (!uploadRes.ok) {
          const errData = await uploadRes.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to upload attachment');
        }
        const uploadData = await uploadRes.json();
        attachmentUrl = uploadData.url;
      }

      const payload = {
        title: newTask.title,
        description: newTask.description,
        subject: newTask.subject,
        deadline: newTask.deadline ? newTask.deadline : null,
        attachment_url: attachmentUrl,
      };
      const res = await fetch('/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to post assignment');
      }
      setNewTask({ title: '', description: '', subject: '', deadline: '', attachment: null });
      setShowPostForm(false);
      fetchTasks();
    } catch (err) {
      setError(err.message);
    } finally {
      setPostLoading(false);
    }
  };

  const handleAccept = async (id) => {
    try {
      const res = await fetch(`/tasks/${id}/accept`, { method: 'POST', credentials: 'include' });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to accept task');
      }
      navigate(`/dashboard/task/${id}`);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStatusChange = async (id, status, progress = null) => {
    try {
      const body = { status };
      if (progress !== null) body.progress = parseInt(progress, 10);
      const res = await fetch(`/tasks/${id}/status`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Status update failed');
      }
      fetchTasks();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteTask = async (id) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      const res = await fetch(`/tasks/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('Delete failed');
      fetchTasks();
    } catch (err) {
      setError(err.message);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toISOString().split('T')[0];
  };

  const getPageTitle = () => {
    const map = {
      'my-tasks': 'My Tasks',
      'posted-requests': 'Posted Requests',
      'active-workflows': 'Active Workflows',
      'market': 'Task Market',
      'profile': 'Profile',
    };
    return map[currentPath] || 'Dashboard';
  };

  const getPageSubtitle = () => {
    const map = {
      'my-tasks': 'Tasks assigned to you',
      'posted-requests': "Assignments you've posted for others",
      'active-workflows': 'Currently running workflows',
      'market': 'Browse public assignments from everyone',
      'profile': 'Manage your account details',
    };
    return map[currentPath] || 'Overview of your activity';
  };

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={17} />, end: true },
    { to: '/dashboard/market', label: 'Task Market', icon: <Users size={17} /> },
    { to: '/dashboard/my-tasks', label: 'My Tasks', icon: <CheckSquare size={17} /> },
    { to: '/dashboard/posted-requests', label: 'Posted Requests', icon: <FileText size={17} /> },
    { to: '/dashboard/active-workflows', label: 'Active Workflows', icon: <GitMerge size={17} /> },
    { to: '/dashboard/profile', label: 'Profile', icon: <User size={17} /> },
  ];

  return (
    <div className="dashboard-container">
      {/* ── Sidebar ── */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-logo">
          <div className="logo-box"><Zap size={18} /></div>
          <h2>StudentConnect</h2>
        </div>

        <nav>
          <ul>
            {navItems.map(({ to, label, icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                {icon} {label}
              </NavLink>
            ))}
          </ul>

          <div className="nav-divider" />

          <ul>
            <li className="nav-item" style={{ opacity: 0.5, cursor: 'default' }}>
              <Activity size={17} /> Analytics
            </li>
            <li className="nav-item" style={{ opacity: 0.5, cursor: 'default' }}>
              <TrendingUp size={17} /> Reports
            </li>
          </ul>

          <div className="nav-divider" />

          <ul>
            <li className="nav-item" onClick={toggleTheme}>
              {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
              {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
            </li>
          </ul>
        </nav>

        {/* Sidebar footer */}
        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
          {userProfile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 0.5rem' }}>
              <div style={{
                width: 36, height: 36, borderRadius: '10px',
                background: 'var(--primary-soft)',
                color: 'var(--primary)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontWeight: 800, fontSize: '1rem',
                border: '1.5px solid var(--primary-soft)', flexShrink: 0,
              }}>
                {userProfile.name?.charAt(0).toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.825rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {userProfile.name}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {userProfile.email}
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="dashboard-main">
        {/* Header */}
        <header className="dashboard-header">
          <div>
            <h1>{getPageTitle()}</h1>
            <p>{getPageSubtitle()}</p>
          </div>
          <div className="header-right">
            <button className="signout-btn" onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </header>

        <Routes>
          {/* ── Profile Route ── */}
          <Route path="profile" element={
            <section className="profile-wrapper">
              {profileLoading ? (
                <div className="loader" />
              ) : userProfile ? (
                <div className="profile-card">
                  <div className="profile-avatar"><User size={40} /></div>
                  <div className="profile-details">
                    {isEditing ? (
                      <div style={{ marginBottom: '1rem' }}>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="edit-name-input"
                          placeholder="Enter your name"
                          autoFocus
                        />
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', justifyContent: 'center' }}>
                          <button className="btn-primary" onClick={handleUpdateName} disabled={updateLoading}>
                            {updateLoading ? 'Saving…' : 'Save Changes'}
                          </button>
                          <button className="btn-secondary" onClick={() => { setIsEditing(false); setEditName(userProfile.name); }}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                        <h2>{userProfile.name}</h2>
                        <button className="edit-btn" onClick={() => setIsEditing(true)}>Edit</button>
                      </div>
                    )}
                    <p className="profile-email">{userProfile.email}</p>

                    <div className="profile-stats">
                      <div className="p-stat">
                        <span>Member Since</span>
                        <strong>{formatDate(userProfile.created_at)}</strong>
                      </div>
                      <div className="p-stat">
                        <span>Account Status</span>
                        <strong className="status-badge status-completed">● Active</strong>
                      </div>
                    </div>

                    {error && <div className="error-message" style={{ marginTop: '1rem' }}>⚠ {error}</div>}
                  </div>
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)' }}>Failed to load profile.</p>
              )}
            </section>
          } />

          {/* ── All Other Routes ── */}
          <Route path="*" element={
            <>
              {/* Stats — only on Dashboard index */}
              {(!currentPath || currentPath === 'dashboard') && (
                <section className="workflow-stats">
                  <div className="stat-card">
                    <div className="stat-icon-wrap icon-blue"><FileText size={20} /></div>
                    <div className="stat-value">{total}</div>
                    <div className="stat-label">Total Requests</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon-wrap icon-yellow"><Clock size={20} /></div>
                    <div className="stat-value">{inProgress}</div>
                    <div className="stat-label">In Progress</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon-wrap icon-green"><CheckCircle2 size={20} /></div>
                    <div className="stat-value">{completed}</div>
                    <div className="stat-label">Completed</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon-wrap icon-red"><XCircle size={20} /></div>
                    <div className="stat-value">{failed}</div>
                    <div className="stat-label">Failed / Cancelled</div>
                  </div>
                </section>
              )}

              {/* Task Table Section */}
              <section className="task-section">
                {/* Active Workflows – Progress Banner */}
                {currentPath === 'active-workflows' && (
                  <div className="overall-progress-banner">
                    <div className="overall-progress-header">
                      <span>Overall Progress</span>
                      <span style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--primary)', letterSpacing: '-0.03em' }}>
                        {avgProgress}%
                      </span>
                    </div>
                    <div className="overall-progress-bar-large">
                      <div className="overall-progress-fill" style={{ width: `${avgProgress}%` }} />
                    </div>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Average progress across active and completed tasks.
                    </p>
                  </div>
                )}

                {/* Section Header */}
                <div className="task-section-header">
                  <h3>
                    {currentPath === 'posted-requests' ? 'Posted Requests' :
                     currentPath === 'my-tasks' ? 'Tasks I\'m Working On' :
                     currentPath === 'market' ? 'Available Assignments' :
                     currentPath === 'active-workflows' ? 'Active Workflows' : 'Recent Activity'}
                  </h3>
                  {currentPath === 'posted-requests' && (
                    <button
                      className="btn-primary"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                      onClick={() => setShowPostForm(v => !v)}
                    >
                      <PlusCircle size={15} />
                      {showPostForm ? 'Cancel' : 'Post Assignment'}
                    </button>
                  )}
                </div>

                {/* Post Form */}
                {currentPath === 'posted-requests' && showPostForm && (
                  <form onSubmit={handlePostAssignment} style={{
                    padding: '1.5rem',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1rem',
                    borderBottom: '1px solid var(--border-subtle)',
                    background: 'var(--bg-subtle)',
                  }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={labelStyle}>Title <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <input type="text" placeholder="Assignment title…" value={newTask.title}
                        onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                        style={inputStyle} required />
                    </div>
                    <div>
                      <label style={labelStyle}>Subject <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <input type="text" placeholder="e.g. Mathematics, CS…" value={newTask.subject}
                        onChange={(e) => setNewTask({ ...newTask, subject: e.target.value })}
                        style={inputStyle} required />
                    </div>
                    <div>
                      <label style={labelStyle}>Deadline</label>
                      <input type="date" value={newTask.deadline}
                        onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                        style={inputStyle} />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={labelStyle}>Description</label>
                      <textarea placeholder="Describe the assignment…" value={newTask.description}
                        onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                        rows={3} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={labelStyle}>Attachment (Image/PDF)</label>
                      <input type="file" accept="image/*,application/pdf"
                        onChange={(e) => setNewTask({ ...newTask, attachment: e.target.files[0] || null })}
                        style={{ ...inputStyle, padding: '0.45rem', fontSize: '0.8rem' }} />
                    </div>
                    <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.75rem' }}>
                      <button type="submit" className="btn-primary" disabled={postLoading}>
                        {postLoading ? 'Posting…' : '✓ Post Assignment'}
                      </button>
                      <button type="button" className="btn-secondary" onClick={() => setShowPostForm(false)}>
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {error && (
                  <div className="error-message" style={{ margin: '0 1.5rem 0.5rem' }}>
                    <AlertCircle size={14} style={{ marginRight: '0.35rem', verticalAlign: 'middle' }} />
                    {error}
                  </div>
                )}

                {/* Table */}
                <div className="task-table-wrapper">
                  <table>
                    <thead>
                      {currentPath === 'posted-requests' || currentPath === 'market' ? (
                        <tr>
                          <th>ID</th>
                          <th>Title</th>
                          <th>Subject</th>
                          <th>Posted</th>
                          <th>Deadline</th>
                          <th>Status</th>
                          <th>{currentPath === 'market' ? 'Creator' : 'Accepted By'}</th>
                          <th>Actions</th>
                        </tr>
                      ) : (
                        <tr>
                          <th>Task ID</th>
                          <th>Title</th>
                          <th>Subject</th>
                          <th>Status</th>
                          <th>Progress</th>
                          <th>Deadline</th>
                          <th>Date</th>
                          <th>Actions</th>
                        </tr>
                      )}
                    </thead>
                    <tbody>
                      {tasks.length === 0 ? (
                        <tr>
                          <td colSpan="8">
                            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📭</div>
                              <div style={{ fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                                {currentPath === 'my-tasks' ? 'No tasks yet' :
                                 currentPath === 'posted-requests' ? 'No posted assignments' :
                                 currentPath === 'market' ? 'No assignments available' :
                                 currentPath === 'active-workflows' ? 'No active workflows' :
                                 'No recent activity'}
                              </div>
                              <div style={{ fontSize: '0.82rem' }}>
                                {currentPath === 'my-tasks' ? 'Accept a task from the market to see it here.' :
                                 currentPath === 'posted-requests' ? 'Post your first assignment above.' :
                                 currentPath === 'market' ? 'Check back later for new requests.' :
                                 'Tasks in progress will appear here.'}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : tasks.map((task) => {
                        const statusClass = task.status ? `status-${task.status.replace('_', '')}` : 'status-pending';
                        const isPastDeadline = task.deadline && new Date(task.deadline) < new Date();

                        return (
                          <tr key={task.id}>
                            {currentPath === 'posted-requests' || currentPath === 'market' ? (
                              <>
                                <td className="task-id">#{task.id}</td>
                                <td className="task-title" style={{ maxWidth: 160 }}>{task.title}</td>
                                <td className="task-subtitle">
                                  {task.subject
                                    ? <span style={{ background: 'var(--primary-soft)', color: 'var(--primary)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>{task.subject}</span>
                                    : <span style={{ color: '#d1d5db' }}>—</span>}
                                </td>
                                <td className="task-subtitle">{formatDate(task.created_at)}</td>
                                <td className="task-subtitle">
                                  {task.deadline
                                    ? <span style={{ color: isPastDeadline ? '#dc2626' : '#059669', fontWeight: 600, fontSize: '0.8rem' }}>{formatDate(task.deadline)}</span>
                                    : <span style={{ color: '#d1d5db' }}>—</span>}
                                </td>
                                <td><span className={`status-badge ${statusClass}`}>{task.status || 'pending'}</span></td>
                                <td className="task-subtitle" style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                                  {currentPath === 'market' ? (task.creator_name || 'Anonymous') : (task.assignee_name || 'No one yet')}
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="task-id">ASG-{String(task.id).padStart(3, '0')}</td>
                                <td className="task-title" style={{ maxWidth: 160 }}>{task.title}</td>
                                <td className="task-subtitle">
                                  {task.subject
                                    ? <span style={{ background: 'var(--primary-soft)', color: 'var(--primary)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>{task.subject}</span>
                                    : <span style={{ color: '#d1d5db' }}>—</span>}
                                </td>
                                <td>
                                  {task.accepted ? (
                                    <select
                                      className={`status-badge ${statusClass}`}
                                      value={task.status || 'pending'}
                                      onChange={(e) => handleStatusChange(task.id, e.target.value, task.progress)}
                                      disabled={task.status === 'completed'}
                                      style={{ cursor: task.status === 'completed' ? 'not-allowed' : 'pointer', border: 'none', outline: 'none', appearance: 'none', paddingRight: '0.5rem' }}
                                    >
                                      <option value="pending">Pending</option>
                                      <option value="accepted">Accepted</option>
                                      <option value="in_progress">In Progress</option>
                                      <option value="submitted">Submitted</option>
                                      {task.creator_id === userProfile?.id && <option value="completed">Completed</option>}
                                      <option value="cancelled">Cancelled</option>
                                    </select>
                                  ) : (
                                    <span className={`status-badge ${statusClass}`} style={{ opacity: 0.8 }}>
                                      {task.status || 'pending'}
                                    </span>
                                  )}
                                </td>
                                <td style={{ minWidth: 130 }}>
                                  <div className="progress-container">
                                    <div className="progress-fill" style={{ width: `${task.progress || 0}%` }} />
                                  </div>
                                  {task.status === 'in_progress' ? (
                                    <div className="progress-input-wrapper">
                                      <input
                                        type="number" className="progress-input"
                                        min="0" max="100" defaultValue={task.progress || 0}
                                        onBlur={(e) => handleStatusChange(task.id, task.status, e.target.value)}
                                      />
                                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>%</span>
                                    </div>
                                  ) : (
                                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginTop: '4px' }}>
                                      {task.progress || 0}%
                                    </span>
                                  )}
                                </td>
                                <td className="task-subtitle">
                                  {task.deadline
                                    ? <span style={{ color: isPastDeadline ? '#dc2626' : '#059669', fontWeight: 600, fontSize: '0.8rem' }}>{formatDate(task.deadline)}</span>
                                    : <span style={{ color: '#d1d5db' }}>—</span>}
                                </td>
                                <td className="task-subtitle">{formatDate(task.created_at)}</td>
                              </>
                            )}
                            <td>
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                {currentPath === 'market' && !task.accepted && task.creator_id !== userProfile?.id && (
                                  <button className="btn-primary" style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem' }} onClick={() => handleAccept(task.id)}>
                                    Accept
                                  </button>
                                )}
                                <button className="action-view" onClick={() => navigate(`/dashboard/task/${task.id}`)}>
                                  <Eye size={13} /> View
                                </button>
                                <button
                                  className="action-view"
                                  style={{ color: '#ef4444', background: 'rgba(239,68,68,0.07)' }}
                                  onClick={() => handleDeleteTask(task.id)}
                                  title="Delete task"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          } />
        </Routes>
      </main>

      {/* Help FAB */}
      <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 50 }}>
        <button className="help-btn" title="Help">
          <HelpCircle size={17} />
        </button>
      </div>
    </div>
  );
}

/* ── Shared inline style helpers ── */
const labelStyle = {
  fontSize: '0.75rem',
  fontWeight: 700,
  color: 'var(--text-secondary)',
  display: 'block',
  marginBottom: '0.4rem',
  letterSpacing: '0.01em',
};

const inputStyle = {
  width: '100%',
  padding: '0.65rem 0.875rem',
  borderRadius: 'var(--radius-md)',
  border: '1.5px solid var(--border)',
  fontSize: '0.875rem',
  fontFamily: 'Inter, sans-serif',
  color: 'var(--text-primary)',
  background: 'var(--bg-card)',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s',
};
