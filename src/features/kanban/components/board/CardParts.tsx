import type { MouseEvent } from 'react';
import { Bell, CheckCircle2, FileText, MapPin, MessageCircle, MessageSquare, Paperclip, Phone, Ruler, Send, Wrench } from 'lucide-react';
import type { Employee } from '../../../../api/employees';
import type { Order, OrderInstaller } from '../../../../api/kanban';
import type { OrderReminderDto } from '../../../../api/reminders';
import { getEmployeeInitials } from '../../../../utils/avatarUtils';
import { formatDateOnly, formatDateTimeInTimezone, formatTimeOnly } from '../../../../utils/dateUtils';
import { getTelegramLink, getWhatsAppLink } from '../../../../utils/messengerUtils';
import { get2GisUrl, getYandexMapsUrl } from '../../../../utils/navigation';
import { getOrderRemainder } from '../../../../utils/orderPayments';
import { completionLabel } from '../../../../utils/orderStatus';
import yandexIcon from '../../../../assets/maps/yandex.svg';
import twoGisIcon from '../../../../assets/maps/2gis.svg';
import { stopCardGesture } from './cardGestures';
import { formatPhone, phoneHref } from '../../../../utils/phone';
import { formatRub } from '../../../../utils/money';

export const ContractNumberBadge = ({ orderNumber }: { orderNumber: string }) => (
  <span
    style={{
      fontSize: '0.68rem',
      fontFamily: 'monospace',
      fontWeight: 700,
      background: 'rgba(34, 197, 94, 0.15)',
      color: '#16a34a',
      padding: '1px 5px',
      borderRadius: 'var(--radius-sm)',
      border: '1px solid rgba(34, 197, 94, 0.3)',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '3px',
      flexShrink: 0
    }}
    title="Номер договора"
  >
    <FileText size={9} />
    № {orderNumber}
  </span>
);

/** Значок напоминаний: красный — просрочено, оранжевый — на сегодня; число, если напоминаний несколько. */
export const RemindersBadge = ({ pending, isOverdue, isToday, nearest }: {
  pending: OrderReminderDto[];
  isOverdue: boolean;
  isToday: boolean;
  nearest?: OrderReminderDto;
}) => {
  if (pending.length === 0 || !nearest) {
    return null;
  }
  const tone = isOverdue ? ['rgba(239, 68, 68, 0.18)', '#ef4444', 'rgba(239, 68, 68, 0.35)']
    : isToday ? ['rgba(245, 158, 11, 0.18)', '#f59e0b', 'rgba(245, 158, 11, 0.35)']
      : ['rgba(59, 130, 246, 0.15)', '#60a5fa', 'rgba(59, 130, 246, 0.3)'];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '2px',
        fontSize: '0.68rem',
        fontWeight: 700,
        padding: '1px 5px',
        borderRadius: 'var(--radius-sm)',
        background: tone[0],
        color: tone[1],
        border: `1px solid ${tone[2]}`,
        cursor: 'default',
        flexShrink: 0
      }}
      title={`Напоминание: ${nearest.comment || 'Звонок'} (${formatTimeOnly(nearest.remindAt)})`}
    >
      <Bell size={10} />
      {pending.length > 1 ? pending.length : ''}
    </span>
  );
};

/** Звонок, мессенджеры клиента и аватар ответственного в правом углу карточки. */
export const CardContacts = ({ phone, whatsapp, telegram, assignee }: {
  phone?: string;
  whatsapp?: string;
  telegram?: string;
  assignee?: Employee;
}) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
    {phone && (
      <a
        href={phoneHref(phone)}
        {...stopCardGesture}
        title={`Позвонить клиенту: ${formatPhone(phone)}`}
        className="card-phone-btn"
        style={{
          borderRadius: '50%',
          background: 'rgba(34, 197, 94, 0.15)',
          border: '1px solid rgba(34, 197, 94, 0.35)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#22c55e',
          textDecoration: 'none',
          flexShrink: 0,
          width: '28px',
          height: '28px',
          transition: 'background 0.15s ease'
        }}
      >
        <Phone size={14} />
      </a>
    )}

    {whatsapp && (
      <a
        href={getWhatsAppLink(whatsapp)}
        target="_blank"
        rel="noopener noreferrer"
        {...stopCardGesture}
        title={`Написать в WhatsApp: ${whatsapp}`}
        className="card-messenger-btn whatsapp-btn"
      >
        <MessageCircle size={14} />
      </a>
    )}

    {telegram && (
      <a
        href={getTelegramLink(telegram)}
        target="_blank"
        rel="noopener noreferrer"
        {...stopCardGesture}
        title={`Написать в Telegram: ${telegram}`}
        className="card-messenger-btn telegram-btn"
      >
        <Send size={14} />
      </a>
    )}

    {assignee && (
      <div
        className="card-assignee-avatar"
        style={{
          borderRadius: '50%',
          overflow: 'hidden',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          color: '#fff',
          background: assignee.avatarUrl ? 'transparent' : '#0891b2',
          flexShrink: 0,
          width: '28px',
          height: '28px'
        }}
        title={`Ответственный: ${assignee.name}`}
      >
        {assignee.avatarUrl ? (
          <img src={assignee.avatarUrl} alt={assignee.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          getEmployeeInitials(assignee.name)
        )}
      </div>
    )}
  </div>
);

