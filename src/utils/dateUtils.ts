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
 * Парсит дату и время из строки от бэкенда как локальное время без смещения часового пояса.
 * Гарантирует, что введенные пользователем день, месяц, год, часы и минуты сохраняются 1:1.
 */
export function parseLocalDateTime(dateStr: string | Date | null | undefined): Date | null {
  if (!dateStr) return null;
  if (dateStr instanceof Date) {
    return isNaN(dateStr.getTime()) ? null : new Date(dateStr.getTime());
  }
  const str = String(dateStr).trim();
  if (!str) return null;

  // Формат YYYY-MM-DD[T| ]HH:mm[:ss[.sss]][Z]
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) {
    const [, y, mo, d, h, mi, s] = m;
    const year = parseInt(y, 10);
    const month = parseInt(mo, 10) - 1;
    const day = parseInt(d, 10);
    const hours = h !== undefined ? parseInt(h, 10) : 0;
    const minutes = mi !== undefined ? parseInt(mi, 10) : 0;
    const seconds = s !== undefined ? parseInt(s, 10) : 0;
    const dateObj = new Date(year, month, day, hours, minutes, seconds);
    return isNaN(dateObj.getTime()) ? null : dateObj;
  }

  const fallback = new Date(str);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * Парсит дату из строки от бэкенда.
 */
export function parseUtcDate(dateStr: string | null | undefined): Date | null {
  return parseLocalDateTime(dateStr);
}

/**
 * Форматирует относительное время (например, "только что", "5 мин назад", "2 ч назад").
 */
export function formatTimeAgo(dateStr: string | null | undefined, _timeZone = 'Europe/Moscow'): string {
  const date = parseLocalDateTime(dateStr);
  if (!date) return '';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return 'только что';
  if (diffMins < 60) return `${diffMins} мин назад`;
  if (diffHours < 24) return `${diffHours} ч назад`;

  const d = String(date.getDate()).padStart(2, '0');
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return `${d}.${mo}, ${h}:${mi}`;
}

/**
 * Форматирует дату и время (например: "10.09.2026, 13:30").
 */
export function formatDateTime(
  dateStr: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateStr) return '';
  const date = parseLocalDateTime(dateStr);
  if (!date) return '';

  if (options) {
    try {
      return new Intl.DateTimeFormat('ru-RU', options).format(date);
    } catch {
      return date.toLocaleString('ru-RU');
    }
  }

  const d = String(date.getDate()).padStart(2, '0');
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  const h = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return `${d}.${mo}.${y}, ${h}:${mi}`;
}

/**
 * Форматирует дату и время в установленном формате без искажений часовых поясов.
 */
export function formatDateTimeInTimezone(
  dateStr: string | Date | null | undefined,
  _timeZone = 'Europe/Moscow',
  options?: Intl.DateTimeFormatOptions
): string {
  return formatDateTime(dateStr, options);
}

/**
 * Форматирует только дату (день.месяц.год, например: "10.09.2026").
 */
export function formatDateOnly(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '';
  const date = parseLocalDateTime(dateStr);
  if (!date) return '';

  const d = String(date.getDate()).padStart(2, '0');
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}.${mo}.${y}`;
}

/**
 * Форматирует только дату (день.месяц.год).
 */
export function formatDateInTimezone(
  dateStr: string | Date | null | undefined,
  _timeZone = 'Europe/Moscow',
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateStr) return '';
  const date = parseLocalDateTime(dateStr);
  if (!date) return '';

  if (options) {
    try {
      return new Intl.DateTimeFormat('ru-RU', options).format(date);
    } catch {
      return date.toLocaleDateString('ru-RU');
    }
  }

  return formatDateOnly(date);
}

/**
 * Форматирует только время (часы:минуты, например: "13:30").
 */
export function formatTimeOnly(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '';
  const date = parseLocalDateTime(dateStr);
  if (!date) return '';

  const h = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${mi}`;
}

/**
 * Конвертирует строку из input type="datetime-local" ("YYYY-MM-DDTHH:mm")
 * в ISO строку локального времени ("YYYY-MM-DDTHH:mm:00") для отправки на бэкенд.
 */
export function localInputToIso(localDateTimeStr: string | null | undefined): string | undefined {
  if (!localDateTimeStr || !localDateTimeStr.trim()) return undefined;
  const trimmed = localDateTimeStr.trim();
  if (trimmed.length === 16) {
    return `${trimmed}:00`;
  }
  return trimmed;
}

/**
 * Конвертирует значение для отправки на бэкенд (алиас для localInputToIso).
 */
export function localInputToUtcIso(localDateTimeStr: string | null | undefined): string | undefined {
  return localInputToIso(localDateTimeStr);
}

/**
 * Конвертирует строку даты/времени из бэкенда ("YYYY-MM-DDTHH:mm:ss...")
 * в строку формата "YYYY-MM-DDTHH:mm" для подстановки в input type="datetime-local".
 */
export function isoToLocalInput(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const d = parseLocalDateTime(dateStr);
  if (!d) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Алиас для обратной совместимости.
 */
export function utcToLocalInput(utcDateStr: string | null | undefined): string {
  return isoToLocalInput(utcDateStr);
}

/**
 * Форматирует статус присутствия сотрудника в стиле мессенджеров (Telegram/WhatsApp).
 *
 * @param lastActiveAt Время последней активности
 * @param isOnline Флаг нахождения онлайн прямо сейчас
 * @param hasAccount Есть ли у сотрудника учетная запись в CRM
 */
export function formatLastSeen(
  lastActiveAt?: string | null,
  isOnline?: boolean,
  hasAccount?: boolean
): { text: string; isOnline: boolean; hasAccount: boolean } {
  if (hasAccount === false) {
    return { text: 'Без доступа к CRM', isOnline: false, hasAccount: false };
  }

  if (isOnline) {
    return { text: 'В сети', isOnline: true, hasAccount: true };
  }

  if (!lastActiveAt) {
    return { text: 'Был(а) давно', isOnline: false, hasAccount: true };
  }

  const date = parseLocalDateTime(lastActiveAt);
  if (!date) {
    return { text: 'Был(а) давно', isOnline: false, hasAccount: true };
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) {
    return { text: 'Был(а) только что', isOnline: false, hasAccount: true };
  }
  if (diffMins < 60) {
    return { text: `Был(а) ${diffMins} мин назад`, isOnline: false, hasAccount: true };
  }

  const h = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const timeStr = `${h}:${mi}`;

  // Проверяем, сегодня ли
  const isToday = now.getFullYear() === date.getFullYear() &&
                  now.getMonth() === date.getMonth() &&
                  now.getDate() === date.getDate();
  if (isToday) {
    return { text: `Был(а) сегодня в ${timeStr}`, isOnline: false, hasAccount: true };
  }

  // Проверяем, вчера ли
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const isYesterday = yesterday.getFullYear() === date.getFullYear() &&
                      yesterday.getMonth() === date.getMonth() &&
                      yesterday.getDate() === date.getDate();
  if (isYesterday) {
    return { text: `Был(а) вчера в ${timeStr}`, isOnline: false, hasAccount: true };
  }

  // Если в этом году
  const d = String(date.getDate()).padStart(2, '0');
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  if (now.getFullYear() === date.getFullYear()) {
    return { text: `Был(а) ${d}.${mo} в ${timeStr}`, isOnline: false, hasAccount: true };
  }

  return { text: `Был(а) ${d}.${mo}.${date.getFullYear()}`, isOnline: false, hasAccount: true };
}

