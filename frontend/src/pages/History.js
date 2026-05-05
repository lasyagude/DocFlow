import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';
import useDocStore from '../store/docStore';
import { CardSkeleton, ChartSkeleton, TableRowSkeleton } from '../components/Skeleton';

const COLORS = ['#06b6d4', '#6366f1', '#a855f7', '#10b981', '#f43f5e', '#f59e0b']; // Techy neon colors
const AI_LABELS = { summarize: 'Summarize', chat: 'Chat' };

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-panel p-3 border border-slate-700 rounded-lg shadow-xl shadow-black/50">
        <p className="text-slate-300 text-xs mb-1">{label}</p>
        <p className="text-white font-bold text-sm">Value: <span className="text-cyan-400">{payload[0].value}</span></p>
      </div>
    );
  }
  return null;
};

export default function History() {
  const { documents, fetchDocuments, loading } = useDocStore();
  const navigate = useNavigate();

  // Fix missing dependency warning inside useEffect
  useEffect(() => { 
    fetchDocuments(); 
  }, [fetchDocuments]);

  const uploadsByDay = useMemo(() => {
    const map = {};
    documents.forEach((doc) => {
      const day = new Date(doc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      map[day] = (map[day] || 0) + 1;
    });
    return Object.entries(map).map(([date, count]) => ({ date, count })).slice(-14);
  }, [documents]);

  const byType = useMemo(() => {
    const map = {};
    documents.forEach((doc) => {
      const name = doc.originalName || doc.filename || '';
      const ext = name.split('.').pop()?.toUpperCase() || 'OTHER';
      map[ext] = (map[ext] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [documents]);

  const aiUsage = useMemo(() => {
    const map = {};
    documents.forEach((doc) => {
      if (doc.aiFeatures) {
        doc.aiFeatures.forEach((f) => {
          const label = AI_LABELS[f.feature] || f.feature;
          map[label] = (map[label] || 0) + 1;
        });
      }
    });
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  }, [documents]);

  const totalSize = useMemo(() => {
    const bytes = documents.reduce((sum, d) => sum + (d.size || 0), 0);
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }, [documents]);

  const stats = [
    { label: 'Total Documents', value: documents.length, icon: '📄', color: 'text-blue-400' },
    { label: 'Total Storage Used', value: totalSize, icon: '💾', color: 'text-indigo-400' },
    { label: 'Recent Uploads', value: documents.filter((d) => new Date(d.createdAt) > new Date(Date.now() - 7 * 86400000)).length, icon: '📅', color: 'text-cyan-400' },
    { label: 'Features Used', value: aiUsage.reduce((s, u) => s + u.count, 0), icon: '🤖', color: 'text-purple-400' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300">
      <div className="glass-panel border-b border-slate-800 px-6 py-4 flex items-center gap-4 sticky top-0 z-20">
        <button onClick={() => navigate('/dashboard')} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-500/50 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition-all">←</button>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Usage History</h1>
          <p className="text-xs text-slate-500 text-cyan-400/70">YOUR DASHBOARD METRICS</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-6 mt-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
          ) : (
            stats.map((s) => (
              <div key={s.label} className="glass-panel border border-slate-800 rounded-2xl p-6 relative overflow-hidden group hover:border-slate-600 transition-all hover:shadow-[0_0_20px_rgba(6,182,212,0.1)]">
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-slate-800/50 rounded-full blur-2xl group-hover:bg-cyan-900/20 transition-colors" />
                <div className={`text-4xl mb-3 ${s.color}`}>{s.icon}</div>
                <div className="text-3xl font-bold text-white tracking-tight mb-1">{s.value}</div>
                <div className="text-sm text-slate-400">{s.label}</div>
              </div>
            ))
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {loading ? <ChartSkeleton /> : (
            <div className="glass-panel border border-slate-800 rounded-2xl p-6">
              <h2 className="font-bold text-slate-300 mb-6">Uploads (Last 14 Days)</h2>
              {uploadsByDay.length === 0 ? (
                <div className="text-center py-16 text-slate-600">No data available</div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={uploadsByDay} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 12 }} allowDecimals={false} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="count" stroke="#06b6d4" fill="url(#colorCount)" strokeWidth={2} activeDot={{ r: 6, fill: '#fff', stroke: '#06b6d4', strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          )}

          {!loading && aiUsage.length > 0 && (
            <div className="glass-panel border border-slate-800 rounded-2xl p-6">
              <h2 className="font-bold text-slate-300 mb-6">Features Used</h2>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={aiUsage} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} allowDecimals={false} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#334155', opacity: 0.4 }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {aiUsage.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {loading ? <ChartSkeleton /> : (
            <div className={`glass-panel border border-slate-800 rounded-2xl p-6 ${aiUsage.length === 0 ? 'lg:col-span-2' : ''}`}>
              <h2 className="font-bold text-slate-300 mb-6">Document Types</h2>
              {byType.length === 0 ? (
                <div className="text-center py-16 text-slate-600">No data available</div>
              ) : (
                <ResponsiveContainer width="100%" height={aiUsage.length === 0 ? 300 : 240}>
                  <PieChart>
                    <Pie data={byType} cx="50%" cy="50%" innerRadius={aiUsage.length === 0 ? 80 : 60} outerRadius={aiUsage.length === 0 ? 110 : 80} dataKey="value" stroke="none"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {byType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    {aiUsage.length === 0 && <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: '#94a3b8' }} />}
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          )}
        </div>

        <div className="glass-panel border border-slate-800 rounded-2xl overflow-hidden mt-6">
          <div className="bg-slate-900/80 px-6 py-4 border-b border-slate-800">
            <h2 className="font-bold text-slate-300">Recent Uploads</h2>
          </div>
          {loading ? (
            <div className="p-4 bg-slate-950/50">
               {Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} columns={3} />)}
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-950/80 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase">File Name</th>
                  <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase">Upload Date</th>
                  <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase">Size</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 bg-slate-900/30">
                {documents.slice(0, 10).map((doc) => (
                  <tr key={doc._id} className="hover:bg-slate-800/60 transition-colors group">
                    <td className="px-6 py-4 text-sm font-semibold text-slate-300">{doc.originalName || doc.filename || 'Unknown Document'}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{new Date(doc.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{doc.size ? `${(doc.size / 1024).toFixed(1)} KB` : 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && documents.length === 0 && (
            <div className="text-center py-16 text-slate-600">No recent uploads</div>
          )}
        </div>
      </div>
    </div>
  );
}
