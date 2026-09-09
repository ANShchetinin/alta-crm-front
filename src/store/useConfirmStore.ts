import { create } from 'zustand';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

interface ConfirmState extends ConfirmOptions {
  isOpen: boolean;
  resolve?: (value: boolean) => void;
  openConfirm: (options: ConfirmOptions & { resolve: (value: boolean) => void }) => void;
  closeConfirm: (result: boolean) => void;
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  isOpen: false,
  title: '',
  message: '',
  confirmText: 'Подтвердить',
  cancelText: 'Отмена',
  danger: false,
  resolve: undefined,

  openConfirm: (options) => {
    set({
      isOpen: true,
      title: options.title,
      message: options.message || '',
      confirmText: options.confirmText || 'Подтвердить',
      cancelText: options.cancelText || 'Отмена',
      danger: Boolean(options.danger),
      resolve: options.resolve
    });
  },

  closeConfirm: (result: boolean) => {
    const { resolve } = get();
    if (resolve) {
      resolve(result);
    }
    set({
      isOpen: false,
      resolve: undefined
    });
  }
}));
