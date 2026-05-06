import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  LayoutDashboard, 
  Plus, 
  User, 
  ShoppingBag, 
  Settings, 
  Moon, 
  Sun,
  Activity,
  Command,
  ArrowRight,
  Briefcase,
  Kanban
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function CommandPalette({ onLogout }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const actions = [
    { id: 'dashboard', title: 'Go to Dashboard', icon: <LayoutDashboard size={18} />, shortcut: 'G D', action: () => navigate('/dashboard') },
    { id: 'board', title: 'Project Board (Kanban)', icon: <Kanban size={18} />, shortcut: 'G B', action: () => navigate('/dashboard/board') },
    { id: 'market', title: 'Task Marketplace', icon: <ShoppingBag size={18} />, shortcut: 'G M', action: () => navigate('/dashboard/market') },
    { id: 'active', title: 'Active Tasks', icon: <Activity size={18} />, shortcut: 'G A', action: () => navigate('/dashboard/active-tasks') },
    { id: 'my-tasks', title: 'My Tasks', icon: <Briefcase size={18} />, shortcut: 'G T', action: () => navigate('/dashboard/my-tasks') },
    { id: 'posted', title: 'Posted Requests', icon: <Plus size={18} />, shortcut: 'G R', action: () => navigate('/dashboard/posted-requests') },
    { id: 'theme', title: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`, icon: theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />, shortcut: 'T', action: toggleTheme },
    { id: 'settings', title: 'Settings', icon: <Settings size={18} />, shortcut: 'S', action: () => navigate('/dashboard?settings=true') },
    { id: 'logout', title: 'Logout', icon: <ArrowRight size={18} className="rotate-180" />, shortcut: 'Q', action: () => {
      if (onLogout) onLogout();
      else {
        localStorage.removeItem('user');
        window.location.href = '/';
      }
    }},
  ];

  const filteredActions = actions.filter(action => 
    action.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleKeyDown = useCallback((e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setIsOpen(prev => !prev);
    }

    if (!isOpen) return;

    if (e.key === 'Escape') {
      setIsOpen(false);
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (filteredActions.length > 0 ? (prev + 1) % filteredActions.length : 0));
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (filteredActions.length > 0 ? (prev - 1 + filteredActions.length) % filteredActions.length : 0));
    }

    if (e.key === 'Enter') {
      if (filteredActions.length > 0) {
        e.preventDefault();
        const action = filteredActions[selectedIndex];
        if (action) {
          action.action();
          setIsOpen(false);
        }
      }
    }
  }, [isOpen, filteredActions, selectedIndex]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm animate-fade-in"
        onClick={() => setIsOpen(false)}
      />

      {/* Palette Container */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-scale-up">
        {/* Search Input Area */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <Search size={20} className="text-zinc-400" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 text-lg"
            placeholder="Type a command or search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-md border border-zinc-200 dark:border-zinc-700">
            <span className="text-[10px] font-bold text-zinc-500">ESC</span>
          </div>
        </div>

        {/* Results Area */}
        <div className="max-h-[60vh] overflow-y-auto py-2">
          {filteredActions.length > 0 ? (
            <div className="px-2">
              <div className="px-3 py-2 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Suggested Actions
              </div>
              {filteredActions.map((action, index) => (
                <button
                  key={action.id}
                  className={`w-full flex items-center justify-between px-3 py-3 rounded-xl transition-all duration-150 ${
                    index === selectedIndex 
                      ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-lg translate-x-1' 
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                  onClick={() => {
                    action.action();
                    setIsOpen(false);
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`${index === selectedIndex ? 'text-white dark:text-zinc-900' : 'text-zinc-400'}`}>
                      {action.icon}
                    </div>
                    <span className="font-medium">{action.title}</span>
                  </div>
                  
                  {action.shortcut && (
                    <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border transition-colors ${
                      index === selectedIndex 
                        ? 'border-white/20 dark:border-zinc-900/20 bg-white/10 dark:bg-zinc-900/10' 
                        : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800'
                    }`}>
                      {action.shortcut}
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <Search size={32} className="mx-auto text-zinc-300 dark:text-zinc-700 mb-4" />
              <p className="text-zinc-500 dark:text-zinc-500">No results found for "{search}"</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-zinc-50/50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400 font-medium">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><ArrowRight size={10} className="rotate-90" /> Navigate</span>
            <span className="flex items-center gap-1"><Command size={10} />+Enter Select</span>
          </div>
          <div className="flex items-center gap-2">
             Powered by TaskNest Workspace
          </div>
        </div>
      </div>
    </div>
  );
}
