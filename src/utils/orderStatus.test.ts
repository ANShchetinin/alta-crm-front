import { describe, it, expect } from 'vitest';
import type { OrderStatus } from '../api/kanban';
import { completionLabel, isActRequired, isCompletedStatus, isInstallationStage } from './orderStatus';

describe('isCompletedStatus', () => {
  it('uses the isCompleted flag only, whatever the stage is called', () => {
    expect(isCompletedStatus({ id: 1, name: 'Готов к монтажу', color: '', sortOrder: 1, isCompleted: false })).toBe(false);
    expect(isCompletedStatus({ id: 2, name: 'Сдан', color: '', sortOrder: 2, isCompleted: true })).toBe(true);
    expect(isCompletedStatus({ id: 3, name: 'Завершен', color: '', sortOrder: 3 })).toBe(false);
    expect(isCompletedStatus(undefined)).toBe(false);
  });
});

describe('isInstallationStage', () => {
  const stage = (id: number, flags: Partial<OrderStatus> = {}): OrderStatus => ({ id, name: '', color: '', sortOrder: id, ...flags });

  it('allows completing installation on any open stage until an installation stage is set', () => {
    const columns = [stage(1), stage(2), stage(3, { isCompleted: true })];
    expect(isInstallationStage(columns[0], columns)).toBe(true);
    expect(isInstallationStage(columns[2], columns)).toBe(false);
    expect(isInstallationStage(undefined, columns)).toBe(false);
  });

  it('allows it only on installation stages once one is set', () => {
    const columns = [stage(1), stage(2, { isInstallation: true }), stage(3, { isCompleted: true })];
    expect(isInstallationStage(columns[0], columns)).toBe(false);
    expect(isInstallationStage(columns[1], columns)).toBe(true);
  });
});

describe('isActRequired', () => {
  it('requires the act only for an order with a contract number', () => {
    expect(isActRequired('Д-1/26')).toBe(true);
    expect(isActRequired('  ')).toBe(false);
    expect(isActRequired(null)).toBe(false);
    expect(isActRequired(undefined)).toBe(false);
  });
});

describe('completionLabel', () => {
  it('names a finished order by whether it had an installer', () => {
    expect(completionLabel(true)).toBe('Монтаж завершен');
    expect(completionLabel(false)).toBe('Сделка закрыта');
  });
});
