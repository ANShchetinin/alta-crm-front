import { Pencil, Trash2 } from 'lucide-react';
import type { SystemAnnouncement } from '../../../api/announcements';
import { Badge, type BadgeVariant } from '../../../components/ui';
import {
  SEVERITY_META, STATUS_LABELS, formatShowPeriod, getAnnouncementStatus, type AnnouncementStatus
} from '../utils/announcements';

const STATUS_VARIANTS: Record<AnnouncementStatus, BadgeVariant> = {
  scheduled: 'info',
  active: 'success',
  finished: 'neutral'
};

interface AnnouncementListProps {
  announcements: SystemAnnouncement[];
  onEdit: (announcement: SystemAnnouncement) => void;
  onDelete: (announcement: SystemAnnouncement) => void;
}

/** Карточки объявлений: важность, статус показа, срок и действия. Одна раскладка для десктопа и телефона. */
export const AnnouncementList = ({ announcements, onEdit, onDelete }: AnnouncementListProps) => (
  <ul className="announcement-list">
    {announcements.map(announcement => {
      const { icon: Icon, label, tone } = SEVERITY_META[announcement.severity];
      const status = getAnnouncementStatus(announcement);
      return (
        <li key={announcement.id} className={`announcement-card announcement-card--${tone} ${status === 'finished' ? 'is-finished' : ''}`}>
          <div className="announcement-card__head">
            <div className="announcement-card__badges">
              <span className={`announcement-card__severity announcement-card__severity--${tone}`}>
                <Icon size={14} aria-hidden="true" /> {label}
              </span>
              <Badge size="sm" variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>
            </div>
            <div className="announcement-card__actions">
              <button type="button" className="btn-icon" onClick={() => onEdit(announcement)} aria-label="Изменить" title="Изменить">
                <Pencil size={17} />
              </button>
              <button
                type="button"
                className="btn-icon announcement-card__delete"
                onClick={() => onDelete(announcement)}
                aria-label="Удалить"
                title="Удалить"
              >
                <Trash2 size={17} />
              </button>
            </div>
          </div>
          <h3 className="announcement-card__title">{announcement.title}</h3>
          <p className="announcement-card__message">{announcement.message}</p>
          <div className="announcement-card__period">{formatShowPeriod(announcement)}</div>
        </li>
      );
    })}
  </ul>
);
