import { create } from 'zustand';
import i18n from '../i18n';
import { getLowStockMaterials } from '../api/storage';
import type { Material } from '../api/storage';

type Theme = 'dark' | 'light';
type Language = 'en' | 'ru';

interface AppState {
  theme: Theme;
  language: Language;
  newOrdersCount: number;
  lowStockMaterials: Material[];
  setTheme: (theme: Theme) => void;
  setLanguage: (lang: Language) => void;
  setNewOrdersCount: (count: number) => void;
  fetchLowStockMaterials: () => Promise<void>;
  tenantSettings: import('../api/settings').TenantDto | null;
  fetchTenantSettings: () => Promise<void>;
  updateTenantSettingsLocally: (settings: Partial<import('../api/settings').TenantDto>) => void;
}

const getInitialTheme = (): Theme => {
  const saved = localStorage.getItem('altacrm_theme');
  return (saved === 'light' || saved === 'dark') ? saved : 'dark';
};

const getInitialLanguage = (): Language => {
  const saved = localStorage.getItem('altacrm_lang');
  return (saved === 'en' || saved === 'ru') ? saved : 'ru';
};

export const useAppStore = create<AppState>((set) => ({
  theme: getInitialTheme(),
  language: getInitialLanguage(),
  newOrdersCount: 0,
  lowStockMaterials: [],
  
  setTheme: (theme) => {
    localStorage.setItem('altacrm_theme', theme);
    set({ theme });
  },
  
  setLanguage: (lang) => {
    localStorage.setItem('altacrm_lang', lang);
    i18n.changeLanguage(lang);
    set({ language: lang });
  },
  
  setNewOrdersCount: (count) => {
    set({ newOrdersCount: count });
  },
  
  fetchLowStockMaterials: async () => {
    try {
      const lowStock = await getLowStockMaterials();
      set({ lowStockMaterials: lowStock.filter(m => m.minQuantity && m.minQuantity > 0) });
    } catch (err) {
      console.error("Failed to fetch low stock materials", err);
    }
  },
  
  tenantSettings: null,
  
  fetchTenantSettings: async () => {
    try {
      const { getCurrentTenant } = await import('../api/settings');
      const tenant = await getCurrentTenant();
      set({ tenantSettings: tenant });
    } catch (err) {
      console.error("Failed to fetch tenant settings", err);
    }
  },
  
  updateTenantSettingsLocally: (updates) => {
    set((state) => ({
      tenantSettings: state.tenantSettings ? { ...state.tenantSettings, ...updates } : null
    }));
  }
}));
