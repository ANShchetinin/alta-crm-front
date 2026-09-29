import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  dismissAnnouncement, getActiveAnnouncements, getPublicAnnouncements, type SystemAnnouncement
} from '../../../api/announcements';
import { toast } from '../../../utils/toast';

export const ACTIVE_ANNOUNCEMENTS_QUERY_KEY = ['announcements', 'active'] as const;
export const PUBLIC_ANNOUNCEMENTS_QUERY_KEY = ['announcements', 'public'] as const;

// Объявления меняются редко: раз в 5 минут и при возврате на вкладку достаточно
const POLL_MS = 5 * 60 * 1000;
const EMPTY: SystemAnnouncement[] = [];

/** Действующие объявления для вошедшего пользователя и скрытие некритичных («Понятно»). */
export const useActiveAnnouncements = (enabled: boolean) => {
  const queryClient = useQueryClient();
  const { data: announcements = EMPTY } = useQuery({
    queryKey: ACTIVE_ANNOUNCEMENTS_QUERY_KEY,
    queryFn: getActiveAnnouncements,
    enabled,
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true
  });

  const dismiss = useCallback(async (id: number) => {
    const previous = queryClient.getQueryData<SystemAnnouncement[]>(ACTIVE_ANNOUNCEMENTS_QUERY_KEY);
    // Скрываем сразу; если сервер не принял — возвращаем объявление
    queryClient.setQueryData<SystemAnnouncement[]>(ACTIVE_ANNOUNCEMENTS_QUERY_KEY, prev => (prev ?? EMPTY).filter(a => a.id !== id));
    try {
      await dismissAnnouncement(id);
    } catch {
      queryClient.setQueryData(ACTIVE_ANNOUNCEMENTS_QUERY_KEY, previous);
      toast.error('Не удалось скрыть объявление, попробуйте еще раз');
    }
  }, [queryClient]);

  return { announcements, dismiss };
};

/** Действующие объявления для страницы входа; если сервер недоступен — просто ничего не показываем. */
export const usePublicAnnouncements = () => {
  const { data: announcements = EMPTY } = useQuery({
    queryKey: PUBLIC_ANNOUNCEMENTS_QUERY_KEY,
    queryFn: getPublicAnnouncements,
    refetchInterval: POLL_MS,
    retry: false
  });
  return announcements;
};
