import { describe, it, expect } from 'vitest';
import { isCompletedStatus } from './orderStatus';

describe('isCompletedStatus', () => {
  it('uses the isCompleted flag only, whatever the stage is called', () => {
    expect(isCompletedStatus({ id: 1, name: 'Готов к монтажу', color: '', sortOrder: 1, isCompleted: false })).toBe(false);
    expect(isCompletedStatus({ id: 2, name: 'Сдан', color: '', sortOrder: 2, isCompleted: true })).toBe(true);
    expect(isCompletedStatus({ id: 3, name: 'Завершен', color: '', sortOrder: 3 })).toBe(false);
    expect(isCompletedStatus(undefined)).toBe(false);
  });
});
