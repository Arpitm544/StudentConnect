import React, { memo } from 'react';
import { Eye, Trash2, Clock, CheckCircle, AlertCircle, FileText, Users, User } from 'lucide-react';
import Avatar from './Avatar.jsx';

const TaskRow = memo(function TaskRow({
  task,
  currentPath,
  userProfile,
  onAccept,
  onView,
  formatDate,
  onDelete
}) {
  const getComputedStatus = () => {
    const milestones = task.milestones || [];
    if (milestones.length === 0) return task.status || 'pending';

    const total = milestones.length;
    const completed = milestones.filter(m => m.status === "done").length;
    const inReview = milestones.some(m => m.status === "submitted" || m.status === "in_review");

    if (completed === total) return "completed";
    if (inReview) return "submitted"; 
    if (completed > 0) return "in_progress";
    return task.accepted ? "accepted" : "pending";
  };

  const computedStatus = getComputedStatus();

  const statusConfig = {
    pending:     { color: 'text-text-secondary bg-text-primary/3 border border-border-subtle', icon: <Clock size={12} /> },
    accepted:    { color: 'text-accent bg-accent-soft border border-accent/10', icon: <CheckCircle size={12} /> },
    in_progress: { color: 'text-accent bg-accent-soft border border-accent/10', icon: <FileText size={12} /> },
    submitted:   { color: 'text-amber-400 bg-amber-400/5 border border-amber-400/10', icon: <AlertCircle size={12} /> },
    completed:   { color: 'text-emerald-400 bg-emerald-400/5 border border-emerald-400/10', icon: <CheckCircle size={12} /> },
    cancelled:   { color: 'text-text-secondary bg-text-primary/3 border border-border-subtle', icon: <AlertCircle size={12} /> },
  }[computedStatus] || { color: 'text-text-secondary bg-text-primary/3 border border-border-subtle', icon: <Clock size={12} /> };

  const isCreator = String(task.creator_id) === String(userProfile?.id);
  const slotsFilled = task.slots_filled || 0;
  const capacity = task.capacity || 1;
  const isMultiSlot = capacity > 1;

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-4 rounded-xl bg-bg-card/50 hover:bg-text-primary/2 transition-all duration-200 group border border-border-subtle gap-4 md:gap-0">

      <div className="flex items-center gap-4 min-w-0 pr-4">
        {currentPath === 'market' ? (
          <Avatar
            name={task.creator_name}
            photoUrl={task.creator_photo_url}
            size="md"
            tooltip
          />
        ) : (currentPath === 'posted-requests' || currentPath === 'dashboard') ? (
          <div className="flex -space-x-3 overflow-hidden p-1">
            {task.assignees && task.assignees.length > 0 ? (
               task.assignees.slice(0, 3).map((a, i) => (
                 <div key={a.user_id || i} className="ring-2 ring-bg-card rounded-full">
                   <Avatar name={a.name} photoUrl={a.photo_url} size="xs" />
                 </div>
               ))
            ) : (
               <div className="w-8 h-8 rounded-full bg-text-primary/5 flex items-center justify-center text-text-secondary border border-border-subtle">
                 <User size={14} />
               </div>
            )}
          </div>
        ) : null}
        
        <div className="flex flex-col min-w-0">
          <span className="font-semibold text-text-primary truncate text-[15px] tracking-tight group-hover:text-accent transition-colors">{task.title}</span>
          <div className="flex items-center gap-2 mt-1 text-[12px] text-text-secondary font-medium">
            {currentPath === 'market' ? (
              <span>{task.creator_name || 'Anonymous'}</span>
            ) : currentPath === 'posted-requests' ? (
              <span className="flex items-center gap-1">
                {isMultiSlot ? (
                  <><Users size={12} /> {slotsFilled}/{capacity} Assignees</>
                ) : (
                  task.assignees?.[0]?.name || 'Unassigned'
                )}
              </span>
            ) : (
              <span>Due {task.deadline ? formatDate(task.deadline) : '—'}</span>
            )}
            {task.subject && (
              <>
                <span className="w-1 h-1 rounded-full bg-text-primary/10" />
                <span className="truncate uppercase tracking-wider text-[10px] opacity-70">{task.subject}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6 shrink-0">
        
        {currentPath === 'my-tasks' && (
          <div className="hidden md:flex items-center gap-3 w-32">
            <div className="w-full h-1 bg-text-primary/5 rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full transition-all duration-700" style={{ width: `${task.progress || 0}%` }} />
            </div>
            <span className="text-[11px] font-bold text-text-secondary w-8">{task.progress || 0}%</span>
          </div>
        )}

        <div className="flex items-center gap-4">
          {task.priority && (
            <span className={`px-2 py-1 text-[9px] font-bold uppercase tracking-widest rounded border ${
              task.priority === 'Critical' ? 'bg-red-500/20 text-red-400 border-red-500/20' :
              task.priority === 'High' ? 'bg-orange-500/20 text-orange-400 border-orange-500/20' :
              task.priority === 'Medium' ? 'bg-blue-500/20 text-blue-400 border-blue-500/20' :
              'bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
            }`}>
              {task.priority}
            </span>
          )}
          <span className={`flex items-center gap-1.5 text-[10px] uppercase tracking-widest px-3 py-1 rounded-lg font-semibold ${statusConfig.color}`}>
            {statusConfig.icon}
            {computedStatus === 'submitted' ? 'In Review' : computedStatus?.replace('_', ' ')}
          </span>

          <div className="flex items-center gap-1 border-l border-border-subtle pl-4">
            {currentPath === 'market' && slotsFilled < capacity && !isCreator && !task.assignees?.some(a => String(a.user_id) === String(userProfile?.id)) && (
              <button
                onClick={() => onAccept(task.id)}
                className="px-4 py-1.5 bg-accent text-white rounded-lg text-[12px] font-semibold hover:opacity-90 transition-all active:scale-95"
              >
                {slotsFilled > 0 ? 'Join' : 'Accept'}
              </button>
            )}
            <button
              onClick={() => onView(task.id)}
              className="p-2 text-text-secondary hover:text-text-primary hover:bg-text-primary/5 rounded-lg transition-all"
              title="View Details"
            >
              <Eye size={18} />
            </button>
            {['posted-requests', 'dashboard', 'my-tasks'].includes(currentPath) && isCreator && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                className="p-2 text-text-secondary hover:text-red-400 hover:bg-red-400/5 rounded-lg transition-all"
                title="Delete"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default TaskRow;
