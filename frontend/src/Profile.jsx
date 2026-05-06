import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Users, LayoutDashboard, CheckSquare, FileText, GitMerge,
  User, Trash2, Zap, LogOut, AlertCircle,
  Menu, X, Search, MoreVertical, Briefcase,
  TrendingUp, ArrowUpRight, Plus, Clock, Upload,
  File, Camera
} from 'lucide-react';
import { Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { useTheme } from './context/ThemeContext.jsx';
import Avatar from './components/Avatar.jsx';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import TaskRow from './components/TaskRow.jsx';
import TaskMarketCard from './components/TaskMarketCard.jsx';
import { StatCardSkeleton, TaskRowSkeleton, TaskMarketCardSkeleton } from './components/Skeleton.jsx';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

const API_BASE = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_URL_SECONDARY || '';

export default function Profile({ onLogout }) {
  const [tasks, setTasks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [newTask, setNewTask] = useState({ title: '', description: '', subject: '', deadline: '', max_assignees: 1, attachment: null });
  const [postLoading, setPostLoading] = useState(false);
  const [showPostForm, setShowPostForm] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [invitations, setInvitations] = useState([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileFormData, setProfileFormData] = useState({
    name: '',
    field: '',
    college_name: '',
    year: '',
    photo: null,
    photoPreview: ''
  });
  const [profileLoading, setProfileLoading] = useState(false);

  const { theme, toggleTheme } = useTheme();

  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname.split('/').pop() || 'dashboard';

  const [userProfile, setUserProfile] = useState(null);
  
  const fetchTasks = useCallback(async () => {
    let endpoint = '/tasks/dashboard';
    if (currentPath === 'my-tasks') endpoint = '/tasks/mine';
    if (currentPath === 'posted-requests') endpoint = '/tasks/posted';
    if (currentPath === 'invitations') endpoint = '/tasks/invitations';
    if (currentPath === 'market') endpoint = '/tasks';

    setTasksLoading(true);
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load tasks');
      const data = await res.json();
      setTasks(data);
    } catch (err) {
      setError(err.message || 'Could not fetch tasks');
    } finally {
      setTasksLoading(false);
    }
  }, [currentPath]);

  const fetchInvitations = useCallback(async () => {
    setInvitationsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/tasks/invitations`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load invitations');
      const data = await res.json();
      setInvitations(data);
    } catch (err) {
      console.error(err);
    } finally {
      setInvitationsLoading(false);
    }
  }, []);

  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/user/profile`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load profile');
      const data = await res.json();
      setUserProfile(data);
    } catch (err) {
      console.error(err);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userProfile) loadProfile();
  }, [userProfile, loadProfile]);

  useEffect(() => {
    if (userProfile) {
      setProfileFormData({
        name: userProfile.name || '',
        field: userProfile.field || '',
        college_name: userProfile.college_name || '',
        year: userProfile.year || '',
        photo: null,
        photoPreview: userProfile.photo_url || ''
      });
    }
  }, [userProfile]);

  useEffect(() => {
    if (currentPath !== 'profile') fetchTasks();
    if (currentPath === 'invitations') fetchInvitations();
    
    // Auto-open post form if redirected from dashboard with state
    if (currentPath === 'posted-requests' && location.state?.openForm) {
      setShowPostForm(true);
      // Clear state so it doesn't stay open on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [currentPath, location.state?.openForm, fetchTasks, navigate, location.pathname]);

  // ── Derived Data: Stats ──
  const { total, completed, inProgress, inReview, pending, dueSoonCount, completionRate, networkCount } = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
    const inReview   = tasks.filter((t) => t.status === 'submitted').length;
    const pending = tasks.filter((t) => !t.status || t.status === 'pending').length;
    const now = new Date();
    const dueSoonCount = tasks.filter(t => t.deadline && new Date(t.deadline) > now && new Date(t.deadline) < new Date(now.getTime() + 48 * 60 * 60 * 1000)).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // Calculate unique network connections
    const connections = new Set();
    tasks.forEach(t => {
      if (t.creator_id && String(t.creator_id) !== String(userProfile?.id)) connections.add(String(t.creator_id));
      if (t.assignee_id && String(t.assignee_id) !== String(userProfile?.id)) connections.add(String(t.assignee_id));
    });
    const networkCount = connections.size;
    
    return { total, completed, inProgress, inReview, pending, dueSoonCount, completionRate, networkCount };
  }, [tasks, userProfile]);

  // ── Derived Data: Chart ──
  const chartData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dataMap = months.reduce((acc, month) => {
      acc[month] = { name: month, completed: 0 };
      return acc;
    }, {});

    tasks.forEach(task => {
      if (task.status === 'completed' && task.updated_at) {
        const date = new Date(task.updated_at);
        const month = months[date.getMonth()];
        dataMap[month].completed += 1;
      }
    });

    return Object.values(dataMap);
  }, [tasks]);

  // ── Search Filtering ──
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchesSearch = !searchTerm || 
        t.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        t.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.creator_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [tasks, searchTerm, statusFilter]);

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      onLogout();
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  const handleAccept = useCallback(async (id) => {
    try {
      const res = await fetch(`${API_BASE}/tasks/${id}/accept`, { method: 'POST', credentials: 'include' });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to accept task');
      }
      navigate(`/dashboard/task/${id}`);
    } catch (err) {
      setError(err.message);
    }
  }, [navigate]);

  const handleView = useCallback((id) => {
    navigate(`/dashboard/task/${id}`);
  }, [navigate]);

  const handleStatusChange = useCallback(async (id, status, progress = null) => {
    try {
      const body = { status };
      if (progress !== null) body.progress = parseInt(progress, 10);
      const res = await fetch(`${API_BASE}/tasks/${id}/status`, {
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
  }, [fetchTasks]);

  const handleRespondInvitation = async (id, action) => {
    try {
      const res = await fetch(`${API_BASE}/tasks/invitations/${id}/respond`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Response failed');
      }
      fetchInvitations();
      fetchTasks();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('name', profileFormData.name);
      formData.append('field', profileFormData.field);
      formData.append('college_name', profileFormData.college_name);
      formData.append('year', profileFormData.year);
      if (profileFormData.photo) {
        formData.append('photo', profileFormData.photo);
      }

      const res = await fetch(`${API_BASE}/api/user/profile`, {
        method: 'PUT',
        credentials: 'include',
        body: formData
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update profile');
      }

      await fetchTasks();
      const profileRes = await fetch(`${API_BASE}/api/user/profile`, { credentials: 'include' });
      if (profileRes.ok) setUserProfile(await profileRes.json());
      
      setIsProfileModalOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePostTask = async (e) => {
    e.preventDefault();
    if (!newTask.title || !newTask.subject) return;
    setPostLoading(true);
    try {
      let attachmentUrl = '';
      if (newTask.attachment) {
        const formData = new FormData();
        formData.append('attachment', newTask.attachment);
        const uploadRes = await fetch(`${API_BASE}/api/upload`, {
          method: 'POST',
          credentials: 'include',
          body: formData
        });
        if (!uploadRes.ok) throw new Error('File upload failed');
        const uploadData = await uploadRes.json();
        attachmentUrl = uploadData.url;
      }

      const res = await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: newTask.title,
          description: newTask.description,
          subject: newTask.subject,
          deadline: newTask.deadline ? new Date(newTask.deadline).toISOString() : null,
          max_assignees: parseInt(newTask.max_assignees, 10),
          attachment_url: attachmentUrl
        }),
      });
      if (!res.ok) throw new Error('Failed to post task');
      
      setNewTask({ title: '', description: '', subject: '', deadline: '', max_assignees: 1, attachment: null });
      setShowPostForm(false);
      fetchTasks();
    } catch (err) {
      setError(err.message);
    } finally {
      setPostLoading(false);
    }
  };

  const [taskToDelete, setTaskToDelete] = useState(null);

  const handleDeleteTask = useCallback((id) => {
    setTaskToDelete(id);
  }, []);

  const confirmDelete = async () => {
    if (!taskToDelete) return;
    setPostLoading(true);
    try {
      const res = await fetch(`${API_BASE}/tasks/${taskToDelete}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('Delete failed');
      setTaskToDelete(null);
      fetchTasks();
    } catch (err) {
      setError(err.message);
    } finally {
      setPostLoading(false);
    }
  };

  const formatDate = useCallback((dateStr) => {
    if (!dateStr) return 'No Deadline';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, []);

  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);
  const openMobileMenu = useCallback(() => setMobileMenuOpen(true), []);
  const togglePostForm = useCallback(() => setShowPostForm(v => !v), []);

  return (
    <div className="flex bg-bg-main h-screen overflow-hidden text-text-primary font-inter">
      
      <Sidebar 
        mobileMenuOpen={mobileMenuOpen}
        closeMobileMenu={closeMobileMenu}
        userProfile={userProfile}
        theme={theme}
        toggleTheme={toggleTheme}
        onLogout={onLogout}
        setIsProfileModalOpen={setIsProfileModalOpen}
        tasks={tasks}
      />

      {/* ── Main Content ── */}
      <main className="flex-1 h-screen overflow-y-auto bg-bg-main transition-colors duration-300">
        
        <Header 
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          userProfile={userProfile}
          setShowPostForm={setShowPostForm}
          openMobileMenu={openMobileMenu}
        />

        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          
          <Routes>
            <Route path="/" element={
              <div className="space-y-8 animate-fade-up">
                
                {/* Welcome & Stats Row */}
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 md:gap-8">
                   <div className="space-y-2">
                      <h2 className="text-2xl md:text-3xl font-semibold text-text-primary tracking-tight">Welcome back, {userProfile?.name?.split(' ')[0]}</h2>
                      <p className="text-text-secondary font-medium">You have <span className="text-accent font-semibold">{inProgress + pending} active tasks</span> to focus on this week.</p>
                   </div>
                   <div className="flex gap-4 flex-shrink-0">
                      <button onClick={() => navigate('/dashboard/posted-requests', { state: { openForm: true } })} className="px-5 py-2.5 bg-accent text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all flex items-center gap-2">
                         <Plus size={13} /> Post Task
                      </button>
                   </div>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                  {tasksLoading
                    ? [...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)
                    : [
                    { label: 'Completion', value: `${completionRate}%`, sub: 'Overall efficiency', icon: <CheckSquare className="text-accent" /> },
                    { label: 'Due Soon', value: dueSoonCount, sub: 'Next 48 hours', icon: <Clock className="text-accent" /> },
                    { label: 'Active', value: inProgress, sub: 'Currently working', icon: <TrendingUp className="text-accent" /> },
                    { label: 'Network', value: networkCount, sub: 'Peer connections', icon: <Users className="text-accent" /> },
                  ].map((stat, i) => (
                    <div key={i} className="premium-card">
                       <div className="flex items-center justify-between mb-6">
                          <div className="p-2.5 rounded-xl bg-accent-soft">
                             {stat.icon}
                          </div>
                          <MoreVertical size={16} className="text-text-secondary/30" />
                       </div>
                       <p className="text-[10px] font-bold text-text-secondary/50 uppercase tracking-widest mb-1">{stat.label}</p>
                       <h4 className="text-2xl font-semibold text-text-primary">{stat.value}</h4>
                       <p className="text-[11px] text-text-secondary/60 font-medium mt-1">{stat.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
                   {/* Activity Chart */}
                   <div className="lg:col-span-2 premium-card">
                      <div className="flex items-center justify-between mb-10">
                         <div>
                            <h3 className="text-lg font-semibold text-text-primary tracking-tight">Productivity Flow</h3>
                            <p className="text-xs text-text-secondary font-medium">Daily task completion analytics</p>
                         </div>
                         <div className="flex items-center gap-2 px-3 py-1.5 bg-text-primary/5 rounded-lg border border-border-subtle">
                            <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                            <span className="text-[10px] font-bold text-text-secondary">Last 12 Months</span>
                         </div>
                      </div>
                      <div className="h-[280px] w-full">
                         <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                               <defs>
                                  <linearGradient id="colorComp" x1="0" y1="0" x2="0" y2="1">
                                     <stop offset="5%" stopColor={theme === 'dark' ? '#4F8CFF' : '#4F8CFF'} stopOpacity={0.1}/>
                                     <stop offset="95%" stopColor={theme === 'dark' ? '#4F8CFF' : '#4F8CFF'} stopOpacity={0}/>
                                  </linearGradient>
                               </defs>
                               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'} />
                               <XAxis 
                                 dataKey="name" 
                                 axisLine={false} 
                                 tickLine={false} 
                                 tick={{ fill: 'var(--text-secondary)', fontSize: 10, fontWeight: 500 }} 
                                 dy={10} 
                               />
                               <YAxis hide />
                               <Tooltip 
                                  contentStyle={{ 
                                    borderRadius: '12px', 
                                    border: theme === 'dark' ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)', 
                                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', 
                                    backgroundColor: 'var(--bg-card)', 
                                    color: 'var(--text-primary)' 
                                  }}
                                  itemStyle={{ color: 'var(--text-primary)' }}
                               />
                               <Area type="monotone" dataKey="completed" stroke="#4F8CFF" strokeWidth={2} fillOpacity={1} fill="url(#colorComp)" />
                            </AreaChart>
                         </ResponsiveContainer>
                      </div>
                   </div>

                   {/* Featured Peer/Task */}
                   <div className="bg-accent rounded-xl p-8 text-white relative overflow-hidden group">
                      <div className="relative z-10 h-full flex flex-col">
                         <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center mb-6">
                            <TrendingUp size={20} />
                         </div>
                         <h3 className="text-xl font-semibold tracking-tight mb-2 leading-tight">Build your reputation.</h3>
                         <p className="text-white/70 text-sm font-medium leading-relaxed mb-10">Complete high-priority tasks from the market to earn badges and unlock exclusive projects.</p>
                         <button onClick={() => navigate('/dashboard/market')} className="mt-auto w-full py-3 bg-white text-accent font-semibold rounded-xl hover:bg-white/90 transition-all">
                            Browse Market
                         </button>
                      </div>
                   </div>
                </div>

                {/* Today's Focus & Task Market */}
                 <div className="space-y-8 pt-4">
                    <div className="flex items-center justify-between">
                       <div>
                          <h3 className="text-2xl font-semibold text-text-primary tracking-tight">Today's Focus</h3>
                          <p className="text-sm text-text-secondary font-medium">Suggested tasks based on your skills and deadlines.</p>
                       </div>
                       <div className="flex bg-bg-card p-1 rounded-xl border border-border-subtle">
                          <button className="px-4 py-1.5 bg-text-primary/5 text-text-primary text-xs font-semibold rounded-lg shadow-sm">Suggested</button>
                          <button onClick={() => navigate('/dashboard/market')} className="px-4 py-1.5 text-text-secondary text-xs font-medium hover:text-text-primary transition-all">All Tasks</button>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-8">
                       {tasksLoading ? (
                          [...Array(3)].map((_, i) => <TaskMarketCardSkeleton key={i} />)
                        ) : filteredTasks.length === 0 ? (
                         <div className="col-span-full premium-card py-20 text-center border-dashed border-2">
                            <Briefcase size={32} className="mx-auto text-text-secondary/30 mb-4" />
                            <h4 className="text-lg font-semibold text-text-primary">No tasks found</h4>
                            <p className="text-text-secondary font-medium">Check the Task Market or adjust your search.</p>
                         </div>
                       ) : (
                         filteredTasks.slice(0, 3).map((task) => (
                           <TaskMarketCard 
                             key={task.id} 
                             task={task} 
                             onAccept={handleAccept} 
                             onView={handleView}
                             formatDate={formatDate}
                           />
                         ))
                       )}
                       
                       {/* Looking for more card */}
                       <div className="bg-accent/5 rounded-xl border border-dashed border-accent/20 flex flex-col items-center justify-center p-8 text-center transition-all duration-300" onClick={() => navigate('/dashboard/market')}>
                          <div className="w-12 h-12 bg-bg-card rounded-full flex items-center justify-center border border-border-subtle shadow-sm mb-6 transition-transform">
                             <Search size={20} className="text-accent" />
                          </div>
                          <h4 className="text-lg font-semibold text-text-primary mb-2 tracking-tight">Looking for more?</h4>
                          <p className="text-sm text-text-secondary font-medium mb-8 leading-relaxed">Explore the global task market to find projects that match your skills.</p>
                          <button className="text-accent font-semibold text-xs flex items-center gap-1 transition-all">
                             Explore Market <ArrowUpRight size={14} />
                          </button>
                       </div>
                    </div>
                 </div>

                <div className="space-y-8 pt-8">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-accent-soft rounded-lg flex items-center justify-center text-accent">
                             <CheckSquare size={18} />
                          </div>
                          <h3 className="text-2xl font-semibold text-text-primary tracking-tight">Recent Tasks</h3>
                       </div>
                        <NavLink to="/dashboard/my-tasks" className="text-xs font-semibold text-accent hover:opacity-80 flex items-center gap-1 group">
                           View all <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </NavLink>
                    </div>

                    <div className="premium-card">
                       <div className="space-y-1">
                           {tasksLoading ? (
                             [...Array(5)].map((_, i) => <TaskRowSkeleton key={i} />)
                           ) : filteredTasks.length === 0 ? (
                             <div className="py-12 text-center">
                               <p className="text-text-secondary font-medium">No tasks found matching your search.</p>
                             </div>
                           ) : (
                             filteredTasks.map((task) => (
                               <TaskRow 
                                 key={task.id} 
                                 task={task} 
                                 currentPath={currentPath}
                                 userProfile={userProfile}
                                 onAccept={handleAccept}
                                 onStatusChange={handleStatusChange}
                                 onDelete={handleDeleteTask}
                                 onView={handleView}
                                 formatDate={formatDate}
                               />
                             ))
                           )}
                       </div>
                    </div>
                 </div>
              </div>
            } />

            <Route path="invitations" element={
              <div className="space-y-8 animate-fade-up">
                 <div className="flex items-center justify-between mb-8">
                     <div>
                        <h2 className="text-3xl font-semibold text-text-primary tracking-tight">Task Requests</h2>
                        <p className="text-text-secondary font-medium">Pending invitations to collaborate on assignments.</p>
                     </div>
                  </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
                      {invitationsLoading ? (
                        [...Array(3)].map((_, i) => <TaskMarketCardSkeleton key={i} />)
                      ) : invitations.length === 0 ? (
                        <div className="col-span-full premium-card py-20 text-center border-dashed border-2">
                          <GitMerge size={32} className="mx-auto text-text-secondary/30 mb-4" />
                          <h4 className="text-lg font-semibold text-text-primary">No pending requests</h4>
                          <p className="text-text-secondary font-medium">When someone invites you to their project, it will appear here.</p>
                        </div>
                      ) : (
                        invitations.map((invite) => (
                          <div key={invite.id} className="premium-card flex flex-col h-full bg-accent/5 border-accent/20">
                            <div className="flex-1">
                              <span className="px-2 py-0.5 bg-accent-soft text-accent text-[10px] font-bold uppercase tracking-wider rounded mb-4 inline-block">Invitation</span>
                              <h3 className="text-lg font-semibold text-text-primary mb-2 line-clamp-1">{invite.task_title}</h3>
                              <p className="text-text-secondary text-sm mb-6 opacity-80">
                                <strong>{invite.creator_name}</strong> has invited you to work on this assignment.
                              </p>
                            </div>
                            <div className="flex gap-3 pt-6 border-t border-border-subtle mt-auto">
                               <button 
                                 onClick={() => handleRespondInvitation(invite.id, 'reject')}
                                 className="flex-1 py-2 px-4 border border-border-subtle text-text-secondary text-xs font-semibold rounded-lg hover:text-text-primary hover:bg-text-primary/5 transition-all"
                               >
                                 Decline
                               </button>
                               <button 
                                 onClick={() => handleRespondInvitation(invite.id, 'accept')}
                                 className="flex-1 py-2 px-4 bg-accent text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-all active:scale-95"
                               >
                                 Accept Request
                               </button>
                            </div>
                          </div>
                        ))
                      )}
                   </div>
              </div>
            } />

            <Route path="market" element={
              <div className="space-y-8 animate-fade-up">
                 <div className="flex items-center justify-between mb-8">
                     <div>
                        <h2 className="text-3xl font-semibold text-text-primary tracking-tight">Task Market</h2>
                        <p className="text-text-secondary font-medium">Browse and accept tasks from across the community.</p>
                     </div>
                  </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
                      {tasksLoading ? (
                        [...Array(6)].map((_, i) => <TaskMarketCardSkeleton key={i} />)
                      ) : filteredTasks.length === 0 ? (
                        <div className="col-span-full premium-card py-20 text-center border-dashed border-2">
                          <Briefcase size={32} className="mx-auto text-text-secondary/30 mb-4" />
                          <h4 className="text-lg font-semibold text-text-primary">No tasks in the market</h4>
                          <p className="text-text-secondary font-medium">Check back later for new assignments.</p>
                        </div>
                      ) : (
                        filteredTasks.map((task) => (
                          <TaskMarketCard 
                            key={task.id} 
                            task={task} 
                            onAccept={handleAccept} 
                            onView={handleView}
                            formatDate={formatDate}
                          />
                        ))
                      )}
                   </div>
              </div>
            } />

            <Route path="*" element={
              <div className="animate-fade-up">
                <div className="flex justify-between items-center mb-10">
                  <div>
                    <h1 className="text-3xl font-semibold text-text-primary">
                      {currentPath === 'posted-requests' ? 'Post Task' : 
                       currentPath === 'invitations' ? 'Task Requests' : 
                       currentPath.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </h1>
                    <p className="text-text-secondary font-medium mt-1">Your task records and details.</p>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {currentPath !== 'posted-requests' && currentPath !== 'invitations' && (
                      <div className="hidden md:flex bg-bg-card p-1 rounded-xl border border-border-subtle">
                        {[
                          { id: 'all', label: 'All' },
                          { id: 'accepted', label: 'Accepted' },
                          { id: 'in_progress', label: 'In Progress' },
                          { id: 'completed', label: 'Completed' }
                        ].map((filter) => (
                          <button
                            key={filter.id}
                            onClick={() => setStatusFilter(filter.id)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                              statusFilter === filter.id 
                                ? 'bg-accent text-white shadow-sm' 
                                : 'text-text-secondary hover:text-text-primary'
                            }`}
                          >
                            {filter.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {currentPath !== 'posted-requests' && currentPath !== 'invitations' && (
                      <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="md:hidden bg-bg-card border border-border-subtle rounded-xl px-3 py-2 text-xs font-semibold text-text-primary outline-none focus:border-accent/30"
                      >
                        <option value="all">All Status</option>
                        <option value="accepted">Accepted</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    )}

                    {currentPath === 'posted-requests' && (
                      <button
                        className="px-6 py-2.5 bg-accent text-white rounded-xl hover:opacity-90 transition font-semibold active:scale-95"
                        onClick={togglePostForm}
                      >
                        {showPostForm ? 'Cancel' : '+ Create Task'}
                      </button>
                    )}
                  </div>
                </div>

                {showPostForm && (
                   <div className="mb-10 premium-card animate-fade-up">
                      <h3 className="text-xl font-semibold mb-8 text-text-primary">Post New Assignment</h3>
                      <form onSubmit={handlePostTask} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <div className="space-y-2">
                            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Title</label>
                            <input 
                               type="text" 
                               required
                               value={newTask.title}
                               onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                               className="w-full bg-bg-main border border-border-subtle rounded-xl p-4 text-sm focus:border-accent/30 outline-none text-text-primary" 
                               placeholder="e.g. Design System for Fintech" 
                            />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Subject</label>
                            <input 
                               type="text" 
                               required
                               value={newTask.subject}
                               onChange={(e) => setNewTask({...newTask, subject: e.target.value})}
                               className="w-full bg-bg-main border border-border-subtle rounded-xl p-4 text-sm focus:border-accent/30 outline-none text-text-primary" 
                               placeholder="e.g. UI/UX Design" 
                            />
                         </div>
                         
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                               <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Deadline</label>
                               <input 
                                  type="date" 
                                  value={newTask.deadline}
                                  onChange={(e) => setNewTask({...newTask, deadline: e.target.value})}
                                  className="w-full bg-bg-main border border-border-subtle rounded-xl p-4 text-sm focus:border-accent/30 outline-none text-text-primary" 
                               />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Max Assignees</label>
                               <input 
                                  type="number" 
                                  min="1"
                                  max="20"
                                  value={newTask.max_assignees || 1}
                                  onChange={(e) => setNewTask({...newTask, max_assignees: Math.max(1, parseInt(e.target.value) || 1)})}
                                  className="w-full bg-bg-main border border-border-subtle rounded-xl p-4 text-sm focus:border-accent/30 outline-none text-text-primary" 
                               />
                               <p className="text-[10px] text-text-secondary opacity-60">How many users can accept this simultaneously</p>
                            </div>
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Attachment</label>
                            <div className="relative">
                               <input 
                                  type="file" 
                                  accept="image/*,application/pdf"
                                  onChange={(e) => setNewTask({...newTask, attachment: e.target.files[0]})}
                                  className="hidden" 
                                  id="file-upload"
                               />
                               <label htmlFor="file-upload" className="w-full bg-bg-main border-dashed border border-text-primary/10 rounded-xl p-4 text-sm flex items-center justify-center gap-2 cursor-pointer hover:bg-text-primary/2 transition-colors text-text-primary">
                                  {newTask.attachment ? (
                                     <><File size={16} className="text-accent" /> {newTask.attachment.name}</>
                                  ) : (
                                     <><Upload size={16} className="text-text-secondary" /> Choose file...</>
                                  )}
                               </label>
                            </div>
                         </div>
 
                         <div className="md:col-span-2 space-y-2">
                            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Description</label>
                            <textarea 
                               required
                               value={newTask.description}
                               onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                               className="w-full bg-bg-main border border-border-subtle rounded-xl p-4 text-sm focus:border-accent/30 outline-none text-text-primary" 
                               rows={4} 
                               placeholder="Describe the requirements..."
                            ></textarea>
                         </div>
                         <div className="md:col-span-2 flex justify-end gap-4 mt-4">
                            <button type="button" onClick={() => setShowPostForm(false)} className="px-6 py-2.5 text-text-secondary font-semibold rounded-xl hover:text-text-primary transition-colors">Discard</button>
                            <button type="submit" disabled={postLoading} className="px-8 py-2.5 bg-accent text-white font-semibold rounded-xl hover:opacity-90 transition-all active:scale-95 disabled:opacity-50">
                                {postLoading ? 'Posting...' : 'Post Now'}
                            </button>
                         </div>
                      </form>
                   </div>
                )}

                <div className="premium-card">
                   <div className="space-y-4">
                     {tasksLoading ? (
                       [...Array(5)].map((_, i) => <TaskRowSkeleton key={i} />)
                     ) : filteredTasks.length === 0 ? (
                        <div className="py-20 text-center">
                           <AlertCircle size={32} className="mx-auto text-text-secondary/20 mb-4" />
                           <p className="text-text-secondary font-medium">No tasks match your current view or search.</p>
                        </div>
                     ) : (
                       filteredTasks.map((task) => (
                         <TaskRow
                           key={task.id}
                           task={task}
                           currentPath={currentPath}
                           userProfile={userProfile}
                           onAccept={handleAccept}
                           onStatusChange={handleStatusChange}
                           onDelete={handleDeleteTask}
                           onView={handleView}
                           formatDate={formatDate}
                         />
                       ))
                     )}
                   </div>
                 </div>
              </div>
            } />
          </Routes>
        </div>
      </main>

      {/* Mobile Menu Button */}
      {!mobileMenuOpen && (
        <button 
          onClick={() => setMobileMenuOpen(true)}
          className="fixed bottom-6 right-6 md:hidden w-12 h-12 bg-accent text-white rounded-full flex items-center justify-center shadow-lg z-50 transition-all active:scale-90"
        >
          <Menu size={20} />
        </button>
      )}
      {mobileMenuOpen && (
         <button 
          onClick={() => setMobileMenuOpen(false)}
          className="fixed bottom-6 right-6 md:hidden w-12 h-12 bg-bg-card text-text-primary border border-border-subtle rounded-full flex items-center justify-center shadow-lg z-[60]"
        >
          <X size={20} />
        </button>
      )}
      {/* Profile Update Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-bg-card rounded-xl w-full max-w-lg shadow-2xl overflow-hidden border border-border-subtle animate-scale-up">
            <form onSubmit={handleUpdateProfile}>
              <div className="p-8">
                <div className="flex items-center justify-between mb-10">
                  <h3 className="text-2xl font-semibold text-text-primary tracking-tight">Update Profile</h3>
                  <button type="button" onClick={() => setIsProfileModalOpen(false)} className="p-2 hover:bg-text-primary/5 rounded-full transition-colors text-text-secondary"><X size={18} /></button>
                </div>

                <div className="space-y-8">
                  {/* Avatar Upload */}
                  <div className="flex flex-col items-center gap-4 mb-4">
                    <div className="relative group">
                      <div className="w-24 h-24 rounded-full bg-bg-main overflow-hidden border border-text-primary/10 shadow-sm">
                        <img 
                          src={profileFormData.photoPreview || "https://ui-avatars.com/api/?name="+profileFormData.name} 
                          alt="Avatar Preview" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <label htmlFor="profile-photo" className="absolute bottom-0 right-0 w-8 h-8 bg-accent text-white rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:opacity-90 transition-colors border-2 border-bg-card">
                        <Camera size={14} />
                        <input 
                          type="file" 
                          id="profile-photo" 
                          className="hidden" 
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              setProfileFormData({
                                ...profileFormData,
                                photo: file,
                                photoPreview: URL.createObjectURL(file)
                              });
                            }
                          }}
                        />
                      </label>
                    </div>
                    <p className="text-[10px] font-bold text-text-secondary/50 uppercase tracking-widest">Profile Photo</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest flex items-center gap-2">Full Name</label>
                      <div className="relative">
                        <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
                        <input 
                          type="text" 
                          required
                          value={profileFormData.name}
                          onChange={(e) => setProfileFormData({...profileFormData, name: e.target.value})}
                          placeholder="Your Name" 
                          className="w-full bg-bg-main border border-border-subtle rounded-xl pl-11 pr-4 py-3 text-sm focus:border-accent/30 outline-none text-text-primary placeholder-text-secondary/30" 
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest flex items-center gap-2">College</label>
                      <input 
                        type="text" 
                        value={profileFormData.college_name}
                        onChange={(e) => setProfileFormData({...profileFormData, college_name: e.target.value})}
                        placeholder="University Name" 
                        className="w-full bg-bg-main border border-border-subtle rounded-xl px-4 py-3 text-sm focus:border-accent/30 outline-none text-text-primary placeholder-text-secondary/30" 
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest flex items-center gap-2">Graduation Year</label>
                      <input 
                        type="text" 
                        value={profileFormData.year}
                        onChange={(e) => setProfileFormData({...profileFormData, year: e.target.value})}
                        placeholder="e.g. 2025" 
                        className="w-full bg-bg-main border border-border-subtle rounded-xl px-4 py-3 text-sm focus:border-accent/30 outline-none text-text-primary placeholder-text-secondary/30" 
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest flex items-center gap-2">Major / Field</label>
                      <input 
                        type="text" 
                        value={profileFormData.field}
                        onChange={(e) => setProfileFormData({...profileFormData, field: e.target.value})}
                        placeholder="e.g. Computer Science" 
                        className="w-full bg-bg-main border border-border-subtle rounded-xl px-4 py-3 text-sm focus:border-accent/30 outline-none text-text-primary placeholder-text-secondary/30" 
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-bg-main/30 border-t border-border-subtle flex gap-4">
                <button type="button" onClick={() => setIsProfileModalOpen(false)} className="flex-1 py-3 text-text-secondary font-semibold rounded-xl hover:text-text-primary transition-all">Cancel</button>
                <button type="submit" disabled={profileLoading} className="flex-1 py-3 bg-accent text-white font-semibold rounded-xl hover:opacity-90 transition-all disabled:opacity-50">
                  {profileLoading ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deletion Confirmation Modal */}
      {taskToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-bg-card rounded-xl w-full max-w-sm shadow-2xl overflow-hidden border border-border-subtle animate-scale-up">
            <div className="p-8 text-center">
              <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={24} />
              </div>
              <h3 className="text-xl font-semibold text-text-primary tracking-tight mb-2">Delete Task?</h3>
              <p className="text-sm text-text-secondary font-medium leading-relaxed">This action cannot be undone. All progress and data associated with this task will be lost.</p>
            </div>
            <div className="p-6 bg-bg-main/30 border-t border-border-subtle flex gap-4">
              <button 
                onClick={() => setTaskToDelete(null)} 
                className="flex-1 py-2.5 text-text-secondary font-semibold rounded-xl hover:text-text-primary transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                disabled={postLoading}
                className="flex-1 py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-all disabled:opacity-50"
              >
                {postLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}