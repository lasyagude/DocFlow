import { create } from 'zustand';
import axios from 'axios';

const API = (typeof process !== 'undefined' ? process.env.REACT_APP_API_URL : null) || 
            (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_API_URL : null) || 
            'http://localhost:5000/api';

const useDocStore = create((set) => ({
  documents: [],
  loading: false,
  uploading: false,
  error: null,

  fetchDocuments: async () => {
    set({ loading: true, error: null });
    try {
      const res = await axios.get(`${API}/documents`);
      set({ documents: res.data.data || res.data, loading: false });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to fetch', loading: false });
    }
  },

  uploadDocument: async (file, onProgress) => {
    set({ uploading: true, error: null });
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await axios.post(`${API}/documents/upload`, formData, {
        onUploadProgress: (e) => {
          if (onProgress) onProgress(Math.round((e.loaded * 100) / e.total));
        },
      });
      const newDoc = res.data.data || res.data.document || res.data;
      set((state) => ({ documents: [newDoc, ...state.documents], uploading: false }));
      return newDoc;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Upload failed', uploading: false });
      return null;
    }
  },

  deleteDocument: async (id) => {
    try {
      await axios.delete(`${API}/documents/${id}`);
      set((state) => ({ documents: state.documents.filter((d) => d._id !== id) }));
      return true;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Delete failed' });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));

export default useDocStore;
