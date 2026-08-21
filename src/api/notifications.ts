import { api } from './axiosConfig';

export interface AppNotificationItem {
  id: number;
  title: string;
  body: string;
  type?: string;
  url?: string;
  orderId?: number;
  isRead: boolean;
  read?: boolean;
  createdAt: string;
}

export const getRecentNotifications = async (): Promise<AppNotificationItem[]> => {
  const response = await api.get('/notifications');
  return (response.data || []).map((item: any) => ({
    ...item,
    isRead: Boolean(item.isRead ?? item.read)
  }));
};

export const markNotificationAsRead = async (id: number): Promise<{ message: string }> => {
  const response = await api.post(`/notifications/${id}/read`);
  return response.data;
};

export const markAllNotificationsAsRead = async (): Promise<{ message: string }> => {
  const response = await api.post('/notifications/read-all');
  return response.data;
};

// --- Push API ---

export interface PushStatus {
  isSubscribed: boolean;
  publicKey: string;
}

export interface PushSubscriptionPayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
}

export const getPushStatus = async (): Promise<PushStatus> => {
  const response = await api.get('/notifications/push/status');
  return response.data;
};

export const getVapidPublicKey = async (): Promise<{ publicKey: string }> => {
  const response = await api.get('/notifications/push/public-key');
  return response.data;
};

export const subscribeToPush = async (payload: PushSubscriptionPayload): Promise<{ message: string }> => {
  const response = await api.post('/notifications/push/subscribe', payload);
  return response.data;
};

export const unsubscribeFromPush = async (endpoint: string): Promise<{ message: string }> => {
  const response = await api.post('/notifications/push/unsubscribe', { endpoint });
  return response.data;
};

export const sendTestPush = async (): Promise<{ message: string }> => {
  const response = await api.post('/notifications/push/test');
  return response.data;
};
