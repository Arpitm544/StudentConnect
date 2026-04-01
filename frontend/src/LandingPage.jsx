import React from 'react';
import { 
  ArrowRight, 
  CheckCircle2, 
  Users, 
  Clock, 
  Zap, 
  ShieldCheck, 
  LayoutDashboard 
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import './App.css';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="landing-wrapper">
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="nav-container">
          <div className="logo" onClick={() => navigate('/')}>
            <span className="logo-icon"><Zap size={24} /></span>
            <span className="logo-text">StudentConnect</span>
          </div>
          <div className="nav-links">
            {user ? (
              <Link to="/dashboard" className="btn-signup">Dashboard</Link>
            ) : (
              <>
                <Link to="/login" className="nav-link">Login</Link>
                <Link to="/signup" className="btn-signup">Sign Up</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="hero-section">
        <div className="hero-content-simple">
          <div className="hero-badge pulsing">NEW: Smart Workflow 2.0</div>
          <h1 className="hero-title">
            Organize Assignment <span className="text-gradient">Collaboration</span> Efficiently
          </h1>
          <p className="hero-subtitle">
            StudentConnect helps college students manage assignments, track workflow status, and collaborate seamlessly with automatic retry and resume capabilities.
          </p>
          <div className="hero-actions">
            {user ? (
              <Link to="/dashboard" className="btn-primary-lg">
                Go to Dashboard <ArrowRight size={20} />
              </Link>
            ) : (
              <Link to="/signup" className="btn-primary-lg">
                Get Started <ArrowRight size={20} />
              </Link>
            )}
            <a href="#features" className="btn-secondary-lg">Learn More</a>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="section-header">
          <h2 className="section-title">Everything You Need to Collaborate</h2>
          <p className="section-subtitle">Powerful features designed specifically for college students</p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon"><FileText /></div>
            <h3>Post Assignment Requests</h3>
            <p>Easily create and share assignment requests with your peers and track responses.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon"><Users /></div>
            <h3>Accept Tasks</h3>
            <p>Browse available assignments and accept tasks that match your expertise.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon"><Clock /></div>
            <h3>Track Workflow Status</h3>
            <p>Monitor progress in real-time with detailed status updates and notifications.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon"><Zap /></div>
            <h3>Automatic Retry & Resume</h3>
            <p>Smart system automatically retries failed tasks and resumes interrupted workflows.</p>
          </div>
        </div>
      </section>


      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-logo">
            <Zap size={20} /> StudentConnect
          </div>
          <p className="footer-tagline">Making academic collaboration smarter.</p>
          <div className="footer-bottom">
            <span>© 2026 StudentConnect. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Icon fallbacks
function FileText() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <polyline points="10 9 9 9 8 9"></polyline>
    </svg>
  );
}
