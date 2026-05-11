import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { Users, Mail, Link as LinkIcon, MoreVertical, Shield, User, Copy, Check, Trash2 } from 'lucide-react';

export default function WorkspaceMembers() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    if (currentWorkspace) {
      setLoading(true);
      api.get(`/api/workspaces/${currentWorkspace.id}/members`)
        .then(res => setMembers(res.data || []))
        .catch(err => console.error('Failed to load members', err))
        .finally(() => setLoading(false));
    }
  }, [currentWorkspace]);

  const copyInviteLink = () => {
    if (currentWorkspace?.invite_code) {
      const link = `${window.location.origin}/join/${currentWorkspace.invite_code}`;
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openInviteModal = () => {
    if (window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('openWorkspaceSettings'));
    }
  };

  const handleRemove = async (targetUserId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;
    
    setActionLoading(targetUserId);
    try {
      await api.delete(`/api/workspaces/${currentWorkspace.id}/members/${targetUserId}`);
      setMembers(members.filter(m => m.user_id !== targetUserId));
    } catch (err) {
      console.error('Failed to remove member', err);
      alert(err.response?.data?.error || 'Failed to remove member');
    } finally {
      setActionLoading(null);
    }
  };

  const canRemoveMember = (member) => {
    if (!currentWorkspace || !user) return false;
    if (member.user_id === user.id) return false; // Cannot remove self here
    
    if (currentWorkspace.user_role === 'owner') return true;
    if (currentWorkspace.user_role === 'admin') {
      return member.role === 'member' || member.role === 'viewer';
    }
    return false;
  };

  if (!currentWorkspace) return null;

  return (
    <div className="space-y-8 animate-fade-in font-inter max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight">Team Members</h2>
          <p className="text-text-secondary font-medium mt-1">Manage access and roles for {currentWorkspace.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={copyInviteLink}
            className="px-4 py-2 bg-bg-card border border-border-subtle text-text-primary rounded-xl text-sm font-semibold hover:bg-bg-subtle transition-all flex items-center gap-2 shadow-sm"
          >
            {copied ? <Check size={16} className="text-green-500" /> : <LinkIcon size={16} />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
          <button 
            onClick={openInviteModal}
            className="px-4 py-2 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-opacity-90 transition-all flex items-center gap-2 shadow-accent/20 shadow-md"
          >
            <Mail size={16} /> Invite by Email
          </button>
        </div>
      </div>

      <div className="bg-bg-card border border-border-subtle rounded-2xl shadow-premium overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-text-secondary">Loading members...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-subtle bg-bg-sidebar">
                  <th className="py-4 px-6 text-xs font-bold text-text-secondary uppercase tracking-wider">Member</th>
                  <th className="py-4 px-6 text-xs font-bold text-text-secondary uppercase tracking-wider">Role</th>
                  <th className="py-4 px-6 text-xs font-bold text-text-secondary uppercase tracking-wider">Joined</th>
                  <th className="py-4 px-6 text-xs font-bold text-text-secondary uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {members.map((member) => (
                  <tr key={member.user_id} className="hover:bg-bg-subtle transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          {member.photo_url ? (
                            <img src={member.photo_url} alt={member.name} className="w-10 h-10 rounded-full object-cover border border-border-subtle" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-accent/10 text-accent flex items-center justify-center font-bold">
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-bg-card rounded-full"></span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-text-primary">{member.name}</p>
                          <p className="text-xs text-text-secondary">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        {member.role === 'owner' ? (
                          <Shield size={14} className="text-accent" />
                        ) : (
                          <User size={14} className="text-text-secondary" />
                        )}
                        <span className={`text-xs font-bold uppercase tracking-wider ${member.role === 'owner' ? 'text-accent' : 'text-text-secondary'}`}>
                          {member.role}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-sm text-text-secondary">
                        {new Date(member.joined_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </p>
                    </td>
                    <td className="py-4 px-6 text-right">
                      {canRemoveMember(member) && (
                        <button 
                          onClick={() => handleRemove(member.user_id)}
                          disabled={actionLoading === member.user_id}
                          className="text-text-secondary hover:text-red-500 p-2 rounded-lg hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                          title="Remove Member"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                      <button className="text-text-secondary hover:text-text-primary p-2 rounded-lg hover:bg-bg-sidebar transition-colors opacity-0 group-hover:opacity-100">
                        <MoreVertical size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
