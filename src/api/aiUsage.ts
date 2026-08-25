import { api } from './axiosConfig';

export type AiServiceType = 'SPEECHKIT' | 'GPT_SUMMARY' | 'GPT_SALES_ADVICE' | 'GPT_CUSTOM' | 'GPT_CHAT';

export interface AiUsageLogDto {
  id: number;
  orderId?: number;
  orderNumber?: string;
  orderAddress?: string;
  employeeId?: number;
  employeeName?: string;
  serviceType: AiServiceType;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  audioDurationSeconds: number;
  costRubles: number;
  details?: string;
  createdAt: string;
}

export interface AiUsageSummaryDto {
  totalCostRubles: number;
  speechkitCostRubles: number;
  gptCostRubles: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  totalAudioDurationSeconds: number;
  totalRequestsCount: number;
  recentLogs: AiUsageLogDto[];
}

export interface OrderAiCostDto {
  orderId: number;
  totalCostRubles: number;
  speechkitCostRubles: number;
  gptCostRubles: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  audioDurationSeconds: number;
  logs: AiUsageLogDto[];
}

export const getCompanyAiUsageSummary = async (from?: string, to?: string): Promise<AiUsageSummaryDto> => {
  const params: Record<string, string> = {};
  if (from) params.from = from;
  if (to) params.to = to;
  const res = await api.get<AiUsageSummaryDto>('/ai-usage/summary', { params });
  return res.data;
};

export const getOrderAiUsage = async (orderId: number): Promise<OrderAiCostDto> => {
  const res = await api.get<OrderAiCostDto>(`/orders/${orderId}/ai-usage`);
  return res.data;
};