const MapIconLink = ({ href, title, icon }: { href: string; title: string; icon: string }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    {...stopCardGesture}
    title={title}
    aria-label={title}
    className="card-map-icon"
  >
    <img src={icon} alt="" draggable={false} />
  </a>
);

/** Адрес объекта с подъездом и этажом и значками маршрута в Яндекс.Картах и 2ГИС. */
export const CardAddress = ({ card }: { card: Order }) => {
  if (!card.address) {
    return null;
  }
  return (
    <div className="card-address-row">
      <MapPin size={14} style={{ flexShrink: 0, opacity: 0.8, color: 'var(--accent-primary)' }} />
      <span style={{ fontWeight: 500, flex: 1, minWidth: 0 }}>
        {card.address}
        {card.entrance ? `, п.${card.entrance}` : ''}
        {card.floor ? `, эт.${card.floor}` : ''}
      </span>
      <MapIconLink
        href={getYandexMapsUrl(card.address, card.entrance, card.floor)}
        title="Маршрут в Яндекс.Картах / Навигаторе"
        icon={yandexIcon}
      />
      <MapIconLink
        href={get2GisUrl(card.address, card.entrance, card.floor)}
        title="Маршрут в 2ГИС"
        icon={twoGisIcon}
      />
    </div>
  );
};

/** Даты замера и монтажа. */
export const CardSchedule = ({ card }: { card: Order }) => (
  <>
    {card.measurementDate && (
      <div className="card-schedule-badge measurement">
        <Ruler size={11} />
        <span>Замер: {formatDateTimeInTimezone(card.measurementDate)}</span>
      </div>
    )}
    {card.installationDate && (
      <div className="card-schedule-badge installation">
        <Wrench size={11} />
        <span>Монтаж: {formatDateOnly(card.installationDate)}</span>
      </div>
    )}
  </>
);

/** Счётчики вложений и комментариев и маржа заказа; без значений не рисуется. */
const CardMeta = ({ card, onOpenComments }: { card: Order; onOpenComments: () => void }) => {
  const attachmentsCount = card.attachments?.length || 0;
  const commentsCount = card.commentsCount || 0;
  const profitMargin = card.profitMargin || 0;

  if (attachmentsCount === 0 && commentsCount === 0 && profitMargin <= 0) {
    return null;
  }
  return (
    <div className="card-meta-row">
      {attachmentsCount > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <Paperclip size={12} /> {attachmentsCount}
        </div>
      )}
      {commentsCount > 0 && (
        <button
          type="button"
          onTouchStart={stopCardGesture.onTouchStart}
          onTouchEnd={stopCardGesture.onTouchEnd}
          onClick={(e) => {
            e.stopPropagation();
            onOpenComments();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            background: 'none',
            border: 'none',
            padding: '0 2px',
            cursor: 'pointer'
          }}
          title={`Комментарии (${commentsCount})`}
        >
          <MessageSquare size={12} /> {commentsCount}
        </button>
      )}
      {profitMargin > 0 && (
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#16a34a' }}>+{profitMargin.toFixed(1)}%</span>
      )}
    </div>
  );
};

/**
 * Сумма заказа, аванс/остаток и счётчики. Рамка финансового блока рисуется только при ненулевых суммах;
 * без сумм счётчики вложений/комментариев и маржа выводятся отдельной строкой без рамки.
 */
