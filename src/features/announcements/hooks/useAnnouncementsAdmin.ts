import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { announcementsAdminApi, type SystemAnnouncement, type SystemAnnouncementRequest } from '../../../api/announcements';
import { ACTIVE_ANNOUNCEMENTS_QUERY_KEY } from './useAnnouncements';

// Данные платформы (SUPERADMIN), не зависят от текущей компании
export const ADMIN_ANNOUNCEMENTS_QUERY_KEY = ['announcements', 'admin'] as const;
const EMPTY: SystemAnnouncement[] = [];

/** Объявления платформы для управления суперадмином: список, сохранение и удаление. */
export const useAnnouncementsAdmin = () => {
  const queryClient = useQueryClient();
  const { data: announcements = EMPTY, isLoading, isError } = useQuery({
    queryKey: ADMIN_ANNOUNCEMENTS_QUERY_KEY,
    queryFn: announcementsAdminApi.getAll
  });

  // Баннер суперадмина тоже обновляется сразу — видно, как объявление выглядит у пользователей
  const refresh = useCallback(() => Promise.all([
    queryClient.invalidateQueries({ queryKey: ADMIN_ANNOUNCEMENTS_QUERY_KEY }),
    queryClient.invalidateQueries({ queryKey: ACTIVE_ANNOUNCEMENTS_QUERY_KEY })
  ]), [queryClient]);

  const save = useCallback(async (request: SystemAnnouncementRequest, id?: number) => {
    if (id) {
      await announcementsAdminApi.update(id, request);
    } else {
      await announcementsAdminApi.create(request);
    }
    await refresh();
  }, [refresh]);

  const remove = useCallback(async (id: number) => {
    await announcementsAdminApi.remove(id);
    await refresh();
  }, [refresh]);

  return { announcements, isLoading, isError, save, remove };
};
