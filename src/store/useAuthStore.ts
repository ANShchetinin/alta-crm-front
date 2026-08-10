import { create } from 'zustand';

interface AuthState {
  token: string | null;
  setToken: (token: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('altacrm_token'),
  
  setToken: (token) => {
    if (token) {
      localStorage.setItem('altacrm_token', token);
    } else {
      localStorage.removeItem('altacrm_token');
    }
    set({ token });
  },

  logout: () => {
    localStorage.removeItem('altacrm_token');
    set({ token: null });
  }
}));
