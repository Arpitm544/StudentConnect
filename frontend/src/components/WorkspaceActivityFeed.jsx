import React, { useState, useEffect } from 'react';
import { Activity, MessageSquare, CheckSquare, Target, UserPlus, Clock } from 'lucide-react';
import api from '../api/axios';
import { useWorkspace } from '../context/WorkspaceContext';
import Avatar from './Avatar';

const formatDistanceToNow = (date) => {
  const diffInSeconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (diffInSeconds < 60) return 'just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
};

export default function WorkspaceActivityFeed() {
  const { currentWorkspace } = useWorkspace();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      if (!currentWorkspace) return;
      setLoading(true);
      try {
        const res = await api.get(`/api/workspaces/${currentWorkspace.id}/activities`);
        setActivities(res.data || []);
      } catch (err) {
        console.error('Failed to load activities', err);
      } finally {
        setLoading(false);
      }
    };
    fetchActivities();
  }, [currentWorkspace]);

  if (!currentWorkspace) return null;

  const getIcon = (action) => {
    if (action.includes('task')) return <CheckSquare size={14} className="text-emerald-500" />;
    if (action.includes('milestone')) return <Target size={14} className="text-purple-500" />;
    if (action.includes('member')) return <UserPlus size={14} className="text-blue-500" />;
    if (action.includes('comment')) return <MessageSquare size={14} className="text-amber-500" />;
    return <Activity size={14} className="text-accent" />;
  };

  return (
    <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 shadow-premium h-full max-h-[500px] flex flex-col">
      <div className="flex items-center gap-2 mb-6 shrink-0">
        <Activity className="text-accent" size={20} />
        <h3 className="text-lg font-bold text-text-primary">Workspace Activity</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
        {loading ? (
          <div className="text-sm text-text-secondary text-center py-8">Loading activities...</div>
        ) : activities.length === 0 ? (
          <div className="text-sm text-text-secondary text-center py-8">No recent activity</div>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="flex gap-3 animate-fade-in group">
              <div className="shrink-0 relative pt-1">
                <Avatar name={activity.user_name} photoUrl={activity.user_photo_url} size="sm" />
                <div className="absolute -bottom-1 -right-1 bg-bg-card rounded-full p-0.5 shadow-sm border border-border-subtle">
                  {getIcon(activity.action)}
                </div>
              </div>
              <div className="flex-1 min-w-0 bg-bg-subtle/50 group-hover:bg-bg-subtle transition-colors p-3 rounded-xl border border-transparent group-hover:border-border-subtle">
                <p className="text-sm text-text-primary break-words">
                  <span className="font-semibold">{activity.user_name}</span> {activity.details}
                </p>
                {activity.entity_title && (
                  <p className="text-xs text-text-secondary mt-1 font-medium truncate">
                    {activity.entity_type}: {activity.entity_title}
                  </p>
                )}
                <p className="text-[10px] text-text-muted mt-2 flex items-center gap-1">
                  <Clock size={10} /> {formatDistanceToNow(activity.created_at)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
