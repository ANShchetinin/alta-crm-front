import { useCallback, useEffect, useState } from 'react';
import { getProfile } from '../../../api/settings';
import { useAuthStore } from '../../../store/useAuthStore';

export interface UserProfileSummary {
  name: string;
  email: string;
  avatarUrl: string | null;
}

const DEFAULT_PROFILE: UserProfileSummary = { name: 'User', email: '', avatarUrl: null };

/**
 * Имя, почта и аватар текущего пользователя для шапки и окна профиля;
 * заодно обновляет его права (финансы, замеры) в сторе авторизации.
 */
export const useUserProfile = (role: string | null) => {
  const [profile, setProfile] = useState<UserProfileSummary>(DEFAULT_PROFILE);

  const refresh = useCallback(async () => {
    try {
      const data = await getProfile();
      const fullName = [data.firstName, data.lastName].filter(Boolean).join(' ');
      setProfile({
        name: fullName || data.email || 'User',
        email: data.email || '',
        // Без фото — первая буква имени, а не фото из прошлой компании или до удаления
        avatarUrl: data.avatarUrl || null
      });
      useAuthStore.getState().setPermissions({
        canViewFinances: data.canViewFinances,
        canAccessMeasurements: data.canAccessMeasurements
      });
    } catch (err) {
      console.error('Failed to fetch user profile', err);
    }
  }, []);

  useEffect(() => {
    if (role !== 'SUPERADMIN') {
      refresh();
    }
  }, [role, refresh]);

  return { profile, refresh };
};
