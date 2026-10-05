import type { MouseEvent } from 'react';
import { Bell, CheckCircle2, FileText, MapPin, MessageCircle, Phone, Ruler, Send, Wrench } from 'lucide-react';
import type { Employee } from '../../../../api/employees';
import type { Order, OrderInstaller } from '../../../../api/kanban';
import type { OrderReminderDto } from '../../../../api/reminders';
import { getEmployeeInitials } from '../../../../utils/avatarUtils';
import { formatDateOnly, formatDateTimeInTimezone, formatTimeOnly } from '../../../../utils/dateUtils';
import { getTelegramLink, getWhatsAppLink } from '../../../../utils/messengerUtils';
import { get2GisUrl, getYandexMapsUrl } from '../../../../utils/navigation';
import { stopCardGesture } from './cardGestures';
import { formatPhone, phoneHref } from '../../../../utils/phone';

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

const MapPill = ({ href, title, letter, label, color, rgb }: { href: string; title: string; letter: string; label: string; color: string; rgb: string }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    {...stopCardGesture}
    title={title}
    className="kanban-map-pill"
    style={{ color, borderColor: `rgba(${rgb}, 0.35)`, background: `rgba(${rgb}, 0.08)` }}
  >
    <span style={{
      width: '16px',
      height: '16px',
      borderRadius: '50%',
      background: color,
      color: '#fff',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '9px',
      fontWeight: 800
    }}>
      {letter}
    </span>
    <span style={{ fontWeight: 600 }}>{label}</span>
  </a>
);

/** Адрес объекта с подъездом и этажом и кнопки маршрута в Яндекс.Картах и 2ГИС. */
export const CardAddress = ({ card }: { card: Order }) => {
  if (!card.address) {
    return null;
  }
  return (
    <div style={{ marginBottom: '6px' }}>
      <div className="card-address-row">
        <MapPin size={14} style={{ flexShrink: 0, opacity: 0.8, color: 'var(--accent-primary)' }} />
        <span style={{ fontWeight: 500 }}>
          {card.address}
          {card.entrance ? `, п.${card.entrance}` : ''}
          {card.floor ? `, эт.${card.floor}` : ''}
        </span>
      </div>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
        <MapPill
          href={getYandexMapsUrl(card.address, card.entrance, card.floor)}
          title="Маршрут в Яндекс.Картах / Навигаторе"
          letter="Я"
          label="Яндекс"
          color="#fc3f1d"
          rgb="252, 63, 29"
        />
        <MapPill
          href={get2GisUrl(card.address, card.entrance, card.floor)}
          title="Маршрут в 2ГИС"
          letter="2Г"
          label="2ГИС"
          color="#22c55e"
          rgb="34, 197, 94"
        />
      </div>
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

/** «Монтаж завершен» с датой или кнопка завершения (нужны монтажник и акт). */
export const CardCompletion = ({ isCompleted, installedAt, installerName, hasAct, onComplete }: {
  isCompleted: boolean;
  installedAt?: string | null;
  installerName?: string;
  hasAct: boolean;
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
        <CheckCircle2 size={14} /> Монтаж завершен {installedAt ? `(${formatDateOnly(installedAt)})` : ''}
      </div>
    );
  }
  const canComplete = Boolean(installerName) && hasAct;
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
      title={!installerName ? 'Назначьте монтажника в карточке' : (!hasAct ? 'Прикрепите Акт выполненных работ' : 'Завершить монтаж')}
    >
      <CheckCircle2 size={15} /> Завершить монтаж
    </button>
  );
};
