import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signup, loading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await signup(name, email, password);
    if (success) navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyan-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md glass-panel p-10 rounded-3xl border border-slate-800 shadow-2xl relative z-10">
        <div className="flex justify-center mb-8">
          <Link to="/">
            <img src="/logo.png" alt="DocFlow" className="w-16 h-16 rounded-xl shadow-lg shadow-cyan-500/20 hover:scale-105 transition-transform" />
          </Link>
        </div>

        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Create Account</h1>
          <p className="text-slate-400">Sign up to start processing documents</p>
        </div>

        {error && (
          <div className="bg-red-950/50 border border-red-500/50 text-red-200 rounded-xl p-4 mb-6 flex justify-between items-center animate-slide-in">
            <span className="text-sm font-medium">{error}</span>
            <button onClick={clearError} className="text-red-400 hover:text-red-300 font-bold ml-3 text-lg">×</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-5 py-3.5 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition text-white placeholder-slate-500"
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-5 py-3.5 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition text-white placeholder-slate-500"
              placeholder="name@company.com"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-5 py-3.5 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition text-white placeholder-slate-500"
              placeholder="Minimum 6 characters"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition text-lg glow-cyan relative overflow-hidden group"
          >
            <span className="relative z-10">{loading ? 'Creating Account...' : 'Sign Up →'}</span>
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
          </button>
        </form>

        <p className="text-center text-slate-400 mt-8 font-medium">
          Already have an account?{' '}
          <Link to="/login" className="text-cyan-400 hover:text-cyan-300 transition hover:underline decoration-cyan-400/30 underline-offset-4">Log In</Link>
        </p>
      </div>
    </div>
  );
}