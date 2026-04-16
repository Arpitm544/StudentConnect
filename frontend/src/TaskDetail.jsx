import React, { useEffect, useState, useMemo, useCallback, memo } from 'react';
import { useParams, useNavigate, Link, NavLink } from 'react-router-dom';
import Avatar from './components/Avatar.jsx';
import {
  ArrowLeft, Clock, CheckCircle2, AlertCircle,
  Briefcase, User, Zap, RefreshCw, FileText,
  UserPlus, Edit3, Check, ChevronRight,
  LayoutDashboard, Users, CheckSquare, GitMerge,
  LogOut, Menu, X, Code, ExternalLink, Link2, Lock
} from 'lucide-react';

// ─── Module-level constants (never re-created per render) ─────────────────────

const STEPS = [
  { id: 'accepted',    label: 'Accepted' },
  { id: 'in_progress', label: 'Developing' },
  { id: 'submitted',   label: 'In Review' },
  { id: 'completed',   label: 'Done' },
];

const navItems = [
  { to: '/dashboard',                    label: 'Dashboard',        icon: <LayoutDashboard size={18} />, end: true },
  { to: '/dashboard/market',             label: 'Task Market',      icon: <Users size={18} /> },
  { to: '/dashboard/my-tasks',           label: 'My Tasks',         icon: <CheckSquare size={18} /> },
  { to: '/dashboard/posted-requests',    label: 'Posted Requests',  icon: <FileText size={18} /> },
  { to: '/dashboard/active-workflows',   label: 'Active Workflows', icon: <GitMerge size={18} /> },
];

const DATE_FMT = { month: 'short', day: 'numeric', year: 'numeric' };

// ─── Memoised sub-components ─────────────────────────────────────────────────

