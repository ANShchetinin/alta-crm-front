import { AlertOctagon, AlertTriangle, Info, type LucideIcon } from 'lucide-react';
import type { AnnouncementSeverity, SystemAnnouncement, SystemAnnouncementRequest } from '../../../api/announcements';

export interface SeverityMeta {
  label: string;
  icon: LucideIcon;
  /** Модификатор CSS-класса: цвет баннера и бейджа берется из переменных темы. */
  tone: 'info' | 'warning' | 'critical';
}

export const SEVERITY_META: Record<AnnouncementSeverity, SeverityMeta> = {
  INFO: { label: 'Информация', icon: Info, tone: 'info' },
  WARNING: { label: 'Предупреждение', icon: AlertTriangle, tone: 'warning' },
  CRITICAL: { label: 'Критично', icon: AlertOctagon, tone: 'critical' }
};

export const SEVERITY_OPTIONS: AnnouncementSeverity[] = ['INFO', 'WARNING', 'CRITICAL'];

export type AnnouncementStatus = 'scheduled' | 'active' | 'finished';

export const STATUS_LABELS: Record<AnnouncementStatus, string> = {
  scheduled: 'Запланировано',
  active: 'Показывается',
  finished: 'Завершено'
};

/** Показывается ли объявление сейчас, еще не началось или уже закончилось. */
export const getAnnouncementStatus = (
  announcement: Pick<SystemAnnouncement, 'showFrom' | 'showUntil'>,
  now: Date = new Date()
): AnnouncementStatus => {
  if (new Date(announcement.showFrom) > now) {
    return 'scheduled';
  }
  if (announcement.showUntil && new Date(announcement.showUntil) <= now) {
    return 'finished';
  }
  return 'active';
};

const pad = (value: number) => String(value).padStart(2, '0');

/** ISO-время (UTC) → значение поля datetime-local в часовом поясе браузера. */
export const isoToInputValue = (iso: string | null | undefined): string => {
  if (!iso) {
    return '';
  }
  const date = new Date(iso);
  if (isNaN(date.getTime())) {
    return '';
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

/** Значение поля datetime-local (время браузера) → ISO UTC; пустое поле — null. */
export const inputValueToIso = (value: string): string | null => {
  if (!value.trim()) {
    return null;
  }
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date.toISOString();
};

/** Дата и время для людей: «29.09.2026, 22:00» в часовом поясе браузера. */
export const formatAnnouncementTime = (iso: string): string =>
  new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(iso));

/** Срок показа для списка: «с … по …», «с … бессрочно». */
export const formatShowPeriod = (announcement: Pick<SystemAnnouncement, 'showFrom' | 'showUntil'>): string => {
  const from = `с ${formatAnnouncementTime(announcement.showFrom)}`;
  return announcement.showUntil ? `${from} по ${formatAnnouncementTime(announcement.showUntil)}` : `${from}, бессрочно`;
};

/** Поля формы объявления: даты — в формате datetime-local. */
export interface AnnouncementFormValues {
  title: string;
  message: string;
  severity: AnnouncementSeverity;
  showFrom: string;
  showUntil: string;
}

export const EMPTY_FORM: AnnouncementFormValues = {
  title: '',
  message: '',
  severity: 'WARNING',
  showFrom: '',
  showUntil: ''
};

export const TITLE_MAX_LENGTH = 200;
export const MESSAGE_MAX_LENGTH = 2000;

export const toFormValues = (announcement: SystemAnnouncement): AnnouncementFormValues => ({
  title: announcement.title,
  message: announcement.message,
  severity: announcement.severity,
  showFrom: isoToInputValue(announcement.showFrom),
  showUntil: isoToInputValue(announcement.showUntil)
});

export const toRequest = (values: AnnouncementFormValues): SystemAnnouncementRequest => ({
  title: values.title.trim(),
  message: values.message.trim(),
  severity: values.severity,
  showFrom: inputValueToIso(values.showFrom),
  showUntil: inputValueToIso(values.showUntil)
});

/** Ошибка заполнения формы или null, если все верно (те же правила, что на бэкенде). */
export const validateForm = (values: AnnouncementFormValues): string | null => {
  if (!values.title.trim()) {
    return 'Укажите заголовок';
  }
  if (!values.message.trim()) {
    return 'Укажите текст объявления';
  }
  const request = toRequest(values);
  if (request.showUntil) {
    const start = request.showFrom ? new Date(request.showFrom) : new Date();
    if (new Date(request.showUntil) <= start) {
      return 'Окончание показа должно быть позже начала';
    }
  }
  return null;
};