export const CardFinance = ({ card, onOpenComments }: { card: Order; onOpenComments: () => void }) => {
  const totalPrice = card.totalPrice || 0;
  const payments = [
    { label: 'Аванс', amount: card.prepayment || 0 },
    { label: 'Остаток', amount: getOrderRemainder(card) }
  ].filter(p => p.amount > 0);
  const meta = <CardMeta card={card} onOpenComments={onOpenComments} />;

  if (totalPrice <= 0 && payments.length === 0) {
    return meta;
  }
  return (
    <div className="kanban-finance-box">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {totalPrice > 0 && <div className="card-price-main">{formatRub(totalPrice)}</div>}
        {meta}
      </div>

      {payments.length > 0 && (
        <div className="card-finance-sub">
          {payments.map((p, idx) => (
            <span key={p.label}>
              {idx > 0 && <span style={{ margin: '0 8px', opacity: 0.35 }}>|</span>}
              {p.label}: <strong style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{formatRub(p.amount)}</strong>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

/** Главный монтажник с аватаром и числом дополнительных монтажников. */
export const CardInstaller = ({ name, avatarUrl, installers }: { name: string; avatarUrl?: string; installers: OrderInstaller[] }) => (
  <div className="card-installer-row">
    <div style={{
      width: '24px',
      height: '24px',
      borderRadius: '50%',
      overflow: 'hidden',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '0.65rem',
      fontWeight: 700,
      color: '#fff',
      background: avatarUrl ? 'transparent' : '#065f46',
      flexShrink: 0
    }}>
      {avatarUrl ? (
        <img src={avatarUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        getEmployeeInitials(name)
      )}
    </div>

    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
      <Wrench size={14} style={{ color: '#16a34a', flexShrink: 0 }} />
      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{name}</span>
      {installers.length > 1 && (
        <span
          title={installers.map(i => i.employeeName).filter(Boolean).join(', ')}
          style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            background: 'rgba(34, 197, 94, 0.15)',
            color: '#16a34a',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '10px',
            padding: '1px 6px',
            marginLeft: '2px',
            cursor: 'default'
          }}
        >
          +{installers.length - 1}
        </span>
      )}
    </div>
  </div>
);

/**
 * «Монтаж завершен» / «Сделка закрыта» с датой или кнопка завершения монтажа (только на этапе монтажа;
 * нужен монтажник, а по договору — еще и акт).
 */
export const CardCompletion = ({ isCompleted, showButton, installedAt, installerName, actMissing, onComplete }: {
  isCompleted: boolean;
  showButton: boolean;
  installedAt?: string | null;
  installerName?: string;
  actMissing: boolean;
  onComplete: (e: MouseEvent) => void;
}) => {
  if (isCompleted) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        padding: '6px 12px',
        background: 'rgba(34, 197, 94, 0.12)',
        border: '1px solid rgba(34, 197, 94, 0.3)',
        borderRadius: '8px',
        color: '#16a34a',
        fontSize: '0.82rem',
        fontWeight: 600,
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <CheckCircle2 size={14} /> {completionLabel(Boolean(installerName))} {installedAt ? `(${formatDateOnly(installedAt)})` : ''}
      </div>
    );
  }
  if (!showButton) {
    return null;
  }
  const canComplete = Boolean(installerName) && !actMissing;
  return (
    <button
      type="button"
      disabled={!canComplete}
      onTouchStart={stopCardGesture.onTouchStart}
      onTouchEnd={stopCardGesture.onTouchEnd}
      onClick={onComplete}
      className="card-complete-btn"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        background: canComplete ? '#16a34a' : 'rgba(255, 255, 255, 0.08)',
        border: canComplete ? 'none' : '1px solid var(--glass-border)',
        color: canComplete ? '#ffffff' : 'var(--text-secondary)',
        fontWeight: 600,
        width: '100%',
        cursor: canComplete ? 'pointer' : 'not-allowed',
        opacity: canComplete ? 1 : 0.55,
        transition: 'all 0.15s ease',
        boxSizing: 'border-box'
      }}
      title={!installerName ? 'Назначьте монтажника в карточке' : (actMissing ? 'По договору прикрепите Акт выполненных работ' : 'Завершить монтаж')}
    >
      <CheckCircle2 size={15} /> Завершить монтаж
    </button>
  );
};
