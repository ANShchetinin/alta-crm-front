import { describe, it, expect } from 'vitest';
import { isCompletedStatus } from './orderStatus';

describe('isCompletedStatus', () => {
  it('trusts the isCompleted flag over the status name', () => {
    expect(isCompletedStatus({ id: 1, name: 'Готов к монтажу', color: '', sortOrder: 1, isCompleted: false })).toBe(false);
    expect(isCompletedStatus({ id: 2, name: 'Сдан', color: '', sortOrder: 2, isCompleted: true })).toBe(true);
  });

  it('falls back to the status name when the flag is absent', () => {
    expect(isCompletedStatus({ id: 1, name: 'Завершен', color: '', sortOrder: 1 })).toBe(true);
    expect(isCompletedStatus({ id: 2, name: 'Новая', color: '', sortOrder: 2 })).toBe(false);
    expect(isCompletedStatus(undefined)).toBe(false);
  });
});
