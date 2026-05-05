import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import useDocStore from '../store/docStore';
import useToastStore from '../store/toastStore';
import { TableRowSkeleton } from '../components/Skeleton';

const API = (typeof process !== 'undefined' ? process.env.REACT_APP_API_URL : null) ||
  (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_API_URL : null) ||
  'http://localhost:5000/api';

export default function Documents() {
  const { documents, fetchDocuments, deleteDocument, loading } = useDocStore();
  const toast = useToastStore;
  const navigate = useNavigate();
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => { fetchDocuments(); }, []);

  const uniqueTypes = [...new Set(documents.map(d => d.fileType).filter(Boolean))];

  const formatSize = (bytes) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  const handleDelete = async (id) => {
    const success = await deleteDocument(id);
    setDeleteConfirm(null);
    if (success) {
      toast.getState().success('Document deleted successfully');
    } else {
      toast.getState().error('Failed to delete document');
    }
  };

  const handleSearch = async (event) => {
    event.preventDefault();
    const query = searchQuery.trim();

    if (!query) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API}/documents/search`, { query }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSearchResults(res.data.data || []);
    } catch (error) {
      toast.getState().error(error.response?.data?.message || 'Document search failed');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300">
      <div className="glass-panel border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-500/50 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition-all">←</button>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">My Documents</h1>
            <p className="text-xs text-slate-500 font-mono text-indigo-400/70">ALL FILES</p>
          </div>
        </div>
        <button onClick={() => navigate('/upload')} className="bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-600/30 hover:shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-all">
          + Upload New Document
        </button>
      </div>

      <div className="max-w-6xl mx-auto p-6 mt-4">
        <form onSubmit={handleSearch} className="glass-panel rounded-2xl border border-slate-800 p-4 mb-6 flex flex-col gap-3 md:flex-row md:items-center">
          <div className="w-48">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Filter by Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-3 text-sm text-white outline-none focus:border-cyan-500 appearance-none"
            >
              <option value="">All Types</option>
              {uniqueTypes.map(type => (
                <option key={type} value={type}>{type.toUpperCase()}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Document Search</label>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search processed text and extracted sections"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-cyan-500"
            />
          </div>
          <div className="flex gap-3 md:self-end">
            <button type="submit" className="px-5 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all">
              {searching ? 'Searching...' : 'Search'}
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSearchResults([]);
              }}
              className="px-5 py-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-all"
            >
              Clear
            </button>
          </div>
        </form>

        {searchResults.length > 0 && (
          <div className="glass-panel rounded-2xl border border-slate-800 p-5 mb-6 space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">Search Matches</h2>
            {searchResults.map((result) => (
              <div key={result.id} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-white">{result.documentName}</div>
                    <div className="text-sm text-slate-400 mt-2">{result.snippet}</div>
                  </div>
                  <button
                    onClick={() => {
                      const doc = documents.find((item) => item._id === result.id);
                      navigate('/ai', { state: { doc } });
                    }}
                    className="px-4 py-2 rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 transition-all text-sm font-semibold"
                  >
                    Open
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-900/80 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">File Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Type</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Size</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} columns={5} />)}
              </tbody>
            </table>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-32 glass-panel rounded-3xl border border-slate-800 max-w-2xl mx-auto">
            <div className="text-6xl mb-6 relative z-10 drop-shadow-[0_0_15px_rgba(99,102,241,0.3)]">📭</div>
            <p className="text-slate-400 text-lg mb-6">You haven't uploaded any documents yet.</p>
            <button onClick={() => navigate('/upload')} className="bg-indigo-600 text-white px-8 py-3.5 rounded-xl font-bold border border-indigo-500/50 shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 transition-colors">
              Upload Your First Document
            </button>
          </div>
        ) : (
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-900/80 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">File Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Type</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Size</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {documents.filter(d => !typeFilter || d.fileType === typeFilter).map((doc) => (
                  <tr key={doc._id} className="hover:bg-slate-800/40 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-lg shadow-inner">📄</div>
                        <p className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">{doc.originalName || doc.filename || 'Unknown Document'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {doc.fileType && <span className="text-xs font-mono bg-slate-800 text-slate-300 px-2 py-1 rounded uppercase">{doc.fileType}</span>}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">{formatSize(doc.size)}</td>
                    <td className="px-6 py-4">
                      {doc.textExtraction?.status === 'success' ? (
                        <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">READY</span>
                      ) : (
                        <span className="text-xs text-red-400 font-bold bg-red-500/10 px-2 py-1 rounded border border-red-500/20">FAILED</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {doc.url && (
                          <a href={doc.url} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white text-xs font-bold transition">View</a>
                        )}
                        <button onClick={() => navigate('/ai', { state: { doc } })} className="px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400 hover:bg-purple-500/20 hover:text-purple-300 text-xs font-bold transition">
                          AI Features ✨
                        </button>
                        {deleteConfirm === doc._id ? (
                          <div className="flex items-center gap-2 bg-red-950/40 p-1 rounded-lg border border-red-900/50">
                            <button onClick={() => handleDelete(doc._id)} className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-bold transition">Delete</button>
                            <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 text-slate-400 hover:text-white text-xs font-bold w-full h-full">Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteConfirm(doc._id)} className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-500 hover:border-red-500/30 hover:text-red-400 hover:bg-red-500/10 text-xs font-bold transition">Delete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
