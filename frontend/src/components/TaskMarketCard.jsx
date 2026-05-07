import React from 'react';
import { Clock, Tag, User, ChevronRight, Users, CheckSquare, AlertCircle, FileText, TrendingUp, Layers } from 'lucide-react';
import Avatar from './Avatar.jsx';

const TaskMarketCard = React.memo(({ task, onAccept, onView, formatDate }) => {
  const isHighPriority = task.deadline && new Date(task.deadline) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const capacity = task.capacity || 1;
  const slotsFilled = task.slots_filled || 0;
  const slotsAvailable = capacity - slotsFilled;
  const isMultiSlot = capacity > 1;
  
  const issueTypeConfig = {
    Task:        { icon: <Layers size={14} className="text-blue-400" /> },
    Bug:         { icon: <AlertCircle size={14} className="text-red-400" /> },
    Story:       { icon: <FileText size={14} className="text-emerald-400" /> },
    Improvement: { icon: <TrendingUp size={14} className="text-purple-400" /> },
  }[task.issue_type || 'Task'] || { icon: <Layers size={14} className="text-text-secondary" /> };

  const getLabelColor = (label) => {
    const colors = [
      'bg-blue-500/10 text-blue-400 border-blue-500/20',
      'bg-purple-500/10 text-purple-400 border-purple-500/20',
      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      'bg-amber-500/10 text-amber-400 border-amber-500/20',
      'bg-rose-500/10 text-rose-400 border-rose-500/20',
      'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    ];
    let hash = 0;
    for (let i = 0; i < label.length; i++) {
      hash = label.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="premium-card flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2 flex-wrap">
          {task.priority && (
            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${
              task.priority === 'Critical' ? 'bg-red-500/20 text-red-400 border-red-500/20' :
              task.priority === 'High' ? 'bg-orange-500/20 text-orange-400 border-orange-500/20' :
              task.priority === 'Medium' ? 'bg-blue-500/20 text-blue-400 border-blue-500/20' :
              'bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
            }`}>
              {task.priority}
            </span>
          )}
           {task.subject && (
             <span className="px-2 py-0.5 bg-accent-soft text-accent text-[10px] font-semibold uppercase tracking-wider rounded border border-accent/10">
               {task.subject}
             </span>
           )}
           {isMultiSlot && (
             <span className="px-2 py-0.5 bg-emerald-500/5 text-emerald-500 text-[10px] font-semibold uppercase tracking-wider rounded border border-emerald-500/10 flex items-center gap-1">
               <Users size={10} /> {slotsFilled}/{capacity} slots
             </span>
           )}
           <span className="px-2 py-0.5 bg-text-primary/3 text-text-secondary text-[10px] font-semibold uppercase tracking-wider rounded border border-border-subtle flex items-center gap-1">
             {issueTypeConfig.icon} {task.issue_type || 'Task'}
           </span>
        </div>
      </div>

      <div className="flex-1">
        <h3 className="text-lg font-semibold text-text-primary mb-2 line-clamp-1 leading-tight">
          {task.title}
        </h3>
        <p className="text-text-secondary text-sm mb-4 line-clamp-2 leading-relaxed opacity-80">
          {task.description || "No description provided for this task."}
        </p>
        {task.labels && task.labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-8">
            {task.labels.map((label, idx) => (
              <span key={idx} className={`px-1.5 py-0.5 border text-[9px] font-bold rounded uppercase tracking-wider ${getLabelColor(label)}`}>
                {label}
              </span>
            ))}
          </div>
        )}
      </div>

      {isMultiSlot && slotsFilled > 0 && task.assignees?.length > 0 && (
        <div className="flex items-center gap-1.5 mb-4">
          <div className="flex -space-x-2">
            {task.assignees.slice(0, 4).map((a, i) => (
              <Avatar key={a.user_id || i} name={a.name} photoUrl={a.photo_url} size="xs" />
            ))}
          </div>
          <span className="text-[10px] text-text-secondary font-medium ml-1">
            {slotsFilled} joined · {slotsAvailable} {slotsAvailable === 1 ? 'slot' : 'slots'} left
          </span>
        </div>
      )}

      <div className="flex items-center justify-between pt-6 border-t border-border-subtle mt-auto">
        <div className="flex items-center gap-2.5">
          <Avatar 
            name={task.creator_name} 
            photoUrl={task.creator_photo_url} 
            size="sm" 
          />
          <div className="flex flex-col">
            <span className="text-[12px] font-semibold text-text-primary leading-none mb-1">{task.creator_name}</span>
            <span className="text-[10px] text-text-secondary font-medium opacity-60">{formatDate(task.created_at)}</span>
          </div>
        </div>

        <div className="flex gap-2">
           <button 
            onClick={() => onView(task.id)}
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-text-primary/5 rounded-lg transition-colors"
          >
            <ChevronRight size={18} />
          </button>
          <button
            onClick={() => onAccept(task.id)}
            className="px-4 py-1.5 bg-accent text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-all active:scale-95"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
});

export default TaskMarketCard;
