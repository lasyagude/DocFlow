import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import useToastStore from '../store/toastStore';
import { CardSkeleton, TableRowSkeleton, ChartSkeleton } from '../components/Skeleton';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import axios from 'axios';

const API_BASE = (typeof process !== 'undefined' ? process.env.REACT_APP_API_URL : null) || 
               (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_API_URL : null) || 
               'http://localhost:5000/api';
const API = `${API_BASE}/admin`;

const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-panel p-3 border border-slate-700 rounded-lg shadow-xl shadow-black/50">
        <p className="text-slate-300 text-xs font-mono mb-1">{label}</p>
        <p className="text-white font-bold text-sm">Value: <span className="text-cyan-400">{payload[0].value}</span></p>
      </div>
    );
  }
  return null;
};

export default function AdminDashboard() {
  const { user, logout } = useAuthStore();
  const toast = useToastStore;
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { role: 'assistant', text: 'SYS_ADMIN_LINK_ACTIVE. Input query for platform analytics.' }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const [docSearch, setDocSearch] = useState('');
  const [aiSettings, setAiSettings] = useState(null);
  const [aiSettingsLoading, setAiSettingsLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchUsers(), fetchDocuments(), fetchAiSettings()]);
      setLoading(false);
    };
    init();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API}/stats`, getAuthHeaders());
      setStats(res.data.data);
    } catch (err) {
      toast.getState().error('Metrics fetch failed');
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API}/users`, getAuthHeaders());
      setUsers(res.data.data);
    } catch (err) {}
  };

  const fetchDocuments = async () => {
    try {
      const res = await axios.get(`${API}/documents`, getAuthHeaders());
      setDocuments(res.data.data);
    } catch (err) {}
  };

  const fetchAiSettings = async () => {
    try {
      const res = await axios.get(`${API}/ai-settings`, getAuthHeaders());
      setAiSettings(res.data.data);
    } catch (err) {}
  };

  const handleUpdateAiSettings = async (updates) => {
    setAiSettingsLoading(true);
    try {
      const res = await axios.patch(`${API}/ai-settings`, updates, getAuthHeaders());
      setAiSettings(res.data.data);
      toast.getState().success('AI settings updated');
    } catch (err) {
      toast.getState().error('Failed to update AI settings');
    } finally {
      setAiSettingsLoading(false);
    }
  };

  const runAdminQuery = async (rawQuery) => {
    const question = rawQuery.trim();
    if (!question || chatLoading) return;

    setChatInput(question);
    setChatHistory((history) => [...history, { role: 'user', text: question }]);
    setChatLoading(true);

    try {
      const res = await axios.post(
        `${API}/query`,
        JSON.stringify({ query: question }),
        {
          ...getAuthHeaders(),
          headers: {
            ...getAuthHeaders().headers,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('Admin query response:', res.data);
      const answer = res.data.answer || 'No response received.';
      setChatHistory((history) => [...history, { role: 'assistant', text: answer }]);
    } catch (err) {
      const errorMessage =
        err.response?.data?.answer ||
        err.response?.data?.message ||
        'Query execution failed.';

      setChatHistory((history) => [...history, { role: 'assistant', text: errorMessage }]);
    } finally {
      setChatLoading(false);
      setChatInput('');
    }
  };

  const handleToggleUser = async (id) => {
    try {
      const res = await axios.patch(`${API}/users/${id}/toggle`, {}, getAuthHeaders());
      toast.getState().success(res.data.message);
      fetchUsers();
    } catch (err) {
      toast.getState().error('Status mutation failed');
    }
  };

  const handleDeleteUser = async (id) => {
    try {
      await axios.delete(`${API}/users/${id}`, getAuthHeaders());
      toast.getState().success('Agent record purged');
      fetchUsers();
      fetchStats();
    } catch (err) {
      toast.getState().error('Purge failed');
    }
  };

  const handleDeleteDocument = async (id) => {
    try {
      await axios.delete(`${API}/documents/${id}`, getAuthHeaders());
      toast.getState().success('Data packet destroyed');
      setDocuments(documents.filter(d => d._id !== id));
      fetchStats();
    } catch (err) {
      toast.getState().error('Destruction failed');
    }
  };

  const handleChat = async (e) => {
    e.preventDefault();
    await runAdminQuery(chatInput);
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const statCards = stats ? [
    { label: 'REGISTERED AGENTS', value: stats.totalUsers, icon: '👥', color: 'text-indigo-400', change: `+${stats.newUsersThisWeek} THIS_CYCLE` },
    { label: 'CORE PACKETS', value: stats.totalDocs, icon: '📄', color: 'text-cyan-400', change: `+${stats.uploadsToday} TODAY` },
    { label: 'NEW INGESTS', value: stats.newUsersToday, icon: '✨', color: 'text-emerald-400', change: 'NEW REGISTRATIONS' },
    { label: 'CORE MASS', value: formatSize(stats.totalStorage), icon: '💾', color: 'text-purple-400', change: `${stats.totalDocs} FILES` },
  ] : [];

  const filteredDocs = documents.filter(d => {
    if (!docSearch) return true;
    const s = docSearch.toLowerCase();
    return (d.originalName || '').toLowerCase().includes(s) ||
      (d.userId?.name || '').toLowerCase().includes(s) ||
      (d.userId?.email || '').toLowerCase().includes(s);
  });

  const overviewMetricCards = stats ? [
    {
      label: 'TOTAL USERS',
      value: stats.totalUsers,
      icon: 'U',
      color: 'text-indigo-400',
      change: `+${stats.newUsersThisWeek} THIS WEEK`,
    },
    {
      label: 'TOTAL DOCUMENTS',
      value: stats.totalDocs,
      icon: 'D',
      color: 'text-cyan-400',
      change: `+${stats.uploadsToday} UPLOADED TODAY`,
    },
    {
      label: 'OCR USAGE',
      value: stats.ocrUsageCount || 0,
      icon: 'O',
      color: 'text-emerald-400',
      change: `${stats.totalDocs ? Math.round(((stats.ocrUsageCount || 0) / stats.totalDocs) * 100) : 0}% OF DOCUMENTS`,
    },
    {
      label: 'AI VS FALLBACK',
      value: `${stats.responseSourceUsage?.ai || 0} / ${stats.responseSourceUsage?.fallback || 0}`,
      icon: 'A',
      color: 'text-purple-400',
      change: 'AI / FALLBACK RESPONSES',
    },
  ] : [];

  const AI_LABELS = { summarize: 'SUMMARIZE', chat: 'CHAT' };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 flex font-sans">
      {/* Sidebar Command Line */}
      <div className="w-64 glass-panel border-r border-slate-800 flex flex-col relative z-20">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-rose-500/20 border border-rose-500/50 rounded-xl flex items-center justify-center text-rose-400 font-bold text-lg shadow-[0_0_15px_rgba(244,63,94,0.3)]">O</div>
             <div>
               <h1 className="font-bold text-white tracking-tight">DocFlow</h1>
               <p className="text-xs text-rose-400 font-mono tracking-widest mt-0.5 flex items-center gap-1">
                 <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span> OVERSEER
               </p>
             </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {[
            { id: 'overview', label: 'METRICS', icon: '📊' },
            { id: 'users', label: 'AGENTS', icon: '👥' },
            { id: 'documents', label: 'ARCHIVES', icon: '📁' },
            { id: 'ai-settings', label: 'AI_SETTINGS', icon: '⚙️' },
            { id: 'assistant', label: 'AI_OVERSEER', icon: '🤖' },
          ].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all font-mono font-bold text-sm tracking-wider ${
                activeTab === item.id 
                  ? 'bg-rose-500/10 border-rose-500/50 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.2)]' 
                  : 'text-slate-500 border-transparent hover:bg-slate-800 hover:border-slate-700 hover:text-white'
              }`}>
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button onClick={() => { logout(); navigate('/'); }} className="w-full bg-slate-900 border border-slate-700 hover:bg-red-950 hover:border-red-500/50 text-slate-400 hover:text-red-400 py-3 rounded-xl text-sm font-bold transition">
            TERMINATE_ACCESS
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto relative">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-rose-600/5 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="p-8 max-w-7xl mx-auto relative z-10">

          {/* Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <header className="mb-8">
                <h2 className="text-2xl font-bold text-white tracking-tight">System Global Metrics</h2>
                <p className="text-slate-500 mt-1 font-mono text-sm">DATACENTER_MONITOR_ONLINE</p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
                ) : (
                  overviewMetricCards.map(card => (
                    <div key={card.label} className="glass-panel border border-slate-800 rounded-2xl p-6 relative overflow-hidden group hover:border-slate-600 transition-colors">
                      <div className={`w-12 h-12 bg-slate-900 border border-slate-700 rounded-xl flex items-center justify-center text-2xl mb-4 ${card.color}`}>
                        {card.icon}
                      </div>
                      <div className="text-4xl font-black text-white tracking-tighter mb-1">{card.value}</div>
                      <div className="text-xs font-mono font-bold text-slate-400">{card.label}</div>
                      <div className="text-[10px] font-mono text-slate-600 mt-2">{card.change}</div>
                    </div>
                  ))
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 {/* Upload Activity Chart */}
                {loading ? <ChartSkeleton /> : (
                  <div className="glass-panel border border-slate-800 rounded-2xl p-6">
                    <h3 className="font-mono font-bold text-slate-400 text-sm tracking-wide mb-6">NETWORK_TRAFFIC (7D)</h3>
                    {stats?.uploadActivity?.length > 0 ? (
                      <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={stats.uploadActivity} margin={{ left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="gradRose" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                          <XAxis dataKey="_id" tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }} allowDecimals={false} axisLine={false} tickLine={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Area type="monotone" dataKey="count" stroke="#f43f5e" fill="url(#gradRose)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-center py-10 text-slate-600 font-mono">NULL_TRAFFIC</div>
                    )}
                  </div>
                )}

                 {/* AI Usage */}
                 {!loading && stats?.aiUsage?.length > 0 && (
                  <div className="glass-panel border border-slate-800 rounded-2xl p-6">
                    <h3 className="font-mono font-bold text-slate-400 text-sm tracking-wide mb-6">AI_PROCESS_DISPERSION</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={stats.aiUsage.map(u => ({ name: AI_LABELS[u._id] || u._id, count: u.count }))} margin={{ left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }} allowDecimals={false} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#334155', opacity: 0.4 }} />
                        <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <header className="flex justify-between items-end mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">Agent Network</h2>
                  <p className="text-slate-500 mt-1 font-mono text-sm">TOTAL: {users.length}</p>
                </div>
              </header>

              <div className="glass-panel border border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-900/80 border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-4 text-xs font-mono font-bold tracking-wider text-slate-500 uppercase">Identity</th>
                      <th className="px-6 py-4 text-xs font-mono font-bold tracking-wider text-slate-500 uppercase">Enlistment</th>
                      <th className="px-6 py-4 text-xs font-mono font-bold tracking-wider text-slate-500 uppercase">Link State</th>
                      <th className="px-6 py-4 text-xs font-mono font-bold tracking-wider text-slate-500 uppercase text-right">Overrides</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} />)
                    ) : (
                      users.map(u => (
                        <tr key={u._id} className="hover:bg-slate-800/40 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                                {u.name?.[0]?.toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-slate-200 group-hover:text-white transition-colors">{u.name}</p>
                                <p className="text-xs text-slate-500 font-mono mt-0.5">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-400 font-mono">
                            {new Date(u.createdAt).toISOString().split('T')[0]}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-md text-xs font-mono font-bold border ${u.isActive !== false ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                              {u.isActive !== false ? 'ONLINE' : 'LOCKED'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-3">
                              <button onClick={() => handleToggleUser(u._id)}
                                className={`px-4 py-2 rounded-lg text-xs font-mono font-bold border transition-colors ${u.isActive !== false ? 'border-amber-500/30 text-amber-500 hover:bg-amber-500/10' : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'}`}>
                                {u.isActive !== false ? 'SUSPEND' : 'RESTORE'}
                              </button>
                              <button onClick={() => handleDeleteUser(u._id)}
                                className="px-4 py-2 bg-red-950/50 border border-red-500/50 text-red-500 hover:bg-red-600 hover:text-white rounded-lg text-xs font-mono font-bold transition-colors">
                                EXTRACT
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                {!loading && users.length === 0 && <div className="text-center py-16 text-slate-600 font-mono">NO_AGENTS_FOUND</div>}
              </div>
            </div>
          )}

           {/* Documents Tab */}
           {activeTab === 'documents' && (
            <div className="space-y-6">
              <header className="flex justify-between items-end mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">Mass Archive Data</h2>
                  <p className="text-slate-500 mt-1 font-mono text-sm">TOTAL: {documents.length}</p>
                </div>
                <input
                  type="text"
                  value={docSearch}
                  onChange={(e) => setDocSearch(e.target.value)}
                  placeholder="QUERY_IDENTIFIER..."
                  className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm outline-none focus:border-cyan-500 text-white font-mono w-64"
                />
              </header>

              <div className="glass-panel border border-slate-800 rounded-2xl overflow-hidden">
                 <table className="w-full text-left">
                  <thead className="bg-slate-900/80 border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-4 text-xs font-mono font-bold tracking-wider text-slate-500 uppercase">Data Block</th>
                      <th className="px-6 py-4 text-xs font-mono font-bold tracking-wider text-slate-500 uppercase">Owned By</th>
                      <th className="px-6 py-4 text-xs font-mono font-bold tracking-wider text-slate-500 uppercase">Mass/Time</th>
                      <th className="px-6 py-4 text-xs font-mono font-bold tracking-wider text-slate-500 uppercase text-right">Overrides</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} columns={4} />)
                    ) : (
                      filteredDocs.map(doc => (
                        <tr key={doc._id} className="hover:bg-slate-800/40 transition-colors group">
                           <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <span className="text-lg opacity-70">📄</span>
                              <div>
                                <p className="font-bold text-slate-200 group-hover:text-white transition-colors truncate max-w-[200px]">{doc.originalName || doc.filename}</p>
                                <p className="text-[10px] text-slate-500 font-mono mt-0.5">{doc.mimeType || 'unknown'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-bold text-slate-300 group-hover:text-white transition-colors">{doc.userId?.name || 'ORPHAN_NODE'}</p>
                            <p className="text-xs text-slate-500 font-mono mt-0.5">{doc.userId?.email || '--'}</p>
                          </td>
                          <td className="px-6 py-4 flex flex-col">
                            <span className="text-sm font-mono text-cyan-400">{formatSize(doc.size)}</span>
                            <span className="text-xs font-mono text-slate-500">{new Date(doc.createdAt).toISOString().split('T')[0]}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <div className="flex items-center justify-end gap-3">
                              {doc.url && (
                                <a href={doc.url} target="_blank" rel="noreferrer" className="px-4 py-2 rounded-lg border border-cyan-500/30 text-cyan-500 hover:bg-cyan-500/10 text-xs font-mono font-bold transition-colors">VIEW</a>
                              )}
                              <button onClick={() => handleDeleteDocument(doc._id)} className="px-4 py-2 bg-red-950/50 border border-red-500/50 text-red-500 hover:bg-red-600 hover:text-white rounded-lg text-xs font-mono font-bold transition-colors">PURGE</button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                {!loading && filteredDocs.length === 0 && <div className="text-center py-16 text-slate-600 font-mono">NO_DATA_BLOCKS_FOUND</div>}
              </div>
            </div>
           )}

          {/* AI Settings Tab */}
          {activeTab === 'ai-settings' && (
            <div className="space-y-6 max-w-2xl">
              <header className="mb-8">
                <h2 className="text-2xl font-bold text-white tracking-tight">AI Feature Controls</h2>
                <p className="text-slate-500 mt-1 font-mono text-sm">SYSTEM_AI_CONFIGURATION</p>
              </header>
              {aiSettings === null ? (
                <div className="glass-panel border border-slate-800 rounded-2xl p-8 text-center text-slate-600 font-mono">LOADING_CONFIG...</div>
              ) : (
                <div className="glass-panel border border-slate-800 rounded-2xl p-6 space-y-5">
                  <div className="flex items-center justify-between p-4 bg-slate-900/80 rounded-xl border border-slate-800">
                    <div>
                      <p className="font-mono font-bold text-white text-sm">AI_ENGINE_ENABLED</p>
                      <p className="text-xs text-slate-500 mt-1">Master switch for all AI features</p>
                    </div>
                    <button onClick={() => handleUpdateAiSettings({ aiEnabled: !aiSettings.aiEnabled, fallbackOnly: aiSettings.fallbackOnly })} disabled={aiSettingsLoading}
                      className={`relative w-14 h-7 rounded-full border transition-all duration-300 ${aiSettings.aiEnabled ? 'bg-emerald-500/20 border-emerald-500/50' : 'bg-slate-800 border-slate-700'}`}>
                      <span className={`absolute top-1 w-5 h-5 rounded-full transition-all duration-300 ${aiSettings.aiEnabled ? 'left-8 bg-emerald-400' : 'left-1 bg-slate-500'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-900/80 rounded-xl border border-slate-800">
                    <div>
                      <p className="font-mono font-bold text-white text-sm">FALLBACK_ONLY_MODE</p>
                      <p className="text-xs text-slate-500 mt-1">Force fallback even when AI is available</p>
                    </div>
                    <button onClick={() => handleUpdateAiSettings({ aiEnabled: aiSettings.aiEnabled, fallbackOnly: !aiSettings.fallbackOnly })} disabled={aiSettingsLoading}
                      className={`relative w-14 h-7 rounded-full border transition-all duration-300 ${aiSettings.fallbackOnly ? 'bg-amber-500/20 border-amber-500/50' : 'bg-slate-800 border-slate-700'}`}>
                      <span className={`absolute top-1 w-5 h-5 rounded-full transition-all duration-300 ${aiSettings.fallbackOnly ? 'left-8 bg-amber-400' : 'left-1 bg-slate-500'}`} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Assistant Tab */}
          {activeTab === 'assistant' && (
            <div className="max-w-4xl mx-auto flex flex-col h-[70vh]">
              <header className="mb-6">
                <h2 className="text-2xl font-bold text-white tracking-tight">Overseer Neural Link</h2>
                <p className="text-slate-500 mt-1 font-mono text-sm">QUERY_SYSTEM_STATE</p>
              </header>

              <div className="flex-1 glass-panel border border-slate-800 rounded-3xl overflow-hidden flex flex-col shadow-2xl relative">
                <div className="absolute inset-0 bg-gradient-to-t from-rose-500/5 to-transparent pointer-events-none" />
                <div className="flex-1 overflow-y-auto p-6 space-y-6 relative z-10">
                  {chatHistory.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-5 py-4 ${
                        msg.role === 'user' 
                          ? 'bg-rose-600 text-white rounded-br-sm shadow-lg shadow-rose-900/50' 
                          : 'bg-slate-900 border border-slate-700 text-slate-300 rounded-bl-sm font-mono text-sm leading-relaxed'
                      }`}>
                         {msg.role === 'assistant' && <div className="text-[10px] font-bold text-rose-500 mb-2 font-sans tracking-wide uppercase">SYSTEM_RESPONSE //</div>}
                         {msg.text}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-slate-900 border border-slate-700 px-5 py-4 rounded-2xl rounded-bl-sm flex gap-2">
                         <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                         <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse delay-75" />
                         <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse delay-150" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-slate-950/80 p-4 border-t border-slate-800 relative z-10 font-sans">
                  <div className="flex flex-wrap gap-2 mb-4">
                     {['How many agents enlisted this week?', 'Who holds the most data blocks?', 'Present mass parameters.', 'Analyze total packets array.'].map(q => (
                       <button key={q} onClick={() => runAdminQuery(q)} className="bg-slate-900 border border-slate-700 hover:border-rose-500/50 hover:text-rose-400 text-slate-400 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors">
                         &gt; {q}
                       </button>
                     ))}
                  </div>
                  <form onSubmit={handleChat} className="flex gap-3">
                    <input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Enter command sequence..."
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-5 py-3 outline-none focus:border-rose-500 text-white font-mono text-sm placeholder-slate-600"
                    />
                    <button type="submit" disabled={chatLoading} className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-8 rounded-xl text-sm transition-all shadow-lg shadow-rose-900/50 disabled:opacity-50 disabled:shadow-none">
                      EXECUTE
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
