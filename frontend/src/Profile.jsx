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
  Database,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  HelpCircle,
  Trash2
} from 'lucide-react';
import { Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom';
import './App.css';

export default function Profile({ onLogout }) {
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState('');
  const [newTask, setNewTask] = useState({ title: '', description: '', subject: '', deadline: '' });
  const [postLoading, setPostLoading] = useState(false);
  const [showPostForm, setShowPostForm] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname.split('/').pop(); // Gets 'profile', 'my-tasks', etc., or 'dashboard'
  
  const [userProfile, setUserProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);

  const fetchTasks = async () => {
    let endpoint = '/tasks';
    if (currentPath === 'my-tasks') endpoint = '/tasks/mine';
    if (currentPath === 'posted-requests') endpoint = '/tasks/posted';
    if (currentPath === 'active-workflows') endpoint = '/tasks/active';

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
    if (!editName.trim()) {
      setError('Name cannot be empty');
      return;
    }
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
    if (!userProfile) {
      loadProfile();
    }
  }, [userProfile]);

  useEffect(() => {
    if (currentPath !== 'profile') {
      fetchTasks();
    }
  }, [currentPath]);

  const computeStats = () => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
    const failed = tasks.filter((t) => t.status === 'cancelled' || t.status === 'failed').length;
    
    // Average progress check
    const activeTasks = tasks.filter(t => t.status === 'in_progress' || t.status === 'completed' || t.status === 'pending');
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
      const payload = {
        title: newTask.title,
        description: newTask.description,
        subject: newTask.subject,
        deadline: newTask.deadline ? newTask.deadline : null,
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
      setNewTask({ title: '', description: '', subject: '', deadline: '' });
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
      const res = await fetch(`/tasks/${id}/accept`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to accept task');
      }
      // Redirect to the task detail page after accepting
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
      const res = await fetch(`/tasks/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Delete failed');
      fetchTasks();
    } catch (err) {
      setError(err.message);
    }
  };


  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toISOString().split('T')[0];
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-logo">
          <div className="logo-box">
            <Users size={20} />
          </div>
          <h2>StudentConnect</h2>
        </div>

        <nav>
          <ul>
            <NavLink to="/dashboard" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <LayoutDashboard />
              Dashboard
            </NavLink>
            <NavLink to="/dashboard/my-tasks" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <CheckSquare />
              My Tasks
            </NavLink>
            <NavLink to="/dashboard/posted-requests" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <FileText />
              Posted Requests
            </NavLink>
            <NavLink to="/dashboard/active-workflows" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <GitMerge />
              Active Workflows
            </NavLink>
            <NavLink to="/dashboard/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <User />
              Profile
            </NavLink>
          </ul>

          <div className="nav-divider"></div>

          <ul>
            <li className="nav-item">
              <PlusCircle />
              Post Assignment
            </li>
            <li className="nav-item">
              <Activity />
              Monitoring
            </li>
            <li className="nav-item">
              <Database />
              Database
            </li>
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <h1>
              {currentPath === 'my-tasks' ? 'My Tasks' :
               currentPath === 'posted-requests' ? 'Posted Requests' :
               currentPath === 'active-workflows' ? 'Active Workflows' :
               currentPath === 'profile' ? 'Profile' : 'Dashboard'}
            </h1>
            <p>{currentPath === 'profile' ? "Manage your account details and settings" : "Welcome back! Here's your task data."}</p>
          </div>
          <div className="header-right">
            <button className="signout-btn" onClick={handleLogout}>Sign Out</button>
          </div>
        </header>

        <Routes>
          <Route path="profile" element={
            <section className="profile-wrapper">
              {profileLoading ? (
                <div className="loader"></div>
              ) : userProfile ? (
                <div className="profile-card">
                  <div className="profile-avatar">
                    <User size={48} />
                  </div>
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
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                          <button 
                            className="btn-primary" 
                            onClick={handleUpdateName} 
                            disabled={updateLoading}
                          >
                            {updateLoading ? 'Saving...' : 'Save'}
                          </button>
                          <button 
                            className="btn-secondary" 
                            onClick={() => {
                              setIsEditing(false);
                              setEditName(userProfile.name);
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <h2>{userProfile.name}</h2>
                        <button 
                          className="edit-btn" 
                          onClick={() => setIsEditing(true)}
                          title="Edit name"
                        >
                          Edit
                        </button>
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
                        <strong className="status-badge status-completed">Active</strong>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p>Failed to load profile.</p>
              )}
            </section>
          } />

          <Route path="*" element={
            <>
              {/* Stats — only on Dashboard index */}
              {(!currentPath || currentPath === 'dashboard') && (
                <section className="workflow-stats">
                  <div className="stat-card">
                    <div className="stat-icon-wrap icon-blue"><FileText /></div>
                    <div className="stat-value">{total}</div>
                    <div className="stat-label">Total Requests</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon-wrap icon-yellow"><Clock /></div>
                    <div className="stat-value">{inProgress}</div>
                    <div className="stat-label">In Progress</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon-wrap icon-green"><CheckCircle2 /></div>
                    <div className="stat-value">{completed}</div>
                    <div className="stat-label">Completed</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon-wrap icon-red"><XCircle /></div>
                    <div className="stat-value">{failed}</div>
                    <div className="stat-label">Failed</div>
                  </div>
                </section>
              )}

              {/* Table — all task views */}
              <section className="task-section">
                {currentPath === 'active-workflows' && (
                  <div className="overall-progress-banner" style={{ margin: '1.5rem', marginBottom: '0.5rem' }}>
                    <div className="overall-progress-header">
                      <span>Overall Progress</span>
                      <span className="task-title" style={{ fontSize: '1.125rem' }}>{avgProgress}%</span>
                    </div>
                    <div className="overall-progress-bar-large">
                      <div className="overall-progress-fill" style={{ width: `${avgProgress}%` }}></div>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280' }}>
                      Based on average progress of active and completed tasks.
                    </p>
                  </div>
                )}

                <div className="task-section-header">
                  <h3>
                    {currentPath === 'posted-requests' ? 'Posted Requests' :
                     currentPath === 'my-tasks' ? 'Tasks I\'m Working On' :
                     currentPath === 'active-workflows' ? 'Active Workflows' : 'Recent Activity'}
                  </h3>
                  {currentPath === 'posted-requests' && (
                    <button
                      className="btn-primary"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}
                      onClick={() => setShowPostForm(v => !v)}
                    >
                      <PlusCircle size={15} />
                      {showPostForm ? 'Cancel' : 'Post New Assignment'}
                    </button>
                  )}
                </div>

                {currentPath === 'posted-requests' && showPostForm && (
                  <form
                    onSubmit={handlePostAssignment}
                    style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderBottom: '1px solid #e5e7eb', background: '#f9fafb', borderRadius: '0 0 12px 12px' }}
                  >
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.35rem' }}>Title <span style={{color:'#dc2626'}}>*</span></label>
                      <input
                        type="text"
                        placeholder="Assignment title..."
                        value={newTask.title}
                        onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                        style={{ width: '100%', padding: '0.6rem 0.875rem', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '0.875rem', boxSizing: 'border-box' }}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.35rem' }}>Description</label>
                      <textarea
                        placeholder="Describe the assignment..."
                        value={newTask.description}
                        onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                        rows={3}
                        style={{ width: '100%', padding: '0.6rem 0.875rem', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '0.875rem', resize: 'vertical', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.35rem' }}>Subject <span style={{color:'#dc2626'}}>*</span></label>
                      <input
                        type="text"
                        placeholder="e.g. Mathematics, Computer Science..."
                        value={newTask.subject}
                        onChange={(e) => setNewTask({ ...newTask, subject: e.target.value })}
                        style={{ width: '100%', padding: '0.6rem 0.875rem', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '0.875rem', boxSizing: 'border-box' }}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.35rem' }}>Deadline</label>
                      <input
                        type="date"
                        value={newTask.deadline}
                        onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                        style={{ padding: '0.6rem 0.875rem', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '0.875rem' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button type="submit" className="btn-primary" disabled={postLoading}>
                        {postLoading ? 'Posting...' : 'Post Assignment'}
                      </button>
                      <button type="button" onClick={() => setShowPostForm(false)} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', fontSize: '0.875rem' }}>
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {error && <div className="error-message" style={{padding: '0 1.5rem'}}>{error}</div>}

                <div className="task-table-wrapper">
                  <table>
                    <thead>
                      {currentPath === 'posted-requests' ? (
                        <tr>
                          <th>ID</th>
                          <th>Title</th>
                          <th>Subject</th>
                          <th>Posted</th>
                          <th>Deadline</th>
                          <th>Status</th>
                          <th>Accepted By</th>
                          <th>Actions</th>
                        </tr>
                      ) : (
                        <tr>
                          <th>Task ID</th>
                          <th>Title</th>
                          <th>Description</th>
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
                          <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                            {currentPath === 'my-tasks' ? 'No tasks assigned to you yet. Accept a task from Dashboard to see it here.' :
                             currentPath === 'posted-requests' ? 'You haven\'t posted any assignments yet.' :
                             currentPath === 'active-workflows' ? 'No active workflows running.' :
                             'No recent activity found.'}
                          </td>
                        </tr>
                      ) : (
                        tasks.map((task) => {
                          const statusClass = task.status ? `status-${task.status.replace('_', '')}` : 'status-pending';

                          return (
                            <tr key={task.id}>
                              {currentPath === 'posted-requests' ? (
                                <>
                                  <td className="task-id">#{task.id}</td>
                                  <td className="task-title">{task.title}</td>
                                  <td className="task-subtitle">{task.subject || <span style={{ color: '#d1d5db' }}>—</span>}</td>
                                  <td className="task-subtitle">{formatDate(task.created_at)}</td>
                                  <td className="task-subtitle">
                                    {task.deadline ? (
                                      <span style={{ color: new Date(task.deadline) < new Date() ? '#dc2626' : '#059669', fontWeight: 500 }}>
                                        {formatDate(task.deadline)}
                                      </span>
                                    ) : <span style={{ color: '#d1d5db' }}>—</span>}
                                  </td>
                                  <td><span className={`status-badge ${statusClass}`}>{task.status || 'pending'}</span></td>
                                  <td className="task-subtitle">{task.assignee_name || <span style={{ color: '#d1d5db' }}>No one yet</span>}</td>
                                </>
                              ) : (
                                <>
                                  <td className="task-id">ASG-{String(task.id).padStart(3, '0')}</td>
                                  <td className="task-title">{task.title}</td>
                                  <td className="task-subtitle" style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {task.description || <span style={{ color: '#d1d5db' }}>—</span>}
                                  </td>
                                  <td>
                                    <select
                                      className={`status-badge ${statusClass}`}
                                      value={task.status || 'pending'}
                                      onChange={(e) => handleStatusChange(task.id, e.target.value, task.progress)}
                                      disabled={task.status === 'completed'}
                                      style={{ cursor: task.status === 'completed' ? 'not-allowed' : 'pointer', border: 'none', outline: 'none', appearance: 'none', paddingRight: '1rem', marginBottom: '4px' }}
                                    >
                                      <option value="pending">Pending</option>
                                      <option value="accepted">Accepted</option>
                                      <option value="in_progress">In Progress</option>
                                      <option value="submitted">Submitted</option>
                                      {task.creator_id === userProfile?.id && <option value="completed">Completed</option>}
                                      <option value="cancelled">Cancelled</option>
                                    </select>
                                  </td>
                                  <td style={{ minWidth: '120px' }}>
                                    <div className="progress-container">
                                      <div className="progress-fill" style={{ width: `${task.progress || 0}%` }}></div>
                                    </div>
                                    {task.status === 'in_progress' ? (
                                      <div className="progress-input-wrapper">
                                        <input 
                                          type="number" 
                                          className="progress-input"
                                          min="0"
                                          max="100"
                                          defaultValue={task.progress || 0}
                                          onBlur={(e) => handleStatusChange(task.id, task.status, e.target.value)}
                                        />
                                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>%</span>
                                      </div>
                                    ) : (
                                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginTop: '4px' }}>
                                        {task.progress || 0}%
                                      </span>
                                    )}
                                  </td>
                                  <td className="task-subtitle">
                                    {task.deadline ? (
                                      <span style={{ color: new Date(task.deadline) < new Date() ? '#dc2626' : '#059669', fontWeight: 500 }}>
                                        {formatDate(task.deadline)}
                                      </span>
                                    ) : <span style={{ color: '#d1d5db' }}>—</span>}
                                  </td>
                                  <td className="task-subtitle">{formatDate(task.created_at)}</td>
                                </>
                              )}
                              <td style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                {currentPath !== 'my-tasks' && !task.accepted && task.creator_id !== userProfile?.id && (
                                  <button
                                    className="btn-primary"
                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                    onClick={() => handleAccept(task.id)}
                                  >
                                    Accept
                                  </button>
                                )}
                                <button className="action-view" onClick={() => navigate(`/dashboard/task/${task.id}`)}>
                                  <Eye /> View
                                </button>
                                <button
                                  className="action-view"
                                  style={{ color: '#dc2626' }}
                                  onClick={() => handleDeleteTask(task.id)}
                                  title="Delete task"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          } />
        </Routes>
      </main>

      <div style={{ position: 'fixed', bottom: '2rem', right: '2rem' }}>
        <button className="help-btn">
          <HelpCircle size={18} />
        </button>
      </div>
    </div>
  );
}
