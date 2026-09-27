import type { OrderInstaller } from '../../../api/kanban';
import type { Employee } from '../../../api/employees';

/**
 * Распределяет стоимость монтажа между монтажниками: поровну (EQUAL или forceEqual, остаток копеек — последнему),
 * по процентам (PERCENT). Фиксированные суммы (FIXED) не трогает.
 */
export const distributeInstallerAmounts = (
  items: OrderInstaller[] | undefined,
  totalPrice: number,
  forceEqual = false
): OrderInstaller[] => {
  if (!items || items.length === 0) {
    return [];
  }
  const count = items.length;

  if (forceEqual || items[0]?.splitType === 'EQUAL') {
    const rawAmount = Math.floor((totalPrice / count) * 100) / 100;
    const share = Math.round((100 / count) * 100) / 100;
    let accumulated = 0;
    return items.map((item, idx) => {
      const isLast = idx === count - 1;
      const amount = isLast ? Math.round((totalPrice - accumulated) * 100) / 100 : rawAmount;
      accumulated += rawAmount;
      return { ...item, splitType: 'EQUAL', sharePercent: share, amount };
    });
  }

  if (items[0]?.splitType === 'PERCENT') {
    return items.map(item => ({
      ...item,
      amount: Math.round(((totalPrice * (item.sharePercent || 0)) / 100) * 100) / 100
    }));
  }

  return items;
};

/**
 * Поля старшего монтажника в форме заказа (installedBy*), вычисленные по списку монтажников.
 */
export const leadInstallerFields = (installers: OrderInstaller[]) => {
  const lead = installers.find(i => i.isLead) || installers[0];
  return {
    installers,
    installedById: lead?.employeeId ? lead.employeeId.toString() : '',
    installedByName: lead?.employeeName || '',
    installedByAvatarUrl: lead?.employeeAvatarUrl || ''
  };
};

/**
 * Добавляет монтажника (первый становится старшим) и делит стоимость монтажа поровну.
 */
export const addInstaller = (installers: OrderInstaller[], employee: Employee, installationPrice: number): OrderInstaller[] => {
  const newItem: OrderInstaller = {
    employeeId: employee.id,
    employeeName: employee.name,
    employeeAvatarUrl: employee.avatarUrl || undefined,
    employeePhone: employee.phone,
    splitType: installers[0]?.splitType || 'EQUAL',
    isLead: installers.length === 0,
    sharePercent: 0,
    amount: 0
  };
  return distributeInstallerAmounts([...installers, newItem], installationPrice, true);
};

/**
 * Удаляет монтажника; если удален старший — старшим становится первый оставшийся. Стоимость делится поровну заново.
 */
export const removeInstaller = (installers: OrderInstaller[], index: number, installationPrice: number): OrderInstaller[] => {
  const remaining = installers.filter((_, idx) => idx !== index);
  const withLead = remaining.length > 0 && !remaining.some(i => i.isLead)
    ? remaining.map((item, idx) => (idx === 0 ? { ...item, isLead: true } : item))
    : remaining;
  return distributeInstallerAmounts(withLead, installationPrice, true);
};

/**
 * Фиксирует сумму конкретного монтажника и пересчитывает его долю в процентах.
 */
export const setInstallerAmount = (
  installers: OrderInstaller[],
  index: number,
  amount: number,
  installationPrice: number
): OrderInstaller[] => {
  const sharePercent = installationPrice > 0 ? Math.round((amount / installationPrice) * 10000) / 100 : 0;
  return installers.map((item, idx) => (idx === index ? { ...item, splitType: 'FIXED', amount, sharePercent } : item));
};
