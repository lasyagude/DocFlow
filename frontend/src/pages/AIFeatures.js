import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import useDocStore from '../store/docStore';

const API_BASE = (typeof process !== 'undefined' ? process.env.REACT_APP_API_URL : null) ||
  (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_API_URL : null) ||
  'http://localhost:5000/api';
const API = `${API_BASE}/ai`;

const FEATURES = [
  {
    id: 'summarize',
    label: 'Summarize',
    icon: 'S',
    desc: 'Generate a concise summary of the selected document',
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10 border-indigo-500/50',
    glow: 'shadow-[0_0_15px_rgba(99,102,241,0.3)]',
  },
  {
    id: 'chat',
    label: 'Chat',
    icon: 'C',
    desc: 'Ask grounded questions using only document context',
    color: 'text-pink-400',
    bg: 'bg-pink-500/10 border-pink-500/50',
    glow: 'shadow-[0_0_15px_rgba(236,72,153,0.3)]',
  },
];

export default function AIFeatures() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { documents, fetchDocuments } = useDocStore();
  const [selectedDoc, setSelectedDoc] = useState(state?.doc || null);
  const [activeFeature, setActiveFeature] = useState('summarize');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { role: 'assistant', text: 'Ask a question about the selected document and I will answer using only its contents.' },
  ]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (!documents.length) {
      fetchDocuments();
    }
  }, [documents.length, fetchDocuments]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  useEffect(() => {
    setResult('');
  }, [activeFeature, selectedDoc]);

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  });

  const handleSummarize = async () => {
    if (!selectedDoc || loading) {
      return;
    }

    setLoading(true);
    setResult('');

    try {
      const res = await axios.post(`${API}/${selectedDoc._id}/summarize`, {}, getAuthHeaders());
      const summary = res.data.summary || res.data.data?.summary || res.data.data?.summary?.summary || 'No summary available.';
      setResult(summary);
    } catch (error) {
      setResult(`Error: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSummary = async () => {
    if (!selectedDoc) {
      return;
    }

    try {
      const response = await axios.get(`${API}/${selectedDoc._id}/summary/download`, {
        ...getAuthHeaders(),
        responseType: 'blob',
      });

      const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'text/plain' }));
      const link = document.createElement('a');
      const baseName = (selectedDoc.originalName || 'document').replace(/\.[^.]+$/, '');

      link.href = blobUrl;
      link.download = `${baseName}_summary.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      setResult(`Error: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleChat = async (event) => {
    event.preventDefault();
    if (!chatInput.trim() || !selectedDoc || loading) {
      return;
    }

    const question = chatInput.trim();
    setChatInput('');
    setChatHistory((prev) => [...prev, { role: 'user', text: question }]);
    setLoading(true);

    try {
      const res = await axios.post(
        `${API}/${selectedDoc._id}/chat`,
        { question },
        getAuthHeaders()
      );

      const answer = res.data.answer || res.data.data?.answer || 'Not found in document';
      const source = res.data.source || res.data.data?.source;
      const chunkIndex = res.data.chunkIndex ?? res.data.data?.chunkIndex;
      setChatHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: answer,
          source,
          chunkIndex,
        },
      ]);
    } catch (error) {
      setChatHistory((prev) => [
        ...prev,
        { role: 'assistant', text: `Error: ${error.response?.data?.message || error.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const active = FEATURES.find((feature) => feature.id === activeFeature);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 flex font-sans">
      <div className="w-80 glass-panel border-r border-slate-800 flex flex-col relative z-20">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-white text-lg tracking-tight hover:text-cyan-400 transition-colors cursor-pointer" onClick={() => navigate('/dashboard')}>DocFlow</h2>
            <p className="text-xs text-cyan-400 mt-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              AI Assistant
            </p>
          </div>
          <button onClick={() => navigate('/documents')} className="w-8 h-8 rounded-lg bg-slate-800/50 hover:bg-slate-700 flex items-center justify-center text-slate-400 transition-colors">D</button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto">
          <div className="mb-6">
            <label className="block text-xs font-bold text-slate-500 mb-2 tracking-wide uppercase">Select Document</label>
            <select
              value={selectedDoc?._id || ''}
              onChange={(e) => setSelectedDoc(documents.find((doc) => doc._id === e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:border-cyan-500 outline-none appearance-none font-mono"
            >
              <option value="">Choose a document...</option>
              {documents.map((doc) => (
                <option key={doc._id} value={doc._id}>{doc.originalName || doc.filename}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 mb-2 tracking-wide uppercase">Features</label>
            {FEATURES.map((feature) => (
              <button
                key={feature.id}
                onClick={() => setActiveFeature(feature.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left group ${
                  activeFeature === feature.id
                    ? `${feature.bg} ${feature.color} ${feature.glow}`
                    : 'border-transparent hover:bg-slate-800 hover:border-slate-700 text-slate-400'
                }`}
              >
                <span className="text-xl group-hover:scale-110 transition-transform">{feature.icon}</span>
                <div>
                  <div className="font-bold text-sm">{feature.label}</div>
                  <div className="text-xs opacity-80">{feature.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 p-8 bg-slate-950 relative overflow-hidden flex flex-col">
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[120px] pointer-events-none transition-colors duration-1000 ${
          activeFeature === 'chat' ? 'bg-pink-500/5' : 'bg-indigo-500/5'
        }`} />

        {!selectedDoc ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 relative z-10">
            <div className="text-6xl mb-4 drop-shadow-[0_0_15px_rgba(100,116,139,0.3)]">D</div>
            <p className="text-lg">No document selected</p>
            <p className="text-sm mt-2 opacity-70">Select a document from the sidebar to begin</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full relative z-10 glass-panel border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="bg-slate-900/80 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-lg">{active?.icon}</div>
                <div>
                  <h3 className="font-bold text-white">{activeFeature === 'chat' ? 'Chat with Document' : 'Summarize Document'}</h3>
                  <p className="text-sm text-slate-500">File: <span className="text-cyan-400">{selectedDoc.originalName}</span></p>
                </div>
              </div>
            </div>

            {activeFeature === 'chat' ? (
              <>
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {chatHistory.map((message, index) => (
                    <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-5 py-4 ${
                        message.role === 'user'
                          ? 'bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-br-sm shadow-lg shadow-indigo-500/20'
                          : 'bg-slate-900 border border-slate-700 text-slate-300 rounded-bl-sm font-sans leading-relaxed'
                      }`}>
                        <div className="whitespace-pre-wrap">{message.text}</div>
                        {message.role === 'assistant' && typeof message.chunkIndex === 'number' && (
                          <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-cyan-400">
                            Answer from section {message.chunkIndex}
                          </div>
                        )}
                        {message.role === 'assistant' && message.source && (
                          <div className="mt-2 text-xs text-slate-500">Source: {message.source}</div>
                        )}
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-slate-900 border border-slate-700 rounded-2xl rounded-bl-sm px-5 py-4 flex gap-2">
                        <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                        <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse delay-75" />
                        <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse delay-150" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                <form onSubmit={handleChat} className="p-4 border-t border-slate-800 bg-slate-950/50 flex gap-3">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask a question..."
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-5 py-3.5 outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition text-white placeholder-slate-600 font-sans"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={loading || !chatInput.trim()}
                    className="bg-pink-600 hover:bg-pink-500 disabled:bg-slate-800 text-white font-bold px-6 rounded-xl transition-all shadow-[0_0_15px_rgba(236,72,153,0.2)] disabled:shadow-none"
                  >
                    Send
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 p-6 flex flex-col">
                {result ? (
                  <div className="flex-1 flex flex-col gap-4">
                    <div className="flex items-center justify-end">
                      <button
                        onClick={handleDownloadSummary}
                        className="px-4 py-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 transition-all text-sm font-semibold"
                      >
                        Download Summary
                      </button>
                    </div>
                    <div className="flex-1 bg-slate-950/50 rounded-xl border border-slate-800 p-6 overflow-y-auto whitespace-pre-wrap font-sans text-slate-300 leading-relaxed shadow-inner">
                      {result}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/30">
                    <div className={`text-6xl mb-6 opacity-80 ${active?.color}`}>{active?.icon}</div>
                    <p className="text-slate-500 mb-6 text-sm">Click below to generate a document summary</p>
                    <button
                      onClick={handleSummarize}
                      disabled={loading}
                      className={`font-bold px-8 py-3.5 rounded-xl transition-all relative overflow-hidden group border shadow-lg ${
                        loading ? 'bg-slate-800 border-slate-700 text-slate-500' : `${active?.bg} ${active?.color} hover:bg-slate-800 ${active?.glow}`
                      }`}
                    >
                      <span className="relative z-10 flex items-center justify-center gap-3">
                        {loading ? 'Processing...' : 'Generate Summary'}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
