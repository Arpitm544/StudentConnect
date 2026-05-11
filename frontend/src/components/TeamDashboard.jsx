import React, { useState, useEffect, useMemo } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import api from '../api/axios';
import { 
  Users, CheckCircle, Clock, TrendingUp, Activity, Plus, 
  LayoutDashboard, Kanban, ChevronRight, MoreVertical, 
  FileText, Layers, Settings, Calendar
} from 'lucide-react';
import WorkspaceActivityFeed from './WorkspaceActivityFeed';
import ActivityChart from './ActivityChart';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

import { useAuth } from '../context/AuthContext';

const COLORS = ['#10B981', '#F59E0B', '#8B5CF6', '#6366F1'];

export default function TeamDashboard({ tasks }) {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (currentWorkspace) {
      api.get(`/api/workspaces/${currentWorkspace.id}/members`)
        .then(res => setMembers(res.data || []))
        .catch(err => console.error('Failed to load members', err));
    }
  }, [currentWorkspace]);

  const { total, completed, inProgress, todo, pending, completionRate, chartData } = useMemo(() => {
    if (!tasks || tasks.length === 0) return { 
      total: 0, completed: 0, inProgress: 0, todo: 0, pending: 0, completionRate: 0, chartData: [] 
    };
    
    const completed = tasks.filter((t) => t.status === 'completed' || t.status === 'done').length;
    const inProgress = tasks.filter((t) => t.status === 'in_progress' || t.status === 'in progress').length;
    const review = tasks.filter((t) => t.status === 'in_review' || t.status === 'submitted').length;
    const todo = tasks.filter((t) => t.status === 'todo' || t.status === 'to do' || t.status === 'pending').length;
    
    const pendingCount = inProgress + todo + review;
    const completionRate = Math.round((completed / tasks.length) * 100);

    const chartData = [
      { name: 'Completed', value: completed },
      { name: 'In-Review', value: review },
      { name: 'To-Do', value: todo }
    ].filter(d => d.value > 0);

    return { total: tasks.length, completed, inProgress, todo, pending: pendingCount, completionRate, chartData };
  }, [tasks]);

  const workflowTasks = useMemo(() => {
    const todoList = tasks.filter(t => t.status === 'todo' || t.status === 'to do' || t.status === 'pending').slice(0, 3);
    const progressList = tasks.filter(t => t.status === 'in_progress' || t.status === 'in progress').slice(0, 3);
    const reviewList = tasks.filter(t => t.status === 'in_review' || t.status === 'submitted').slice(0, 3);
    return { todo: todoList, inProgress: progressList, inReview: reviewList };
  }, [tasks]);

  const activityData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      last7Days.push({
        key,
        day: days[d.getDay()],
        postings: 0,
        completions: 0,
        inProgress: 0
      });
    }

    last7Days.forEach(dayInfo => {
      tasks.forEach(task => {
        if (!task.created_at) return;
        const taskCreatedDay = new Date(task.created_at).toISOString().split('T')[0];
        const taskUpdatedDay = task.updated_at ? new Date(task.updated_at).toISOString().split('T')[0] : null;
        
        if (taskCreatedDay === dayInfo.key) {
          dayInfo.postings += 1;
        }
        if ((task.status === 'completed' || task.status === 'done') && taskUpdatedDay === dayInfo.key) {
          dayInfo.completions += 1;
        }
        if ((task.status === 'in_progress' || task.status === 'in-progress') && taskCreatedDay <= dayInfo.key && (!taskUpdatedDay || taskUpdatedDay >= dayInfo.key)) {
          dayInfo.inProgress += 1;
        }
      });
    });

    return last7Days;
  }, [tasks]);

  if (!currentWorkspace) return null;

  return (
    <div className="space-y-8 animate-fade-in font-inter">
     
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">
            Welcome back to {currentWorkspace.name}, <span className="text-accent">{user?.name?.split(' ')[0] || 'Team'}</span>
          </h1>
          <p className="text-text-secondary flex items-center gap-2">
            <Calendar size={14} /> You have <span className="text-accent font-bold">{pending} tasks</span> to focus on in this workspace.
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => navigate('/dashboard/team-tasks')}
            className="px-6 py-2.5 bg-accent text-white rounded-xl font-semibold shadow-lg shadow-accent/20 hover:scale-105 transition-all flex items-center gap-2"
          >
            <Plus size={18} /> Post Task
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-bg-card border border-border-subtle rounded-3xl p-6 shadow-premium">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-bold text-text-primary">Workflow Overview</h3>
                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em] mt-1">Live Kanban View • Top Team Tasks</p>
              </div>
              <button onClick={() => navigate('/dashboard/board')} className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-subtle hover:bg-bg-sidebar text-text-primary text-[10px] font-bold rounded-lg border border-border-subtle transition-all">
                <Kanban size={14} /> FULL BOARD
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <div className="w-2 h-2 rounded-full bg-text-secondary opacity-40" />
                  <span className="text-[11px] font-bold text-text-secondary uppercase tracking-widest">TO DO</span>
                  <span className="ml-auto text-[10px] font-bold text-text-secondary px-1.5 py-0.5 bg-bg-subtle rounded-md border border-border-subtle">{workflowTasks.todo.length}</span>
                </div>
                <div className="space-y-3">
                  {workflowTasks.todo.length > 0 ? workflowTasks.todo.map(task => (
                    <TaskMiniCard key={task.id} task={task} onClick={() => navigate(`/dashboard/task/${task.id}`)} />
                  )) : (
                    <div className="h-24 border-2 border-dashed border-border-subtle rounded-2xl flex items-center justify-center text-[10px] text-text-secondary uppercase tracking-widest">No tasks</div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-[11px] font-bold text-text-secondary uppercase tracking-widest">IN PROGRESS</span>
                  <span className="ml-auto text-[10px] font-bold text-text-secondary px-1.5 py-0.5 bg-bg-subtle rounded-md border border-border-subtle">{workflowTasks.inProgress.length}</span>
                </div>
                <div className="space-y-3">
                  {workflowTasks.inProgress.length > 0 ? workflowTasks.inProgress.map(task => (
                    <TaskMiniCard key={task.id} task={task} onClick={() => navigate(`/dashboard/task/${task.id}`)} />
                  )) : (
                    <div className="h-24 border-2 border-dashed border-border-subtle rounded-2xl flex items-center justify-center text-[10px] text-text-secondary uppercase tracking-widest">No tasks</div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-[11px] font-bold text-text-secondary uppercase tracking-widest">IN REVIEW</span>
                  <span className="ml-auto text-[10px] font-bold text-text-secondary px-1.5 py-0.5 bg-bg-subtle rounded-md border border-border-subtle">{workflowTasks.inReview.length}</span>
                </div>
                <div className="space-y-3">
                  {workflowTasks.inReview.length > 0 ? workflowTasks.inReview.map(task => (
                    <TaskMiniCard key={task.id} task={task} onClick={() => navigate(`/dashboard/task/${task.id}`)} />
                  )) : (
                    <div className="h-24 border-2 border-dashed border-border-subtle rounded-2xl flex items-center justify-center text-[10px] text-text-secondary uppercase tracking-widest">No tasks</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-bg-card border border-border-subtle rounded-3xl p-6 shadow-premium h-full overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <Activity size={20} className="text-accent" /> Team Activity
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                <WorkspaceActivityFeed />
              </div>
            </div>

            <div className="bg-bg-card border border-border-subtle rounded-3xl p-6 shadow-premium">
              <h3 className="text-lg font-bold text-text-primary mb-6">Team Performance</h3>
              <div className="space-y-6">
                {members.slice(0, 5).map(member => {
                  const memberTasks = tasks.filter(t => t.assignee_id === member.user_id);
                  const completedCount = memberTasks.filter(t => t.status === 'completed' || t.status === 'done').length;
                  const totalCount = memberTasks.length;
                  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
                  
                  return (
                    <div key={member.user_id} className="group">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            {member.photo_url ? (
                              <img src={member.photo_url} alt={member.name} className="w-10 h-10 rounded-full object-cover border border-border-subtle group-hover:border-accent transition-colors" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-accent/10 text-accent flex items-center justify-center font-bold text-sm">
                                {member.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-text-primary">{member.name}</p>
                            <p className="text-[10px] text-text-secondary uppercase tracking-wider">{totalCount} Tasks Assigned</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-text-primary">{completionRate}%</span>
                          <p className="text-[10px] text-text-secondary uppercase tracking-wider">Done</p>
                        </div>
                      </div>
                      
                      <div className="w-full h-1.5 bg-bg-subtle rounded-full overflow-hidden border border-border-subtle">
                        <div 
                          className="h-full bg-accent transition-all duration-500 ease-out" 
                          style={{ width: `${completionRate}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                
                {members.length > 5 && (
                  <button onClick={() => navigate('/dashboard/members')} className="w-full mt-2 py-2 text-xs font-bold text-accent hover:bg-accent/5 rounded-xl transition-all uppercase tracking-widest">
                    View full team analytics
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-bg-card border border-border-subtle rounded-3xl p-8 shadow-premium">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold text-text-primary">Team Progress</h3>
              <MoreVertical size={16} className="text-text-secondary cursor-pointer" />
            </div>
            <div className="h-[240px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-4xl font-black text-text-primary">{completionRate}%</span>
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em] mt-1">Overall</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-8">
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                <span className="text-[10px] font-bold text-text-secondary uppercase">Done</span>
                <span className="text-sm font-bold text-text-primary">{completed}</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6]" />
                <span className="text-[10px] font-bold text-text-secondary uppercase">Review</span>
                <span className="text-sm font-bold text-text-primary">{tasks.filter(t => t.status === 'in_review' || t.status === 'submitted').length}</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#6366F1]" />
                <span className="text-[10px] font-bold text-text-secondary uppercase">Pending</span>
                <span className="text-sm font-bold text-text-primary">{todo}</span>
              </div>
            </div>
          </div>
          <div className="bg-bg-card border border-border-subtle rounded-3xl p-8 shadow-premium h-[350px]">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-bold text-text-primary uppercase tracking-wider text-[14px]">Velocity</h3>
                <p className="text-[10px] text-text-secondary uppercase tracking-widest mt-1">Task Completion Rate</p>
              </div>
            </div>
            <div className="h-[200px] w-full">
               <ActivityChart data={activityData} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskMiniCard({ task, onClick }) {
  const priorityColor = task.priority === 'High' ? 'text-red-500 bg-red-500/10' : task.priority === 'Medium' ? 'text-blue-500 bg-blue-500/10' : 'text-gray-400 bg-gray-400/10';
  
  return (
    <div 
      onClick={onClick}
      className="bg-bg-sidebar/50 border border-border-subtle rounded-2xl p-4 cursor-pointer hover:border-accent/50 hover:bg-bg-sidebar transition-all group"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${priorityColor}`}>
          {task.priority || 'Medium'}
        </span>
        {task.ai_optimized && (
          <div className="w-4 h-4 rounded-full bg-accent text-white flex items-center justify-center">
            <TrendingUp size={10} />
          </div>
        )}
      </div>
      <h4 className="text-sm font-bold text-text-primary group-hover:text-accent transition-colors line-clamp-1">{task.title}</h4>
      <p className="text-[11px] text-text-secondary mt-1 line-clamp-2 leading-relaxed">{task.description}</p>
      
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-1.5 text-text-secondary">
          <Clock size={12} />
          <span className="text-[10px] font-medium">{task.deadline ? new Date(task.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No date'}</span>
        </div>
        <div className="w-6 h-6 rounded-lg bg-bg-card flex items-center justify-center text-text-secondary group-hover:bg-accent group-hover:text-white transition-all">
          <ChevronRight size={14} />
        </div>
      </div>
    </div>
  );
}

