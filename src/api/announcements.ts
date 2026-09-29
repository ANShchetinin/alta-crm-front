import { api } from './axiosConfig';

export type AnnouncementSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

/** Объявление платформы для всех пользователей (время — ISO UTC). */
export interface SystemAnnouncement {
  id: number;
  title: string;
  message: string;
  severity: AnnouncementSeverity;
  showFrom: string;
  showUntil: string | null;
  /** Может ли пользователь скрыть объявление (критичные — нет). */
  dismissible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SystemAnnouncementRequest {
  title: string;
  message: string;
  severity: AnnouncementSeverity;
  showFrom: string | null;
  showUntil: string | null;
}

/** Действующие объявления для страницы входа (без авторизации). */
export const getPublicAnnouncements = async (): Promise<SystemAnnouncement[]> => {
  const response = await api.get<SystemAnnouncement[]>('/announcements/public');
  return response.data;
};

/** Действующие объявления для текущего пользователя, кроме скрытых им. */
export const getActiveAnnouncements = async (): Promise<SystemAnnouncement[]> => {
  const response = await api.get<SystemAnnouncement[]>('/announcements/active');
  return response.data;
};

/** Скрывает объявление у текущего пользователя на всех его устройствах. */
export const dismissAnnouncement = async (id: number): Promise<void> => {
  await api.post(`/announcements/${id}/dismiss`);
};

/** Управление объявлениями (только SUPERADMIN). */
export const announcementsAdminApi = {
  getAll: async (): Promise<SystemAnnouncement[]> => {
    const response = await api.get<SystemAnnouncement[]>('/announcements/admin');
    return response.data;
  },
  create: async (data: SystemAnnouncementRequest): Promise<SystemAnnouncement> => {
    const response = await api.post<SystemAnnouncement>('/announcements/admin', data);
    return response.data;
  },
  update: async (id: number, data: SystemAnnouncementRequest): Promise<SystemAnnouncement> => {
    const response = await api.put<SystemAnnouncement>(`/announcements/admin/${id}`, data);
    return response.data;
  },
  remove: async (id: number): Promise<void> => {
    await api.delete(`/announcements/admin/${id}`);
  }
};
