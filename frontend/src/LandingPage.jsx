import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, 
  CheckCircle2, 
  ChevronRight, 
  FileText, 
  LayoutDashboard, 
  Menu, 
  X, 
  Zap, 
  Shield, 
  Rocket, 
  Users, 
  Star,
  PlayCircle,
  Moon,
  Sun
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { useTheme } from './context/ThemeContext.jsx';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [stats, setStats] = useState({ total_tasks: 0, completed_tasks: 0, active_tasks: 0, days_live: 30 });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_URL || '';
        const res = await fetch(`${API_BASE}/api/public/stats`);
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error("Failed to fetch stats", err);
      } finally {
        setStatsLoading(false);
      }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const AnimatedNumber = ({ value, duration = 1500, suffix = "" }) => {
    const [count, setCount] = useState(0);
    const [ref, setRef] = useState(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
      if (!ref) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setIsVisible(true);
        },
        { threshold: 0.1 }
      );
      observer.observe(ref);
      return () => observer.disconnect();
    }, [ref]);

    useEffect(() => {
      if (!isVisible) return;
      let start = 0;
      const end = parseInt(value);
      if (start === end) {
        setCount(end);
        return;
      }

      let timer = setInterval(() => {
        start += Math.ceil(end / (duration / 16));
        if (start >= end) {
          setCount(end);
          clearInterval(timer);
        } else {
          setCount(start);
        }
      }, 16);
      return () => clearInterval(timer);
    }, [isVisible, value, duration]);

    return (
      <span ref={setRef}>
        {count.toLocaleString()}{suffix}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 selection:bg-zinc-200 dark:selection:bg-zinc-800 font-sans transition-colors duration-300">
      
      {/* 1. NAVBAR */}
      <nav className={`fixed w-full top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800/80 py-3' : 'bg-transparent py-5'}`}>
        <div className="max-w-6xl mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => navigate('/')}>
            <div className="bg-zinc-900 dark:bg-white p-1.5 rounded-lg flex items-center justify-center transition-colors">
              <Zap size={18} className="text-white dark:text-zinc-950" fill="currentColor" />
            </div>
            <span className="text-lg font-bold tracking-tight dark:text-white group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">StudentConnect</span>
          </div>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">How it Works</a>
            <a href="#pricing" className="text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">Pricing</a>
          </div>

          {/* Auth Links */}
          <div className="hidden md:flex items-center gap-4">
            <button 
              onClick={toggleTheme}
              className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800 mx-2"></div>
            {user ? (
              <Link to="/dashboard" className="text-sm font-medium px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 rounded-lg hover:opacity-90 transition-all shadow-sm">
                Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                  Log in
                </Link>
                <Link to="/signup" className="text-sm font-medium px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 rounded-lg hover:opacity-90 transition-all shadow-sm flex items-center gap-2">
                  Sign up <ArrowRight size={14} />
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button className="md:hidden p-2 text-zinc-600" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-white dark:bg-zinc-950 pt-20 px-6 animate-fade-in">
          <div className="flex flex-col gap-6 text-lg">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="font-medium border-b border-zinc-100 dark:border-zinc-800 pb-4 dark:text-white">Features</a>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="font-medium border-b border-zinc-100 dark:border-zinc-800 pb-4 dark:text-white">How it Works</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="font-medium border-b border-zinc-100 dark:border-zinc-800 pb-4 dark:text-white">Pricing</a>
            <div className="flex items-center justify-between pt-2">
               <span className="font-medium dark:text-white">Theme</span>
               <button onClick={toggleTheme} className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                 {theme === 'dark' ? <Sun size={20} className="text-white" /> : <Moon size={20} className="text-zinc-900" />}
               </button>
            </div>
            <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="font-medium text-zinc-600 dark:text-zinc-400 pb-2">Log in</Link>
            <Link to="/signup" onClick={() => setMobileMenuOpen(false)} className="font-medium bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 py-3 rounded-xl text-center">Sign up</Link>
          </div>
        </div>
      )}

      <main className="pt-24 md:pt-32 pb-20">
        {/* 2. HERO SECTION */}
        <section className="px-6 max-w-6xl mx-auto text-center mb-24">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 mb-8 mt-4 transition-colors">
            <span className="flex h-2 w-2 rounded-full bg-blue-500"></span>
            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 tracking-wide uppercase">Introducing Workflow 2.0</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-zinc-900 dark:text-white mb-6 leading-[1.05] transition-colors">
            Manage academic work <br className="hidden md:block" />
            <span className="text-zinc-400 dark:text-zinc-600">with absolute clarity.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            StudentConnect is the modern way for college students to post, track, and collaborate on assignments. Built for speed, designed for focus.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-20">
            {user ? (
               <Link to="/dashboard" className="w-full sm:w-auto px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 font-medium rounded-xl hover:opacity-90 transition-all shadow-lg shadow-zinc-200 dark:shadow-none flex items-center justify-center gap-2">
                 Go to Dashboard <ArrowRight size={18} />
               </Link>
            ) : (
              <Link to="/signup" className="w-full sm:w-auto px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 font-medium rounded-xl hover:opacity-90 transition-all shadow-lg shadow-zinc-200 dark:shadow-none flex items-center justify-center gap-2">
                Get Started <ArrowRight size={18} />
              </Link>
            )}
            <a href="#how-it-works" className="w-full sm:w-auto px-6 py-3 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-medium rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 shadow-sm">
              <PlayCircle size={18} /> View Demo
            </a>
          </div>

        </section>

        {/* CORE FEATURES SHOWCASE */}
        <section className="px-6 max-w-6xl mx-auto mb-28">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Feature 1: AI */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-all group">
              <div className="w-10 h-10 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-lg flex items-center justify-center mb-4 group-hover:bg-zinc-900 dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-zinc-950 transition-all">
                <Zap size={20} fill="currentColor" />
              </div>
              <h4 className="font-bold text-zinc-900 dark:text-white mb-2">AI Roadmap</h4>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Automatically generate subject-specific milestones using Llama-3 AI for project clarity.
              </p>
            </div>

            {/* Feature 2: Marketplace */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-all group">
              <div className="w-10 h-10 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-lg flex items-center justify-center mb-4 group-hover:bg-zinc-900 dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-zinc-950 transition-all">
                <LayoutDashboard size={20} />
              </div>
              <h4 className="font-bold text-zinc-900 dark:text-white mb-2">Marketplace</h4>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Post and accept academic assignments in a secure, student-only collaborative environment.
              </p>
            </div>

            {/* Feature 3: Team */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-all group">
              <div className="w-10 h-10 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-lg flex items-center justify-center mb-4 group-hover:bg-zinc-900 dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-zinc-950 transition-all">
                <Users size={20} />
              </div>
              <h4 className="font-bold text-zinc-900 dark:text-white mb-2">Team Sync</h4>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Invite peers to your tasks and manage team capacity with built-in permission controls.
              </p>
            </div>

            {/* Feature 4: Deadlines */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-all group">
              <div className="w-10 h-10 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-lg flex items-center justify-center mb-4 group-hover:bg-zinc-900 dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-zinc-950 transition-all">
                <CheckCircle2 size={20} />
              </div>
              <h4 className="font-bold text-zinc-900 dark:text-white mb-2">Tracking</h4>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Never miss a deadline with automated status updates and visual milestone tracking.
              </p>
            </div>
          </div>
        </section>

        {/* Live Stats Row */}
        <section className="px-6 max-w-6xl mx-auto mb-28">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto border-y border-zinc-200 dark:border-zinc-800 py-12 transition-colors">
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-1 tracking-tight">
                {statsLoading ? (
                  <span className="opacity-20">...</span>
                ) : (
                  <AnimatedNumber value={stats.total_tasks} suffix={stats.total_tasks >= 1000 ? "k+" : "+"} />
                )}
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-500">Tasks Created</p>
            </div>
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-1 tracking-tight">
                {statsLoading ? (
                  <span className="opacity-20">...</span>
                ) : (
                  <AnimatedNumber value={stats.completed_tasks} />
                )}
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-500">Completed</p>
            </div>
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-1 tracking-tight">
                {statsLoading ? (
                  <span className="opacity-20">...</span>
                ) : (
                  <AnimatedNumber value={stats.active_tasks} />
                )}
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-500">In Progress</p>
            </div>
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-1 tracking-tight">
                {statsLoading ? (
                  <span className="opacity-20">...</span>
                ) : (
                  <AnimatedNumber value={stats.days_live} suffix="+" />
                )}
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-500">Days Live</p>
            </div>
          </div>
        </section>

        {/* 4. FEATURES SECTION */}
        <section id="features" className="max-w-6xl mx-auto px-6 mb-32">
          <div className="mb-16 md:text-center">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white mb-4 transition-colors">
              Everything you need. Nothing you don't.
            </h2>
            <p className="text-lg text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto transition-colors">
              A carefully curated set of tools designed around modern student workflows.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <FileText size={20} />,
                title: 'Clean Assignments',
                desc: 'Create detailed task requests with rich text, strict deadlines, and clear requirements without the clutter.'
              },
              {
                icon: <Users size={20} />,
                title: 'Seamless Collaboration',
                desc: 'Find peers instantly. Accept workflows, share context, and update progress in real-time.'
              },
              {
                icon: <LayoutDashboard size={20} />,
                title: 'Centralized Dashboard',
                desc: 'Track every assignment from a single, unified view. Know exactly what needs attention and when.'
              }
            ].map((feat, i) => (
              <div key={i} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 hover:shadow-lg dark:hover:shadow-none hover:-translate-y-1 transition-all duration-300 group">
                <div className="h-12 w-12 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-400 mb-6 group-hover:bg-zinc-900 dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-zinc-950 transition-colors">
                  {feat.icon}
                </div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2 transition-colors">{feat.title}</h3>
                <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed text-sm transition-colors">{feat.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 5. HOW IT WORKS */}
        <section id="how-it-works" className="max-w-5xl mx-auto px-6 mb-32">
          <div className="bg-zinc-900 dark:bg-zinc-900/50 dark:border dark:border-zinc-800 rounded-[32px] text-zinc-50 p-10 md:p-16 relative overflow-hidden transition-colors">
            {/* Subtle background glow */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-[100px] pointer-events-none transition-colors"></div>
            
            <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
                  Simple, linear <br /> workflow.
                </h2>
                <p className="text-zinc-400 text-lg mb-8 max-w-md">
                  Stop juggling emails and messy group chats. Move from assignment creation to completion in three clear steps.
                </p>
              </div>
              
              <div className="space-y-8">
                {[
                  { step: '01', title: 'Create a Request', desc: 'Detail what you need done and set a deadline.' },
                  { step: '02', title: 'Find a Match', desc: 'Peers review and accept your tasks seamlessly.' },
                  { step: '03', title: 'Track to Done', desc: 'Monitor progress visually on your dashboard.' }
                ].map((item, i) => (
                  <div key={i} className="flex gap-5">
                    <div className="font-mono text-sm font-semibold text-zinc-500 mt-1">{item.step}</div>
                    <div>
                      <h4 className="text-lg font-bold text-white mb-1">{item.title}</h4>
                      <p className="text-zinc-400 text-sm">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 7. TESTIMONIALS */}
        <section className="max-w-6xl mx-auto px-6 mb-32 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mb-12 transition-colors">Built for high-performing students.</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
            {[
              {
                quote: "Finally, a platform that doesn't feel like a clunky enterprise tool from 2005. It's fast, minimal, and gets out of my way.",
                author: "Alex Rivera",
                role: "Computer Science, Junior"
              },
              {
                quote: "I use this to manage all collaborative engineering projects. The interface just makes sense. Very Stripe-esque.",
                author: "Sarah Chen",
                role: "Engineering, Senior"
              },
              {
                quote: "Instead of texting 5 different people for notes and assignments, I just post it here. The dashboard view is a lifesaver.",
                author: "Michael T.",
                role: "Business Admin, Sophomore"
              }
            ].map((t, i) => (
               <div key={i} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 shadow-sm transition-colors">
                 <div className="flex gap-1 text-zinc-900 dark:text-white mb-4">
                   {[1,2,3,4,5].map(s => <Star key={s} size={16} fill="currentColor" />)}
                 </div>
                 <p className="text-zinc-600 dark:text-zinc-400 mb-6 text-sm leading-relaxed transition-colors">"{t.quote}"</p>
                 <div>
                   <div className="font-semibold text-zinc-900 dark:text-white text-sm transition-colors">{t.author}</div>
                   <div className="text-zinc-500 dark:text-zinc-500 text-xs transition-colors">{t.role}</div>
                 </div>
               </div>
            ))}
          </div>
        </section>

        {/* 8. PRICING SECTION */}
        <section id="pricing" className="max-w-4xl mx-auto px-6 mb-32">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white mb-4 transition-colors">Simple pricing. No surprises.</h2>
            <p className="text-zinc-500 dark:text-zinc-400 transition-colors">Start for free. Upgrade when you need more power.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 items-start">
             {/* Free Tier */}
             <div className="bg-white dark:bg-zinc-900 border text-center md:text-left border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 transition-colors">
               <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2 transition-colors">Basic</h3>
               <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 transition-colors">Perfect for individual students.</p>
               <div className="mb-6 transition-colors">
                 <span className="text-4xl font-bold text-zinc-900 dark:text-white">$0</span>
                 <span className="text-zinc-500 dark:text-zinc-400">/ forever</span>
               </div>
               <Link to="/signup" className="block w-full py-3 px-4 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-center font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700 dark:text-white transition-colors mb-8">
                 Get Started
               </Link>
               <ul className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400 text-left transition-colors">
                 <li className="flex items-center gap-3"><CheckCircle2 size={16} className="text-zinc-400 dark:text-zinc-600" /> Up to 5 active tasks</li>
                 <li className="flex items-center gap-3"><CheckCircle2 size={16} className="text-zinc-400 dark:text-zinc-600" /> Basic workflow tracking</li>
                 <li className="flex items-center gap-3"><CheckCircle2 size={16} className="text-zinc-400 dark:text-zinc-600" /> Community support</li>
               </ul>
             </div>

             {/* Pro Tier */}
             <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-white text-center md:text-left rounded-3xl p-8 relative shadow-xl shadow-zinc-200/50 dark:shadow-none transform md:-translate-y-4 transition-all">
               <div className="absolute top-0 right-8 -translate-y-1/2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 text-[10px] font-bold px-3 py-1 rounded-full tracking-wide">
                 RECOMMENDED
               </div>
               <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2 transition-colors">Pro</h3>
               <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 transition-colors">For power users and study groups.</p>
               <div className="mb-6 transition-colors">
                 <span className="text-4xl font-bold text-zinc-900 dark:text-white">FREE</span>
                 <br></br>
                 <span className="text-2xl text-zinc-900 dark:text-zinc-100 line-through opacity-50">$5</span>
                 <span className="text-zinc-500 dark:text-zinc-400">/ month</span>
               </div>
               <Link to="/signup" className="block w-full py-3 px-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 rounded-xl text-center font-medium hover:opacity-90 transition-all mb-8 shadow-sm">
                 Try Pro
               </Link>
               <ul className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400 text-left transition-colors">
                 <li className="flex items-center gap-3"><CheckCircle2 size={16} className="text-zinc-900 dark:text-white" /> Unlimited active tasks</li>
                 <li className="flex items-center gap-3"><CheckCircle2 size={16} className="text-zinc-900 dark:text-white" /> Advanced analytics</li>
                 <li className="flex items-center gap-3"><CheckCircle2 size={16} className="text-zinc-900 dark:text-white" /> Priority matching</li>
                 <li className="flex items-center gap-3"><CheckCircle2 size={16} className="text-zinc-900 dark:text-white" /> Verified profile badge</li>
               </ul>
             </div>
          </div>
        </section>

        {/* 9. CTA SECTION */}
        <section className="max-w-5xl mx-auto px-6 mb-10">
          <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[32px] p-12 md:p-20 text-center relative overflow-hidden transition-colors">
             <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-zinc-900 dark:text-white mb-6 relative z-10 transition-colors">
               Start managing your tasks <span className="text-zinc-400 dark:text-zinc-600">smarter.</span>
             </h2>
             <p className="text-lg text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto mb-10 relative z-10 transition-colors">
               Join thousands of students who have already upgraded their academic workflow. Get started in less than 30 seconds.
             </p>
             <Link to="/signup" className="inline-flex items-center gap-2 px-8 py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 font-medium rounded-xl hover:opacity-90 transition-all shadow-lg hover:-translate-y-1 relative z-10">
                Create Free Account <ArrowRight size={18} />
             </Link>
          </div>
        </section>
      </main>

      {/* 10. FOOTER */}
      <footer className="border-t border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 pt-16 pb-8 transition-colors">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-12 border-b border-zinc-200 dark:border-zinc-800 pb-12 transition-colors">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-4">
                 <Zap size={18} className="text-zinc-900 dark:text-white" fill="currentColor" />
                 <span className="font-bold tracking-tight dark:text-white">StudentConnect</span>
              </div>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-sm transition-colors">
                A modern platform to streamline student collaboration, assignment tracking, and productivity.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-zinc-900 dark:text-white mb-4 text-sm transition-colors">Product</h4>
              <ul className="space-y-3 text-sm text-zinc-500 dark:text-zinc-400 transition-colors">
                <li><a href="#features" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Changelog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-zinc-900 dark:text-white mb-4 text-sm transition-colors">Company</h4>
              <ul className="space-y-3 text-sm text-zinc-500 dark:text-zinc-400 transition-colors">
                <li><a href="#" className="hover:text-zinc-900 dark:hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center text-xs text-zinc-400 dark:text-zinc-500 transition-colors">
            <p>© 2026 StudentConnect Inc. All rights reserved.</p>
            <div className="flex gap-4 mt-4 md:mt-0">
               <a href="#" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Twitter</a>
               <a href="#" className="hover:text-zinc-900 dark:hover:text-white transition-colors">GitHub</a>
               <a href="#" className="hover:text-zinc-900 dark:hover:text-white transition-colors">LinkedIn</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
