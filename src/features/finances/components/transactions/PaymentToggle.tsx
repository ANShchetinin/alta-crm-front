import { Check, Plus } from 'lucide-react';

interface PaymentToggleProps {
  /** Название платежа в подсказке: «Аванс» / «Остаток». */
  label: string;
  amount: number;
  paid: boolean;
  /** Дата получения, уже отформатированная для подсказки. */
  paidAtText?: string;
  onToggle: () => void;
}

/** Нулевая неоплаченная часть (например, заказ без аванса) не ждет оплаты: ни суммы, ни кнопки «Принять». */
const needsToggle = (amount: number, paid: boolean) => paid || amount > 0;
const formatAmount = (amount: number, paid: boolean) => (needsToggle(amount, paid) ? `${amount.toLocaleString('ru-RU')} ₽` : '—');

/** Ячейка таблицы: сумма платежа и кнопка отметки «Получен» / «Принять». */
export const PaymentCellToggle = ({ label, amount, paid, paidAtText, onToggle }: PaymentToggleProps) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
    <span style={{ fontWeight: 600 }}>{formatAmount(amount, paid)}</span>
    {needsToggle(amount, paid) && (<button
      type="button"
      onClick={onToggle}
      title={paid
        ? `${label} получен: ${paidAtText || 'да'}. Нажмите для отмены.`
        : `Нажмите, чтобы отметить получение ${label === 'Аванс' ? 'аванса' : 'остатка'}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '0.7rem',
        padding: '2px 6px',
        background: paid ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.04)',
        border: paid ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid var(--glass-border)',
        color: paid ? '#4ade80' : 'var(--text-secondary)',
        borderRadius: '4px',
        cursor: 'pointer'
      }}
    >
      {paid ? <><Check size={11} /> Получен</> : <><Plus size={11} /> Принять</>}
    </button>)}
  </div>
);

/** Плитка мобильной карточки: сумма платежа и крупная кнопка отметки «Оплачен» / «Принять». */
export const PaymentTileToggle = ({ label, amount, paid, onToggle }: PaymentToggleProps) => (
  <div style={{
    padding: '10px',
    borderRadius: 'var(--radius-sm)',
    background: paid ? 'rgba(34, 197, 94, 0.08)' : 'rgba(255, 255, 255, 0.02)',
    border: paid ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid var(--glass-border)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: '6px'
  }}>
    <div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{label}:</div>
      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{formatAmount(amount, paid)}</div>
    </div>
    {needsToggle(amount, paid) && (<button
      type="button"
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        fontSize: '0.75rem',
        fontWeight: 600,
        padding: '6px',
        background: paid ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.06)',
        border: paid ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid var(--glass-border)',
        color: paid ? '#4ade80' : 'var(--text-primary)',
        borderRadius: '6px',
        cursor: 'pointer'
      }}
    >
      {paid ? <><Check size={13} /> Оплачен</> : <><Plus size={13} /> Принять</>}
    </button>)}
  </div>
);
