import React from 'react';
import { useNavigate } from 'react-router-dom';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden flex flex-col">
      {/* Abstract Background Elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyan-600/20 rounded-full blur-[120px] pointer-events-none" />
      
      {/* Navbar */}
      <nav className="flex justify-between items-center px-8 py-5 relative z-10 glass-panel border-b border-white/5">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="DocFlow Logo" className="w-8 h-8 rounded-lg shadow-lg shadow-cyan-500/30" />
          <h1 className="text-white text-2xl font-bold tracking-tight">DocFlow</h1>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => navigate('/login')}
            className="text-slate-300 px-5 py-2 font-medium hover:text-white transition"
          >
            Login
          </button>
          <button
            onClick={() => navigate('/signup')}
            className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-5 py-2 rounded-lg font-bold transition shadow-lg shadow-cyan-500/20"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium mb-8">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
          AI-Powered Document Intelligence
        </div>
        
        <h2 className="text-6xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 mb-6 drop-shadow-sm leading-tight max-w-4xl">
          Understand your documents at <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-500">lightspeed.</span>
        </h2>
        
        <p className="text-slate-400 text-xl mb-12 max-w-2xl leading-relaxed">
          Upload, compress, merge, split, summarize, and chat with your documents in one focused AI workspace.
          Fast, practical, and built for everyday document tasks.
        </p>
        
        <div className="flex gap-4">
          <button
            onClick={() => navigate('/signup')}
            className="bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-white px-8 py-4 rounded-xl text-lg font-bold transition shadow-xl shadow-indigo-500/25 glow-cyan"
          >
            Start Analyzing Now
          </button>
          <button
            onClick={() => navigate('/login')}
            className="glass-panel text-white hover:bg-white/10 px-8 py-4 rounded-xl text-lg font-bold transition border border-slate-700 hover:border-slate-500"
          >
            Sign In
          </button>
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-8 pb-20 max-w-7xl mx-auto relative z-10">
        {[
          { title: 'PDF Operations', desc: 'Securely compress, merge, and split PDFs instantly with our high performance engine.', icon: '⚡' },
          { title: 'AI Summarizer', desc: 'Turn long documents into concise, readable summaries with grounded AI prompts.', icon: '🧠' },
          { title: 'Interactive Chat', desc: 'Ask questions about a document and get answers constrained to its contents.', icon: '💬' },
          { title: 'Scanned PDF Support', desc: 'Image-based PDFs automatically fall back to OCR when embedded text is missing.', icon: '📄' },
          { title: 'Focused Analytics', desc: 'Track document usage and strong AI workflows instead of scattered weak features.', icon: '📊' },
          { title: 'Full Analytics', desc: 'Monitor API usage, track document storage, and view rich historical insights.', icon: '📊' },
        ].map((feature, i) => (
          <div key={i} className="glass-panel border border-slate-800 rounded-2xl p-6 hover:bg-slate-800/80 transition group overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition-colors" />
            <div className="text-4xl mb-4 bg-slate-900 w-14 h-14 rounded-xl flex items-center justify-center border border-slate-800 group-hover:border-cyan-500/50 transition-colors">
              {feature.icon}
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
            <p className="text-slate-400 leading-relaxed text-sm">{feature.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Landing;
