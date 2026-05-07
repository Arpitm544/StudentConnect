import React, { memo } from 'react';
import { Eye, Trash2, Clock, CheckCircle, AlertCircle, FileText, Users, User, TrendingUp, Layers, CheckSquare } from 'lucide-react';
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
  
  const issueTypeConfig = {
    Task:        { icon: <Layers size={16} className="text-blue-400" /> },
    Bug:         { icon: <AlertCircle size={16} className="text-red-400" /> },
    Story:       { icon: <FileText size={16} className="text-emerald-400" /> },
    Improvement: { icon: <TrendingUp size={16} className="text-purple-400" /> },
  }[task.issue_type || 'Task'] || { icon: <Layers size={16} className="text-text-secondary" /> };

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

  const isCreator = String(task.creator_id) === String(userProfile?.id);
  const slotsFilled = task.slots_filled || 0;
  const capacity = task.capacity || 1;
  const isMultiSlot = capacity > 1;

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between p-4 md:px-6 md:py-4 rounded-xl bg-bg-card/50 hover:bg-text-primary/2 transition-all duration-200 group border border-border-subtle gap-4 md:gap-0">
      
      {/* Left Section: Info */}
      <div className="flex items-start gap-3 md:items-center md:gap-4 min-w-0">
        <div className="shrink-0 mt-1 md:mt-0">
          {currentPath === 'market' ? (
            <Avatar name={task.creator_name} photoUrl={task.creator_photo_url} size="sm" />
          ) : (currentPath === 'posted-requests' || currentPath === 'dashboard') ? (
            <div className="flex -space-x-2 overflow-hidden">
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
        </div>
        
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="shrink-0">{issueTypeConfig.icon}</span>
            <span className="font-semibold text-text-primary truncate text-sm md:text-[15px] tracking-tight group-hover:text-accent transition-colors">
              {task.title}
            </span>
          </div>
          <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-1 text-[11px] text-text-secondary font-medium">
            <span className="flex items-center gap-1">
              {currentPath === 'market' ? (
                task.creator_name || 'Anonymous'
              ) : currentPath === 'posted-requests' ? (
                <>{isMultiSlot ? `${slotsFilled}/${capacity} Assignees` : (task.assignees?.[0]?.name || 'Unassigned')}</>
              ) : (
                <>Due {task.deadline ? formatDate(task.deadline) : '—'}</>
              )}
            </span>
            {task.subject && (
              <>
                <span className="w-1 h-1 rounded-full bg-text-primary/10 hidden sm:block" />
                <span className="truncate uppercase tracking-wider text-[10px] opacity-70 border-l border-border-subtle pl-2 sm:border-0 sm:pl-0">
                  {task.subject}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right Section: Badges & Actions */}
      <div className="flex items-center justify-between md:justify-end gap-3 md:gap-6 w-full md:w-auto mt-2 md:mt-0 pt-3 md:pt-0 border-t md:border-t-0 border-border-subtle/30">
        <div className="flex items-center gap-2 md:gap-3">
          {task.priority && (
            <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border ${
              task.priority === 'Critical' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
              task.priority === 'High' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
              task.priority === 'Medium' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
              'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            }`}>
              {task.priority}
            </span>
          )}
          <span className={`flex items-center gap-1 text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border font-bold ${statusConfig.color}`}>
            {statusConfig.icon}
            {computedStatus === 'submitted' ? 'In Review' : computedStatus?.replace('_', ' ')}
          </span>
        </div>

        <div className="flex items-center gap-1 border-l border-border-subtle pl-3 md:pl-4">
          <button onClick={() => onView(task.id)} className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-text-primary/5 rounded-lg transition-all">
            <Eye size={16} />
          </button>
          {['posted-requests', 'dashboard', 'my-tasks'].includes(currentPath) && isCreator && (
            <button onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} className="p-1.5 text-text-secondary hover:text-red-400 hover:bg-red-400/5 rounded-lg transition-all">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

export default TaskRow;
