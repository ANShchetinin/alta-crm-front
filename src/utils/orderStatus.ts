import type { OrderStatus } from '../api/kanban';

/**
 * Завершающий этап — только по флагу «Завершающий статус» в настройках этапа (как на бэкенде).
 * Название не учитывается: иначе, например, «Готов к монтажу» считался бы завершающим.
 */
export const isCompletedStatus = (status?: OrderStatus | null): boolean => Boolean(status?.isCompleted);

/**
 * Показывать ли «Завершить монтаж» на этапе: только на этапах монтажа (флаг в настройках этапа).
 * Пока компания не отметила ни одного этапа монтажа, кнопка есть на любом незавершенном этапе, как раньше.
 */
export const isInstallationStage = (status: OrderStatus | null | undefined, columns: OrderStatus[]): boolean => {
  if (!status || isCompletedStatus(status)) {
    return false;
  }
  return columns.some(c => c.isInstallation) ? Boolean(status.isInstallation) : true;
};

/** Акт выполненных работ обязателен для завершения только по договору — когда у заявки есть номер договора (как на бэкенде). */
export const isActRequired = (orderNumber?: string | null): boolean => Boolean(orderNumber?.trim());

/** Надпись о завершенной заявке: с монтажником — «Монтаж завершен», без него — «Сделка закрыта». */
export const completionLabel = (hasInstaller: boolean): string => (hasInstaller ? 'Монтаж завершен' : 'Сделка закрыта');
