import type { OrderStatus } from '../api/kanban';

/**
 * Завершающий этап — только по флагу «Завершающий статус» в настройках этапа (как на бэкенде).
 * Название не учитывается: иначе, например, «Готов к монтажу» считался бы завершающим.
 */
export const isCompletedStatus = (status?: OrderStatus | null): boolean => Boolean(status?.isCompleted);
