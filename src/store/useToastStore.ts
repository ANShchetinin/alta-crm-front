import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number; // ms, default 3500, 0 = infinite until dismissed
  createdAt: number;
}

interface ToastState {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id' | 'createdAt'>) => string;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  addToast: (toast) => {
    const id = 'toast_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
    const newItem: ToastItem = {
      ...toast,
      id,
      duration: toast.duration !== undefined ? toast.duration : (toast.type === 'error' ? 4500 : 3200),
      createdAt: Date.now()
    };

    set((state) => {
      // Keep up to 4 newest toasts
      const updated = [newItem, ...state.toasts.filter(t => t.id !== id)].slice(0, 4);
      return { toasts: updated };
    });

    return id;
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id)
    }));
  },

  clearAll: () => {
    set({ toasts: [] });
  }
}));
