import React, { useEffect, useState, useMemo, useCallback, memo } from 'react';
import { useParams, useNavigate, Link, NavLink } from 'react-router-dom';
import Avatar from './components/Avatar.jsx';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import { useTheme } from './context/ThemeContext.jsx';
import {
  ArrowLeft, Clock, CheckCircle2, AlertCircle,
  Briefcase, User, Zap, RefreshCw, FileText,
  UserPlus, Edit3, Check, ChevronRight,
  LayoutDashboard, Users, CheckSquare, GitMerge,
  LogOut, Menu, X, Code, ExternalLink, Link2, Lock,
  Plus, Send
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_URL_SECONDARY || '';

// ─── Module-level constants (never re-created per render) ─────────────────────

const STEPS = [
  { id: 'accepted',    label: 'Accepted' },
  { id: 'in_progress', label: 'Developing' },
  { id: 'submitted',   label: 'In Review' },
  { id: 'completed',   label: 'Done' },
];



const DATE_FMT = { month: 'short', day: 'numeric', year: 'numeric' };

// ─── Memoised sub-components ─────────────────────────────────────────────────

/** Step circle in the timeline — only re-renders when its own state changes */
const TimelineStep = memo(function TimelineStep({ step, isCompleted, isActive }) {
  return (
    <div className="relative flex flex-col items-center flex-1 z-10 w-full group cursor-default">
      <div
        className={`w-4 h-4 rounded-full flex items-center justify-center mb-4 transition-all duration-200 border-2
          ${isCompleted
            ? 'bg-accent border-accent text-white'
            : isActive
              ? 'bg-bg-main border-accent'
              : 'bg-bg-main border-text-primary/10 group-hover:border-text-primary/20'
          }`}
      >
        {isCompleted && <Check size={10} strokeWidth={4} />}
        {isActive    && <div className="w-1.5 h-1.5 rounded-full bg-accent" />}
      </div>
      <span
        className={`text-[11px] tracking-wide text-center whitespace-normal sm:whitespace-nowrap uppercase font-bold
          ${isCompleted || isActive ? 'text-text-primary opacity-100' : 'text-text-secondary opacity-40'}`}
      >
        {step.label}
      </span>
    </div>
  );
});

/** CTA action strip — memoised so it doesn't flicker on unrelated state updates */
const CTAStrip = memo(function CTAStrip({ status, isCreator, isAssignee, updateLoading, onAccept, onAction, onLeave, hasMilestones }) {
  if (status === 'pending') {
    return (
      <div className="bg-accent-soft border border-accent/20 rounded-xl p-5 flex flex-col gap-4 w-full">
        <div className="text-[13px] text-accent font-medium">This task is waiting to be accepted.</div>
        {!isCreator && (
          <button
            onClick={onAccept}
            disabled={updateLoading}
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 bg-accent text-white rounded-lg text-[13px] font-semibold hover:opacity-90 transition-colors active:scale-[0.98]"
          >
            {updateLoading ? <RefreshCw size={14} className="animate-spin" /> : <ChevronRight size={14} />}
            Accept Task
          </button>
        )}
      </div>
    );
  }
  
  if (isAssignee && (status === 'accepted' || status === 'in_progress' || status === 'submitted')) {
    return (
      <div className="bg-text-primary/2 border border-border-subtle rounded-xl p-5 flex flex-col gap-4 w-full">
        <div className="text-[13px] text-text-secondary font-medium">Manage your progress</div>
        {status === 'in_progress' && !hasMilestones && (
          <button
            onClick={() => onAction('submit')}
            disabled={updateLoading}
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-lg text-[13px] font-semibold hover:bg-amber-500/20 transition-colors"
          >
            {updateLoading ? <RefreshCw size={14} className="animate-spin" /> : <GitMerge size={14} />}
            Submit for Review
          </button>
        )}
        <button
          onClick={onLeave}
          disabled={updateLoading}
          className="inline-flex items-center justify-center gap-2 w-full py-2 bg-transparent border border-red-500/20 text-red-400/60 rounded-lg text-[12px] font-semibold hover:bg-red-500/5 hover:text-red-400 transition-all"
        >
          {updateLoading ? <RefreshCw size={12} className="animate-spin" /> : <LogOut size={12} />}
          Leave Task
        </button>
      </div>
    );
  }


  if (status === 'completed') {
    if (hasMilestones) return null; 
    return (
      <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-6 flex flex-col gap-4 w-full justify-center items-center">
        <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center">
          <CheckCircle2 size={20} />
        </div>
        <div className="text-[13px] text-emerald-500/80 font-medium text-center">Task completely finished.</div>
      </div>
    );
  }

  return (
    <div className="bg-text-primary/2 border border-border-subtle rounded-xl p-5 flex flex-col justify-center w-full">
      <div className="text-[12px] text-text-secondary font-medium text-center opacity-60 uppercase tracking-widest">
        Status: <span className="text-text-primary">{status?.replace('_', ' ')}</span>
      </div>
    </div>
  );
});

// ─── Main component ───────────────────────────────────────────────────────────

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task,          setTask]          = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userProfile,   setUserProfile]   = useState(null);
  const [searchTerm,    setSearchTerm]    = useState('');
  const { theme, toggleTheme } = useTheme();

  // Proof of Work Submission State
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [subGithub, setSubGithub] = useState('');
  const [subDocs, setSubDocs] = useState('');
  const [subDrive, setSubDrive] = useState('');
  const [subNotes, setSubNotes] = useState('');

  // Milestone Submission State
  const [submittingMilestone, setSubmittingMilestone] = useState(null);
  const [mileLink, setMileLink] = useState('');
  const [mileNote, setMileNote] = useState('');

  // Add Milestone Inline State
  const [isAddingMilestone, setIsAddingMilestone] = useState(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');

  // ── Data fetching (useCallback so stable reference across renders) ──────────

  const fetchTask = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/tasks/detail/${id}`, { credentials: 'include' });
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
  }, [id]);

  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/user/profile`, { credentials: 'include' });
      if (res.ok) setUserProfile(await res.json());
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
  }, []);

  useEffect(() => {
    if (id) {
       fetchTask();
       loadProfile();
    }
  }, [id, fetchTask, loadProfile]);

  // ── Action handlers ─────────────────────────────────────────────────────────

  const handleLogout = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      navigate('/', { replace: true });
    } catch (_) {}
  }, [navigate]);

  const handleStatusUpdate = useCallback(async (newStatus) => {
    setUpdateLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/tasks/${id}/status`, {
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
  }, [id, fetchTask]);

  const handleAcceptTask = useCallback(async () => {
    setUpdateLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/tasks/${id}/accept`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to accept task');
      }
      fetchTask();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdateLoading(false);
    }
  }, [id, fetchTask]);

  const handleAction = useCallback(async (action) => {
    if (action === 'submit') {
      setShowSubmitModal(true);
      return;
    }
    setUpdateLoading(true);
    setError('');
    let url = `${API_BASE}/tasks/${id}`;
    if (action === 'approve') url += '/approve';
    else if (action === 'request-changes') url += '/request-changes';

    try {
      const res = await fetch(url, { method: 'POST', credentials: 'include' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Operation failed');
      }
      fetchTask();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdateLoading(false);
    }
  }, [id, fetchTask]);

  const handleFinalSubmit = useCallback(async () => {
    setUpdateLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/tasks/${id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          github: subGithub,
          docs: subDocs,
          drive: subDrive,
          notes: subNotes
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to submit review');
      }
      setShowSubmitModal(false);
      fetchTask();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdateLoading(false);
    }
  }, [id, fetchTask, subGithub, subDocs, subDrive, subNotes]);

  const handleAddMilestone = useCallback(async (e) => {
    if (e) e.preventDefault();
    if (!newMilestoneTitle.trim()) return;
    setUpdateLoading(true);
    try {
      const res = await fetch(`${API_BASE}/tasks/${id}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: newMilestoneTitle }),
      });
      if (res.ok) {
         setNewMilestoneTitle('');
         setIsAddingMilestone(false);
         fetchTask();
      } else {
         const errData = await res.json().catch(() => ({}));
         throw new Error(errData.error || 'Failed to add milestone');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdateLoading(false);
    }
  }, [id, fetchTask, newMilestoneTitle]);

  const handleMilestoneStatus = useCallback(async (mid, status) => {
    setUpdateLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/tasks/${id}/milestones/${mid}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      if (res.ok) fetchTask();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdateLoading(false);
    }
  }, [id, fetchTask]);
  
  const handleMilestoneSubmit = useCallback(async () => {
    setUpdateLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/tasks/${id}/milestones/${submittingMilestone.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ link: mileLink, note: mileNote }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to submit milestone');
      }
      setSubmittingMilestone(null);
      fetchTask();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdateLoading(false);
    }
  }, [id, fetchTask, submittingMilestone, mileLink, mileNote]);

  const handleLeaveTask = useCallback(async () => {
    if (!window.confirm('Are you sure you want to leave this task? All your progress will be reset.')) return;
    
    setUpdateLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/tasks/${id}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to leave task');
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdateLoading(false);
    }
  }, [id, navigate]);

  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);
  const openMobileMenu  = useCallback(() => setMobileMenuOpen(true),  []);

  // ── Pure derivations (useMemo — no side effects) ────────────────────────────

  const formatDate = useCallback((dateStr) => {
    if (!dateStr) return 'Not set';
    return new Date(dateStr).toLocaleDateString('en-US', DATE_FMT);
  }, []);

  const isPastDeadline = useMemo(
    () => task?.deadline && new Date(task.deadline) < new Date(),
    [task?.deadline]
  );

  const isCreator = useMemo(
    () => !!(userProfile && task && String(task.creator_id) === String(userProfile.id)),
    [userProfile, task?.creator_id]
  );

  const isAssignee = useMemo(
    () => !!(userProfile && task && String(task.assignee_id) === String(userProfile.id)),
    [userProfile, task?.assignee_id]
  );

  const currentStepIndex = useMemo(
    () => STEPS.findIndex(s => s.id === (task?.status === 'pending' ? 'accepted' : task?.status)),
    [task?.status]
  );

  const percentage = useMemo(() => {
    if (!task) return 0;
    if (task.milestones?.length > 0) {
      const completed = task.milestones.filter(m => m.status === 'done').length;
      return Math.round((completed / task.milestones.length) * 100);
    }
    if (task.progress) return task.progress;
    const map = { completed: 100, submitted: 75, in_progress: 50, accepted: 25 };
    return map[task.status] ?? 0;
  }, [task?.progress, task?.status, task?.milestones]);

  // ── Progress bar width (memoised string to avoid recalc on every render) ───

  const progressBarStyle = useMemo(
    () => ({ width: `calc(${percentage}% - 16px)` }),
    [percentage]
  );

  // ── Early returns ───────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-bg-main gap-4">
      <p className="text-text-secondary text-sm font-medium animate-pulse">Loading workspace…</p>
    </div>
  );

  if (error && !task) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-bg-main text-center gap-4">
      <div className="w-16 h-16 rounded-full bg-red-400/10 flex items-center justify-center">
        <AlertCircle size={32} className="text-red-400" />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-text-primary mb-2">Task Not Found</h2>
        <p className="text-text-secondary text-sm max-w-sm mb-6">{error}</p>
      </div>
      <Link to="/dashboard" className="px-6 py-3 bg-bg-card border border-border-subtle text-text-primary rounded-xl font-medium text-sm hover:bg-text-primary/5 transition-colors shadow-sm">
        ← Back to Dashboard
      </Link>
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex bg-bg-main h-screen overflow-hidden text-text-primary font-inter transition-colors duration-300">
      
      <Sidebar 
        mobileMenuOpen={mobileMenuOpen}
        closeMobileMenu={() => setMobileMenuOpen(false)}
        userProfile={userProfile}
        theme={theme}
        toggleTheme={toggleTheme}
        onLogout={handleLogout}
        // TaskDetail doesn't have the profile modal logic yet, but we can redirect or ignore
      />

      {/* ── Main Content ── */}
      <main className="flex-1 h-screen overflow-y-auto bg-bg-main transition-colors duration-300">
        
        <Header 
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          userProfile={userProfile}
          openMobileMenu={() => setMobileMenuOpen(true)}
        />

        <div className="p-8 max-w-7xl mx-auto">

        {/* Breadcrumb */}
        <div className="mb-10">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-[12px] font-semibold text-text-secondary hover:text-accent transition-colors uppercase tracking-widest">
            <ArrowLeft size={14} strokeWidth={2.5} /> Back to Dashboard
          </Link>
        </div>

        {/* Floating Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 mb-12">
          <div>
            <h1 className="text-3xl sm:text-4xl font-semibold text-text-primary tracking-tight leading-tight mb-6">
              {task.title}
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-text-primary/3 border border-border-subtle text-text-secondary rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider">
                {task.status?.replace('_', ' ') || 'Pending'}
              </span>
              <span className="bg-text-primary/3 border border-border-subtle text-text-secondary rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider">
                Assignee: {task.assignee_name || 'Unassigned'}
              </span>
              <span className="bg-text-primary/3 border border-border-subtle text-text-secondary rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider">
                Posted {formatDate(task.created_at)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {task.status === 'pending' && !isCreator && (
              <button
                onClick={handleAcceptTask}
                disabled={updateLoading}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-accent text-white rounded-xl text-[13px] font-semibold hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-accent/10"
              >
                {updateLoading ? <RefreshCw size={14} className="animate-spin" /> : <ChevronRight size={14} />}
                Accept Task
              </button>
            )}
            <button className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-text-primary/3 border border-border-subtle text-text-primary hover:bg-text-primary/6 rounded-xl text-[13px] font-semibold transition-colors">
              <UserPlus size={16} /> Assign
            </button>
            {isCreator && (
              <button className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-text-primary/3 border border-border-subtle text-text-primary hover:bg-text-primary/6 rounded-xl text-[13px] font-semibold transition-colors">
                <Edit3 size={16} /> Edit
              </button>
            )}
          </div>
        </div>

        {/* Glass Panel */}
        <div className="premium-card mb-16">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-12">

            {/* Properties grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-10 gap-x-12">
              <div>
                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-3 flex items-center gap-2 opacity-60"><Zap size={14} /> Status</p>
                <p className="text-[15px] font-semibold text-text-primary capitalize">{task.status?.replace('_', ' ') || 'Pending'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-4 flex items-center gap-2 opacity-60"><User size={14} /> Assigned To</p>
                {task.assignee_name ? (
                  <div className="flex items-center gap-3">
                    <Avatar name={task.assignee_name} photoUrl={task.assignee_photo_url} size="md" />
                    <span className="text-[15px] font-semibold text-text-primary">{task.assignee_name}</span>
                  </div>
                ) : (
                  <p className="text-[15px] font-medium text-text-secondary italic">Unassigned</p>
                )}
              </div>
              <div>
                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-4 flex items-center gap-2 opacity-60"><Briefcase size={14} /> Posted By</p>
                <div className="flex items-center gap-3">
                  <Avatar name={task.creator_name} photoUrl={task.creator_photo_url} size="md" />
                  <span className="text-[15px] font-semibold text-text-primary">{task.creator_name || 'Unknown'}</span>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-3 flex items-center gap-2 opacity-60"><Clock size={14} /> Deadline</p>
                <p className={`text-[15px] font-semibold ${isPastDeadline ? 'text-red-400' : 'text-text-primary'}`}>{formatDate(task.deadline)}</p>
              </div>
            </div>

             {/* CTA Strip — passes stable callbacks to memoised child */}
            <div className="flex flex-col justify-center border-t md:border-t-0 md:border-l border-border-subtle pt-10 md:pt-0 md:pl-12">
              <CTAStrip
                status={task.status}
                isCreator={isCreator}
                isAssignee={isAssignee}
                updateLoading={updateLoading}
                onAccept={handleAcceptTask}
                onAction={handleAction}
                onLeave={handleLeaveTask}
                hasMilestones={task.milestones?.length > 0}
              />
            </div>
          </div>

          {/* Error alert */}
          {error && (
            <div className="mt-8 p-4 bg-red-50 text-red-600 text-[14px] font-medium rounded-xl flex items-center gap-2 shadow-sm border border-red-100">
              <AlertCircle size={18} /> {error}
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="mb-24">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-xl font-semibold text-text-primary tracking-tight">Project Status</h3>
            <span className="text-[11px] font-bold text-accent tracking-widest uppercase bg-accent-soft border border-accent/20 px-3 py-1 rounded-full">{percentage}% Complete</span>
          </div>

          <div className="relative pt-6 pb-10 w-full px-4">
            {/* Track */}
            <div className="absolute top-[31px] left-4 right-4 h-[1.5px] bg-text-primary/5 rounded-full -z-10" />
            {/* Fill */}
            <div
              className="absolute top-[31px] left-4 h-[1.5px] rounded-full transition-[width] duration-1000 ease-in-out bg-accent -z-10"
              style={progressBarStyle}
            />
            {/* Steps */}
            <div className="flex justify-between relative w-full">
              {STEPS.map((step, index) => (
                <TimelineStep
                  key={step.id}
                  step={step}
                  isCompleted={index < currentStepIndex || task.status === 'completed'}
                  isActive={index === currentStepIndex && task.status !== 'completed'}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Milestones Section */}
        <div className="mb-16 premium-card">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
               <GitMerge size={20} className="text-accent" /> Milestones
            </h3>
            {isCreator && !isAddingMilestone && (
               <button 
                 onClick={() => setIsAddingMilestone(true)}
                 className="text-[11px] font-bold text-accent hover:text-white bg-accent/10 border border-accent/20 px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 uppercase tracking-widest"
                >
                 <Plus size={14} /> Add Milestone
               </button>
            )}
          </div>

          {isAddingMilestone && (
             <form onSubmit={handleAddMilestone} className="mb-8 p-6 bg-bg-main border border-border-subtle rounded-xl animate-fade-in">
                <div className="flex items-center gap-4">
                   <input 
                      type="text" 
                      autoFocus
                      placeholder="Enter milestone title..." 
                      value={newMilestoneTitle}
                      onChange={(e) => setNewMilestoneTitle(e.target.value)}
                      className="flex-1 bg-transparent border border-text-primary/10 rounded-lg px-4 py-2.5 text-sm focus:border-accent/40 outline-none text-text-primary"
                   />
                   <button 
                      type="submit" 
                      disabled={updateLoading || !newMilestoneTitle.trim()}
                      className="px-6 py-2.5 bg-accent text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                   >
                      {updateLoading ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                      Add
                   </button>
                   <button 
                      type="button" 
                      onClick={() => {
                        setIsAddingMilestone(false);
                        setNewMilestoneTitle('');
                      }}
                      className="p-2 text-text-secondary hover:text-text-primary"
                   >
                      <X size={20} />
                   </button>
                </div>
             </form>
          )}
          
          <div className="space-y-4">
            {task.milestones?.length > 0 ? (
              task.milestones.map((m, index) => {
                const isLocked = index > 0 && task.milestones[index - 1].status !== 'done';
                
                return (
                  <div key={m.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-bg-main/50 rounded-xl border border-border-subtle group transition-all ${isLocked ? 'opacity-40 grayscale' : 'hover:border-text-primary/10'}`}>
                    <div className="flex items-center gap-5 mb-4 sm:mb-0">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${m.status === 'done' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : isLocked ? 'bg-bg-main border-border-subtle text-text-secondary/30' : 'bg-bg-main border-accent/20 text-accent'}`}>
                        {isLocked ? <Lock size={16} /> : m.status === 'done' ? <Check size={18} strokeWidth={3} /> : <GitMerge size={18} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h4 className={`text-[15px] font-semibold ${m.status === 'done' ? 'text-text-secondary line-through' : 'text-text-primary'}`}>{m.title}</h4>
                          {isLocked && <span className="text-[9px] font-bold text-text-secondary/40 bg-text-primary/3 border border-border-subtle px-2 py-0.5 rounded flex items-center gap-1 uppercase tracking-widest"><Lock size={8} /> Locked</span>}
                        </div>
                        <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest opacity-60 mt-0.5">{m.status?.replace('_', ' ')}</p>
                      </div>
                    </div>
                  
                  <div className="flex items-center gap-3">
                    {isAssignee && m.status === 'pending' && (
                      <button 
                        onClick={() => handleMilestoneStatus(m.id, 'in_progress')} 
                        disabled={isLocked}
                        className="px-4 py-1.5 bg-accent text-white text-[12px] font-semibold rounded-lg hover:opacity-90 disabled:opacity-50"
                      >
                        Start
                      </button>
                    )}
                    {isAssignee && m.status === 'in_progress' && (
                      <button 
                        onClick={() => {
                          if (isLocked) return;
                          setSubmittingMilestone(m);
                          setMileLink('');
                          setMileNote('');
                        }} 
                        disabled={isLocked}
                        className="px-4 py-1.5 bg-amber-500 text-white text-[12px] font-semibold rounded-lg hover:bg-amber-600 disabled:opacity-50"
                      >
                        Submit
                      </button>
                    )}
                    {(m.status === 'submitted' || m.status === 'done') && m.submission_link && (
                      <a 
                        href={m.submission_link} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="flex items-center gap-2 px-4 py-1.5 bg-text-primary/3 border border-border-subtle text-text-primary text-[12px] font-semibold rounded-lg hover:bg-text-primary/6 transition-all"
                      >
                        <ExternalLink size={14} /> View Work
                      </a>
                    )}
                    {isCreator && m.status === 'submitted' && (
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleMilestoneStatus(m.id, 'done')} className="px-4 py-1.5 bg-emerald-500 text-white text-[12px] font-semibold rounded-lg hover:bg-emerald-600">Approve</button>
                        <button onClick={() => handleMilestoneStatus(m.id, 'in_progress')} className="px-4 py-1.5 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] text-[#9AA4B2] text-[12px] font-semibold rounded-lg hover:bg-[rgba(255,255,255,0.06)]">Reject</button>
                      </div>
                    )}
                  </div>
                </div>
                );
              })
            ) : (
              <p className="text-center py-10 text-text-secondary text-sm italic border border-dashed border-border-subtle rounded-xl opacity-60">No milestones added yet.</p>
            )}
          </div>
        </div>

        {/* Proof of Work Section (Only shown if submitted/completed) */}
        {(task.status === 'submitted' || task.status === 'completed') && (
          <div className="mb-16 animate-fade-up">
            <h3 className="text-[13px] font-bold text-text-secondary mb-6 tracking-widest uppercase opacity-60">Proof of Work</h3>
            <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {/* Task-level links */}
                  {task.submission_github && (
                    <a href={task.submission_github} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 bg-text-primary/3 border border-border-subtle rounded-xl hover:bg-text-primary/5 transition shadow-sm group">
                      <div className="w-10 h-10 bg-accent text-white rounded-lg flex items-center justify-center shrink-0">
                        <Code size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-text-primary">GitHub Repository</p>
                        <p className="text-[11px] text-text-secondary truncate">{task.submission_github}</p>
                      </div>
                      <ExternalLink size={14} className="ml-auto text-text-secondary/30 group-hover:text-text-secondary" />
                    </a>
                  )}
                  {task.submission_docs && (
                    <a href={task.submission_docs} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 bg-accent-soft border border-accent/10 rounded-xl hover:opacity-90 transition shadow-sm group">
                      <div className="w-10 h-10 bg-accent text-white rounded-lg flex items-center justify-center shrink-0">
                        <FileText size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-text-primary">Google Docs / PDF</p>
                        <p className="text-[11px] text-text-secondary truncate">{task.submission_docs}</p>
                      </div>
                      <ExternalLink size={14} className="ml-auto text-text-secondary/30 group-hover:text-text-secondary" />
                    </a>
                  )}

                  {/* Milestone-level links */}
                  {task.milestones?.filter(m => m.submission_link).map(m => (
                    <a key={m.id} href={m.submission_link} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 bg-accent-soft border border-accent/10 rounded-xl hover:opacity-90 transition shadow-sm group">
                      <div className="w-10 h-10 bg-accent text-white rounded-lg flex items-center justify-center shrink-0">
                        <ExternalLink size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-text-primary">{m.title}</p>
                        <p className="text-[11px] text-text-secondary truncate">{m.submission_link}</p>
                      </div>
                      <ExternalLink size={14} className="ml-auto text-text-secondary/30 group-hover:text-text-secondary" />
                    </a>
                  ))}

                  {(!task.submission_github && !task.submission_docs && !task.milestones?.some(m => m.submission_link)) && (
                    <p className="text-sm text-text-secondary italic py-4 text-center opacity-60">No submission links provided.</p>
                  )}
                </div>
                
                <div className="bg-text-primary/3 border border-border-subtle p-5 rounded-2xl">
                   <p className="text-[13px] font-bold text-text-primary mb-2 flex items-center gap-2">
                     <FileText size={16} className="text-accent" /> Additional Notes
                   </p>
                   <p className="text-sm text-text-secondary/80 leading-relaxed whitespace-pre-wrap">
                      {task.submission_notes || 'The assignee did not provide any additional notes with this submission.'}
                   </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>

      {/* Proof of Work Submission Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-bg-card rounded-xl w-full max-w-lg shadow-2xl overflow-hidden border border-border-subtle animate-scale-up">
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-semibold text-text-primary tracking-tight">Submit Work</h3>
                <button onClick={() => setShowSubmitModal(false)} className="p-2 hover:bg-text-primary/5 rounded-full transition-colors text-text-secondary"><X size={20} /></button>
              </div>
              
              <p className="text-sm text-text-secondary font-medium mb-10 leading-relaxed opacity-60">Provide links to your completed work for review. Once submitted, the creator will be notified.</p>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest flex items-center gap-2 opacity-60"><Code size={12} /> GitHub Repository</label>
                  <input type="text" value={subGithub} onChange={e => setSubGithub(e.target.value)} placeholder="https://github.com/..." className="w-full bg-bg-main border border-border-subtle rounded-xl p-4 text-sm focus:border-accent/30 outline-none text-text-primary placeholder-text-secondary/30" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest flex items-center gap-2 opacity-60"><FileText size={12} /> Documentation</label>
                  <input type="text" value={subDocs} onChange={e => setSubDocs(e.target.value)} placeholder="Google Docs, PDF, etc." className="w-full bg-bg-main border border-border-subtle rounded-xl p-4 text-sm focus:border-accent/30 outline-none text-text-primary placeholder-text-secondary/30" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest flex items-center gap-2 opacity-60"><Link2 size={12} /> Other Resources</label>
                  <input type="text" value={subDrive} onChange={e => setSubDrive(e.target.value)} placeholder="Drive link, Figma, etc." className="w-full bg-bg-main border border-border-subtle rounded-xl p-4 text-sm focus:border-accent/30 outline-none text-text-primary placeholder-text-secondary/30" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest flex items-center gap-2 opacity-60">Additional Notes</label>
                  <textarea value={subNotes} onChange={e => setSubNotes(e.target.value)} rows={3} placeholder="Any specific details for the reviewer?" className="w-full bg-bg-main border border-border-subtle rounded-xl p-4 text-sm focus:border-accent/30 outline-none text-text-primary placeholder-text-secondary/30" />
                </div>
              </div>
            </div>
            
            <div className="p-8 bg-bg-main/30 border-t border-border-subtle flex gap-4">
              <button onClick={() => setShowSubmitModal(false)} className="flex-1 py-3 text-text-secondary font-semibold rounded-xl hover:text-text-primary transition-all">Cancel</button>
              <button onClick={handleFinalSubmit} disabled={updateLoading} className="flex-1 py-3 bg-accent text-white font-semibold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-accent/10">
                {updateLoading ? 'Submitting...' : 'Confirm Submission'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Milestone Submission Modal */}
      {submittingMilestone && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-bg-card rounded-xl w-full max-w-md shadow-2xl overflow-hidden border border-border-subtle animate-scale-up">
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-semibold text-text-primary tracking-tight">Submit Milestone</h3>
                <button onClick={() => setSubmittingMilestone(null)} className="p-2 hover:bg-text-primary/5 rounded-full transition-colors text-text-secondary"><X size={20} /></button>
              </div>
              <p className="text-sm text-text-secondary font-medium mb-10 leading-relaxed opacity-60">Submission for: <span className="text-accent font-semibold">{submittingMilestone.title}</span></p>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest flex items-center gap-2 opacity-60">Submission Link</label>
                  <input type="text" value={mileLink} onChange={e => setMileLink(e.target.value)} placeholder="URL to your work..." className="w-full bg-bg-main border border-border-subtle rounded-xl p-4 text-sm focus:border-accent/30 outline-none text-text-primary placeholder-text-secondary/30" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest flex items-center gap-2 opacity-60">Notes</label>
                  <textarea value={mileNote} onChange={e => setMileNote(e.target.value)} rows={2} placeholder="Optional notes..." className="w-full bg-bg-main border border-border-subtle rounded-xl p-4 text-sm focus:border-accent/30 outline-none text-text-primary placeholder-text-secondary/30" />
                </div>
              </div>
            </div>
            
            <div className="p-8 bg-bg-main/30 border-t border-border-subtle flex gap-4">
              <button onClick={() => setSubmittingMilestone(null)} className="flex-1 py-3 text-text-secondary font-semibold rounded-xl hover:text-text-primary transition-all">Cancel</button>
              <button onClick={handleMilestoneSubmit} disabled={updateLoading} className="flex-1 py-3 bg-accent text-white font-semibold rounded-xl hover:opacity-90 transition-all disabled:opacity-50">
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
