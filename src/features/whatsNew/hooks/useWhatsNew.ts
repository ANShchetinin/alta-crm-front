import { useMemo } from 'react';
import { create } from 'zustand';
import { useAuthStore } from '../../../store/useAuthStore';
import { RELEASES } from '../releases';
import { getReleasesForRole, isReleaseUnseen } from '../utils/whatsNew';

const STORAGE_KEY = 'altacrm_whats_new_seen';

const readSeenVersion = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

interface WhatsNewState {
  lastSeenVersion: string | null;
  /** Версия, просмотренная до открытия окна: по ней в окне отмечаются новые выпуски. */
  previousSeenVersion: string | null;
  isOpen: boolean;
  open: (latestVersion: string | null) => void;
  close: () => void;
}

/** Окно «Что нового» и последняя просмотренная версия (в браузере; общее для бокового меню и нижней панели). */
export const useWhatsNewStore = create<WhatsNewState>(set => ({
  lastSeenVersion: readSeenVersion(),
  previousSeenVersion: null,
  isOpen: false,
  open: latestVersion => set(state => {
    if (latestVersion) {
      try {
        localStorage.setItem(STORAGE_KEY, latestVersion);
      } catch {
        // Хранилище недоступно (приватный режим) — отметка сбросится после перезагрузки
      }
    }
    return {
      isOpen: true,
      previousSeenVersion: state.lastSeenVersion,
      lastSeenVersion: latestVersion ?? state.lastSeenVersion
    };
  }),
  close: () => set({ isOpen: false })
}));

/** Выпуски для роли текущего пользователя, отметка «есть новое» и управление окном. */
export const useWhatsNew = () => {
  const role = useAuthStore(state => state.role);
  const { lastSeenVersion, previousSeenVersion, isOpen, open, close } = useWhatsNewStore();
  const releases = useMemo(() => getReleasesForRole(RELEASES, role), [role]);
  const latestVersion = releases[0]?.version ?? null;

  return {
    releases,
    hasUnseen: latestVersion !== null && isReleaseUnseen(latestVersion, lastSeenVersion),
    isOpen,
    /**
     * Новые выпуски в открытом окне — относительно того, что было просмотрено до открытия;
     * при первом открытии новым считается только последний выпуск.
     */
    isNew: (version: string) => (previousSeenVersion ? isReleaseUnseen(version, previousSeenVersion) : version === latestVersion),
    open: () => open(latestVersion),
    close
  };
};
