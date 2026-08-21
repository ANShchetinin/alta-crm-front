import { api } from './axiosConfig';

export type ReminderStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'SNOOZED';

export interface OrderReminderDto {
  id: number;
  orderId: number;
  orderNumber?: string;
  clientId?: number;
  clientName?: string;
  clientPhone?: string;
  address?: string;
  userId?: number;
  userName?: string;
  createdByUserId?: number;
  createdByName?: string;
  remindAt: string; // ISO-8601 UTC
  status: ReminderStatus;
  comment?: string;
  notifyBeforeMinutes?: number;
  notificationSent: boolean;
  isOverdue: boolean;
  completedAt?: string;
  completedByUserId?: number;
  completedByName?: string;
  createdAt: string;
}

export interface CreateReminderRequest {
  remindAt: string; // ISO-8601 UTC
  comment?: string;
  userId?: number;
  notifyBeforeMinutes?: number;
}

export interface SnoozeReminderRequest {
  minutes?: number;
  hours?: number;
  days?: number;
  newRemindAt?: string;
}

export interface ReminderCountsDto {
  totalPending: number;
  today: number;
  overdue: number;
}

export const getOrderReminders = async (orderId: number): Promise<OrderReminderDto[]> => {
  const res = await api.get(`/orders/${orderId}/reminders`);
  return res.data;
};

export const createReminder = async (orderId: number, data: CreateReminderRequest): Promise<OrderReminderDto> => {
  const res = await api.post(`/orders/${orderId}/reminders`, data);
  return res.data;
};

export const completeReminder = async (reminderId: number): Promise<OrderReminderDto> => {
  const res = await api.patch(`/reminders/${reminderId}/complete`);
  return res.data;
};

export const snoozeReminder = async (reminderId: number, data: SnoozeReminderRequest): Promise<OrderReminderDto> => {
  const res = await api.patch(`/reminders/${reminderId}/snooze`, data);
  return res.data;
};

export const deleteReminder = async (reminderId: number): Promise<void> => {
  await api.delete(`/reminders/${reminderId}`);
};

export const getMyReminders = async (filter: 'all' | 'today' | 'overdue' = 'all'): Promise<OrderReminderDto[]> => {
  const res = await api.get(`/reminders/my?filter=${filter}`);
  return res.data;
};

export const getReminderCounts = async (): Promise<ReminderCountsDto> => {
  const res = await api.get('/reminders/counts');
  return res.data;
};
