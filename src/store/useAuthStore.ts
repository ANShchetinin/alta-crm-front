import { create } from 'zustand';

interface AuthState {
  token: string | null;
  role: string | null;
  email: string | null;
  userId: number | null;
  tenantId: number | null;
  canViewFinances: boolean;
  canAccessMeasurements: boolean;
  setToken: (token: string | null) => void;
  setPermissions: (perms: { canViewFinances?: boolean; canAccessMeasurements?: boolean }) => void;
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
  } catch {
    return null;
  }
};

const getEmailFromToken = (token: string | null): string | null => {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub || null;
  } catch {
    return null;
  }
};

const getUserIdFromToken = (token: string | null): number | null => {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.userId ? Number(payload.userId) : null;
  } catch {
    return null;
  }
};

const getTenantIdFromToken = (token: string | null): number | null => {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.tenantId ? Number(payload.tenantId) : null;
  } catch {
    return null;
  }
};

const initialToken = localStorage.getItem('altacrm_token');

export const useAuthStore = create<AuthState>((set) => {
  const initialRole = getRoleFromToken(initialToken);
  return {
    token: initialToken,
    role: initialRole,
    email: getEmailFromToken(initialToken),
    userId: getUserIdFromToken(initialToken),
    tenantId: getTenantIdFromToken(initialToken),
    canViewFinances: initialRole === 'OWNER' || initialRole === 'SUPERADMIN',
    canAccessMeasurements: initialRole !== 'WORKER',
    
    setToken: (token) => {
      if (token) {
        localStorage.setItem('altacrm_token', token);
      } else {
        localStorage.removeItem('altacrm_token');
      }
      const role = getRoleFromToken(token);
      set({
        token,
        role,
        email: getEmailFromToken(token),
        userId: getUserIdFromToken(token),
        tenantId: getTenantIdFromToken(token),
        canViewFinances: role === 'OWNER' || role === 'SUPERADMIN',
        canAccessMeasurements: role !== 'WORKER'
      });
    },

    setPermissions: (perms) => {
      set((state) => ({
        canViewFinances: perms.canViewFinances !== undefined ? perms.canViewFinances : state.canViewFinances,
        canAccessMeasurements: perms.canAccessMeasurements !== undefined ? perms.canAccessMeasurements : state.canAccessMeasurements
      }));
    },

    logout: () => {
      localStorage.removeItem('altacrm_token');
      set({ 
        token: null, 
        role: null, 
        email: null, 
        userId: null, 
        tenantId: null,
        canViewFinances: false,
        canAccessMeasurements: false
      });
    }
  };
});
