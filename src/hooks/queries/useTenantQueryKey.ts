import { useAuthStore } from '../../store/useAuthStore';

/**
 * Добавляет текущую компанию в ключ запроса: после переключения компании смонтированные страницы
 * получают новый ключ и перезапрашивают данные, а не показывают кеш прежней компании.
 * Инвалидация по базовому ключу (префиксу) затрагивает все компании.
 */
export const useTenantQueryKey = <T extends readonly unknown[]>(baseKey: T) => {
  const tenantId = useAuthStore(state => state.tenantId);
  return [...baseKey, tenantId] as const;
};
