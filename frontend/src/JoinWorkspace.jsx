import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useWorkspace } from './context/WorkspaceContext';
import api from './api/axios';
import { Loader2, CheckCircle2, XCircle, Briefcase } from 'lucide-react';

export default function JoinWorkspace() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { refreshWorkspaces, selectWorkspace } = useWorkspace();
  const [status, setStatus] = useState('processing'); // processing, success, error
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      // Store the join code in session so we can return here after login
      sessionStorage.setItem('joinWorkspaceCode', code);
      navigate('/login?redirect=join');
      return;
    }

    const join = async () => {
      try {
        const res = await api.post(`/api/workspaces/join/${code}`);
        setStatus('success');
        await refreshWorkspaces();
        
        // Auto-select the new workspace and go to dashboard
        if (res.data.workspace_id) {
          setTimeout(() => {
            selectWorkspace(res.data.workspace_id);
            navigate('/dashboard');
          }, 2000);
        }
      } catch (err) {
        setStatus('error');
        setError(err.response?.data?.error || 'Failed to join workspace. The link might be invalid or expired.');
      }
    };

    join();
  }, [code, user, authLoading, navigate, refreshWorkspaces, selectWorkspace]);

  return (
    <div className="min-h-screen bg-bg-main flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-bg-card border border-border-subtle rounded-3xl p-8 shadow-premium text-center animate-fade-up">
        <div className="w-16 h-16 bg-accent/10 text-accent rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Briefcase size={32} />
        </div>

        {status === 'processing' && (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">Joining Workspace</h1>
            <p className="text-text-secondary">Please wait while we add you to the team...</p>
            <div className="flex justify-center mt-8">
              <Loader2 className="animate-spin text-accent" size={40} />
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="flex justify-center mb-2">
              <CheckCircle2 className="text-green-500" size={48} />
            </div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">Success!</h1>
            <p className="text-text-secondary">You have successfully joined the workspace. Redirecting to your dashboard...</p>
            <button 
              onClick={() => navigate('/dashboard')}
              className="mt-6 w-full bg-accent text-white py-3 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-accent/20"
            >
              Go to Dashboard
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="flex justify-center mb-2">
              <XCircle className="text-red-500" size={48} />
            </div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">Oops!</h1>
            <p className="text-red-500 font-medium">{error}</p>
            <p className="text-text-secondary text-sm mt-4">
              If you think this is a mistake, please ask the workspace owner for a new invite link.
            </p>
            <button 
              onClick={() => navigate('/dashboard')}
              className="mt-6 w-full bg-bg-subtle text-text-primary py-3 rounded-xl font-bold hover:bg-bg-sidebar transition-all border border-border-subtle"
            >
              Back to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
