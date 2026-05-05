import React from 'react';
import { Clock, Tag, User, ChevronRight } from 'lucide-react';
import Avatar from './Avatar.jsx';

const TaskMarketCard = React.memo(({ task, onAccept, onView, formatDate }) => {
  const isHighPriority = task.deadline && new Date(task.deadline) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return (
    <div className="premium-card flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          {isHighPriority && (
            <span className="px-2 py-0.5 bg-red-400/5 text-red-400 text-[10px] font-semibold uppercase tracking-wider rounded border border-red-400/10">
              High Priority
            </span>
          )}
           {task.subject && (
             <span className="px-2 py-0.5 bg-accent-soft text-accent text-[10px] font-semibold uppercase tracking-wider rounded border border-accent/10">
               {task.subject}
             </span>
           )}
        </div>
      </div>

      <div className="flex-1">
        <h3 className="text-lg font-semibold text-text-primary mb-2 line-clamp-1 leading-tight">
          {task.title}
        </h3>
        <p className="text-text-secondary text-sm mb-8 line-clamp-2 leading-relaxed opacity-80">
          {task.description || "No description provided for this task."}
        </p>
      </div>

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
