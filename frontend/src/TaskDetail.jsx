import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Clock, 
  Calendar, 
  User, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Briefcase
} from 'lucide-react';
import './App.css';

const STEPS = [
  { id: 'accepted', label: 'Accepted' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'completed', label: 'Completed' },
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
    const url = `/tasks/detail/${id}`;
    console.log('Fetching task detail from:', url);
    try {
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 404) throw new Error('Task detail endpoint not found (404). Check backend routes.');
        throw new Error(`Failed to load task (Status: ${res.status})`);
      }
      const data = await res.json();
      setTask(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadProfile = async () => {
    try {
      const res = await fetch('/api/user/profile', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUserProfile(data);
      }
    } catch (err) {
      console.error('Failed to load profile in detail view:', err);
    }
  };

  useEffect(() => {
    fetchTask();
    loadProfile();
  }, [id]);

  const handleStatusUpdate = async (newStatus) => {
    setUpdateLoading(true);
    setError(''); // Clear previous errors
    try {
      const res = await fetch(`/tasks/${id}/status`, {
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

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
      <div className="loader"></div>
    </div>
  );
  
  if (error) return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <AlertCircle size={48} color="#dc2626" style={{ marginBottom: '1rem' }} />
      <h2 style={{ marginBottom: '0.5rem' }}>Task Not Found</h2>
      <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>{error}</p>
      <Link to="/dashboard" className="btn-primary" style={{ textDecoration: 'none' }}>Go to Dashboard</Link>
    </div>
  );

  const currentStepIndex = STEPS.findIndex(s => s.id === (task.status === 'pending' ? 'accepted' : task.status));
  
  const formatDate = (dateStr) => {
    if (!dateStr) return 'No date set';
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', day: 'numeric', year: 'numeric' 
    });
  };

  return (
    <div className="task-detail-layout">
      <div className="task-detail-header">
        <button onClick={() => navigate(-1)} className="back-btn">
          <ArrowLeft size={18} /> Back to Dashboard
        </button>
      </div>

      <div className="task-detail-grid">
        {/* Main Content */}
        <div className="task-main-column">
          <div className="task-card main-info-card">
            <div className="task-header-row">
              <h1>{task.title}</h1>
              <span className={`status-badge status-${task.status.replace('_', '')}`}>
                {task.status.replace('_', ' ')}
              </span>
            </div>
            
            <div className="task-meta-info">
              <div className="meta-item">
                <Calendar size={16} />
                <span>Due: {formatDate(task.deadline)}</span>
              </div>
              <div className="meta-item">
                <span className="subject-tag">
                  <Briefcase size={14} style={{ marginRight: '6px' }} />
                  {task.subject || 'No Subject'}
                </span>
              </div>
            </div>

            <div className="task-description-section">
              <h3>Description</h3>
              <p>{task.description || 'No description provided for this task.'}</p>
            </div>
          </div>

          <div className="task-card workflow-card">
            <h3 style={{ marginBottom: '2.5rem', fontSize: '1rem', color: '#374151' }}>Workflow Progress</h3>
            <div className="workflow-steps">
              {STEPS.map((step, index) => {
                const isCompleted = index < currentStepIndex || task.status === 'completed';
                const isActive = index === currentStepIndex && task.status !== 'completed';
                
                return (
                  <div key={step.id} className={`step-item ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}>
                    <div className="step-circle">
                      {isCompleted ? <CheckCircle2 size={16} /> : index + 1}
                    </div>
                    <span className="step-label">{step.label}</span>
                    <div className="step-line"></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="task-sidebar-column">
          {/* Update Status Card First (more interactive) */}
          <div className="task-card status-update-card">
            <h4>Update Task Status</h4>
            <select 
              value={task.status === 'pending' ? 'accepted' : task.status} 
              onChange={(e) => handleStatusUpdate(e.target.value)}
              disabled={updateLoading || task.status === 'cancelled' || task.status === 'completed'}
              className="status-dropdown"
            >
              <option value="pending" disabled>Pending</option>
              {STEPS.filter(s => s.id !== 'completed' || task.creator_id === userProfile?.id).map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
              <option value="cancelled">Cancelled</option>
            </select>
            {updateLoading && <p style={{ fontSize: '0.75rem', color: '#2563eb', marginTop: '0.5rem' }}>Updating status...</p>}
          </div>

          <div className="task-card user-card">
            <h4>Assigned To</h4>
            <div className="user-info">
              <div className="user-avatar">
                {task.assignee_name ? task.assignee_name.charAt(0).toUpperCase() : '?'}
              </div>
              <div className="user-text">
                <p className="user-name">{task.assignee_name || 'Not yet assigned'}</p>
                <p className="user-email">{task.assignee_email || '—'}</p>
              </div>
            </div>
          </div>

          <div className="task-card user-card">
            <h4>Posted By</h4>
            <div className="user-info">
              <div className="user-avatar creator">
                {task.creator_name ? task.creator_name.charAt(0).toUpperCase() : '?'}
              </div>
              <div className="user-text">
                <p className="user-name">{task.creator_name}</p>
                <p className="user-email">{task.creator_email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
