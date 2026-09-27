import React from 'react';
import { CheckCircle2, FileCheck } from 'lucide-react';
import { formatDateTimeInTimezone } from '../../../../../utils/dateUtils';

interface OrderStatusBannersProps {
  isCompleted: boolean;
  installedAt?: string;
  timezone?: string;
  hasAct: boolean;
  onOpenFiles: () => void;
}

const INSTALLED_AT_FORMAT: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' };

/**
 * Плашки состояния заказа: дата завершения монтажа и наличие Акта выполненных работ.
 */
export const OrderStatusBanners: React.FC<OrderStatusBannersProps> = ({ isCompleted, installedAt, timezone, hasAct, onOpenFiles }) => (
  <>
    {isCompleted && installedAt && (
      <div style={{
        marginBottom: '16px',
        padding: '8px 12px',
        background: 'rgba(34, 197, 94, 0.06)',
        border: '1px solid rgba(34, 197, 94, 0.2)',
        borderRadius: 'var(--radius-sm)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '0.8rem',
        color: '#4ade80'
      }}>
        <CheckCircle2 size={15} />
        <span>Монтаж завершен: <strong>{formatDateTimeInTimezone(installedAt, timezone, INSTALLED_AT_FORMAT)}</strong></span>
      </div>
    )}

    <div style={{
      marginBottom: '16px',
      padding: '10px 14px',
      background: hasAct ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)',
      border: hasAct ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
      borderRadius: 'var(--radius-sm)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '10px',
      flexWrap: 'wrap'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
        <FileCheck size={16} style={{ color: hasAct ? '#4ade80' : '#fbbf24' }} />
        <span style={{ color: hasAct ? '#4ade80' : '#fbbf24', fontWeight: 600 }}>
          {hasAct ? 'Акт выполненных работ прикреплен' : 'Акт выполненных работ не прикреплен'}
        </span>
      </div>
      <button
        type="button"
        onClick={onOpenFiles}
        className="btn btn-ghost"
        style={{ padding: '3px 8px', fontSize: '0.78rem', color: 'var(--accent-primary)', textDecoration: 'underline' }}
      >
        {hasAct ? 'Посмотреть во вкладке «Файлы»' : 'Перейти в «Файлы» для загрузки →'}
      </button>
    </div>
  </>
);
