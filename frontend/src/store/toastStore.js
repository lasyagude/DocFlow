import { create } from 'zustand';

let toastId = 0;

const useToastStore = create((set) => ({
  toasts: [],

  addToast: (message, type = 'info', duration = 4000) => {
    const id = ++toastId;
    set((state) => ({
      toasts: [...state.toasts, { id, message, type, duration }],
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, duration);
    return id;
  },

  success: (message, duration) => {
    return useToastStore.getState().addToast(message, 'success', duration);
  },
  error: (message, duration) => {
    return useToastStore.getState().addToast(message, 'error', duration);
  },
  info: (message, duration) => {
    return useToastStore.getState().addToast(message, 'info', duration);
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));

export default useToastStore;
