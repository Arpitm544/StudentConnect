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
  PlayCircle
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-900 selection:bg-zinc-200 font-sans">
      
      {/* 1. NAVBAR */}
      <nav className={`fixed w-full top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 backdrop-blur-md border-b border-zinc-200/80 py-3' : 'bg-transparent py-5'}`}>
        <div className="max-w-6xl mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <div className="bg-zinc-900 p-1.5 rounded-lg flex items-center justify-center">
              <Zap size={18} className="text-white" fill="currentColor" />
            </div>
            <span className="text-lg font-bold tracking-tight">StudentConnect</span>
          </div>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors">How it Works</a>
            <a href="#pricing" className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors">Pricing</a>
          </div>

          {/* Auth Links */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <Link to="/dashboard" className="text-sm font-medium px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-all shadow-sm">
                Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">
                  Log in
                </Link>
                <Link to="/signup" className="text-sm font-medium px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-all shadow-sm flex items-center gap-2">
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
        <div className="fixed inset-0 z-40 bg-white pt-20 px-6">
          <div className="flex flex-col gap-6 text-lg">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="font-medium border-b border-zinc-100 pb-4">Features</a>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="font-medium border-b border-zinc-100 pb-4">How it Works</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="font-medium border-b border-zinc-100 pb-4">Pricing</a>
            <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="font-medium text-zinc-600 pb-2">Log in</Link>
            <Link to="/signup" onClick={() => setMobileMenuOpen(false)} className="font-medium bg-zinc-900 text-white py-3 rounded-xl text-center">Sign up</Link>
          </div>
        </div>
      )}

      <main className="pt-24 md:pt-32 pb-20">
        {/* 2. HERO SECTION */}
        <section className="px-6 max-w-6xl mx-auto text-center mb-24">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 border border-zinc-200 mb-8 mt-4">
            <span className="flex h-2 w-2 rounded-full bg-blue-500"></span>
            <span className="text-xs font-semibold text-zinc-600 tracking-wide uppercase">Introducing Workflow 2.0</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-zinc-900 mb-6 leading-[1.05]">
            Manage academic work <br className="hidden md:block" />
            <span className="text-zinc-400">with absolute clarity.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-zinc-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            StudentConnect is the modern way for college students to post, track, and collaborate on assignments. Built for speed, designed for focus.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {user ? (
               <Link to="/dashboard" className="w-full sm:w-auto px-6 py-3 bg-zinc-900 text-white font-medium rounded-xl hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200 flex items-center justify-center gap-2">
                 Go to Dashboard <ArrowRight size={18} />
               </Link>
            ) : (
              <Link to="/signup" className="w-full sm:w-auto px-6 py-3 bg-zinc-900 text-white font-medium rounded-xl hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200 flex items-center justify-center gap-2">
                Get Started <ArrowRight size={18} />
              </Link>
            )}
            <a href="#how-it-works" className="w-full sm:w-auto px-6 py-3 bg-white text-zinc-700 font-medium rounded-xl border border-zinc-200 hover:bg-zinc-50 transition-all flex items-center justify-center gap-2 shadow-sm">
              <PlayCircle size={18} /> View Demo
            </a>
          </div>
        </section>
        {/* CORE FEATURES SHOWCASE */}
        <section className="px-6 max-w-6xl mx-auto mb-28">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Feature 1: AI */}
            <div className="bg-white border border-zinc-200 p-6 rounded-2xl shadow-sm hover:border-zinc-300 transition-all group">
              <div className="w-10 h-10 bg-zinc-50 text-zinc-900 rounded-lg flex items-center justify-center mb-4 group-hover:bg-zinc-900 group-hover:text-white transition-all">
                <Zap size={20} fill="currentColor" />
              </div>
              <h4 className="font-bold text-zinc-900 mb-2">AI Roadmap</h4>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Automatically generate subject-specific milestones using Llama-3 AI for project clarity.
              </p>
            </div>

            {/* Feature 2: Marketplace */}
            <div className="bg-white border border-zinc-200 p-6 rounded-2xl shadow-sm hover:border-zinc-300 transition-all group">
              <div className="w-10 h-10 bg-zinc-50 text-zinc-900 rounded-lg flex items-center justify-center mb-4 group-hover:bg-zinc-900 group-hover:text-white transition-all">
                <LayoutDashboard size={20} />
              </div>
              <h4 className="font-bold text-zinc-900 mb-2">Marketplace</h4>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Post and accept academic assignments in a secure, student-only collaborative environment.
              </p>
            </div>

            {/* Feature 3: Team */}
            <div className="bg-white border border-zinc-200 p-6 rounded-2xl shadow-sm hover:border-zinc-300 transition-all group">
              <div className="w-10 h-10 bg-zinc-50 text-zinc-900 rounded-lg flex items-center justify-center mb-4 group-hover:bg-zinc-900 group-hover:text-white transition-all">
                <Users size={20} />
              </div>
              <h4 className="font-bold text-zinc-900 mb-2">Team Sync</h4>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Invite peers to your tasks and manage team capacity with built-in permission controls.
              </p>
            </div>

            {/* Feature 4: Deadlines */}
            <div className="bg-white border border-zinc-200 p-6 rounded-2xl shadow-sm hover:border-zinc-300 transition-all group">
              <div className="w-10 h-10 bg-zinc-50 text-zinc-900 rounded-lg flex items-center justify-center mb-4 group-hover:bg-zinc-900 group-hover:text-white transition-all">
                <CheckCircle2 size={20} />
              </div>
              <h4 className="font-bold text-zinc-900 mb-2">Tracking</h4>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Never miss a deadline with automated status updates and visual milestone tracking.
              </p>
            </div>
          </div>
        </section>

        {/* 3. SOCIAL PROOF */}
        <section className="mb-24 md:mb-32 border-y border-zinc-200/60 bg-white py-10 md:py-12 text-center overflow-hidden">
          <p className="text-xs md:text-sm font-semibold text-zinc-400 tracking-wider uppercase mb-6 md:mb-8 px-4">
            Trusted by students from forward-thinking universities
          </p>
          <div className="flex flex-wrap justify-center gap-x-8 md:gap-x-12 gap-y-4 md:gap-y-6 opacity-60 grayscale px-6">
            <span className="text-lg md:text-xl font-bold tracking-tighter text-zinc-800">Stanford</span>
            <span className="text-lg md:text-xl font-bold tracking-tighter text-zinc-800">MIT</span>
            <span className="text-lg md:text-xl font-black tracking-widest text-zinc-800 font-serif">HARVARD</span>
            <span className="text-lg md:text-xl font-bold tracking-tight text-zinc-800">UC Berkeley</span>
            <span className="text-lg md:text-xl font-semibold tracking-tighter text-zinc-800">NYU</span>
          </div>
        </section>

        {/* 4. FEATURES SECTION */}
        <section id="features" className="max-w-6xl mx-auto px-6 mb-32">
          <div className="mb-16 md:text-center">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 mb-4">
              Everything you need. Nothing you don't.
            </h2>
            <p className="text-lg text-zinc-500 max-w-2xl mx-auto">
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
              <div key={i} className="bg-white border border-zinc-200 rounded-2xl p-8 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                <div className="h-12 w-12 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-600 mb-6 group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                  {feat.icon}
                </div>
                <h3 className="text-lg font-bold text-zinc-900 mb-2">{feat.title}</h3>
                <p className="text-zinc-500 leading-relaxed text-sm">{feat.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 5. HOW IT WORKS */}
        <section id="how-it-works" className="max-w-5xl mx-auto px-6 mb-32">
          <div className="bg-zinc-900 rounded-[32px] text-zinc-50 p-10 md:p-16 relative overflow-hidden">
            {/* Subtle background glow */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>
            
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
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 mb-12">Built for high-performing students.</h2>
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
               <div key={i} className="bg-white border border-zinc-200 rounded-2xl p-8 shadow-sm">
                 <div className="flex gap-1 text-zinc-900 mb-4">
                   {[1,2,3,4,5].map(s => <Star key={s} size={16} fill="currentColor" />)}
                 </div>
                 <p className="text-zinc-600 mb-6 text-sm leading-relaxed">"{t.quote}"</p>
                 <div>
                   <div className="font-semibold text-zinc-900 text-sm">{t.author}</div>
                   <div className="text-zinc-500 text-xs">{t.role}</div>
                 </div>
               </div>
            ))}
          </div>
        </section>

        {/* 8. PRICING SECTION */}
        <section id="pricing" className="max-w-4xl mx-auto px-6 mb-32">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 mb-4">Simple pricing. No surprises.</h2>
            <p className="text-zinc-500">Start for free. Upgrade when you need more power.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 items-start">
             {/* Free Tier */}
             <div className="bg-white border text-center md:text-left border-zinc-200 rounded-3xl p-8">
               <h3 className="text-xl font-bold text-zinc-900 mb-2">Basic</h3>
               <p className="text-sm text-zinc-500 mb-6">Perfect for individual students.</p>
               <div className="mb-6">
                 <span className="text-4xl font-bold text-zinc-900">$0</span>
                 <span className="text-zinc-500">/ forever</span>
               </div>
               <Link to="/signup" className="block w-full py-3 px-4 bg-white border border-zinc-200 rounded-xl text-center font-medium hover:bg-zinc-50 transition-colors mb-8">
                 Get Started
               </Link>
               <ul className="space-y-3 text-sm text-zinc-600 text-left">
                 <li className="flex items-center gap-3"><CheckCircle2 size={16} className="text-zinc-400" /> Up to 5 active tasks</li>
                 <li className="flex items-center gap-3"><CheckCircle2 size={16} className="text-zinc-400" /> Basic workflow tracking</li>
                 <li className="flex items-center gap-3"><CheckCircle2 size={16} className="text-zinc-400" /> Community support</li>
               </ul>
             </div>

             {/* Pro Tier */}
             <div className="bg-white border-2 border-zinc-900 text-center md:text-left rounded-3xl p-8 relative shadow-xl shadow-zinc-200/50 transform md:-translate-y-4">
               <div className="absolute top-0 right-8 -translate-y-1/2 bg-zinc-900 text-white text-xs font-bold px-3 py-1 rounded-full tracking-wide">
                 RECOMMENDED
               </div>
               <h3 className="text-xl font-bold text-zinc-900 mb-2">Pro</h3>
               <p className="text-sm text-zinc-500 mb-6">For power users and study groups.</p>
               <div className="mb-6">
                 <span className="text-4xl font-bold text-zinc-900">FREE</span>
                 <br></br>
                 <span className="text-2xl  text-zinc-900 line-through">$5</span>
                 <span className="text-zinc-500">/ month</span>
               </div>
               <Link to="/signup" className="block w-full py-3 px-4 bg-zinc-900 text-white rounded-xl text-center font-medium hover:bg-zinc-800 transition-colors mb-8 shadow-sm">
                 Try Pro
               </Link>
               <ul className="space-y-3 text-sm text-zinc-600 text-left">
                 <li className="flex items-center gap-3"><CheckCircle2 size={16} className="text-zinc-900" /> Unlimited active tasks</li>
                 <li className="flex items-center gap-3"><CheckCircle2 size={16} className="text-zinc-900" /> Advanced analytics</li>
                 <li className="flex items-center gap-3"><CheckCircle2 size={16} className="text-zinc-900" /> Priority matching</li>
                 <li className="flex items-center gap-3"><CheckCircle2 size={16} className="text-zinc-900" /> Verified profile badge</li>
               </ul>
             </div>
          </div>
        </section>

        {/* 9. CTA SECTION */}
        <section className="max-w-5xl mx-auto px-6 mb-10">
          <div className="bg-zinc-50 border border-zinc-200 rounded-[32px] p-12 md:p-20 text-center relative overflow-hidden">
             <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-zinc-900 mb-6 relative z-10">
               Start managing your tasks <span className="text-zinc-400">smarter.</span>
             </h2>
             <p className="text-lg text-zinc-500 max-w-xl mx-auto mb-10 relative z-10">
               Join thousands of students who have already upgraded their academic workflow. Get started in less than 30 seconds.
             </p>
             <Link to="/signup" className="inline-flex items-center gap-2 px-8 py-4 bg-zinc-900 text-white font-medium rounded-xl hover:bg-zinc-800 transition-all shadow-lg hover:-translate-y-1 relative z-10">
                Create Free Account <ArrowRight size={18} />
             </Link>
          </div>
        </section>
      </main>

      {/* 10. FOOTER */}
      <footer className="border-t border-zinc-200/80 bg-white pt-16 pb-8">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-12 border-b border-zinc-200 pb-12">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-4">
                 <Zap size={18} className="text-zinc-900" fill="currentColor" />
                 <span className="font-bold tracking-tight">StudentConnect</span>
              </div>
              <p className="text-zinc-500 text-sm max-w-sm">
                A modern platform to streamline student collaboration, assignment tracking, and productivity.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-zinc-900 mb-4 text-sm">Product</h4>
              <ul className="space-y-3 text-sm text-zinc-500">
                <li><a href="#features" className="hover:text-zinc-900 transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-zinc-900 transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-zinc-900 transition-colors">Changelog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-zinc-900 mb-4 text-sm">Company</h4>
              <ul className="space-y-3 text-sm text-zinc-500">
                <li><a href="#" className="hover:text-zinc-900 transition-colors">About</a></li>
                <li><a href="#" className="hover:text-zinc-900 transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-zinc-900 transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center text-xs text-zinc-400">
            <p>© 2026 StudentConnect Inc. All rights reserved.</p>
            <div className="flex gap-4 mt-4 md:mt-0">
               <a href="#" className="hover:text-zinc-900 transition-colors">Twitter</a>
               <a href="#" className="hover:text-zinc-900 transition-colors">GitHub</a>
               <a href="#" className="hover:text-zinc-900 transition-colors">LinkedIn</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
