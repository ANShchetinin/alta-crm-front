import { api } from './axiosConfig';

export interface ExitIntentCalcData {
  area?: number;
  perimeter?: number;
  canvasType?: string;
  profileType?: string;
  lights?: number;
  chandeliers?: number;
  lightLines?: number;
  trackSystems?: number;
  curtains?: number;
  totalPrice?: number;
  isMinOrderApplied?: boolean;
}

export interface ExitIntentSessionItem {
  id: number;
  sessionId: string;
  ipAddress?: string;
  city?: string;
  region?: string;
  os?: string;
  deviceType?: string;
  browser?: string;
  shownCount: number;
  openedCalculator: boolean;
  openedCalculatorCount: number;
  pdfDownloadsCount: number;
  imageDownloadsCount: number;
  lastAction?: string;
  pageUrl?: string;
  referrer?: string;
  calcData?: string;
  totalPrice?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DailyExitIntentStat {
  date: string;
  visits: number;
  shows: number;
  calcOpens: number;
  pdfDownloads: number;
  imageDownloads: number;
}

export interface ExitIntentSummary {
  totalSessions: number;
  totalShows: number;
  totalCalculatorOpens: number;
  totalPdfDownloads: number;
  totalImageDownloads: number;
  conversionToShowRate: number;
  conversionToCalcRate: number;
  conversionToPdfRate: number;
  conversionToImageRate: number;
  conversionTotalDownloadsRate: number;
  byOs: Record<string, number>;
  byDevice: Record<string, number>;
  byCity: Record<string, number>;
  dailyStats: DailyExitIntentStat[];
}

export interface PaginatedExitIntentSessions {
  content: ExitIntentSessionItem[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface GetExitIntentParams {
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  size?: number;
}

export const getExitIntentSummary = async (params?: { from?: string; to?: string }): Promise<ExitIntentSummary> => {
  const response = await api.get('/analytics/exit-intent/summary', { params });
  return response.data;
};

export const getExitIntentSessions = async (params?: GetExitIntentParams): Promise<PaginatedExitIntentSessions> => {
  const response = await api.get('/analytics/exit-intent/sessions', { params });
  return response.data;
};

export const deleteExitIntentSession = async (id: number): Promise<{ success: boolean; message?: string }> => {
  const response = await api.delete(`/analytics/exit-intent/sessions/${id}`);
  return response.data;
};
