import type { MouseEvent } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import type { OrderStatus } from '../../../api/kanban';
import { getTelegramLink, getWhatsAppLink } from '../../../utils/messengerUtils';

/** Бейдж статуса архивного заказа (без статуса — «Завершен»). */
export const StatusPill = ({ status, gap = '6px' }: { status?: OrderStatus; gap?: string }) => (
  <span style={{
    display: 'inline-flex',
    alignItems: 'center',
    gap,
    padding: '3px 10px',
    borderRadius: '12px',
    fontSize: '0.76rem',
    fontWeight: 600,
    backgroundColor: status?.color ? `${status.color}22` : 'rgba(59, 130, 246, 0.15)',
    color: status?.color || 'var(--accent-primary)',
    border: `1px solid ${status?.color || 'var(--accent-primary)'}44`
  }}>
    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: status?.color || '#3b82f6' }} />
    {status?.name || 'Завершен'}
  </span>
);

interface MessengerButtonsProps {
  whatsapp?: string;
  telegram?: string;
  /** Сторона кнопки в пикселях. */
  size: number;
  iconSize: number;
  /** Подсказки «Написать в …» вместо названия мессенджера. */
  verboseTitles?: boolean;
}

const openInNewTab = (url: string) => (e: MouseEvent) => {
  e.stopPropagation();
  window.open(url, '_blank');
};

/** Кнопки WhatsApp и Telegram клиента; клик не открывает карточку заказа под ними. */
export const MessengerButtons = ({ whatsapp, telegram, size, iconSize, verboseTitles = false }: MessengerButtonsProps) => (
  <>
    {whatsapp && (
      <button
        type="button"
        onClick={openInNewTab(getWhatsAppLink(whatsapp))}
        className="contact-btn whatsapp-btn"
        style={{ width: `${size}px`, height: `${size}px` }}
        title={verboseTitles ? 'Написать в WhatsApp' : 'WhatsApp'}
      >
        <MessageCircle size={iconSize} />
      </button>
    )}
    {telegram && (
      <button
        type="button"
        onClick={openInNewTab(getTelegramLink(telegram))}
        className="contact-btn telegram-btn"
        style={{ width: `${size}px`, height: `${size}px` }}
        title={verboseTitles ? 'Написать в Telegram' : 'Telegram'}
      >
        <Send size={iconSize} />
      </button>
    )}
  </>
);
