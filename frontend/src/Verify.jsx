import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Mail, ShieldCheck, RefreshCw } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_URL_SECONDARY || '';

export default function Verify({ onVerified }) {
  const RESEND_COOLDOWN_SECONDS = 120;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((v) => (v > 0 ? v - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      setMessage('Email verified successfully. Redirecting...');
      await onVerified();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setMessage('');
    if (!email) {
      setError('Please enter your email to resend verification');
      return;
    }
    setResending(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to resend verification email');
      setMessage(data.message || 'Verification email sent');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex justify-center items-center bg-bg-main p-4 text-text-primary font-inter transition-colors duration-300">
      <Link to="/login" className="absolute top-8 left-8 text-text-secondary hover:text-accent flex items-center gap-2 transition-all text-xs font-bold uppercase tracking-widest">
        <ArrowLeft size={14} strokeWidth={2.5} /> Back to login
      </Link>

      <div className="w-full max-w-[440px] bg-bg-card rounded-xl border border-border-subtle p-10 shadow-2xl animate-fade-up">
        <div className="mb-10 text-center">
          <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-accent/20">
            <ShieldCheck size={20} className="text-white" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary mb-3">Verify your email</h1>
          <p className="text-text-secondary text-sm opacity-60">
            Enter the 6-digit OTP sent to your email.
          </p>
        </div>

        {error && (
          <div className="bg-red-400/5 text-red-400 px-4 py-3 rounded-xl mb-6 text-[13px] border border-red-400/10 flex items-start gap-3 leading-relaxed">
            {error}
          </div>
        )}
        {message && (
          <div className="bg-emerald-400/5 text-emerald-400 px-4 py-3 rounded-xl mb-6 text-[13px] border border-emerald-400/10 flex items-center gap-3">
            <CheckCircle2 size={16} />
            <span>{message}</span>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-6 mb-8">
          <div>
            <label className="block mb-2 font-bold text-[10px] text-text-secondary uppercase tracking-widest opacity-60">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full py-3 px-4 border border-border-subtle rounded-xl bg-bg-main text-sm text-text-primary outline-none transition-all placeholder:text-text-secondary/30 focus:border-accent/30"
            />
          </div>

          <div>
            <label className="block mb-2 font-bold text-[10px] text-text-secondary uppercase tracking-widest opacity-60">6-digit OTP</label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              required
              className="w-full py-3 px-4 border border-border-subtle rounded-xl bg-bg-main text-sm text-text-primary outline-none transition-all placeholder:text-text-secondary/30 focus:border-accent/30 tracking-[0.5em] text-center font-mono text-lg"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-accent text-white rounded-xl text-[13px] font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-accent/10 active:scale-[0.98]"
          >
            {loading ? <RefreshCw size={16} className="animate-spin" /> : 'Verify Email'}
          </button>
        </form>

        <div className="rounded-xl border border-border-subtle p-6 bg-bg-main/30">
          <div className="flex items-center gap-3 mb-4 text-[13px] font-medium text-text-primary">
            <Mail size={16} className="text-accent" />
            <span>Didn't receive an email?</span>
          </div>
          <div className="space-y-4">
            <button
              type="button"
              onClick={handleResend}
              disabled={resending || cooldown > 0}
              className="w-full py-2.5 bg-transparent border border-border-subtle text-text-secondary hover:text-text-primary hover:bg-text-primary/5 rounded-xl text-[12px] font-semibold transition-all disabled:opacity-50"
            >
              {resending ? 'Sending...' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend verification email'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
