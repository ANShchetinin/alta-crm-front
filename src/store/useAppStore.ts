import { create } from 'zustand';
import i18n from '../i18n';

type Theme = 'dark' | 'light';
type Language = 'en' | 'ru';

interface AppState {
  theme: Theme;
  language: Language;
  setTheme: (theme: Theme) => void;
  setLanguage: (lang: Language) => void;
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
  
  setTheme: (theme) => {
    localStorage.setItem('altacrm_theme', theme);
    set({ theme });
  },
  
  setLanguage: (lang) => {
    localStorage.setItem('altacrm_lang', lang);
    i18n.changeLanguage(lang);
    set({ language: lang });
  }
}));
