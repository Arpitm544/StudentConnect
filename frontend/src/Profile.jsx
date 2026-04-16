import React, { useEffect, useState, useMemo, useCallback, memo } from 'react';
import {
  Users,
  LayoutDashboard,
  CheckSquare,
  FileText,
  GitMerge,
  User,
  PlusCircle,
  Eye,
  Trash2,
  Zap,
  LogOut,
  AlertCircle,
  FileText as FileTextIcon,
  Menu,
  X
} from 'lucide-react';
import { Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Avatar from './components/Avatar.jsx';
import TaskRow from './components/TaskRow.jsx';

export default function Profile({ onLogout }) {
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState('');
  const [newTask, setNewTask] = useState({ title: '', description: '', subject: '', deadline: '', attachment: null });
  const [postLoading, setPostLoading] = useState(false);
  const [showPostForm, setShowPostForm] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname.split('/').pop() || 'dashboard';

  const [userProfile, setUserProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editField, setEditField] = useState('');
  const [editCollegeName, setEditCollegeName] = useState('');
  const [editYear, setEditYear] = useState('');
  const [editPhotoFile, setEditPhotoFile] = useState(null);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState(null);
  
  const [updateLoading, setUpdateLoading] = useState(false);

  const fetchTasks = async () => {
    let endpoint = '/tasks/dashboard';
    if (currentPath === 'my-tasks') endpoint = '/tasks/mine';
    if (currentPath === 'posted-requests') endpoint = '/tasks/posted';
    if (currentPath === 'active-workflows') endpoint = '/tasks/active';
    if (currentPath === 'market') endpoint = '/tasks';

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}${endpoint}`, { credentials: 'include' });
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
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/user/profile`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load profile');
      const data = await res.json();
      setUserProfile(data);
    } catch (err) {
      console.error(err);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!editName.trim()) { setError('Name cannot be empty'); return; }
    setUpdateLoading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('name', editName);
    formData.append('field', editField);
    formData.append('college_name', editCollegeName);
    formData.append('year', editYear);
    if (editPhotoFile) {
       formData.append('photo', editPhotoFile);
    }
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/user/profile`, {
        method: 'PUT',
        credentials: 'include',
        body: formData,
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to update profile');
      }
      loadProfile();
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

  // ✅ useMemo — only recomputes when tasks array changes
  const { total, completed, inProgress, inReview, pending } = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
    const inReview   = tasks.filter((t) => t.status === 'submitted').length;
    const pending = tasks.filter((t) => !t.status || t.status === 'pending').length;
    return { total, completed, inProgress, inReview, pending };
  }, [tasks]);

  const handleLogout = async () => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/logout`, {
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
        const uploadRes = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/upload`, {
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
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/tasks`, {
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

  const handleAccept = useCallback(async (id) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/tasks/${id}/accept`, { method: 'POST', credentials: 'include' });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to accept task');
      }
      navigate(`/dashboard/task/${id}`);
    } catch (err) {
      setError(err.message);
    }
  }, [navigate]); // useCallback

  const handleStatusChange = useCallback(async (id, status, progress = null) => {
    try {
      const body = { status };
      if (progress !== null) body.progress = parseInt(progress, 10);
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/tasks/${id}/status`, {
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
  }, [fetchTasks]); // useCallback

  const handleDeleteTask = useCallback(async (id) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/tasks/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('Delete failed');
      fetchTasks();
    } catch (err) {
      setError(err.message);
    }
  }, [fetchTasks]); // useCallback

  const formatDate = useCallback((dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }, []);

  const getPageTitle = useMemo(() => {
    const map = {
      'my-tasks': 'My Tasks',
      'posted-requests': 'Posted Requests',
      'active-workflows': 'Active Workflows',
      'market': 'Task Market',
      'profile': 'Profile',
    };
    return map[currentPath] || (userProfile ? `Welcome back, ${userProfile.name.split(' ')[0]}` : 'Welcome back');
  }, [currentPath, userProfile]);

  const getPageSubtitle = useMemo(() => {
    const map = {
      'my-tasks': 'Assignments assigned to your queue',
      'posted-requests': "Assignments you've posted for others",
      'active-workflows': 'Currently running workflows tracking',
      'market': 'Browse public assignments from all students',
      'profile': 'Manage your personal details and account',
    };
    return map[currentPath] || 'Dashboard';
  }, [currentPath]);

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} />, end: true },
    { to: '/dashboard/market', label: 'Task Market', icon: <Users size={18} /> },
    { to: '/dashboard/my-tasks', label: 'My Tasks', icon: <CheckSquare size={18} /> },
    { to: '/dashboard/posted-requests', label: 'Posted Requests', icon: <FileText size={18} /> },
    { to: '/dashboard/active-workflows', label: 'Active Workflows', icon: <GitMerge size={18} /> },
  ];

  return (
    <div className="flex flex-col md:flex-row bg-[#f8fafc] min-h-screen relative overflow-x-hidden">
      
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 h-16 sticky top-0 z-30 w-full shrink-0 shadow-sm">
        <div className="flex items-center gap-2">
          <Zap size={20} className="text-slate-900" fill="currentColor" />
          <h2 className="text-[15px] font-bold text-slate-900 tracking-tight m-0">StudentConnect</h2>
        </div>
        <button onClick={() => setMobileMenuOpen(true)} className="p-2 -mr-2 text-gray-500 hover:text-slate-900 hover:bg-gray-50 rounded-lg transition">
          <Menu size={22} />
        </button>
      </div>

      {/* Mobile Menu Backdrop */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* ── PHASE 6: Sidebar Final Polish ── */}
      <aside className={`w-64 bg-white/95 md:bg-white/80 backdrop-blur-md border-r border-gray-100 flex flex-col shrink-0 h-screen z-50 transition-transform duration-300 md:translate-x-0 ${mobileMenuOpen ? 'translate-x-0 fixed top-0 left-0 shadow-2xl' : '-translate-x-full fixed top-0 left-0 md:sticky'}`}>
        
        {/* Logo */}
        <div className="flex items-center justify-between gap-2 px-6 h-16 md:h-20 shrink-0 border-b md:border-0 border-slate-100">
          <div className="flex items-center gap-2">
             <Zap size={20} className="text-slate-900" fill="currentColor" />
             <h2 className="text-[15px] font-bold text-slate-900 tracking-tight m-0">StudentConnect</h2>
          </div>
          <button className="md:hidden p-2 -mr-2 text-gray-400 hover:text-slate-900 bg-gray-50 hover:bg-gray-100 rounded-lg transition" onClick={() => setMobileMenuOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 overflow-y-auto">
          <ul className="space-y-1">
            {navItems.map(({ to, label, icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-600 font-medium'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                    }`
                  }
                >
                  {icon} {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-gray-100">
          {userProfile && (
            <div 
              className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-gray-50 transition cursor-pointer group"
              onClick={() => navigate('/dashboard/profile')}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Avatar name={userProfile.name} photoUrl={userProfile.photo_url} size="md" />
                <div className="min-w-0 pr-2">
                  <p className="text-sm font-medium text-gray-900 truncate">{userProfile.name}</p>
                </div>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); handleLogout(); }}
                className="text-gray-400 opacity-0 group-hover:opacity-100 hover:text-red-600 transition p-1"
                title="Sign out"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── PHASE 1: Main Content Wrapper ── */}
      <main className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-6xl mx-auto w-full min-w-0 flex flex-col">
        <Routes>
          <Route path="profile" element={
            <div className="max-w-2xl animate-fade-up">
              {/* PHASE 2: Header */}
              <div className="flex justify-between items-center mb-10">
                <div>
                  <p className="text-sm text-gray-500">{getPageSubtitle}</p>
                  <h1 className="text-3xl font-semibold text-slate-900">{getPageTitle}</h1>
                </div>
              </div>
              
              {profileLoading ? (
                <div className="loader !border-slate-200 !border-l-indigo-600 my-8" />
              ) : userProfile ? (
                <div className="bg-white rounded-2xl shadow-sm p-6 max-w-lg border border-gray-50 hover:shadow-md transition">
                  <div className="flex flex-col sm:flex-row items-start gap-6 border-b border-gray-100 pb-6 mb-6">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-indigo-50 to-purple-50 text-indigo-600 rounded-full flex items-center justify-center text-xl sm:text-2xl font-medium border border-indigo-100 shrink-0 overflow-hidden relative group">
                      {isEditing ? (
                         <>
                            {previewPhotoUrl ? (
                               <img src={previewPhotoUrl} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                               userProfile.photo_url ? (
                                  <img src={userProfile.photo_url} alt="Profile" className="w-full h-full object-cover" />
                               ) : (
                                  <span>{editName?.charAt(0).toUpperCase()}</span>
                               )
                            )}
                            <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-white text-xs font-semibold cursor-pointer z-10 transition">
                               Upload
                            </div>
                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-20" accept="image/*" onChange={(e) => {
                               if(e.target.files && e.target.files[0]) {
                                  setEditPhotoFile(e.target.files[0]);
                                  setPreviewPhotoUrl(URL.createObjectURL(e.target.files[0]));
                               }
                            }} />
                         </>
                      ) : (
                         userProfile.photo_url ? (
                            <img src={userProfile.photo_url} alt="Profile" className="w-full h-full object-cover" />
                         ) : (
                            <span>{userProfile.name?.charAt(0).toUpperCase()}</span>
                         )
                      )}
                    </div>
                    <div className="flex-1 w-full min-w-0">
                      {isEditing ? (
                        <div className="space-y-4">
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                             <div className="space-y-1">
                               <label className="text-[12px] font-medium text-slate-500 uppercase tracking-wide">Full Name</label>
                               <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full py-2.5 px-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-[14px]" placeholder="Full name" autoFocus />
                             </div>
                             <div className="space-y-1">
                               <label className="text-[12px] font-medium text-slate-500 uppercase tracking-wide">Field</label>
                               <input type="text" value={editField} onChange={(e) => setEditField(e.target.value)} className="w-full py-2.5 px-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-[14px]" placeholder="E.g. Computer Science" />
                             </div>
                             <div className="space-y-1">
                               <label className="text-[12px] font-medium text-slate-500 uppercase tracking-wide">College Name</label>
                               <input type="text" value={editCollegeName} onChange={(e) => setEditCollegeName(e.target.value)} className="w-full py-2.5 px-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-[14px]" placeholder="E.g. MIT" />
                             </div>
                             <div className="space-y-1">
                               <label className="text-[12px] font-medium text-slate-500 uppercase tracking-wide">Year</label>
                               <input type="text" value={editYear} onChange={(e) => setEditYear(e.target.value)} className="w-full py-2.5 px-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-[14px]" placeholder="E.g. Sophomore" />
                             </div>
                           </div>
                           <div className="flex gap-2 pt-2">
                             <button onClick={handleUpdateProfile} disabled={updateLoading} className="inline-flex items-center justify-center px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition text-sm font-medium w-full sm:w-auto shadow-sm">
                               {updateLoading ? 'Saving...' : 'Save Changes'}
                             </button>
                             <button onClick={() => { setIsEditing(false); }} className="inline-flex items-center justify-center px-4 py-2.5 bg-gray-50 text-gray-700 rounded-xl hover:bg-gray-100 transition text-sm font-medium border border-gray-100 w-full sm:w-auto">
                               Cancel
                             </button>
                           </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center flex-wrap gap-x-3 gap-y-2 mb-2">
                            <h2 className="text-[22px] font-bold text-gray-900 tracking-tight">{userProfile.name}</h2>
                            <button onClick={() => {
                               setIsEditing(true);
                               setEditName(userProfile.name);
                               setEditField(userProfile.field || '');
                               setEditCollegeName(userProfile.college_name || '');
                               setEditYear(userProfile.year || '');
                               setEditPhotoFile(null);
                               setPreviewPhotoUrl(null);
                            }} className="px-3.5 py-1.5 bg-indigo-50/70 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 rounded-full text-[13px] font-medium transition cursor-pointer border border-indigo-100">
                               Edit Profile
                            </button>
                          </div>
                          <div className="flex flex-col gap-1.5 mt-3">
                             <p className="text-gray-600 text-[14px] flex items-center gap-2">
                                <span className="font-medium text-gray-400 w-16">Email</span> {userProfile.email}
                             </p>
                             {userProfile.field && (
                                <p className="text-gray-600 text-[14px] flex items-center gap-2">
                                  <span className="font-medium text-gray-400 w-16">Field</span> {userProfile.field}
                                </p>
                             )}
                             {(userProfile.college_name || userProfile.year) && (
                                <p className="text-gray-600 text-[14px] flex items-center gap-2">
                                  <span className="font-medium text-gray-400 w-16">College</span> 
                                  {userProfile.college_name} 
                                  {userProfile.college_name && userProfile.year && <span className="text-gray-400">•</span>} 
                                  {userProfile.year && <span className="text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded-full text-[12px]">{userProfile.year}</span>}
                                </p>
                             )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 mb-1">Member Since</p>
                      <p className="font-medium text-gray-900">{formatDate(userProfile.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Status</p>
                      <p className="font-medium text-gray-900 flex items-center gap-2">
                         <span className="w-2 h-2 rounded-full bg-green-500"></span> Active
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Failed to load profile.</p>
              )}
            </div>
          } />

          <Route path="*" element={
            <div className="animate-fade-up">
              
              {/* ── PHASE 2: Header ── */}
              <div className="flex justify-between items-center mb-10">
                <div>
                  <p className="text-sm text-gray-500">{getPageSubtitle}</p>
                  <h1 className="text-3xl font-semibold text-slate-900">{getPageTitle}</h1>
                </div>

                {currentPath === 'posted-requests' && (
                  <button
                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium"
                    onClick={() => setShowPostForm(v => !v)}
                  >
                    {showPostForm ? 'Cancel' : '+ Create Task'}
                  </button>
                )}
              </div>

              {/* Create Task Form */}
              {currentPath === 'posted-requests' && showPostForm && (
                 <div className="mb-10 bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition">
                   <form onSubmit={handlePostAssignment} className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                         <label className="block text-sm text-gray-500 mb-1.5">Title</label>
                         <input type="text" placeholder="Task title..." value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                           className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition" required />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-500 mb-1.5">Subject</label>
                        <input type="text" placeholder="Subject..." value={newTask.subject} onChange={(e) => setNewTask({ ...newTask, subject: e.target.value })}
                           className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition" required />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-500 mb-1.5">Deadline</label>
                        <input type="date" value={newTask.deadline} onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                           className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm text-gray-500 mb-1.5">Description</label>
                        <textarea placeholder="Write out the requirements..." value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} rows={3}
                           className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition resize-y" />
                      </div>
                      <div className="col-span-2 border border-dashed border-gray-200 p-4 rounded-xl mt-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Attachment (Optional)</label>
                        <input type="file" accept="image/*,application/pdf" onChange={(e) => setNewTask({ ...newTask, attachment: e.target.files[0] || null })}
                           className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 transition cursor-pointer" />
                      </div>
                      <div className="col-span-2 mt-2">
                         <button type="submit" disabled={postLoading} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium disabled:opacity-60">
                           {postLoading ? 'Creating...' : 'Create Task'}
                         </button>
                      </div>
                   </form>
                 </div>
              )}

              {error && (
                <div className="mb-10 flex items-center gap-2 p-4 bg-red-50 text-red-600 rounded-2xl text-sm">
                  <AlertCircle size={18} /> {error}
                </div>
              )}

              {/* ── PHASE 3: Metrics ── */}
              {(!currentPath || currentPath === 'dashboard') && (
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-10 w-full">
                  {[
                    { title: 'Total Tasks', value: total, text: 'Total scope', color: 'text-gray-500' },
                    { title: 'In Progress', value: inProgress, text: 'Developing', color: 'text-indigo-600' },
                    { title: 'In Review',   value: inReview,   text: 'Peer review', color: 'text-amber-600' },
                    { title: 'Completed',   value: completed,  text: 'Finished', color: 'text-emerald-600' },
                    { title: 'Open',        value: pending,    text: 'Awaiting pick', color: 'text-slate-400' },
                  ].map((card) => (
                    <div key={card.title} className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition border border-gray-50">
                      <p className="text-[12px] font-medium text-gray-400 uppercase tracking-tight">{card.title}</p>
                      <h2 className="text-2xl font-bold mt-1 text-slate-900">{card.value}</h2>
                      <p className={`text-[11px] mt-1 font-semibold ${card.color}`}>{card.text}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* ── PHASE 4: Feed List View Structure ── */}
              <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm p-4 sm:p-6 border border-white/60">
                
                {/* Rows & PHASE 5: Premium Empty State */}
                <div className="space-y-1.5">
                  {tasks.length === 0 ? (
                    <div className="text-center py-20">
                      <div className="w-12 h-12 mx-auto bg-gray-100 rounded-xl flex items-center justify-center">
                        <FileTextIcon size={20} className="text-gray-500" />
                      </div>
                      <h3 className="mt-4 text-lg font-medium text-slate-900">No tasks yet</h3>
                      <p className="text-gray-500 mt-2 text-sm">
                        {currentPath === 'posted-requests' ? 'Create your first task to get started' : 'Check back later for new tasks.'}
                      </p>
                      {currentPath === 'posted-requests' && (
                        <button onClick={() => setShowPostForm(true)} className="mt-6 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium shadow-sm">
                          Create Task
                        </button>
                      )}
                    </div>
                  ) : (
                    // ✅ Memoized TaskRow — each row only re-renders when its own data changes
                    tasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        currentPath={currentPath}
                        userProfile={userProfile}
                        onAccept={handleAccept}
                        onStatusChange={handleStatusChange}
                        onDelete={handleDeleteTask}
                        onView={(id) => navigate(`/dashboard/task/${id}`)}
                        formatDate={formatDate}
                      />
                    ))
                  )}
                </div>

              </div>

            </div>
          } />
        </Routes>
      </main>

    </div>
  );
}
