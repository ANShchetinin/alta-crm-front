import React from 'react';
import { Archive, Check, CheckCircle2, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { completionLabel } from '../../../../utils/orderStatus';

interface OrderDrawerFooterProps {
  orderId: number | null;
  isDirty: boolean;
  isWorker: boolean;
  isCompleted: boolean;
  /** Кнопка «Завершить монтаж» — только на этапе монтажа. */
  showComplete: boolean;
  /** Кнопка «В архив» — сохраненный заказ в завершающем этапе. */
  showArchive: boolean;
  hasInstaller: boolean;
  /** По договору не прикреплен акт. */
  actMissing: boolean;
  onCancel: () => void;
  onDelete: () => void;
  onArchive: () => void;
  onComplete: (e: React.MouseEvent, orderId: number) => void;
}

const completeHint = (hasInstaller: boolean, actMissing: boolean): string => {
  if (!hasInstaller) {
    return 'Для завершения монтажа необходимо выбрать монтажника';
  }
  if (actMissing) {
    return 'По договору для завершения необходимо прикрепить Акт во вкладке «Файлы»';
  }
  return 'Завершить монтаж и перевести заказ в статус «Завершен»';
};

/**
 * Подвал шторки: сохранение/отмена изменений, удаление и перевод в архив завершенного заказа,
 * завершение монтажа (нужен монтажник, по договору — и Акт).
 */
export const OrderDrawerFooter: React.FC<OrderDrawerFooterProps> = ({
  orderId,
  isDirty,
  isWorker,
  isCompleted,
  showComplete,
  showArchive,
  hasInstaller,
  actMissing,
  onCancel,
  onDelete,
  onArchive,
  onComplete
}) => {
  const { t } = useTranslation();
  const canComplete = hasInstaller && !actMissing;

  return (
    <div className="order-drawer-footer">
      {(!orderId || isDirty) && (
        <div className="order-drawer-save-actions animate-fade-in">
          {orderId && (
            <button type="button" onClick={onCancel} className="btn btn-ghost order-drawer-cancel-btn">
              {t('kanban.modal.cancel') || 'Отмена'}
            </button>
          )}
          <button
            type="submit"
            className="btn btn-primary order-drawer-save-btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Check size={16} />
            {orderId ? (t('kanban.modal.save') || 'Сохранить') : (t('kanban.createOrder') || 'Создать заказ')}
          </button>
        </div>
      )}

      {orderId && (
        <div className="order-drawer-secondary-actions">
          {!isWorker ? (
            <div className="order-drawer-manage-actions">
              <button
                type="button"
                onClick={onDelete}
                className="btn btn-ghost order-drawer-delete-btn"
                style={{ color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Trash2 size={16} /> {t('kanban.modal.delete') || 'Удалить'}
              </button>
              {showArchive && (
                <button
                  type="button"
                  onClick={onArchive}
                  disabled={isDirty}
                  className="btn btn-ghost order-drawer-archive-btn"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  title={isDirty ? 'Сначала сохраните изменения' : 'Убрать заказ с доски в архив, не дожидаясь следующего месяца'}
                >
                  <Archive size={16} /> В архив
                </button>
              )}
            </div>
          ) : <div />}

          {isCompleted ? (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: '#4ade80',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: 'rgba(34, 197, 94, 0.12)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid rgba(34, 197, 94, 0.25)'
            }}>
              <CheckCircle2 size={16} /> {completionLabel(hasInstaller)}
            </div>
          ) : showComplete && (
            <button
              type="button"
              disabled={!canComplete}
              onClick={(e) => onComplete(e, orderId)}
              className="btn order-drawer-complete-btn"
              style={{
                background: canComplete ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'rgba(255, 255, 255, 0.08)',
                color: canComplete ? '#fff' : 'var(--text-secondary)',
                border: canComplete ? 'none' : '1px solid var(--glass-border)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 600,
                padding: '8px 14px',
                cursor: canComplete ? 'pointer' : 'not-allowed',
                opacity: canComplete ? 1 : 0.45
              }}
              title={completeHint(hasInstaller, actMissing)}
            >
              <CheckCircle2 size={16} /> Завершить монтаж
            </button>
          )}
        </div>
      )}
    </div>
  );
};
