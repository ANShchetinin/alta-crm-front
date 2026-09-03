import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './useAuthStore';

// Helper to create a dummy JWT with payload
const createMockJwt = (payload: Record<string, any>) => {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.signature`;
};

describe('useAuthStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().logout();
  });

  it('correctly parses token payload upon setToken', () => {
    const mockToken = createMockJwt({
      sub: 'admin@ecoline.ru',
      role: 'ROLE_OWNER',
      userId: 5,
      tenantId: 10
    });

    useAuthStore.getState().setToken(mockToken);

    const state = useAuthStore.getState();
    expect(state.token).toBe(mockToken);
    expect(state.email).toBe('admin@ecoline.ru');
    expect(state.role).toBe('OWNER');
    expect(state.userId).toBe(5);
    expect(state.tenantId).toBe(10);
    expect(localStorage.getItem('altacrm_token')).toBe(mockToken);
  });

  it('resets state and clears localStorage upon logout', () => {
    const mockToken = createMockJwt({
      sub: 'worker@ecoline.ru',
      role: 'ROLE_WORKER',
      userId: 2,
      tenantId: 1
    });

    useAuthStore.getState().setToken(mockToken);
    expect(useAuthStore.getState().token).toBe(mockToken);

    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.role).toBeNull();
    expect(state.email).toBeNull();
    expect(state.userId).toBeNull();
    expect(state.tenantId).toBeNull();
    expect(localStorage.getItem('altacrm_token')).toBeNull();
  });

  it('handles invalid token gracefully', () => {
    useAuthStore.getState().setToken('invalid.token');
    const state = useAuthStore.getState();
    expect(state.role).toBeNull();
    expect(state.email).toBeNull();
  });
});
