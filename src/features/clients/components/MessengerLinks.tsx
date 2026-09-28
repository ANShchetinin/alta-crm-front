import type { MouseEvent } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { getTelegramLink, getWhatsAppLink } from '../../../utils/messengerUtils';

interface MessengerLinksProps {
  whatsapp?: string;
  telegram?: string;
  iconSize: number;
  /** Подробная подсказка с контактом (десктоп) или короткая — название мессенджера. */
  detailedTitles?: boolean;
}

const stopPropagation = (e: MouseEvent) => e.stopPropagation();

/** Ссылки «написать в WhatsApp / Telegram»; клик не открывает карточку клиента под ними. */
export const MessengerLinks = ({ whatsapp, telegram, iconSize, detailedTitles = false }: MessengerLinksProps) => (
  <>
    {whatsapp && (
      <a
        href={getWhatsAppLink(whatsapp)}
        target="_blank"
        rel="noopener noreferrer"
        title={detailedTitles ? `Написать в WhatsApp: ${whatsapp}` : 'WhatsApp'}
        onClick={stopPropagation}
        className="messenger-link whatsapp-link"
      >
        <MessageCircle size={iconSize} />
      </a>
    )}
    {telegram && (
      <a
        href={getTelegramLink(telegram)}
        target="_blank"
        rel="noopener noreferrer"
        title={detailedTitles ? `Написать в Telegram: ${telegram}` : 'Telegram'}
        onClick={stopPropagation}
        className="messenger-link telegram-link"
      >
        <Send size={iconSize} />
      </a>
    )}
  </>
);
