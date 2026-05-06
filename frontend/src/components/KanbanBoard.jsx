import React, { useMemo, useState, useEffect } from 'react';
import { 
  MoreVertical, 
  Plus, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  MessageSquare,
  Paperclip,
  X
} from 'lucide-react';

export default function KanbanBoard({ tasks, onStatusChange, onView, formatDate }) {
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);
  const columns = [
    { id: 'pending', title: 'To Do', color: 'bg-zinc-500' },
    { id: 'in_progress', title: 'In Progress', color: 'bg-blue-500' },
    { id: 'submitted', title: 'In Review', color: 'bg-amber-500' },
    { id: 'completed', title: 'Completed', color: 'bg-emerald-500' }
  ];

  const boardData = useMemo(() => {
    return columns.map(col => ({
      ...col,
      tasks: tasks.filter(t => (t.status || 'pending') === col.id)
    }));
  }, [tasks, columns]);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Critical': return 'bg-red-500/10 text-red-600 border-red-200';
      case 'High': return 'bg-orange-500/10 text-orange-600 border-orange-200';
      case 'Medium': return 'bg-blue-500/10 text-blue-600 border-blue-200';
      default: return 'bg-zinc-500/10 text-zinc-600 border-zinc-200';
    }
  };

  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('taskId', taskId);
    e.currentTarget.style.opacity = '0.4';
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('bg-zinc-200/50', 'dark:bg-zinc-800/50');
  };

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('bg-zinc-200/50', 'dark:bg-zinc-800/50');
  };

  const handleDrop = (e, status) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-zinc-200/50', 'dark:bg-zinc-800/50');
    const taskId = e.dataTransfer.getData('taskId');
    
    if (taskId) {
      const task = tasks.find(t => String(t.id) === String(taskId));
      
      // Validation: If moving to "In Review" (submitted), check milestones
      if (status === 'submitted' && task) {
        const incompleteMilestones = task.milestones?.filter(m => 
          m.status.toLowerCase() !== 'done' && m.status.toLowerCase() !== 'completed'
        ) || [];
        
        if (incompleteMilestones.length > 0) {
          setNotification({
            title: 'Action Blocked',
            message: `You have ${incompleteMilestones.length} incomplete milestone(s). Please complete them before moving to review.`,
            type: 'error'
          });
          return;
        }
      }
      
      onStatusChange(taskId, status);
    }
  };

  return (
    <div className="flex gap-6 overflow-x-auto pb-8 min-h-[calc(100vh-200px)]">
      {boardData.map(column => (
        <div key={column.id} className="flex-shrink-0 w-80 flex flex-col">
          {/* Column Header */}
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${column.color}`} />
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider text-xs">
                {column.title}
              </h3>
              <span className="ml-1 text-[10px] font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-full">
                {column.tasks.length}
              </span>
            </div>
            <button className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
              <MoreVertical size={14} />
            </button>
          </div>

          {/* Column Body */}
          <div 
            className="flex-1 space-y-4 min-h-[150px] bg-zinc-50/50 dark:bg-zinc-900/30 p-2 rounded-2xl border border-zinc-100/50 dark:border-zinc-800/50 transition-colors"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            {column.tasks.map(task => (
              <div 
                key={task.id}
                draggable
                onDragStart={(e) => handleDragStart(e, task.id)}
                onDragEnd={handleDragEnd}
                className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-accent/30 transition-all cursor-grab active:cursor-grabbing"
                onClick={() => onView(task.id)}
              >
                {/* Task Header */}
                <div className="flex items-center justify-between mb-3 pointer-events-none">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                  <div className="flex -space-x-2">
                    <img 
                      src={`https://ui-avatars.com/api/?name=${task.creator_name || 'U'}&background=random`} 
                      className="w-5 h-5 rounded-full border-2 border-white dark:border-zinc-900 shadow-sm" 
                      alt="" 
                    />
                  </div>
                </div>

                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-2 line-clamp-2 leading-tight group-hover:text-accent transition-colors pointer-events-none">
                  {task.title}
                </h4>

                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-4 leading-relaxed pointer-events-none">
                  {task.description || "No description provided."}
                </p>

                {/* Task Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800 pointer-events-none">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-medium">
                      <Clock size={12} />
                      {formatDate(task.deadline)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {task.attachment_url && <Paperclip size={12} className="text-zinc-300" />}
                    <div className="w-6 h-6 rounded-lg bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:bg-accent group-hover:text-white transition-all">
                      <ArrowRight size={12} />
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {column.tasks.length === 0 && (
              <div className="h-24 flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                 <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">No tasks</p>
              </div>
            )}
          </div>
        </div>
      ))}
      {/* Premium Notification Popup */}
      {notification && (
        <div className="fixed bottom-8 right-8 z-[10000] animate-fade-up">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-4 w-80 flex gap-4">
            <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${notification.type === 'error' ? 'bg-red-50 text-red-600 dark:bg-red-500/10' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10'}`}>
              <AlertCircle size={20} />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-1">{notification.title}</h4>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
                {notification.message}
              </p>
            </div>
            <button 
              onClick={() => setNotification(null)}
              className="shrink-0 h-6 w-6 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-400 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
