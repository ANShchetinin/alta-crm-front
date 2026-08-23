import { describe, it, expect } from 'vitest';
import { parseUtcDate, formatTimeAgo, formatDateInTimezone } from './dateUtils';

describe('Date Utilities (dateUtils)', () => {
  describe('parseUtcDate', () => {
    it('returns null for null or empty string', () => {
      expect(parseUtcDate(null)).toBeNull();
      expect(parseUtcDate('')).toBeNull();
      expect(parseUtcDate(undefined)).toBeNull();
    });

    it('correctly appends Z to parse server UTC date strings', () => {
      const parsed = parseUtcDate('2026-08-23T10:00:00');
      expect(parsed).not.toBeNull();
      expect(parsed?.toISOString()).toBe('2026-08-23T10:00:00.000Z');
    });

    it('parses strings that already have Z or offset', () => {
      const parsedZ = parseUtcDate('2026-08-23T10:00:00Z');
      expect(parsedZ?.toISOString()).toBe('2026-08-23T10:00:00.000Z');
    });
  });

  describe('formatTimeAgo', () => {
    it('returns empty string for null', () => {
      expect(formatTimeAgo(null)).toBe('');
    });

    it('returns "только что" for recent dates within a minute', () => {
      const recent = new Date().toISOString();
      expect(formatTimeAgo(recent)).toBe('только что');
    });
  });

  describe('formatDateInTimezone', () => {
    it('formats date correctly in given timezone', () => {
      const dateStr = '2026-08-23T10:00:00Z';
      const formatted = formatDateInTimezone(dateStr, 'Europe/Moscow');
      expect(formatted).toContain('23.08.2026');
    });
  });
});
