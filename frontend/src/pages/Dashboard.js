import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function Dashboard() {
  const { user, logout, fetchUser } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchUser();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const menuItems = [
    { label: 'Upload Files', icon: '📤', path: '/upload' },
    { label: 'My Documents', icon: '📁', path: '/documents' },
    { label: 'AI Features', icon: '🤖', path: '/ai' },
    { label: 'PDF Operations', icon: '📄', path: '/pdf-operations' },
    { label: 'History', icon: '📊', path: '/history' },
  ];

  const cards = [
    { title: 'Upload Document', desc: 'Securely upload a new PDF or file.', icon: '⚡', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20 group-hover:border-cyan-500/50 group-hover:shadow-[0_0_15px_rgba(6,182,212,0.4)]', path: '/upload' },
    { title: 'My Documents', desc: 'Browse and manage your files.', icon: '🗄️', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20 group-hover:border-indigo-500/50 group-hover:shadow-[0_0_15px_rgba(99,102,241,0.4)]', path: '/documents' },
    { title: 'AI Summarizer', desc: 'Get quick summaries of heavy documents.', icon: '🧠', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20 group-hover:border-purple-500/50 group-hover:shadow-[0_0_15px_rgba(168,85,247,0.4)]', path: '/ai' },
    { title: 'Chat with Docs', desc: 'Talk directly with your documents via AI.', icon: '💬', color: 'text-pink-400 bg-pink-500/10 border-pink-500/20 group-hover:border-pink-500/50 group-hover:shadow-[0_0_15px_rgba(236,72,153,0.4)]', path: '/ai' },
    { title: 'PDF Operations', desc: 'Compress, merge, and split PDFs.', icon: '⚙️', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20 group-hover:border-blue-500/50 group-hover:shadow-[0_0_15px_rgba(59,130,246,0.4)]', path: '/pdf-operations' },
    { title: 'Usage History', desc: 'View your document activity metrics.', icon: '📈', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20 group-hover:border-orange-500/50 group-hover:shadow-[0_0_15px_rgba(249,115,22,0.4)]', path: '/history' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex font-sans text-slate-300">
      <div className="w-64 glass-panel border-r border-slate-800 flex flex-col relative z-20">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
             <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-lg shadow-lg shadow-cyan-500/20" />
             <h1 className="text-xl font-bold tracking-tight text-white">DocFlow</h1>
          </div>
          <p className="text-cyan-400 text-xs mt-2 font-mono flex items-center gap-1">
             <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
             User: {user?.name || 'Unknown'}
          </p>
        </div>
        <nav className="flex-1 p-4 flex flex-col gap-2">
          {menuItems.map((item) => (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-transparent hover:bg-slate-800/50 hover:border-slate-700 transition text-left text-sm font-bold text-slate-400 hover:text-white group"
            >
              <span className="text-lg opacity-70 group-hover:opacity-100 transition-opacity">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full bg-slate-800 hover:bg-red-950/50 border border-slate-700 hover:border-red-500/30 text-slate-400 hover:text-red-400 py-3 rounded-xl transition text-sm font-bold shadow-sm"
          >
            Log Out
          </button>
        </div>
      </div>

      <div className="flex-1 p-8 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 max-w-6xl mx-auto">
          <header className="mb-10">
            <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">
              Dashboard
            </h2>
            <p className="text-slate-400 font-medium">Select a tool below to get started.</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {cards.map((card) => (
              <div
                key={card.title}
                onClick={() => navigate(card.path)}
                className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 transition-all duration-300 cursor-pointer group hover:bg-slate-800 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl mb-5 transition-all duration-300 border ${card.color} relative z-10 bg-slate-950`}>
                  {card.icon}
                </div>
                <h3 className="font-bold text-slate-200 mb-2 relative z-10">{card.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed relative z-10">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}