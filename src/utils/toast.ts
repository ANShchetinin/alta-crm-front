import { useToastStore, type ToastItem } from '../store/useToastStore';

export interface ToastOptions {
  title?: string;
  duration?: number;
}

export const toast = {
  success: (message: string, options?: ToastOptions): string => {
    return useToastStore.getState().addToast({
      type: 'success',
      message,
      title: options?.title,
      duration: options?.duration
    });
  },

  error: (message: string, options?: ToastOptions): string => {
    return useToastStore.getState().addToast({
      type: 'error',
      message,
      title: options?.title,
      duration: options?.duration
    });
  },

  warning: (message: string, options?: ToastOptions): string => {
    return useToastStore.getState().addToast({
      type: 'warning',
      message,
      title: options?.title,
      duration: options?.duration
    });
  },

  info: (message: string, options?: ToastOptions): string => {
    return useToastStore.getState().addToast({
      type: 'info',
      message,
      title: options?.title,
      duration: options?.duration
    });
  },

  custom: (item: Omit<ToastItem, 'id' | 'createdAt'>): string => {
    return useToastStore.getState().addToast(item);
  },

  dismiss: (id: string): void => {
    useToastStore.getState().removeToast(id);
  },

  clear: (): void => {
    useToastStore.getState().clearAll();
  }
};
