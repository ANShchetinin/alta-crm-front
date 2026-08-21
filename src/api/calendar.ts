import { api } from './axiosConfig';

export interface CalendarEventDto {
  id: string; // "measurement_100", "installation_100", "reminder_45"
  type: 'MEASUREMENT' | 'INSTALLATION' | 'REMINDER';
  orderId?: number;
  orderNumber?: string;
  clientId?: number;
  clientName: string;
  clientPhone?: string;
  address?: string;
  entrance?: string;
  floor?: string;
  title: string;
  description?: string;
  start: string; // ISO-8601 UTC
  end?: string;
  allDay: boolean;
  status: string;
  statusId?: number;
  statusColor?: string;
  assigneeId?: number;
  assigneeName?: string;
  assigneeAvatarUrl?: string;
  isOverdue?: boolean;
}

export interface GetCalendarEventsParams {
  start?: string;
  end?: string;
  types?: string[];
  employeeId?: number;
}

export const getCalendarEvents = async (params: GetCalendarEventsParams = {}): Promise<CalendarEventDto[]> => {
  const searchParams = new URLSearchParams();
  if (params.start) searchParams.set('start', params.start);
  if (params.end) searchParams.set('end', params.end);
  if (params.types && params.types.length > 0) {
    params.types.forEach(t => searchParams.append('types', t));
  }
  if (params.employeeId) searchParams.set('employeeId', params.employeeId.toString());

  const res = await api.get(`/calendar/events?${searchParams.toString()}`);
  return res.data;
};
