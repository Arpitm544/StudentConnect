import React, { useState, useEffect } from 'react';
import { Target, Plus, CheckCircle2, Circle, Clock, ChevronRight, BarChart } from 'lucide-react';
import api from '../api/axios';
import { useWorkspace } from '../context/WorkspaceContext';

const formatDate = (dateString) => {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(dateString));
};

export default function WorkspaceMilestones() {
  const { currentWorkspace } = useWorkspace();
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', due_date: '' });
  const [createLoading, setCreateLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchMilestones = async () => {
    if (!currentWorkspace) return;
    setLoading(true);
    try {
      const res = await api.get(`/api/workspaces/${currentWorkspace.id}/milestones`);
      setMilestones(res.data || []);
    } catch (err) {
      setError('Failed to load milestones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMilestones();
  }, [currentWorkspace]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.title) return;
    setCreateLoading(true);
    try {
      await api.post(`/api/workspaces/${currentWorkspace.id}/milestones`, formData);
      setShowCreate(false);
      setFormData({ title: '', description: '', due_date: '' });
      fetchMilestones();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create milestone');
    } finally {
      setCreateLoading(false);
    }
  };

  if (!currentWorkspace) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <Target size={48} className="text-text-muted mb-4" />
        <h2 className="text-xl font-bold text-text-primary">Milestones are a Workspace Feature</h2>
        <p className="text-text-secondary mt-2">Select a team workspace to view and manage milestones.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-up">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-semibold text-text-primary tracking-tight">Milestones</h2>
          <p className="text-text-secondary font-medium">Track your team's progress across sprints and major goals.</p>
        </div>
        {(currentWorkspace.user_role === 'owner' || currentWorkspace.user_role === 'admin') && (
          <button 
            onClick={() => setShowCreate(true)}
            className="px-5 py-2.5 bg-accent text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all flex items-center gap-2"
          >
            <Plus size={16} /> New Milestone
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-xl text-sm mb-6">
          {error}
        </div>
      )}

      {showCreate && (
        <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 shadow-premium mb-8">
          <h3 className="text-lg font-bold text-text-primary mb-4">Create New Milestone</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-text-primary block mb-1">Title</label>
              <input 
                type="text" 
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full bg-bg-subtle border border-border-subtle rounded-xl px-4 py-2 text-sm text-text-primary focus:border-accent outline-none"
                required
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-text-primary block mb-1">Description</label>
              <textarea 
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full bg-bg-subtle border border-border-subtle rounded-xl px-4 py-2 text-sm text-text-primary focus:border-accent outline-none min-h-[80px]"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-text-primary block mb-1">Due Date</label>
              <input 
                type="date" 
                value={formData.due_date}
                onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                className="bg-bg-subtle border border-border-subtle rounded-xl px-4 py-2 text-sm text-text-primary focus:border-accent outline-none"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button 
                type="button" 
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-text-secondary hover:bg-bg-subtle"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={createLoading}
                className="px-5 py-2 bg-accent text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {createLoading ? 'Creating...' : 'Create Milestone'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-text-secondary">Loading milestones...</div>
      ) : milestones.length === 0 ? (
        <div className="bg-bg-card border border-border-subtle rounded-2xl p-12 text-center shadow-sm">
          <Target size={48} className="text-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-bold text-text-primary mb-2">No Milestones Yet</h3>
          <p className="text-sm text-text-secondary mb-6">Create your first milestone to start tracking your team's sprints.</p>
          {(currentWorkspace.user_role === 'owner' || currentWorkspace.user_role === 'admin') && (
            <button 
              onClick={() => setShowCreate(true)}
              className="px-5 py-2 bg-accent/10 text-accent rounded-xl text-sm font-semibold hover:bg-accent/20 transition-all inline-flex items-center gap-2"
            >
              <Plus size={16} /> Create Milestone
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {milestones.map(milestone => (
            <div key={milestone.id} className="bg-bg-card border border-border-subtle rounded-2xl p-6 shadow-premium hover:border-accent/30 transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-text-primary group-hover:text-accent transition-colors">{milestone.title}</h3>
                  {milestone.due_date && (
                    <div className="flex items-center gap-1.5 text-xs text-text-secondary mt-1 font-medium">
                      <Clock size={12} /> Due {formatDate(milestone.due_date)}
                    </div>
                  )}
                </div>
                <div className="bg-bg-subtle p-2 rounded-lg text-accent">
                  <BarChart size={20} />
                </div>
              </div>
              
              <p className="text-sm text-text-secondary mb-6 line-clamp-2 min-h-[40px]">
                {milestone.description || 'No description provided.'}
              </p>

              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Progress</div>
                  <div className="text-sm font-bold text-text-primary">{Math.round(milestone.progress)}%</div>
                </div>
                <div className="w-full bg-bg-subtle rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-accent to-purple-500 h-2.5 rounded-full transition-all duration-500" 
                    style={{ width: `${milestone.progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs font-medium text-text-secondary pt-1">
                  <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-green-500" /> {milestone.completed_tasks} completed</span>
                  <span className="flex items-center gap-1"><Circle size={12} /> {milestone.total_tasks - milestone.completed_tasks} pending</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
