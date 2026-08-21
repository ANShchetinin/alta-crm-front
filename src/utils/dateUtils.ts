export interface TimezoneOption {
  value: string;
  label: string;
  offsetLabel: string;
}

export const TIMEZONE_OPTIONS: TimezoneOption[] = [
  { value: 'Europe/Kaliningrad', label: 'Калининград (МСК-1)', offsetLabel: 'UTC+2' },
  { value: 'Europe/Moscow', label: 'Москва, Санкт-Петербург (МСК)', offsetLabel: 'UTC+3' },
  { value: 'Europe/Samara', label: 'Самара, Ижевск, Саратов (МСК+1)', offsetLabel: 'UTC+4' },
  { value: 'Asia/Yekaterinburg', label: 'Екатеринбург, Тюмень, Пермь, Уфа, Челябинск (МСК+2)', offsetLabel: 'UTC+5' },
  { value: 'Asia/Omsk', label: 'Омск (МСК+3)', offsetLabel: 'UTC+6' },
  { value: 'Asia/Novosibirsk', label: 'Новосибирск, Томск, Барнаул, Кемерово (МСК+4)', offsetLabel: 'UTC+7' },
  { value: 'Asia/Krasnoyarsk', label: 'Красноярск, Норильск (МСК+4)', offsetLabel: 'UTC+7' },
  { value: 'Asia/Irkutsk', label: 'Иркутск, Улан-Удэ (МСК+5)', offsetLabel: 'UTC+8' },
  { value: 'Asia/Yakutsk', label: 'Якутск, Чита (МСК+6)', offsetLabel: 'UTC+9' },
  { value: 'Asia/Vladivostok', label: 'Владивосток, Хабаровск (МСК+7)', offsetLabel: 'UTC+10' },
  { value: 'Asia/Magadan', label: 'Магадан, Сахалин (МСК+8)', offsetLabel: 'UTC+11' },
  { value: 'Asia/Kamchatka', label: 'Камчатка, Анадырь (МСК+9)', offsetLabel: 'UTC+12' },
  { value: 'UTC', label: 'Всемирное координированное время (UTC)', offsetLabel: 'UTC+0' }
];

/**
 * Парсит дату из строки от бэкенда, гарантируя корректную интерпретацию UTC,
 * даже если серверная строка не содержит постфикса 'Z'.
 */
export function parseUtcDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const hasTimezone = dateStr.endsWith('Z') || /[+-]\d{2}(:\d{2})?$/.test(dateStr);
  const normalized = hasTimezone ? dateStr : `${dateStr}Z`;
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Форматирует относительное время (например, "только что", "5 мин назад", "2 ч назад")
 * с учетом разницы во времени и часового пояса компании.
 */
export function formatTimeAgo(dateStr: string | null | undefined, timeZone = 'Europe/Moscow'): string {
  const date = parseUtcDate(dateStr);
  if (!date) return '';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return 'только что';
  if (diffMins < 60) return `${diffMins} мин назад`;
  if (diffHours < 24) return `${diffHours} ч назад`;

  try {
    return new Intl.DateTimeFormat('ru-RU', {
      timeZone: timeZone || 'Europe/Moscow',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch {
    return date.toLocaleString('ru-RU');
  }
}

/**
 * Форматирует дату и время в установленном часовом поясе компании.
 */
export function formatDateTimeInTimezone(
  dateStr: string | Date | null | undefined,
  timeZone = 'Europe/Moscow',
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateStr) return '';
  const date = dateStr instanceof Date ? dateStr : parseUtcDate(dateStr);
  if (!date) return '';

  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: timeZone || 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    ...options
  };

  try {
    return new Intl.DateTimeFormat('ru-RU', defaultOptions).format(date);
  } catch {
    return date.toLocaleString('ru-RU');
  }
}
