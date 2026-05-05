import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import useToastStore from '../store/toastStore';

const API_BASE = (typeof process !== 'undefined' ? process.env.REACT_APP_API_URL : null) || 
               (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_API_URL : null) || 
               'http://localhost:5000/api';
const API = `${API_BASE}/pdf`;

const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

const TABS = [
  { id: 'compress', label: 'COMPRESS', icon: '🗜️', desc: 'Squeeze Mass', route: 'compress', activeColor: 'text-blue-400', activeBg: 'bg-blue-500/10 border-blue-500/50' },
  { id: 'merge', label: 'FUSION', icon: '🔗', desc: 'Bind Documents', route: 'merge', activeColor: 'text-purple-400', activeBg: 'bg-purple-500/10 border-purple-500/50' },
  { id: 'split', label: 'SPLICE', icon: '✂️', desc: 'Sever Pages', route: 'split', activeColor: 'text-cyan-400', activeBg: 'bg-cyan-500/10 border-cyan-500/50' },
];

export default function PDFOperations() {
  const navigate = useNavigate();
  const toast = useToastStore;
  const [activeTab, setActiveTab] = useState('compress');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [splitStart, setSplitStart] = useState(1);
  const [splitEnd, setSplitEnd] = useState('');

  const onDrop = (acceptedFiles) => {
    if (activeTab === 'merge') {
      setFiles(prev => [...prev, ...acceptedFiles]);
    } else {
      setFiles(acceptedFiles.slice(0, 1));
    }
    setResult(null);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: activeTab === 'merge',
  });

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleProcess = async () => {
    if (files.length === 0) {
      toast.getState().error('Load array empty. Insert file.');
      return;
    }
    if (activeTab === 'merge' && files.length < 2) {
      toast.getState().error('Fusion requires minimum 2 sequences.');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();

      if (activeTab === 'merge') {
        files.forEach(f => formData.append('files', f));
      } else {
        formData.append('file', files[0]);
      }

      if (activeTab === 'split') {
        formData.append('startPage', splitStart);
        if (splitEnd) formData.append('endPage', splitEnd);
      }

      const res = await axios.post(`${API}/${activeTab}`, formData, {
        ...getAuthHeaders(),
        headers: {
          ...getAuthHeaders().headers,
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000,
      });

      const resData = res.data.data || res.data;
      setResult(resData);
      toast.getState().success(resData.message || 'Sequence executed!');
    } catch (err) {
      console.error('PDF Engine error:', err.response?.data || err.message);
      toast.getState().error(err.response?.data?.message || 'Sequence failure');
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (id) => {
    setActiveTab(id);
    setFiles([]);
    setResult(null);
    setSplitStart(1);
    setSplitEnd('');
  };

  const actTab = TABS.find(t => t.id === activeTab);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300">
      <div className="glass-panel border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-500/50 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition-all">←</button>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">PDF Engine</h1>
            <p className="text-xs text-slate-500 font-mono text-cyan-400/70">RESTRUCTURE_MODIFICATION_UNIT</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-8 mt-6">
        {/* Module Tabs */}
        <div className="flex gap-4">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => switchTab(tab.id)}
                className={`flex-1 flex items-center gap-4 px-6 py-5 rounded-2xl border transition-all duration-300 group ${
                  isActive
                    ? `${tab.activeBg} ${tab.activeColor} shadow-lg shadow-black/50`
                    : 'border-slate-800 glass-panel hover:bg-slate-800/80 text-slate-500 hover:border-slate-600'
                }`}
              >
                <div className={`text-3xl transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>{tab.icon}</div>
                <div className="text-left">
                  <p className="font-mono font-bold tracking-widest text-sm">{tab.label}</p>
                  <p className="text-xs font-mono opacity-60 uppercase">{tab.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Input parameters (Split only) */}
        {activeTab === 'split' && files.length > 0 && (
          <div className="glass-panel rounded-2xl border border-cyan-500/30 p-5 flex items-center gap-5 slide-in animate-slide-in overflow-hidden relative">
             <div className="absolute top-0 left-0 w-1 h-full bg-cyan-400" />
            <span className="text-sm font-mono font-bold text-cyan-400 ml-2">SLICE_COORDINATES:</span>
            <div className="flex items-center gap-3">
              <input
                type="number" min={1} value={splitStart} onChange={(e) => setSplitStart(e.target.value)}
                className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-center outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-white font-mono"
                placeholder="SEQ.A"
              />
              <span className="text-slate-500 font-mono">-&gt;</span>
              <input
                type="number" min={splitStart} value={splitEnd} onChange={(e) => setSplitEnd(e.target.value)}
                className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-center outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-white font-mono"
                placeholder="SEQ.Z"
              />
              <span className="text-xs text-slate-500 font-mono ml-4 uppercase tracking-wider">// EOF assumes remaining seq</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {/* Dropzone */}
           <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-3xl p-10 text-center flex items-center justify-center cursor-pointer transition-all ${
              isDragActive ? `${actTab.activeBg} border-cyan-400` : 'border-slate-800 glass-panel hover:border-slate-600 hover:bg-slate-900/60'
            }`}
            style={{ minHeight: '300px' }}
          >
            <input {...getInputProps()} />
            <div>
              <div className="text-5xl mb-4 relative z-10">{actTab.icon}</div>
              {isDragActive ? (
                <p className={`text-xl font-bold font-mono tracking-wide ${actTab.activeColor}`}>INPUT_DETECTED</p>
              ) : (
                <>
                  <p className="text-white text-lg font-bold tracking-tight mb-2">Initialize {actTab.label} Vector</p>
                  <p className="text-slate-500 font-mono text-sm max-w-[200px] mx-auto">
                    {activeTab === 'merge' ? 'Drop multiple sequence arrays' : 'Drop single sequence array'}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Files / Processing */}
          <div className="glass-panel border border-slate-800 rounded-3xl flex flex-col overflow-hidden" style={{ minHeight: '300px' }}>
            {files.length === 0 ? (
               <div className="flex-1 flex flex-col items-center justify-center text-slate-600 font-mono text-sm">
                 <div className="text-3xl mb-3">📡</div>
                 AWAITING_INPUT_BUFFER
               </div>
            ) : (
              <div className="flex-1 flex flex-col">
                <div className="bg-slate-900/80 px-5 py-3 border-b border-slate-800 flex justify-between items-center">
                  <h3 className="font-mono font-bold text-slate-400 text-sm tracking-wide">BUFFER_QUEUE ({files.length})</h3>
                  {activeTab === 'merge' && <span className="text-xs text-slate-500 font-mono">ORDER MATTERS</span>}
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 h-48">
                  {files.map((file, i) => (
                    <div key={`${file.name}-${i}`} className="flex items-center gap-3 p-3 bg-slate-900 border border-slate-800 rounded-xl group relative overflow-hidden">
                      <span className="text-lg opacity-70">📄</span>
                      <div className="flex-1 min-w-0 relative z-10">
                        <p className="text-sm font-semibold text-white truncate">{file.name}</p>
                        <p className="text-xs text-slate-500 font-mono">{formatSize(file.size)}</p>
                      </div>
                      <button
                        onClick={() => removeFile(i)}
                        className="text-slate-600 hover:text-red-400 text-lg w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800 relative z-10"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t border-slate-800 bg-slate-950/50">
                  <button
                    onClick={handleProcess}
                    disabled={loading}
                    className={`w-full font-mono font-bold py-3.5 rounded-xl transition-all shadow-lg border relative overflow-hidden group ${loading ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-slate-900 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)]'}`}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-3">
                      {loading ? (
                        <>
                           <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                           EXECUTING {actTab.label}...
                        </>
                      ) : (
                         <>EXECUTE_{actTab.label}_SEQUENCE</>
                      )}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Output Result */}
        {result && (
          <div className="glass-panel rounded-2xl border-2 border-emerald-500/30 p-8 shadow-[0_0_30px_rgba(16,185,129,0.1)] relative overflow-hidden animate-slide-in">
             <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
             <div className="flex flex-col md:flex-row md:items-center gap-6 relative z-10">
               <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center text-3xl border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.4)]">✓</div>
               <div className="flex-1">
                 <h3 className="text-xl font-bold text-white mb-2 tracking-tight">{result.message}</h3>
                 <div className="font-mono text-sm text-emerald-400/80 bg-slate-950/50 inline-block px-4 py-2 rounded-lg border border-slate-800">
                    {activeTab === 'compress' && `MASS_REDUCTION: ${formatSize(result.originalSize)} -> ${formatSize(result.compressedSize)} (-${result.savings})`}
                    {activeTab === 'merge' && `VECTORS_MERGED: ${result.filesCount} -> SIZE: ${result.pageCount} PAGES`}
                    {activeTab === 'split' && `VECTORS_EXTRACTED: ${result.range}`}
                 </div>
               </div>
               <div className="flexflex-col gap-3 min-w-[200px]">
                  {result.document?.url && (
                    <a
                      href={result.document.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-center font-bold py-3 rounded-xl transition-colors shadow-lg shadow-emerald-500/20 mb-3"
                    >
                      DOWNLOAD_OUTPUT
                    </a>
                  )}
                  <button
                    onClick={() => navigate('/documents')}
                    className="block w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-center font-bold py-3 rounded-xl transition-colors"
                  >
                    ACCESS_CORE
                  </button>
               </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
