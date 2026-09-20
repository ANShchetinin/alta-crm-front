import { create } from 'zustand';

export type OrderModalTab = 'MAIN' | 'MEASUREMENT' | 'CONTRACT' | 'MATERIALS' | 'FILES' | 'AI' | 'COMMENTS';

export interface OrderDrawerState {
  isOpen: boolean;
  orderId: number | null; // null = creating new order, number = editing order
  activeTab: OrderModalTab;
  expandComments?: boolean;
  openOrder: (orderId: number, tab?: OrderModalTab) => void;
  openCreateOrder: () => void;
  closeOrder: () => void;
  setActiveTab: (tab: OrderModalTab) => void;
  setExpandComments: (expand: boolean) => void;
}

export const useOrderDrawerStore = create<OrderDrawerState>((set) => ({
  isOpen: false,
  orderId: null,
  activeTab: 'MAIN',
  expandComments: false,
  openOrder: (orderId: number, tab: OrderModalTab = 'MAIN') => {
    if (tab === 'COMMENTS') {
      set({ isOpen: true, orderId, activeTab: 'MAIN', expandComments: true });
    } else {
      set({ isOpen: true, orderId, activeTab: tab, expandComments: false });
    }
  },
  openCreateOrder: () => {
    set({ isOpen: true, orderId: null, activeTab: 'MAIN', expandComments: false });
  },
  closeOrder: () => {
    set({ isOpen: false, orderId: null, activeTab: 'MAIN', expandComments: false });
  },
  setActiveTab: (tab: OrderModalTab) => {
    set({ activeTab: tab });
  },
  setExpandComments: (expand: boolean) => {
    set({ expandComments: expand });
  }
}));
