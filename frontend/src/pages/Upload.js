import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import useDocStore from '../store/docStore';
import useToastStore from '../store/toastStore';

export default function Upload() {
  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState({});
  const [results, setResults] = useState({});
  const { uploadDocument, uploading, error, clearError } = useDocStore();
  const toast = useToastStore;
  const navigate = useNavigate();

  const onDrop = useCallback((acceptedFiles) => {
    clearError();
    setFiles((prev) => [...prev, ...acceptedFiles]);
  }, [clearError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
    },
  });

  const handleUpload = async () => {
    if (files.length === 0) return;

    let successCount = 0;
    let failCount = 0;

    for (const file of files) {
      if (results[file.name]?.success) continue;
      setResults((r) => ({ ...r, [file.name]: { success: false, uploading: true } }));
      const doc = await uploadDocument(file, (pct) => {
        setProgress((p) => ({ ...p, [file.name]: pct }));
      });
      if (doc) {
        successCount++;
        setResults((r) => ({ ...r, [file.name]: { success: true, uploading: false, doc } }));
      } else {
        failCount++;
        setResults((r) => ({ ...r, [file.name]: { success: false, uploading: false, error: true } }));
      }
    }

    if (successCount > 0) toast.getState().success(`Uploaded ${successCount} files successfully!`);
    if (failCount > 0) toast.getState().error(`Upload failed for ${failCount} files`);
  };

  const removeFile = (name) => {
    setFiles((prev) => prev.filter((f) => f.name !== name));
    setProgress((p) => { const n = { ...p }; delete n[name]; return n; });
    setResults((r) => { const n = { ...r }; delete n[name]; return n; });
  };

  const formatSize = (bytes) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const allDone = files.length > 0 && files.every((f) => results[f.name]?.success);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300">
      <div className="glass-panel border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-500/50 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition-all">←</button>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Upload Files</h1>
            <p className="text-xs text-slate-500 font-mono text-cyan-400/70">SECURE UPLOAD</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-6 space-y-6 mt-6">

        {error && (
          <div className="bg-red-950/50 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl flex justify-between items-center animate-slide-in">
            <span className="font-mono text-sm">Error: {error}</span>
            <button onClick={clearError} className="text-red-400 hover:text-red-300 text-lg">✕</button>
          </div>
        )}

        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-3xl p-16 text-center cursor-pointer transition-all duration-300 relative overflow-hidden ${
            isDragActive ? 'border-cyan-500 bg-cyan-950/20' : 'border-slate-800 hover:border-cyan-500/50 glass-panel hover:bg-slate-900/80'
          }`}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />
          <input {...getInputProps()} />
          <div className="text-6xl mb-6 relative z-10 drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]">📡</div>
          {isDragActive ? (
            <p className="text-cyan-400 text-xl font-bold tracking-tight">Drop files here...</p>
          ) : (
            <div className="relative z-10">
              <p className="text-white text-xl font-bold tracking-tight mb-2">Drag & drop files to upload</p>
              <p className="text-slate-500">or click to browse your computer</p>
              <div className="flex gap-2 justify-center mt-6">
                {['PDF', 'DOCX', 'TXT', 'PNG', 'JPG', 'XLSX', 'PPTX'].map(ext => (
                  <span key={ext} className="text-xs font-mono font-bold bg-slate-900 border border-slate-700 px-2 py-1 rounded text-slate-400">{ext}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {files.length > 0 && (
          <div className="glass-panel rounded-2xl border border-slate-800 p-5 space-y-4">
            <h2 className="font-bold text-slate-400 text-sm tracking-wide uppercase">Selected Files ({files.length})</h2>
            <div className="space-y-3">
              {files.map((file) => (
                <div key={file.name} className="flex items-center gap-4 p-4 bg-slate-900/80 border border-slate-800 rounded-xl relative overflow-hidden group hover:border-slate-700 transition-colors">
                  {progress[file.name] !== undefined && progress[file.name] < 100 && (
                    <div className="absolute top-0 left-0 h-1 bg-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,1)] transition-all ease-linear" style={{ width: `${progress[file.name]}%` }} />
                  )}
                  
                  <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-lg shadow-inner">📄</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{file.name}</p>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{formatSize(file.size)}</p>

                    <div className="mt-1">
                      {results[file.name]?.success && (
                        <>
                          <span className="text-xs text-emerald-400 font-bold">✓ UPLOADED</span>
                          {results[file.name].doc?.fileType && (
                            <span className="text-xs ml-3 text-slate-400 bg-slate-800 px-2 py-0.5 rounded uppercase font-mono">
                              {results[file.name].doc.fileType}
                            </span>
                          )}
                          {results[file.name].doc?.textExtraction?.usedOcr && (
                            <span className="text-xs ml-2 text-indigo-400 bg-indigo-500/20 px-2 py-0.5 rounded font-mono">
                              OCR USED
                            </span>
                          )}
                        </>
                      )}
                      {results[file.name]?.error && <span className="text-xs text-red-400 font-bold">✕ FAILED</span>}
                      {results[file.name]?.uploading && (
                        <span className="text-xs text-cyan-400 font-bold flex items-center gap-2">
                           <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" /> UPLOADING... {progress[file.name] || 0}%
                        </span>
                      )}
                    </div>
                  </div>

                  {!results[file.name]?.success && !results[file.name]?.uploading && (
                    <button onClick={() => removeFile(file.name)} className="text-slate-500 hover:text-red-400 text-xl font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800 transition" title="Remove">×</button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-800 mt-2">
              <button
                onClick={handleUpload}
                disabled={uploading || allDone}
                className="flex-1 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 disabled:border-slate-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg"
              >
                {uploading ? 'Uploading...' : allDone ? '✓ All Uploads Complete' : 'Upload Files'}
              </button>
              {Object.values(results).some((r) => r.success) && (
                <button
                  onClick={() => navigate('/documents')}
                  className="flex-1 glass-panel hover:bg-slate-800 hover:border-slate-600 text-white font-bold py-3.5 rounded-xl transition-all"
                >
                  View My Documents →
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