/** Step circle in the timeline — only re-renders when its own state changes */
const TimelineStep = memo(function TimelineStep({ step, isCompleted, isActive }) {
  return (
    <div className="relative flex flex-col items-center flex-1 z-10 w-full group cursor-default">
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center mb-4 transition-transform duration-200
          ${isCompleted
            ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)] group-hover:scale-110'
            : isActive
              ? 'bg-white border-[4px] border-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.3)] group-hover:scale-110'
              : 'bg-[#f8fafc] text-transparent border-2 border-slate-300/60 group-hover:bg-slate-100'
          }`}
      >
        {isCompleted && <Check size={12} strokeWidth={3.5} />}
        {isActive    && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
      </div>
      <span
        className={`text-[11px] sm:text-[13px] tracking-wide text-center whitespace-normal sm:whitespace-nowrap
          ${isCompleted || isActive ? 'font-semibold text-slate-800' : 'font-medium text-slate-400'}`}
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
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 flex flex-col gap-4 shadow-sm w-full">
        <div className="text-[14px] text-indigo-900 font-medium">This task is waiting to be accepted.</div>
        {!isCreator && (
          <button
            onClick={onAccept}
            disabled={updateLoading}
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-md hover:scale-[1.02]"
          >
            {updateLoading ? <RefreshCw size={16} className="animate-spin" /> : <ChevronRight size={16} />}
            Accept Task
          </button>
        )}
      </div>
    );
  }
  
  if (isAssignee && (status === 'accepted' || status === 'in_progress' || status === 'submitted')) {
    return (
      <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 flex flex-col gap-4 shadow-sm w-full">
        <div className="text-[14px] text-slate-900 font-medium">Changed your mind?</div>
        {status === 'in_progress' && !hasMilestones && (
          <button
            onClick={() => onAction('submit')}
            disabled={updateLoading}
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 transition-colors shadow-md hover:scale-[1.02]"
          >
            {updateLoading ? <RefreshCw size={16} className="animate-spin" /> : <GitMerge size={16} />}
            Submit for Review
          </button>
        )}
        <button
          onClick={onLeave}
          disabled={updateLoading}
          className="inline-flex items-center justify-center gap-2 w-full py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-[13px] font-semibold hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all"
        >
          {updateLoading ? <RefreshCw size={14} className="animate-spin" /> : <LogOut size={14} />}
          Leave Task
        </button>
      </div>
    );
  }


  if (status === 'completed') {
    if (hasMilestones) return null; // No need for "Finished" banner if we have milestones
    return (
      <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 flex flex-col gap-4 shadow-sm h-full w-full justify-center items-center">
        <div className="text-[14px] text-slate-500 font-medium text-center">Task completely finished.</div>
        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
          <CheckCircle2 size={24} />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 flex flex-col justify-center h-full w-full">
      <div className="text-[14px] text-slate-500 font-medium text-center opacity-80">
        Status: <span className="capitalize">{status?.replace('_', ' ')}</span>
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

  // ── Data fetching (useCallback so stable reference across renders) ──────────

  const fetchTask = useCallback(async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/tasks/detail/${id}`, { credentials: 'include' });
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
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/user/profile`, { credentials: 'include' });
      if (res.ok) setUserProfile(await res.json());
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
  }, []);

  useEffect(() => {
    fetchTask();
    loadProfile();
  }, [fetchTask, loadProfile]);

  // ── Action handlers ─────────────────────────────────────────────────────────

  const handleLogout = useCallback(async () => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/logout`, {
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
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/tasks/${id}/status`, {
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
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/tasks/${id}/accept`, {
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
    let url = `${import.meta.env.VITE_API_URL || ''}/tasks/${id}`;
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
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/tasks/${id}/submit`, {
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

  const handleAddMilestone = useCallback(async (title) => {
    if (!title.trim()) return;
    setUpdateLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/tasks/${id}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title }),
      });
      if (res.ok) fetchTask();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdateLoading(false);
    }
  }, [id, fetchTask]);

  const handleMilestoneStatus = useCallback(async (mid, status) => {
    setUpdateLoading(true);
    setError('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/tasks/${id}/milestones/${mid}/status`, {
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
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/tasks/${id}/milestones/${submittingMilestone.id}/submit`, {
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
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/tasks/${id}/leave`, {
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
    () => !!(userProfile && task && task.creator_id === userProfile.id),
    [userProfile, task?.creator_id]
  );

  const isAssignee = useMemo(
    () => !!(userProfile && task && task.assignee_id === userProfile.id),
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
    <div className="flex flex-col justify-center items-center min-h-screen bg-[#f8fafc] gap-4">
      <p className="text-slate-500 text-sm font-medium animate-pulse">Loading workspace…</p>
    </div>
  );

  if (error && !task) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#f8fafc] text-center gap-4">
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
        <AlertCircle size={32} className="text-red-500" />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Task Not Found</h2>
        <p className="text-slate-500 text-sm max-w-sm mb-6">{error}</p>
      </div>
      <Link to="/dashboard" className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium text-sm hover:bg-slate-50 transition-colors shadow-sm">
        ← Back to Dashboard
      </Link>
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-row bg-gradient-to-b from-slate-50 to-white h-screen overflow-hidden font-sans selection:bg-indigo-100 relative">
      
      {/* Ambient background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-50 rounded-full blur-3xl pointer-events-none -z-10 opacity-70" />

      {/* ── Mobile top bar ─────────────────────────────────────────────────── */}
      <div className="md:hidden flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 h-16 sticky top-0 z-30 w-full shrink-0 shadow-sm">
        <div className="flex items-center gap-2">
          <Zap size={20} className="text-slate-900" fill="currentColor" />
          <h2 className="text-[15px] font-bold text-slate-900 tracking-tight m-0">StudentConnect</h2>
        </div>
        <button onClick={openMobileMenu} className="p-2 -mr-2 text-gray-500 hover:text-slate-900 hover:bg-gray-50 rounded-lg transition-colors">
          <Menu size={22} />
        </button>
      </div>

      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 md:hidden" onClick={closeMobileMenu} />
      )}

      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <aside className={`w-[260px] bg-white border-r border-slate-100 flex flex-col shrink-0 z-50 py-6 h-full overflow-hidden transition-transform duration-300 ease-out ${mobileMenuOpen ? 'translate-x-0 fixed inset-y-0 left-0 shadow-2xl' : '-translate-x-full fixed inset-y-0 left-0 md:relative md:translate-x-0 md:left-auto'}`}>
        <div className="flex items-center justify-between gap-2 px-6 mb-10 shrink-0">
          <div className="flex items-center gap-2">
            <Zap size={22} className="text-slate-900" fill="currentColor" />
            <h2 className="text-[15px] font-bold text-slate-900 tracking-tight m-0">StudentConnect</h2>
          </div>
          <button className="md:hidden p-2 -mr-2 text-gray-400 hover:text-slate-900 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors" onClick={closeMobileMenu}>
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 px-4 overflow-y-auto">
          <ul className="space-y-1.5">
            {navItems.map(({ to, label, icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2.5 rounded-xl text-[14px] font-medium transition-colors duration-150 ${
                      isActive ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`
                  }
                >
                  {icon} {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="px-4 mt-auto pt-4 border-t border-slate-100">
          {userProfile && (
            <div className="flex items-center justify-between gap-2 px-2 py-2 rounded-xl hover:bg-slate-50 transition-colors group">
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar name={userProfile.name} photoUrl={userProfile.photo_url} size="md" />
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-slate-900 truncate">{userProfile.name}</p>
                  <p className="text-[11px] text-slate-400 truncate">{userProfile.email}</p>
                </div>
              </div>
              <button onClick={handleLogout} className="p-1.5 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Sign out">
                <LogOut size={15} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-6 py-8 md:px-12 lg:px-20 w-full z-10 box-border">

        {/* Breadcrumb */}
        <div className="mb-8 pl-1">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-400 hover:text-slate-900 transition-colors duration-150">
            <ArrowLeft size={14} strokeWidth={2.5} /> Back to Tasks
          </Link>
        </div>

        {/* Floating Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 mb-10">
          <div>
            <h1 className="text-[32px] sm:text-4xl font-semibold text-slate-900 tracking-tight leading-snug m-0 mb-4">
              {task.title}
            </h1>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="bg-slate-100 text-slate-600 rounded-full px-3.5 py-1 text-[13px] font-medium capitalize">
                {task.status?.replace('_', ' ') || 'Pending'}
              </span>
              <span className="bg-slate-100 text-slate-600 rounded-full px-3.5 py-1 text-[13px] font-medium">
                Assigned to: {task.assignee_name || 'Unassigned'}
              </span>
              <span className="bg-slate-100 text-slate-600 rounded-full px-3.5 py-1 text-[13px] font-medium">
                Created {formatDate(task.created_at)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 md:mt-0 mt-2">
            {task.status === 'pending' && !isCreator && (
              <button
                onClick={handleAcceptTask}
                disabled={updateLoading}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-[13px] font-semibold hover:bg-indigo-700 transition-colors shadow-md hover:shadow-lg hover:scale-[1.02] w-full sm:w-auto justify-center"
              >
                {updateLoading ? <RefreshCw size={14} className="animate-spin" /> : <ChevronRight size={14} />}
                Accept Task
              </button>
            )}
            <button className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white sm:bg-transparent border sm:border-0 border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg text-[13px] font-medium transition-colors flex-1 sm:flex-none">
              <UserPlus size={16} /> Assign
            </button>
            {isCreator && (
              <button className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white sm:bg-transparent border sm:border-0 border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg text-[13px] font-medium transition-colors flex-1 sm:flex-none">
                <Edit3 size={16} /> Edit
              </button>
            )}
          </div>
        </div>

        {/* Glass Panel */}
        <div className="bg-white/80 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.06)] rounded-2xl p-8 mb-16 border border-white/60">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-8">

            {/* Properties grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-8">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><Zap size={14} /> Status</p>
                <p className="text-[15px] font-medium text-slate-900 capitalize">{task.status?.replace('_', ' ') || 'Pending'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><User size={14} /> Assigned To</p>
                {task.assignee_name ? (
                  <div className="flex items-center gap-2.5">
                    <Avatar name={task.assignee_name} photoUrl={task.assignee_photo_url} size="md" tooltip />
                    <span className="text-[15px] font-medium text-slate-900">{task.assignee_name}</span>
                  </div>
                ) : (
                  <p className="text-[15px] font-medium text-slate-400 italic">Unassigned</p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Briefcase size={14} /> Posted By</p>
                <div className="flex items-center gap-2.5">
                  <Avatar name={task.creator_name} photoUrl={task.creator_photo_url} size="md" tooltip />
                  <span className="text-[15px] font-medium text-slate-900">{task.creator_name || 'Unknown'}</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><Clock size={14} /> Deadline</p>
                <p className={`text-[15px] font-medium ${isPastDeadline ? 'text-red-500' : 'text-slate-900'}`}>{formatDate(task.deadline)}</p>
              </div>
              {task.subject && (
                <div className="col-span-1 border-t border-slate-100 pt-6">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Subject</p>
                  <p className="text-[15px] font-medium text-slate-900">{task.subject}</p>
                </div>
              )}
            </div>

             {/* CTA Strip — passes stable callbacks to memoised child */}
            <div className="flex flex-col justify-center border-t md:border-t-0 md:border-l border-slate-100 pt-8 md:pt-0 md:pl-8">
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
        <div className="mb-20">
          <div className="flex justify-between items-end mb-8">
            <h3 className="text-xl font-semibold text-slate-900 tracking-tight">Timeline</h3>
            <span className="text-[13px] font-bold text-indigo-600 tracking-wider uppercase bg-indigo-50 px-3 py-1 rounded-md">{percentage}% Completed</span>
          </div>

          <div className="relative pt-4 pb-8 w-full px-2">
            {/* Track */}
            <div className="absolute top-[26.5px] left-2 right-2 h-[3px] bg-slate-200/60 rounded-full -z-10" />
            {/* Fill */}
            <div
              className="absolute top-[26.5px] left-2 h-[3px] rounded-full transition-[width] duration-1000 ease-in-out bg-gradient-to-r from-indigo-500 to-violet-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] -z-10"
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
        <div className="mb-16 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
               <GitMerge size={20} className="text-indigo-500" /> Milestones
            </h3>
            {isCreator && (
               <button 
                 onClick={() => {
                   const title = prompt('Enter milestone title:');
                   if (title) handleAddMilestone(title);
                 }}
                 className="text-[12px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                 + Add Milestone
               </button>
            )}
          </div>
          
          <div className="space-y-4">
            {task.milestones?.length > 0 ? (
              task.milestones.map((m, index) => {
                const isLocked = index > 0 && task.milestones[index - 1].status !== 'done';
                
                return (
                  <div key={m.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50/50 rounded-xl border border-slate-100/80 group transition-opacity ${isLocked ? 'opacity-50 grayscale-[0.5]' : ''}`}>
                    <div className="flex items-center gap-4 mb-3 sm:mb-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${m.status === 'done' ? 'bg-emerald-100 text-emerald-600' : isLocked ? 'bg-slate-100 text-slate-300' : 'bg-slate-200 text-slate-400'}`}>
                        {isLocked ? <Lock size={14} /> : <Check size={16} strokeWidth={3} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className={`text-[14px] font-semibold ${m.status === 'done' ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{m.title}</h4>
                          {isLocked && <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded flex items-center gap-1 uppercase tracking-tighter"><Lock size={8} /> Locked</span>}
                        </div>
                        <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{m.status}</p>
                      </div>
                    </div>
                  
                  <div className="flex items-center gap-2">
                    {isAssignee && m.status === 'pending' && (
                      <button 
                        onClick={() => handleMilestoneStatus(m.id, 'in_progress')} 
                        disabled={isLocked}
                        className="px-3 py-1.5 bg-slate-900 text-white text-[12px] font-bold rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
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
                        className="px-3 py-1.5 bg-amber-500 text-white text-[12px] font-bold rounded-lg hover:bg-amber-600 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Submit for Review
                      </button>
                    )}
                    {(m.status === 'submitted' || m.status === 'done') && m.submission_link && (
                      <a 
                        href={m.submission_link} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-600 text-[12px] font-bold rounded-lg hover:bg-indigo-100 transition-colors"
                      >
                        <ExternalLink size={12} /> View Submission
                      </a>
                    )}
                    {isCreator && m.status === 'submitted' && (
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => handleMilestoneStatus(m.id, 'done')} className="px-3 py-1.5 bg-emerald-500 text-white text-[12px] font-bold rounded-lg hover:bg-emerald-600 shadow-sm">Approve</button>
                        <button onClick={() => handleMilestoneStatus(m.id, 'in_progress')} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-[12px] font-bold rounded-lg hover:bg-slate-50">Reject</button>
                      </div>
                    )}
                  </div>
                </div>
                );
              })
            ) : (
              <p className="text-center py-6 text-slate-400 text-sm italic border-2 border-dashed border-slate-100 rounded-xl">No milestones added yet.</p>
            )}
          </div>
        </div>

        {/* Proof of Work Section (Only shown if submitted/completed) */}
        {(task.status === 'submitted' || task.status === 'completed') && (
          <div className="mb-16 animate-fade-up">
            <h3 className="text-[13px] font-bold text-slate-400 mb-6 tracking-widest uppercase">Proof of Work</h3>
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {/* Task-level links */}
                  {task.submission_github && (
                    <a href={task.submission_github} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 transition shadow-sm group">
                      <div className="w-10 h-10 bg-slate-900 text-white rounded-lg flex items-center justify-center shrink-0">
                        <Code size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-slate-800">GitHub Repository</p>
                        <p className="text-[11px] text-slate-500 truncate">{task.submission_github}</p>
                      </div>
                      <ExternalLink size={14} className="ml-auto text-slate-300 group-hover:text-slate-500" />
                    </a>
                  )}
                  {task.submission_docs && (
                    <a href={task.submission_docs} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 bg-blue-50/50 border border-blue-100/50 rounded-xl hover:bg-blue-50 transition shadow-sm group">
                      <div className="w-10 h-10 bg-blue-500 text-white rounded-lg flex items-center justify-center shrink-0">
                        <FileText size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-slate-800">Google Docs / PDF</p>
                        <p className="text-[11px] text-slate-500 truncate">{task.submission_docs}</p>
                      </div>
                      <ExternalLink size={14} className="ml-auto text-slate-300 group-hover:text-slate-500" />
                    </a>
                  )}

                  {/* Milestone-level links */}
                  {task.milestones?.filter(m => m.submission_link).map(m => (
                    <a key={m.id} href={m.submission_link} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 bg-amber-50/50 border border-amber-100/50 rounded-xl hover:bg-amber-50 transition shadow-sm group">
                      <div className="w-10 h-10 bg-amber-500 text-white rounded-lg flex items-center justify-center shrink-0">
                        <ExternalLink size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-slate-800">{m.title}</p>
                        <p className="text-[11px] text-slate-500 truncate">{m.submission_link}</p>
                      </div>
                      <ExternalLink size={14} className="ml-auto text-slate-300 group-hover:text-slate-500" />
                    </a>
                  ))}

                  {(!task.submission_github && !task.submission_docs && !task.milestones?.some(m => m.submission_link)) && (
                    <p className="text-sm text-slate-400 italic py-4 text-center">No submission links provided.</p>
                  )}
                </div>
                
                <div className="bg-slate-50/50 border border-slate-100 p-5 rounded-2xl">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Submission Notes</p>
                  <div className="space-y-4">
                    {task.milestones?.some(m => m.submission_note) ? (
                      task.milestones.filter(m => m.submission_note).map(m => (
                        <div key={m.id} className="border-l-2 border-slate-200 pl-4 py-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-1">{m.title}</p>
                          <p className="text-[14px] text-slate-700 leading-relaxed italic">
                            {m.submission_note}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-[14px] text-slate-700 leading-relaxed italic">
                        {task.submission_notes || "No additional notes provided."}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Description */}
        <div className="max-w-3xl mb-24">
          <h3 className="text-[13px] font-bold text-slate-400 mb-6 tracking-widest uppercase">Task Description</h3>
          <div className="text-slate-700 leading-relaxed text-[16px] whitespace-pre-wrap">
            {task.description || <span className="text-slate-400 italic">No description provided.</span>}
          </div>

          {task.attachment_url && (
            <div className="mt-10 pt-8 border-t border-slate-200/50">
              <a
                href={task.attachment_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 bg-white border border-slate-200/80 rounded-xl text-[14px] font-medium text-slate-700 hover:bg-slate-50 hover:shadow-md hover:scale-[1.02] transition-all duration-150 shadow-sm w-fit"
              >
                <FileText size={18} className="text-indigo-500" /> View Attached Document
              </a>
            </div>
          )}
        </div>

        {/* Task Submission Modal */}
        {showSubmitModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Zap size={20} className="text-indigo-600" fill="currentColor" /> Submit Proof of Work
                </h3>
                <button onClick={() => setShowSubmitModal(false)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-white rounded-xl transition">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 space-y-5">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">GitHub Repository</label>
                    <div className="relative">
                      <div className="absolute left-3 top-3 text-slate-400"><Code size={18} /></div>
                      <input type="text" placeholder="https://github.com/..." value={subGithub} onChange={(e) => setSubGithub(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition" />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Google Docs / PDF Link</label>
                    <div className="relative">
                      <div className="absolute left-3 top-3 text-slate-400"><FileText size={18} /></div>
                      <input type="text" placeholder="https://docs.google.com/..." value={subDocs} onChange={(e) => setSubDocs(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Drive / Assets Link</label>
                    <div className="relative">
                      <div className="absolute left-3 top-3 text-slate-400"><Link2 size={18} /></div>
                      <input type="text" placeholder="https://drive.google.com/..." value={subDrive} onChange={(e) => setSubDrive(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Submission Notes</label>
                    <textarea rows={3} placeholder="Any specific notes for the reviewer?" value={subNotes} onChange={(e) => setSubNotes(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition resize-none"></textarea>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <button onClick={handleFinalSubmit} disabled={updateLoading} className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50">
                    {updateLoading ? <RefreshCw size={18} className="animate-spin mx-auto" /> : "Confirm Submission"}
                  </button>
                  <button onClick={() => setShowSubmitModal(false)} className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-50 transition">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Milestone Submission Modal */}
        {submittingMilestone && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Link2 size={20} className="text-amber-500" /> Submit Milestone
                </h3>
                <button onClick={() => setSubmittingMilestone(null)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-white rounded-xl transition">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 space-y-5">
                <div className="space-y-4">
                  <p className="text-sm text-slate-500">Submitting proof for: <span className="font-bold text-slate-700">{submittingMilestone.title}</span></p>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Submission Link (Optional)</label>
                    <div className="relative">
                      <div className="absolute left-3 top-3 text-slate-400"><Link2 size={18} /></div>
                      <input type="text" placeholder="https://..." value={mileLink} onChange={(e) => setMileLink(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition" />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Additional Notes (Optional)</label>
                    <textarea rows={3} placeholder="Any notes for this specific milestone?" value={mileNote} onChange={(e) => setMileNote(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition resize-none"></textarea>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <button onClick={handleMilestoneSubmit} disabled={updateLoading} className="flex-1 py-3 bg-amber-500 text-white rounded-2xl font-bold text-sm hover:bg-amber-600 shadow-lg shadow-amber-200 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50">
                    {updateLoading ? <RefreshCw size={18} className="animate-spin mx-auto" /> : "Confirm Milestone Submission"}
                  </button>
                  <button onClick={() => setSubmittingMilestone(null)} className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-50 transition">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
