import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const role = await login(email, password);
    if (role === 'admin') navigate('/admin');
    else if (role === 'user') navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyan-600/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="hidden lg:flex w-1/2 flex-col items-center justify-center p-12 relative z-10 border-r border-white/5">
        <div className="text-center">
          <div className="mb-8 inline-block p-4 glass-panel rounded-3xl shadow-2xl shadow-cyan-500/10">
            <img src="/logo.png" alt="DocFlow" className="w-24 h-24 rounded-2xl" />
          </div>
          <h2 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 mb-6">DocFlow</h2>
          <p className="text-slate-400 text-xl max-w-md mx-auto leading-relaxed">
            Your intelligent gateway to document processing, analysis, and chat.
          </p>
          <div className="mt-12 grid grid-cols-2 gap-4 text-sm font-medium">
            {['📄 Smart Processing', '🤖 AI Insights', '💬 Interactive Chat', '🛡️ Fraud Detection'].map(f => (
              <div key={f} className="glass-panel text-slate-300 rounded-xl px-5 py-3 border border-slate-800/50 hover:border-indigo-500/30 transition shadow-lg">
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 relative z-10">
        <div className="w-full max-w-md glass-panel p-10 rounded-3xl border border-slate-800 shadow-2xl relative">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl" />
          
          <div className="mb-10 text-center lg:text-left">
            <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-slate-400">Log in to view your documents</p>
          </div>

          {error && (
            <div className="bg-red-950/50 border border-red-500/50 text-red-200 rounded-xl p-4 mb-6 flex justify-between items-center animate-slide-in">
              <span className="text-sm font-medium">{error}</span>
              <button onClick={clearError} className="font-bold text-red-400 hover:text-red-300">×</button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Email Address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-5 py-3.5 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition text-white placeholder-slate-500"
                placeholder="name@company.com" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-5 py-3.5 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition text-white placeholder-slate-500"
                placeholder="••••••••" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition text-lg glow-cyan relative overflow-hidden group">
              <span className="relative z-10">{loading ? 'Signing in...' : 'Sign In →'}</span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
            </button>
          </form>

          <p className="text-center text-slate-400 mt-8 font-medium">
            Don't have an account?{' '}
            <Link to="/signup" className="text-cyan-400 hover:text-cyan-300 transition hover:underline decoration-cyan-400/30 underline-offset-4">Sign Up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}