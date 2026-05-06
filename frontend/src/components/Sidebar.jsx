import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Briefcase, 
  PieChart, FileText, X, UserCircle, 
  Sun, Moon, LogOut, CheckSquare, GitMerge, Users, Kanban, Layers, Settings
} from 'lucide-react';
import Avatar from './Avatar.jsx';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} />, end: true },
  { to: '/dashboard/board', label: 'Kanban Board', icon: <Kanban size={18} /> },
  { to: '/dashboard/market', label: 'Task Market', icon: <Briefcase size={18} /> },
  { to: '/dashboard/my-tasks', label: 'My Tasks', icon: <CheckSquare size={18} /> },
  { to: '/dashboard/invitations', label: 'Task Requests', icon: <Users size={18} /> },
  { to: '/dashboard/posted-requests', label: 'Post Task', icon: <FileText size={18} /> },
];

const Sidebar = React.memo(({ 
  mobileMenuOpen, 
  closeMobileMenu, 
  userProfile, 
  theme, 
  toggleTheme, 
  onLogout, 
  setIsSettingsModalOpen,
  tasks = [] 
}) => {
  const navigate = useNavigate();
  const projectColors = ['bg-indigo-500', 'bg-purple-500', 'bg-amber-500', 'bg-emerald-500', 'bg-pink-500'];

  return (
    <aside className={`w-[280px] bg-bg-sidebar text-text-secondary flex flex-col shrink-0 z-50 py-8 h-screen border-r border-border-subtle transition-transform duration-300 ease-out ${mobileMenuOpen ? 'translate-x-0 fixed inset-y-0 left-0 shadow-2xl' : '-translate-x-full fixed inset-y-0 left-0 md:relative md:translate-x-0 md:left-auto'}`}>
      <div className="p-6 flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-white">
            <Layers size={18} />
          </div>
          <h1 className="text-lg font-semibold text-text-primary tracking-tight">TaskNest</h1>
        </div>
        <button className="md:hidden p-2 text-text-secondary hover:text-text-primary" onClick={closeMobileMenu}>
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={closeMobileMenu}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-accent-soft text-accent' 
                  : 'hover:bg-text-primary/5 hover:text-text-primary'
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
        
        {tasks.length > 0 && (
          <div className="pt-8 pb-4">
            <p className="px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-text-secondary/50 mb-4">Projects</p>
            <ul className="space-y-1">
               {tasks.slice(0, 5).map((t, i) => (
                 <li 
                    key={t.id} 
                    onClick={() => {
                      navigate(`/dashboard/task/${t.id}`);
                      closeMobileMenu();
                    }}
                    className="px-4 py-2 flex items-center gap-3 text-sm hover:text-text-primary cursor-pointer transition-colors group"
                 >
                    <div className="w-1.5 h-1.5 rounded-full bg-accent/40 group-hover:bg-accent transition-colors" />
                    <span className="truncate">{t.title}</span>
                 </li>
               ))}
            </ul>
          </div>
        )}
      </nav>

      <div className="px-4 mt-auto space-y-1">
         {toggleTheme && (
           <button 
             onClick={toggleTheme}
             className="w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm hover:bg-text-primary/5 hover:text-text-primary transition-colors"
           >
             {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />} 
             {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
           </button>
         )}
         <button 
           onClick={() => {
             if (setIsSettingsModalOpen) {
               setIsSettingsModalOpen(true);
             } else {
               navigate('/dashboard?settings=true');
             }
             closeMobileMenu();
           }}
           className="w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm hover:bg-text-primary/5 hover:text-text-primary transition-colors"
         >
           <Settings size={18} /> Settings
         </button>
         {userProfile && (
           <div 
             onClick={() => {
               if (setIsSettingsModalOpen) {
                 setIsSettingsModalOpen(true);
               } else {
                 navigate('/dashboard?settings=true');
               }
               closeMobileMenu();
             }}
             className="mt-4 flex items-center gap-3 px-4 py-4 bg-text-primary/5 rounded-2xl border border-border-subtle cursor-pointer hover:bg-text-primary/10 transition-all group"
           >
             <Avatar name={userProfile?.name} photoUrl={userProfile?.photo_url} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs font-semibold text-text-primary truncate leading-none group-hover:text-accent transition-colors">{userProfile?.name || 'Loading...'}</p>
                </div>
                <p className="text-[10px] text-text-secondary truncate">{userProfile?.email}</p>
              </div>
             <button 
               onClick={(e) => {
                 e.stopPropagation();
                 onLogout();
               }} 
               className="text-text-secondary hover:text-red-400 transition-colors p-1"
             >
                <LogOut size={14} />
             </button>
           </div>
         )}
      </div>
    </aside>
  );
});

export default Sidebar;
