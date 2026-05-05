import { create } from 'zustand';
import axios from 'axios';

const API = (typeof process !== 'undefined' ? process.env.REACT_APP_API_URL : null) || 
            (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_API_URL : null) || 
            'http://localhost:5000/api';

axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('token') || null,
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const res = await axios.post(`${API}/auth/login`, { email, password });
      const { token, data } = res.data;
      localStorage.setItem('token', token);
      set({ token, user: data, loading: false });
      return data.role;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Login failed', loading: false });
      return null;
    }
  },

  signup: async (name, email, password) => {
    set({ loading: true, error: null });
    try {
      const res = await axios.post(`${API}/auth/register`, { name, email, password });
      const { token, data } = res.data;
      localStorage.setItem('token', token);
      set({ token, user: data, loading: false });
      return true;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Signup failed', loading: false });
      return false;
    }
  },

  fetchUser: async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await axios.get(`${API}/auth/me`);
      set({ user: res.data.data || res.data });
    } catch {
      localStorage.removeItem('token');
      set({ token: null, user: null });
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ token: null, user: null });
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;