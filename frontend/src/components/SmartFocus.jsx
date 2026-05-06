import React from 'react';
import { Clock, ArrowRight, Target, AlertTriangle, Layers } from 'lucide-react';

export default function PriorityTasks({ tasks, onAction, formatDate, loading }) {
  if (loading) {
    return (
      <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 animate-pulse">
        <div className="h-10 w-48 bg-text-primary/5 rounded-xl mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-24 bg-text-primary/5 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="bg-bg-card border border-border-subtle rounded-2xl flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-bg-main rounded-full flex items-center justify-center border border-border-subtle mb-6">
          <Target size={28} className="text-text-secondary" />
        </div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">Focus Queue</h3>
        <p className="text-sm text-text-secondary max-w-sm mb-8">
          The Focus Queue tracks tasks you've accepted. Browse the market to find new projects.
        </p>
        <button 
          onClick={() => onAction('explore')} 
          className="px-6 py-2 bg-text-primary text-bg-main font-medium rounded-lg hover:opacity-90 transition-all active:scale-95"
        >
          Browse Market
        </button>
      </div>
    );
  }

  const getTimeStatus = (deadline) => {
    if (!deadline) return null;
    const now = new Date();
    const due = new Date(deadline);
    const diff = due - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (diff < 0) return { label: 'Overdue', color: 'text-red-500', icon: <AlertTriangle size={12} /> };
    if (hours < 24) return { label: `${hours}h left`, color: 'text-orange-500', icon: <Clock size={12} /> };
    return { label: `${days}d left`, color: 'text-text-secondary', icon: <Clock size={12} /> };
  };

  const getWorkloadSummary = () => {
    const overdue = tasks.filter(t => new Date(t.deadline) < new Date()).length;
    const critical = tasks.filter(t => t.priority === 'Critical').length;
    
    if (overdue > 0) return `Action Required: ${overdue} tasks are overdue.`;
    if (critical > 0) return `High Priority: ${critical} critical tasks in your queue.`;
    return "Status: Your workload is currently balanced.";
  };

  const summary = getWorkloadSummary();

  return (
    <div className="bg-bg-card border border-border-subtle rounded-2xl overflow-hidden">
      <div className="p-6 border-b border-border-subtle bg-bg-main/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-text-primary text-bg-main rounded-lg flex items-center justify-center">
              <Target size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text-primary tracking-tight">Focus Queue</h3>
              <p className="text-xs text-text-secondary">Assigned tasks requiring attention.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-bg-main border border-border-subtle text-text-primary rounded-lg text-xs font-medium">
            {tasks.length} Active
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-6 p-4 bg-bg-main/50 rounded-xl border border-border-subtle flex items-start gap-3">
           <AlertTriangle size={16} className="text-text-secondary mt-0.5" />
           <p className="text-xs font-medium text-text-primary">
              {summary}
           </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tasks.map((task) => {
            const timeStatus = getTimeStatus(task.deadline);
            const isReview = task.status === 'submitted';
            
            return (
              <div 
                key={task.id} 
                className="group p-5 bg-bg-card border border-border-subtle rounded-xl hover:border-text-primary/20 transition-all cursor-pointer shadow-sm active:scale-[0.99]"
                onClick={() => onAction(task.id)}
              >
                <div className="flex justify-between items-start mb-4">
                   <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          task.priority === 'Critical' ? 'bg-red-500' : 
                          task.priority === 'High' ? 'bg-orange-500' : 'bg-blue-500'
                        }`} />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                          {isReview ? 'Needs Review' : !task.accepted ? 'Your Post' : task.subject}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-text-primary leading-tight pr-2">{task.title}</h4>
                   </div>
                   {timeStatus && (
                      <div className={`px-2 py-0.5 rounded bg-bg-main text-[10px] font-bold ${timeStatus.color} border border-border-subtle`}>
                        {timeStatus.label}
                      </div>
                    )}
                </div>

                <div className="mt-4 pt-4 border-t border-border-subtle/50 flex items-center justify-between gap-4">
                   <div className="flex-1 h-1 bg-bg-main rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-text-primary transition-all duration-700" 
                        style={{ width: `${task.progress || 0}%` }}
                      />
                   </div>
                  <ArrowRight size={14} className="text-text-secondary group-hover:text-text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
