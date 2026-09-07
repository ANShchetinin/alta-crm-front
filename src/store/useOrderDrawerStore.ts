import { create } from 'zustand';

export type OrderModalTab = 'MAIN' | 'MEASUREMENT' | 'CONTRACT' | 'MATERIALS' | 'FILES' | 'AI';

export interface OrderDrawerState {
  isOpen: boolean;
  orderId: number | null; // null = creating new order, number = editing order
  activeTab: OrderModalTab;
  openOrder: (orderId: number, tab?: OrderModalTab) => void;
  openCreateOrder: () => void;
  closeOrder: () => void;
  setActiveTab: (tab: OrderModalTab) => void;
}

export const useOrderDrawerStore = create<OrderDrawerState>((set) => ({
  isOpen: false,
  orderId: null,
  activeTab: 'MAIN',
  openOrder: (orderId: number, tab: OrderModalTab = 'MAIN') => {
    set({ isOpen: true, orderId, activeTab: tab });
  },
  openCreateOrder: () => {
    set({ isOpen: true, orderId: null, activeTab: 'MAIN' });
  },
  closeOrder: () => {
    set({ isOpen: false, orderId: null, activeTab: 'MAIN' });
  },
  setActiveTab: (tab: OrderModalTab) => {
    set({ activeTab: tab });
  }
}));
