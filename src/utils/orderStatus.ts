import type { OrderStatus } from '../api/kanban';

const COMPLETED_NAME_MARKERS = ['заверш', 'готов', 'выполнен', 'complete'];

/**
 * Признак завершающего статуса: флаг isCompleted из настроек статусов, а для статусов без флага —
 * эвристика по названию («Завершен», «Готово», «Выполнен»).
 */
export const isCompletedStatus = (status?: OrderStatus | null): boolean => {
  if (!status) {
    return false;
  }
  if (status.isCompleted !== undefined) {
    return Boolean(status.isCompleted);
  }
  if (!status.name) {
    return false;
  }
  const name = status.name.trim().toLowerCase();
  return COMPLETED_NAME_MARKERS.some(marker => name.includes(marker));
};
