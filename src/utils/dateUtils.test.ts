import { describe, it, expect } from 'vitest';
import {
  TIMEZONE_OPTIONS,
  parseLocalDateTime,
  parseUtcDate,
  formatTimeAgo,
  formatDateTime,
  formatDateTimeInTimezone,
  formatDateOnly,
  formatDateInTimezone,
  formatTimeOnly,
  localInputToIso,
  localInputToUtcIso,
  isoToLocalInput,
  utcToLocalInput,
  formatLastSeen
} from './dateUtils';

describe('Date Utilities (dateUtils)', () => {
  describe('TIMEZONE_OPTIONS', () => {
    it('contains standard Russian timezones and UTC', () => {
      expect(TIMEZONE_OPTIONS.length).toBeGreaterThanOrEqual(10);
      expect(TIMEZONE_OPTIONS.some(tz => tz.value === 'Europe/Moscow')).toBe(true);
      expect(TIMEZONE_OPTIONS.some(tz => tz.value === 'UTC')).toBe(true);
    });
  });

  describe('parseLocalDateTime and parseUtcDate', () => {
    it('returns null for null, empty, invalid or undefined string', () => {
      expect(parseLocalDateTime(null)).toBeNull();
      expect(parseLocalDateTime('')).toBeNull();
      expect(parseLocalDateTime(undefined)).toBeNull();
      expect(parseLocalDateTime('invalid-date-string')).toBeNull();
    });

    it('parses ISO local date-time strings without timezone distortion', () => {
      const parsed = parseLocalDateTime('2026-09-10T13:30:00');
      expect(parsed).not.toBeNull();
      expect(parsed?.getFullYear()).toBe(2026);
      expect(parsed?.getMonth()).toBe(8); // September is 0-indexed (8)
      expect(parsed?.getDate()).toBe(10);
      expect(parsed?.getHours()).toBe(13);
      expect(parsed?.getMinutes()).toBe(30);
      expect(parsed?.getSeconds()).toBe(0);

      const parsedUtc = parseUtcDate('2026-09-10T13:30:00');
      expect(parsedUtc).not.toBeNull();
      expect(parsedUtc?.getHours()).toBe(13);
    });

    it('parses strings with space delimiter or trailing Z preserving wall-clock numbers', () => {
      const parsedZ = parseLocalDateTime('2026-09-10T13:30:00Z');
      expect(parsedZ).not.toBeNull();
      expect(parsedZ?.getFullYear()).toBe(2026);
      expect(parsedZ?.getDate()).toBe(10);
      expect(parsedZ?.getHours()).toBe(13);
      expect(parsedZ?.getMinutes()).toBe(30);

      const parsedSpace = parseLocalDateTime('2026-09-10 13:30:00');
      expect(parsedSpace).not.toBeNull();
      expect(parsedSpace?.getHours()).toBe(13);
      expect(parsedSpace?.getMinutes()).toBe(30);
    });

    it('handles Date instances directly', () => {
      const date = new Date(2026, 8, 10, 13, 30);
      const parsed = parseLocalDateTime(date);
      expect(parsed).not.toBeNull();
      expect(parsed?.getHours()).toBe(13);
      expect(parsed?.getMinutes()).toBe(30);
    });
  });

  describe('formatDateTime and formatDateTimeInTimezone', () => {
    it('returns empty string for null or empty input', () => {
      expect(formatDateTime(null)).toBe('');
      expect(formatDateTime(undefined)).toBe('');
      expect(formatDateTime('')).toBe('');
    });

    it('formats date and time exactly as given (DD.MM.YYYY, HH:mm)', () => {
      const formatted = formatDateTime('2026-09-10T13:30:00');
      expect(formatted).toBe('10.09.2026, 13:30');
    });

    it('formatDateTimeInTimezone formats identically preserving wall-clock time', () => {
      const formatted = formatDateTimeInTimezone('2026-09-10T13:30:00', 'Europe/Moscow');
      expect(formatted).toBe('10.09.2026, 13:30');
    });
  });

  describe('formatDateOnly and formatDateInTimezone', () => {
    it('returns empty string for null or empty', () => {
      expect(formatDateOnly(null)).toBe('');
      expect(formatDateOnly('')).toBe('');
      expect(formatDateInTimezone(null)).toBe('');
    });

    it('formats only date part (DD.MM.YYYY)', () => {
      expect(formatDateOnly('2026-09-10T13:30:00')).toBe('10.09.2026');
      expect(formatDateOnly('2026-09-10')).toBe('10.09.2026');
      expect(formatDateInTimezone('2026-09-10T13:30:00')).toBe('10.09.2026');
    });
  });

  describe('formatTimeOnly', () => {
    it('returns empty string for null or empty', () => {
      expect(formatTimeOnly(null)).toBe('');
      expect(formatTimeOnly('')).toBe('');
    });

    it('formats only time part (HH:mm)', () => {
      expect(formatTimeOnly('2026-09-10T13:30:00')).toBe('13:30');
      expect(formatTimeOnly('2026-09-10T09:05:00')).toBe('09:05');
    });
  });

  describe('localInputToIso and localInputToUtcIso', () => {
    it('returns undefined for invalid or empty input', () => {
      expect(localInputToIso(null)).toBeUndefined();
      expect(localInputToIso('')).toBeUndefined();
      expect(localInputToUtcIso(null)).toBeUndefined();
    });

    it('converts local input format "YYYY-MM-DDTHH:mm" to "YYYY-MM-DDTHH:mm:00"', () => {
      expect(localInputToIso('2026-09-10T13:30')).toBe('2026-09-10T13:30:00');
      expect(localInputToUtcIso('2026-09-10T13:30')).toBe('2026-09-10T13:30:00');
    });
  });

  describe('isoToLocalInput and utcToLocalInput', () => {
    it('returns empty string for null or empty input', () => {
      expect(isoToLocalInput(null)).toBe('');
      expect(isoToLocalInput('')).toBe('');
      expect(utcToLocalInput(null)).toBe('');
    });

    it('converts ISO string to input datetime-local format "YYYY-MM-DDTHH:mm"', () => {
      expect(isoToLocalInput('2026-09-10T13:30:00')).toBe('2026-09-10T13:30');
      expect(utcToLocalInput('2026-09-10T13:30:00.000')).toBe('2026-09-10T13:30');
    });
  });

  describe('formatTimeAgo', () => {
    it('returns empty string for null or undefined', () => {
      expect(formatTimeAgo(null)).toBe('');
      expect(formatTimeAgo(undefined)).toBe('');
    });

    it('returns "только что" for recent dates within a minute', () => {
      const now = new Date();
      const recent = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      expect(formatTimeAgo(recent)).toBe('только что');
    });
  });

  describe('formatLastSeen', () => {
    it('returns "Без доступа к CRM" when hasAccount is false', () => {
      const res = formatLastSeen('2026-09-10T13:30:00', false, false);
      expect(res).toEqual({
        text: 'Без доступа к CRM',
        isOnline: false,
        hasAccount: false
      });
    });

    it('returns "В сети" when isOnline is true', () => {
      const res = formatLastSeen('2026-09-10T13:30:00', true, true);
      expect(res).toEqual({
        text: 'В сети',
        isOnline: true,
        hasAccount: true
      });
    });

    it('returns "Был(а) давно" when lastActiveAt is empty or invalid', () => {
      expect(formatLastSeen(null, false, true).text).toBe('Был(а) давно');
      expect(formatLastSeen(undefined, false, true).text).toBe('Был(а) давно');
      expect(formatLastSeen('invalid-date', false, true).text).toBe('Был(а) давно');
    });

    it('returns "Был(а) только что" for activity within 1 minute', () => {
      const now = new Date();
      const isoStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      const res = formatLastSeen(isoStr, false, true);
      expect(res.text).toBe('Был(а) только что');
      expect(res.isOnline).toBe(false);
      expect(res.hasAccount).toBe(true);
    });

    it('returns "Был(а) X мин назад" for activity between 1 and 59 minutes ago', () => {
      const date = new Date(Date.now() - 15 * 60 * 1000);
      const isoStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
      const res = formatLastSeen(isoStr, false, true);
      expect(res.text).toBe('Был(а) 15 мин назад');
    });

    it('returns "Был(а) вчера в HH:mm" for activity yesterday', () => {
      const now = new Date();
      const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 14, 30, 0);
      const isoStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}T14:30:00`;
      const res = formatLastSeen(isoStr, false, true);
      expect(res.text).toBe('Был(а) вчера в 14:30');
    });

    it('returns "Был(а) сегодня в HH:mm" for activity earlier today', () => {
      const now = new Date();
      const todayEarlier = new Date(now.getFullYear(), now.getMonth(), now.getDate(), Math.max(0, now.getHours() - 2), 0, 0);
      const isoStr = `${todayEarlier.getFullYear()}-${String(todayEarlier.getMonth() + 1).padStart(2, '0')}-${String(todayEarlier.getDate()).padStart(2, '0')}T${String(todayEarlier.getHours()).padStart(2, '0')}:00:00`;
      const res = formatLastSeen(isoStr, false, true);
      const diffMins = Math.floor((now.getTime() - todayEarlier.getTime()) / 60000);
      if (diffMins < 1) {
        expect(res.text).toBe('Был(а) только что');
      } else if (diffMins < 60) {
        expect(res.text).toBe(`Был(а) ${diffMins} мин назад`);
      } else {
        expect(res.text).toBe(`Был(а) сегодня в ${String(todayEarlier.getHours()).padStart(2, '0')}:00`);
      }
    });
  });
});
