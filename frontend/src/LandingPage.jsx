import React from 'react';
import { ArrowRight, Users, Clock, Zap, FileText, GitMerge } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import './App.css';

const FEATURES = [
  {
    icon: <FileText size={24} />,
    title: 'Post Assignment Requests',
    desc: 'Create and share assignment requests with peers in seconds. Add deadlines, subjects, and detailed descriptions.',
  },
  {
    icon: <Users size={24} />,
    title: 'Accept & Collaborate',
    desc: 'Browse available assignments and accept tasks that match your skills and schedule seamlessly.',
  },
  {
    icon: <Clock size={24} />,
    title: 'Track Workflow Status',
    desc: 'Monitor progress in real-time with detailed status stages from acceptance to completion.',
  },
  {
    icon: <GitMerge size={24} />,
    title: 'Automatic Retry & Resume',
    desc: 'Smart system retries failed tasks and resumes interrupted workflows without losing progress.',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="landing-wrapper">
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="nav-container">
          <div className="logo" onClick={() => navigate('/')}>
            <span className="logo-icon"><Zap size={20} /></span>
            <span className="logo-text">StudentConnect</span>
          </div>
          <div className="nav-links">
            {user ? (
              <Link to="/dashboard" className="btn-signup">Dashboard →</Link>
            ) : (
              <>
                <Link to="/login" className="nav-link">Login</Link>
                <Link to="/signup" className="btn-signup">Get Started →</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="hero-section">
        <div className="hero-content-simple">
          <div className="hero-badge pulsing">
            <Zap size={12} /> NEW: Smart Workflow 2.0
          </div>
          <h1 className="hero-title">
            Assignment{' '}
            <span className="text-gradient">Collaboration</span>
            <br />
            Made Simple
          </h1>
          <p className="hero-subtitle">
            StudentConnect helps college students post assignments, find collaborators,
            track progress in real-time, and complete work efficiently — all in one place.
          </p>
          <div className="hero-actions">
            {user ? (
              <Link to="/dashboard" className="btn-primary-lg">
                Go to Dashboard <ArrowRight size={18} />
              </Link>
            ) : (
              <Link to="/signup" className="btn-primary-lg">
                Get Started Free <ArrowRight size={18} />
              </Link>
            )}
            <a href="#features" className="btn-secondary-lg">See Features</a>
          </div>
        </div>
      </header>

      {/* Social proof strip */}
      <div style={{
        background: 'var(--bg-subtle)',
        borderTop: '1px solid var(--border-subtle)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '2.5rem 2rem',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <p style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1.5rem' }}>
            Trusted by students at top universities
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '3rem', flexWrap: 'wrap' }}>
            {[
              { num: '500+', label: 'Active Students' },
              { num: '2K+', label: 'Tasks Completed' },
              { num: '98%', label: 'Success Rate' },
              { num: '4.9★', label: 'Average Rating' },
            ].map(({ num, label }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.04em' }}>{num}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <section id="features" className="features-section">
        <div className="section-header">
          <h2 className="section-title">
            Everything you need to{' '}
            <span className="text-gradient">collaborate</span>
          </h2>
          <p className="section-subtitle">
            Powerful tools designed specifically for the modern college student
          </p>
        </div>

        <div className="features-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="feature-card">
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)',
        padding: '5rem 2rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '-50%', left: '50%', transform: 'translateX(-50%)',
          width: 600, height: 600,
          background: 'radial-gradient(circle, rgba(139,92,246,0.25) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative', maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.04em', margin: '0 0 1rem 0' }}>
            Ready to collaborate smarter?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1rem', margin: '0 0 2.5rem 0', lineHeight: 1.7 }}>
            Join StudentConnect today and transform how you handle academic assignments.
          </p>
          {user ? (
            <Link to="/dashboard" className="btn-primary-lg" style={{ display: 'inline-flex' }}>
              Go to Dashboard <ArrowRight size={18} />
            </Link>
          ) : (
            <Link to="/signup" className="btn-primary-lg" style={{ display: 'inline-flex' }}>
              Start for Free <ArrowRight size={18} />
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-logo">
            <Zap size={18} /> StudentConnect
          </div>
          <p className="footer-tagline">Making academic collaboration smarter, one assignment at a time.</p>
          <div className="footer-bottom">
            <span>© 2026 StudentConnect. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
