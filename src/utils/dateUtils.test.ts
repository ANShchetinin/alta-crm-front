import { describe, it, expect } from 'vitest';
import {
  parseUtcDate,
  formatTimeAgo,
  formatDateTimeInTimezone,
  formatDateInTimezone,
  localInputToUtcIso,
  utcToLocalInput,
  formatDateOnly,
  TIMEZONE_OPTIONS
} from './dateUtils';

describe('Date Utilities (dateUtils)', () => {
  describe('TIMEZONE_OPTIONS', () => {
    it('contains standard Russian timezones and UTC', () => {
      expect(TIMEZONE_OPTIONS.length).toBeGreaterThanOrEqual(10);
      expect(TIMEZONE_OPTIONS.some(tz => tz.value === 'Europe/Moscow')).toBe(true);
      expect(TIMEZONE_OPTIONS.some(tz => tz.value === 'UTC')).toBe(true);
    });
  });

  describe('parseUtcDate', () => {
    it('returns null for null, empty, invalid or undefined string', () => {
      expect(parseUtcDate(null)).toBeNull();
      expect(parseUtcDate('')).toBeNull();
      expect(parseUtcDate(undefined)).toBeNull();
      expect(parseUtcDate('invalid-date-string')).toBeNull();
    });

    it('correctly appends Z to parse server UTC date strings without timezone', () => {
      const parsed = parseUtcDate('2026-08-23T10:00:00');
      expect(parsed).not.toBeNull();
      expect(parsed?.toISOString()).toBe('2026-08-23T10:00:00.000Z');
    });

    it('parses strings that already have Z or offset', () => {
      const parsedZ = parseUtcDate('2026-08-23T10:00:00Z');
      expect(parsedZ?.toISOString()).toBe('2026-08-23T10:00:00.000Z');

      const parsedOffset = parseUtcDate('2026-08-23T13:00:00+03:00');
      expect(parsedOffset?.toISOString()).toBe('2026-08-23T10:00:00.000Z');
    });
  });

  describe('formatTimeAgo', () => {
    it('returns empty string for null or undefined', () => {
      expect(formatTimeAgo(null)).toBe('');
      expect(formatTimeAgo(undefined)).toBe('');
    });

    it('returns "только что" for recent dates within a minute', () => {
      const recent = new Date().toISOString();
      expect(formatTimeAgo(recent)).toBe('только что');
    });

    it('returns minutes ago for dates 1-59 mins ago', () => {
      const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      expect(formatTimeAgo(tenMinsAgo)).toBe('10 мин назад');
    });

    it('returns hours ago for dates 1-23 hours ago', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      expect(formatTimeAgo(twoHoursAgo)).toBe('2 ч назад');
    });

    it('returns formatted date for older dates (> 24 hours)', () => {
      const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const formatted = formatTimeAgo(twoDaysAgo);
      expect(formatted).toMatch(/\d{2}\.\d{2}/);
    });
  });

  describe('formatDateTimeInTimezone', () => {
    it('returns empty string for null or empty input', () => {
      expect(formatDateTimeInTimezone(null)).toBe('');
      expect(formatDateTimeInTimezone(undefined)).toBe('');
    });

    it('formats date and time in given timezone', () => {
      const dateStr = '2026-08-23T10:00:00Z';
      const formatted = formatDateTimeInTimezone(dateStr, 'Europe/Moscow');
      expect(formatted).toContain('23.08.2026');
      expect(formatted).toContain('13:00');
    });

    it('accepts Date object instance directly', () => {
      const dateObj = new Date('2026-08-23T10:00:00Z');
      const formatted = formatDateTimeInTimezone(dateObj, 'UTC');
      expect(formatted).toContain('23.08.2026');
      expect(formatted).toContain('10:00');
    });
  });

  describe('formatDateInTimezone', () => {
    it('returns empty string for null', () => {
      expect(formatDateInTimezone(null)).toBe('');
    });

    it('formats date correctly in given timezone', () => {
      const dateStr = '2026-08-23T10:00:00Z';
      const formatted = formatDateInTimezone(dateStr, 'Europe/Moscow');
      expect(formatted).toBe('23.08.2026');
    });
  });

  describe('localInputToUtcIso and utcToLocalInput', () => {
    it('returns undefined / empty for invalid or empty input', () => {
      expect(localInputToUtcIso(null)).toBeUndefined();
      expect(localInputToUtcIso('')).toBeUndefined();
      expect(utcToLocalInput(null)).toBe('');
      expect(utcToLocalInput('')).toBe('');
    });

    it('converts local input string to UTC ISO string', () => {
      const localStr = '2026-09-04T12:30';
      const utcIso = localInputToUtcIso(localStr);
      expect(utcIso).toBeDefined();
      expect(utcIso).toMatch(/Z$/);
    });

    it('converts UTC date string to input datetime-local format', () => {
      const utcStr = '2026-09-04T12:30:00.000Z';
      const localInput = utcToLocalInput(utcStr);
      expect(localInput).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    });
  });

  describe('formatDateOnly', () => {
    it('returns empty string for empty input', () => {
      expect(formatDateOnly(null)).toBe('');
      expect(formatDateOnly('')).toBe('');
    });

    it('formats YYYY-MM-DD directly to DD.MM.YYYY', () => {
      expect(formatDateOnly('2026-09-04')).toBe('04.09.2026');
      expect(formatDateOnly('2026-12-31T15:00:00Z')).toBe('31.12.2026');
    });
  });
});
