import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { OrderStatus } from '../../../api/kanban';
import {
  useCreateOrderStatusMutation,
  useDeleteOrderStatusMutation,
  useUpdateOrderStatusMutation
} from '../../../hooks/queries/useOrderStatusesQuery';
import { toast } from '../../../utils/toast';
import { confirm } from '../../../utils/confirm';
import { getErrorMessage } from '../../../utils/errorMessage';

const DEFAULT_COLOR = '#3b82f6';

/** Создание, редактирование и удаление этапов (колонок) доски; форма модального окна этапа. */
export const useColumnEditor = (columnsCount: number, onChanged: () => void) => {
  const { t } = useTranslation();
  const createMutation = useCreateOrderStatusMutation();
  const updateMutation = useUpdateOrderStatusMutation();
  const deleteMutation = useDeleteOrderStatusMutation();

  const [isOpen, setIsOpen] = useState(false);
  const [editingColumnId, setEditingColumnId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [includeInFinances, setIncludeInFinances] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);

  const fillForm = (column: OrderStatus | null) => {
    setEditingColumnId(column?.id ?? null);
    setName(column?.name ?? '');
    setColor(column?.color || DEFAULT_COLOR);
    setIncludeInFinances(column ? column.includeInFinances !== false : true);
    setIsCompleted(Boolean(column?.isCompleted));
  };

  const openAdd = () => {
    fillForm(null);
    setIsOpen(true);
  };

  const openEdit = (column: OrderStatus) => {
    fillForm(column);
    setIsOpen(true);
  };

  const close = () => setIsOpen(false);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (editingColumnId) {
        await updateMutation.mutateAsync({ id: editingColumnId, data: { name, color, includeInFinances, isCompleted } });
        toast.success('Этап обновлен');
      } else {
        await createMutation.mutateAsync({ name, color, sortOrder: columnsCount + 1, includeInFinances, isCompleted });
        toast.success('Этап добавлен');
      }
      setIsOpen(false);
      fillForm(null);
      onChanged();
    } catch (err) {
      console.error('Failed to save column', err);
      toast.error(getErrorMessage(err, 'Ошибка сохранения этапа'));
    }
  };

  const remove = async (columnId: number) => {
    const ok = await confirm({
      title: 'Удаление этапа',
      message: t('kanban.deleteColumnConfirm') || 'Вы уверены, что хотите удалить этот этап?',
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      danger: true
    });
    if (!ok) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(columnId);
      toast.success('Этап удален');
      onChanged();
    } catch {
      toast.error(t('kanban.deleteColumnError') || 'Нельзя удалить этап, в котором есть заявки.');
    }
  };

  return {
    modalProps: {
      isOpen,
      editingColumnId,
      columnName: name,
      setColumnName: setName,
      columnColor: color,
      setColumnColor: setColor,
      includeInFinances,
      setIncludeInFinances,
      isCompleted,
      setIsCompleted,
      onClose: close,
      onSubmit: save
    },
    openAdd,
    openEdit,
    remove
  };
};
