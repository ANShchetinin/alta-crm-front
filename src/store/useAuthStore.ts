import { create } from 'zustand';

interface AuthState {
  token: string | null;
  role: string | null;
  email: string | null;
  setToken: (token: string | null) => void;
  logout: () => void;
}

const getRoleFromToken = (token: string | null): string | null => {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    let role = payload.role || null;
    if (role && role.startsWith('ROLE_')) {
      role = role.substring(5);
    }
    return role;
  } catch (e) {
    return null;
  }
};

const getEmailFromToken = (token: string | null): string | null => {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub || null;
  } catch (e) {
    return null;
  }
};

const initialToken = localStorage.getItem('altacrm_token');

export const useAuthStore = create<AuthState>((set) => ({
  token: initialToken,
  role: getRoleFromToken(initialToken),
  email: getEmailFromToken(initialToken),
  
  setToken: (token) => {
    if (token) {
      localStorage.setItem('altacrm_token', token);
    } else {
      localStorage.removeItem('altacrm_token');
    }
    set({ token, role: getRoleFromToken(token), email: getEmailFromToken(token) });
  },

  logout: () => {
    localStorage.removeItem('altacrm_token');
    set({ token: null, role: null, email: null });
  }
}));
