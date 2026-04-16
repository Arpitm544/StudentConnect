import React, { memo, useCallback } from 'react';
import { Eye, Trash2 } from 'lucide-react';
import Avatar from './Avatar.jsx';

/**
 * Memoized TaskRow — only re-renders when its own task data changes.
 * Prevents the entire list re-rendering when parent state (error, loading, etc.) changes.
 */
const TaskRow = memo(function TaskRow({
  task,
  currentPath,
  userProfile,
  onAccept,
  onStatusChange,
  onDelete,
  onView,
  formatDate,
}) {
  const isCreator = task.creator_id === userProfile?.id;

  const statusColor = {
    pending:     'text-amber-600 bg-amber-50',
    accepted:    'text-blue-600 bg-blue-50',
    in_progress: 'text-indigo-600 bg-indigo-50',
    submitted:   'text-purple-600 bg-purple-50',
    completed:   'text-green-600 bg-green-50',
    cancelled:   'text-gray-500 bg-gray-100',
  }[task.status] || 'text-gray-500 bg-gray-100';

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between px-4 py-3.5 rounded-xl bg-transparent hover:bg-gray-50/80 transition-colors duration-150 group cursor-default gap-4 md:gap-0">

      {/* Left: avatar + info */}
      <div className="flex items-center gap-3 min-w-0 pr-4">
        {(currentPath === 'market' || currentPath === 'posted-requests') && (
          <Avatar
            name={currentPath === 'market' ? task.creator_name : task.assignee_name}
            photoUrl={currentPath === 'market' ? task.creator_photo_url : task.assignee_photo_url}
            size="sm"
            tooltip
          />
        )}
        <div className="flex flex-col min-w-0">
          <span className="font-semibold text-slate-900 truncate text-[15px] tracking-tight">{task.title}</span>
          <div className="flex items-center gap-2 mt-1 text-[13px] text-gray-500 font-medium">
            {currentPath === 'market' ? (
              <div className="flex items-center gap-1.5">
                <span>{task.creator_name || 'Anonymous'}</span>
              </div>
            ) : currentPath === 'posted-requests' ? (
              <div className="flex items-center gap-1.5">
                <span>{task.assignee_name || 'Unassigned'}</span>
              </div>
            ) : (
              <span>Deadline: {task.deadline ? formatDate(task.deadline) : '—'}</span>
            )}
            {task.subject && (
              <>
                <span className="w-1 h-1 rounded-full bg-gray-300 shrink-0" />
                <span className="truncate">{task.subject}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right: status + actions */}
      <div className="flex items-center gap-4 shrink-0">

        {/* Status Badge / Select */}
        {currentPath === 'my-tasks' && task.accepted ? (
          <select
            value={task.status || 'pending'}
            onChange={(e) => onStatusChange(task.id, e.target.value, task.progress)}
            disabled={task.status === 'completed'}
            className={`bg-white border border-gray-200 text-gray-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg outline-none cursor-pointer capitalize transition-colors hover:bg-gray-50 shadow-sm ${task.status === 'completed' ? 'pointer-events-none opacity-60' : ''}`}
          >
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="in_progress">In Progress</option>
            <option value="submitted">Submitted</option>
            {isCreator && <option value="completed">Completed</option>}
            <option value="cancelled">Cancelled</option>
          </select>
        ) : (
          <span className={`text-[11px] uppercase tracking-wider px-2.5 py-1 rounded-md font-bold ${statusColor}`}>
            {task.status?.replace('_', ' ') || 'Pending'}
          </span>
        )}

        {/* Progress bar (my-tasks only) */}
        {currentPath === 'my-tasks' && (
          <div className="hidden md:flex items-center gap-2 w-28">
            <div className="w-full h-1.5 bg-gray-200/80 rounded-full overflow-hidden">
              <div className="h-full bg-slate-900 rounded-full transition-[width] duration-500" style={{ width: `${task.progress || 0}%` }} />
            </div>
            <span className="text-xs font-medium text-gray-500 w-8">{task.progress || 0}%</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 sm:border-l border-gray-200/60 sm:pl-4 sm:ml-1">
          {currentPath === 'market' && !task.accepted && !isCreator && (
            <button
              onClick={() => onAccept(task.id)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-[13px] font-semibold hover:bg-indigo-700 transition-colors shadow-sm hover:shadow-md active:scale-95 mr-1"
            >
              Accept
            </button>
          )}
          <button
            onClick={() => onView(task.id)}
            className="p-2 text-gray-400 hover:text-slate-900 rounded-lg hover:bg-white transition-colors"
            aria-label="View Task"
          >
            <Eye size={16} />
          </button>
          {['posted-requests', 'dashboard', 'my-tasks'].includes(currentPath) && isCreator && (
            <button
              onClick={() => onDelete(task.id)}
              className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
              aria-label="Delete Task"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

export default TaskRow;
