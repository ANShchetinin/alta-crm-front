import { useState } from 'react';
import { updateFinanceStatuses, type OrderStatus } from '../../../api/kanban';
import { toast } from '../../../utils/toast';

/** Настройка статусов, заказы из которых учитываются в финансах: черновик выбора и сохранение. */
export const useFinanceStatusSettings = (statuses: OrderStatus[], onSaved: (updated: OrderStatus[]) => void) => {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<Record<number, boolean>>({});
  const [saving, setSaving] = useState(false);

  const open = () => {
    const initial: Record<number, boolean> = {};
    statuses.forEach(s => {
      initial[s.id] = s.includeInFinances !== false;
    });
    setSettings(initial);
    setIsOpen(true);
  };

  const close = () => setIsOpen(false);

  const setIncluded = (statusId: number, included: boolean) => {
    setSettings(prev => ({ ...prev, [statusId]: included }));
  };

  const setAll = (included: boolean) => {
    const next: Record<number, boolean> = {};
    statuses.forEach(s => {
      next[s.id] = included;
    });
    setSettings(next);
  };

  const save = async () => {
    setSaving(true);
    try {
      const updated = await updateFinanceStatuses(settings);
      onSaved(updated);
      setIsOpen(false);
      toast.success('Настройки статусов сохранены');
    } catch (err) {
      console.error('Failed to update finance statuses', err);
      toast.error('Не удалось сохранить настройки статусов');
    } finally {
      setSaving(false);
    }
  };

  return { isOpen, open, close, settings, setIncluded, setAll, saving, save };
};
