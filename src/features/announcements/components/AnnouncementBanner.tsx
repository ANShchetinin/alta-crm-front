import { useLayoutEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { SystemAnnouncement } from '../../../api/announcements';
import { SEVERITY_META } from '../utils/announcements';
import '../../../styles/announcements.css';

interface AnnouncementItemProps {
  announcement: SystemAnnouncement;
  onDismiss?: (id: number) => void;
}

const AnnouncementItem = ({ announcement, onDismiss }: AnnouncementItemProps) => {
  const { icon: Icon, tone, label } = SEVERITY_META[announcement.severity];
  const [isExpanded, setIsExpanded] = useState(false);
  const [isClamped, setIsClamped] = useState(false);
  const messageRef = useRef<HTMLParagraphElement>(null);

  // Кнопка «Подробнее» нужна, только если текст действительно не поместился. Перемеряем, когда меняется ширина
  // (поворот экрана) и когда догружается шрифт: высота обрезанного блока при этом не меняется, а текст — да
  useLayoutEffect(() => {
    const element = messageRef.current;
    if (!element || isExpanded) {
      return;
    }
    let isActive = true;
    const measure = () => {
      if (isActive) {
        setIsClamped(element.scrollHeight > element.clientHeight + 1);
      }
    };
    measure();
    document.fonts?.ready.then(measure);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(element);
    return () => {
      isActive = false;
      observer?.disconnect();
    };
  }, [announcement.message, isExpanded]);

  const canDismiss = Boolean(onDismiss) && announcement.dismissible;

  return (
    <div
      className={`announcement announcement--${tone}`}
      role={tone === 'info' ? 'status' : 'alert'}
      title={label}
    >
      <Icon className="announcement__icon" size={18} aria-hidden="true" />
      <div className="announcement__body">
        <div className="announcement__title">{announcement.title}</div>
        <p ref={messageRef} className={`announcement__message ${isExpanded ? 'announcement__message--expanded' : ''}`}>
          {announcement.message}
        </p>
        {(isClamped || isExpanded) && (
          <button type="button" className="announcement__more" onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? 'Свернуть' : 'Подробнее'}
          </button>
        )}
      </div>
      {canDismiss && (
        <button
          type="button"
          className="announcement__dismiss"
          onClick={() => onDismiss?.(announcement.id)}
          aria-label="Скрыть объявление"
          title="Скрыть объявление"
        >
          <span className="announcement__dismiss-text">Понятно</span>
          <X className="announcement__dismiss-icon" size={18} aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

interface AnnouncementBannerProps {
  announcements: SystemAnnouncement[];
  /** Без обработчика объявления нельзя скрыть (страница входа). */
  onDismiss?: (id: number) => void;
  className?: string;
}

/** Объявления платформы: цвет по важности, длинный текст сворачивается, некритичные можно скрыть. */
export const AnnouncementBanner = ({ announcements, onDismiss, className = '' }: AnnouncementBannerProps) => {
  if (announcements.length === 0) {
    return null;
  }
  return (
    <div className={`announcements ${className}`}>
      {announcements.map(announcement => (
        <AnnouncementItem key={announcement.id} announcement={announcement} onDismiss={onDismiss} />
      ))}
    </div>
  );
};
