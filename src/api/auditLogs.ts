import { api } from './axiosConfig';

export type AuditActionType =
  | 'ORDER_CREATED'
  | 'ORDER_STATUS_CHANGED'
  | 'ORDER_UPDATED'
  | 'ORDER_DELETED'
  | 'ORDER_RESTORED'
  | 'ORDER_AMOUNT_CHANGED'
  | 'ORDER_PAYMENT_ADDED'
  | 'CLIENT_CREATED'
  | 'CLIENT_UPDATED'
  | 'CLIENT_DELETED'
  | 'EMPLOYEE_CREATED'
  | 'EMPLOYEE_UPDATED'
  | 'EMPLOYEE_ROLE_CHANGED'
  | 'EMPLOYEE_STATUS_CHANGED'
  | 'EMPLOYEE_DELETED'
  | 'AUTH_LOGIN_SUCCESS'
  | 'AUTH_LOGIN_FAILED'
  | 'TENANT_SETTINGS_CHANGED'
  | 'CONTRACT_TEMPLATE_UPLOADED'
  | 'CONTRACT_TEMPLATE_DELETED'
  | 'CONTRACT_CONFIG_CHANGED'
  | 'EXPENSE_CREATED'
  | 'EXPENSE_DELETED'
  | 'MATERIAL_CREATED'
  | 'MATERIAL_UPDATED';

export type AuditEntityType =
  | 'ORDER'
  | 'CLIENT'
  | 'EMPLOYEE'
  | 'TENANT'
  | 'CONTRACT_TEMPLATE'
  | 'EXPENSE'
  | 'MATERIAL'
  | 'AUTH';

export interface AuditLogItem {
  id: number;
  tenantId: number;
  createdAt: string;
  actorId?: number;
  actorEmail?: string;
  actorName?: string;
  actorRole?: string;
  actionType: AuditActionType;
  entityType: AuditEntityType;
  entityId?: number;
  entityTitle?: string;
  description: string;
  detailsJson?: string;
  ipAddress?: string;
}

export interface AuditLogFilters {
  actionType?: AuditActionType;
  entityType?: AuditEntityType;
  actorId?: number;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  size?: number;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export const getAuditLogs = async (filters: AuditLogFilters = {}): Promise<PageResponse<AuditLogItem>> => {
  const params: Record<string, any> = {};
  if (filters.actionType) params.actionType = filters.actionType;
  if (filters.entityType) params.entityType = filters.entityType;
  if (filters.actorId) params.actorId = filters.actorId;
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (filters.search) params.search = filters.search;
  params.page = filters.page ?? 0;
  params.size = filters.size ?? 20;

  const response = await api.get<PageResponse<AuditLogItem>>('/audit-logs', { params });
  return response.data;
};

export const getRecentAuditLogs = async (): Promise<AuditLogItem[]> => {
  const response = await api.get<AuditLogItem[]>('/audit-logs/recent');
  return response.data;
};
