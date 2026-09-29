import { describe, expect, it } from 'vitest';
import {
  EMPTY_FORM, getAnnouncementStatus, inputValueToIso, isoToInputValue, toRequest, validateForm
} from './announcements';

describe('getAnnouncementStatus', () => {
  const now = new Date('2026-09-29T12:00:00Z');

  it('is scheduled before the start, active within the period and finished after it', () => {
    expect(getAnnouncementStatus({ showFrom: '2026-09-29T13:00:00Z', showUntil: null }, now)).toBe('scheduled');
    expect(getAnnouncementStatus({ showFrom: '2026-09-29T11:00:00Z', showUntil: '2026-09-29T13:00:00Z' }, now)).toBe('active');
    expect(getAnnouncementStatus({ showFrom: '2026-09-29T10:00:00Z', showUntil: '2026-09-29T12:00:00Z' }, now)).toBe('finished');
  });

  it('stays active without an end', () => {
    expect(getAnnouncementStatus({ showFrom: '2026-01-01T00:00:00Z', showUntil: null }, now)).toBe('active');
  });
});

describe('datetime-local conversion', () => {
  it('round-trips through the browser time zone', () => {
    const iso = inputValueToIso('2026-09-29T22:00');
    expect(iso).toBe(new Date(2026, 8, 29, 22, 0).toISOString());
    expect(isoToInputValue(iso)).toBe('2026-09-29T22:00');
  });

  it('treats empty and broken values as no date', () => {
    expect(inputValueToIso('')).toBeNull();
    expect(inputValueToIso('  ')).toBeNull();
    expect(isoToInputValue(null)).toBe('');
    expect(isoToInputValue('not a date')).toBe('');
  });
});

describe('announcement form', () => {
  const filled = { ...EMPTY_FORM, title: ' Обновление ', message: ' Сервис недоступен ' };

  it('requires a title and a text', () => {
    expect(validateForm(EMPTY_FORM)).toBe('Укажите заголовок');
    expect(validateForm({ ...EMPTY_FORM, title: 'Обновление', message: '   ' })).toBe('Укажите текст объявления');
    expect(validateForm(filled)).toBeNull();
  });

  it('requires the end to be after the start', () => {
    expect(validateForm({ ...filled, showFrom: '2026-09-29T22:00', showUntil: '2026-09-29T22:00' }))
      .toBe('Окончание показа должно быть позже начала');
    expect(validateForm({ ...filled, showFrom: '2026-09-29T22:00', showUntil: '2026-09-29T23:00' })).toBeNull();
  });

  it('compares an end without a start with the current time', () => {
    expect(validateForm({ ...filled, showUntil: '2000-01-01T00:00' })).toBe('Окончание показа должно быть позже начала');
  });

  it('builds a trimmed request with UTC dates and nulls for empty ones', () => {
    expect(toRequest({ ...filled, severity: 'CRITICAL', showUntil: '2026-09-29T23:00' })).toEqual({
      title: 'Обновление',
      message: 'Сервис недоступен',
      severity: 'CRITICAL',
      showFrom: null,
      showUntil: new Date(2026, 8, 29, 23, 0).toISOString()
    });
  });
});
