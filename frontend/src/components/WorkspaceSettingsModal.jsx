import React, { useState, useEffect } from 'react';
import { X, Users, Mail, Link as LinkIcon, Trash2, Crown, Shield, User } from 'lucide-react';
import api from '../api/axios';
import { useWorkspace } from '../context/WorkspaceContext';

export default function WorkspaceSettingsModal({ isOpen, onClose }) {
  const { currentWorkspace, refreshWorkspaces, selectWorkspace } = useWorkspace();
  const [activeTab, setActiveTab] = useState('members');
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isOpen && currentWorkspace) {
      fetchMembers();
      setActiveTab('members');
      setError('');
      setSuccess('');
    }
  }, [isOpen, currentWorkspace]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/workspaces/${currentWorkspace.id}/members`);
      setMembers(res.data);
    } catch (err) {
      setError('Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email) return;
    
    setInviteLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.post(`/api/workspaces/${currentWorkspace.id}/members`, {
        email,
        role
      });
      setSuccess('Member invited successfully');
      setEmail('');
      fetchMembers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to invite member');
    } finally {
      setInviteLoading(false);
    }
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/join/${currentWorkspace.invite_code}`;
    navigator.clipboard.writeText(link);
    setSuccess('Invite link copied to clipboard');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this workspace? This action cannot be undone.')) return;
    
    try {
      await api.delete(`/api/workspaces/${currentWorkspace.id}`);
      selectWorkspace(null);
      refreshWorkspaces();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete workspace');
    }
  };

  if (!isOpen || !currentWorkspace) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-bg-card border border-border-subtle rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-fade-up">
        
        <div className="flex items-center justify-between p-6 border-b border-border-subtle shrink-0">
          <div>
            <h2 className="text-xl font-bold text-text-primary tracking-tight">Workspace Settings</h2>
            <p className="text-sm text-text-secondary mt-1">{currentWorkspace.name}</p>
          </div>
          <button onClick={onClose} className="p-2 text-text-secondary hover:text-text-primary bg-bg-subtle hover:bg-bg-sidebar rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b border-border-subtle px-6 pt-4 shrink-0 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveTab('members')}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'members' ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <Users size={16} /> Members
          </button>
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'general' ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <Shield size={16} /> General
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {error && <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm font-medium">{error}</div>}
          {success && <div className="mb-6 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-500 text-sm font-medium">{success}</div>}

          {activeTab === 'members' && (
            <div className="space-y-8">
              {(currentWorkspace.user_role === 'owner' || currentWorkspace.user_role === 'admin') && (
                <div className="p-5 border border-border-subtle rounded-xl bg-bg-subtle">
                  <h3 className="text-sm font-bold text-text-primary mb-4">Invite New Members</h3>
                  <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email address"
                      className="flex-1 bg-bg-card border border-border-subtle rounded-lg px-4 py-2 text-sm text-text-primary focus:border-accent outline-none"
                      required
                    />
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="bg-bg-card border border-border-subtle rounded-lg px-4 py-2 text-sm text-text-primary focus:border-accent outline-none"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button
                      type="submit"
                      disabled={inviteLoading}
                      className="bg-accent text-white px-5 py-2 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 whitespace-nowrap flex items-center gap-2 justify-center"
                    >
                      <Mail size={16} /> {inviteLoading ? 'Inviting...' : 'Invite'}
                    </button>
                  </form>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-text-secondary">Or share an invite link</span>
                    <button onClick={copyInviteLink} type="button" className="text-xs font-semibold text-accent hover:text-accent-hover flex items-center gap-1">
                      <LinkIcon size={14} /> Copy Invite Link
                    </button>
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-bold text-text-primary mb-4">Current Members ({members.length})</h3>
                {loading ? (
                  <div className="text-sm text-text-secondary">Loading members...</div>
                ) : (
                  <div className="space-y-2">
                    {members.map(member => (
                      <div key={member.user_id} className="flex items-center justify-between p-3 border border-border-subtle rounded-lg bg-bg-card">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold text-sm">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-text-primary">{member.name}</p>
                            <p className="text-xs text-text-secondary">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-md flex items-center gap-1 ${
                            member.role === 'owner' ? 'bg-amber-500/10 text-amber-500' :
                            member.role === 'admin' ? 'bg-purple-500/10 text-purple-500' :
                            member.role === 'viewer' ? 'bg-gray-500/10 text-gray-500' :
                            'bg-blue-500/10 text-blue-500'
                          }`}>
                            {member.role === 'owner' && <Crown size={12} />}
                            {member.role === 'admin' && <Shield size={12} />}
                            {member.role === 'member' && <User size={12} />}
                            {member.role}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="p-5 border border-border-subtle rounded-xl bg-bg-subtle">
                <h3 className="text-sm font-bold text-text-primary mb-2">Workspace Details</h3>
                <p className="text-sm text-text-secondary mb-1"><strong className="text-text-primary">Name:</strong> {currentWorkspace.name}</p>
                <p className="text-sm text-text-secondary mb-1"><strong className="text-text-primary">Category:</strong> <span className="capitalize">{currentWorkspace.category}</span></p>
                <p className="text-sm text-text-secondary"><strong className="text-text-primary">Description:</strong> {currentWorkspace.description || 'No description'}</p>
              </div>

              {currentWorkspace.user_role === 'owner' && (
                <div className="p-5 border border-red-500/20 rounded-xl bg-red-500/5">
                  <h3 className="text-sm font-bold text-red-500 mb-2">Danger Zone</h3>
                  <p className="text-xs text-text-secondary mb-4">Once you delete a workspace, there is no going back. Please be certain.</p>
                  <button onClick={handleDelete} className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors flex items-center gap-2">
                    <Trash2 size={16} /> Delete Workspace
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
