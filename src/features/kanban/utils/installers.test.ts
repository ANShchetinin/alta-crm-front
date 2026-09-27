import { describe, it, expect } from 'vitest';
import {
  addInstaller,
  distributeInstallerAmounts,
  leadInstallerFields,
  removeInstaller,
  setInstallerAmount
} from './installers';
import type { OrderInstaller } from '../../../api/kanban';
import type { Employee } from '../../../api/employees';

const employee = (id: number, name: string) => ({ id, name, phone: `+7999000000${id}` } as Employee);
const installer = (employeeId: number, extra: Partial<OrderInstaller> = {}): OrderInstaller => ({ employeeId, ...extra });

describe('installers', () => {
  it('splits equally and gives the rounding remainder to the last installer', () => {
    const result = distributeInstallerAmounts([installer(1), installer(2), installer(3)], 1000, true);

    expect(result.map(i => i.amount)).toEqual([333.33, 333.33, 333.34]);
    expect(result.every(i => i.sharePercent === 33.33 && i.splitType === 'EQUAL')).toBe(true);
  });

  it('recalculates percent split from shares', () => {
    const result = distributeInstallerAmounts(
      [installer(1, { splitType: 'PERCENT', sharePercent: 70 }), installer(2, { splitType: 'PERCENT', sharePercent: 30 })],
      10000
    );

    expect(result.map(i => i.amount)).toEqual([7000, 3000]);
  });

  it('keeps fixed amounts untouched', () => {
    const items = [installer(1, { splitType: 'FIXED', amount: 100 })];

    expect(distributeInstallerAmounts(items, 5000)).toBe(items);
    expect(distributeInstallerAmounts(undefined, 5000)).toEqual([]);
  });

  it('adds the first installer as lead with the whole installation price', () => {
    const result = addInstaller([], employee(1, 'Олег'), 8000);

    expect(result).toEqual([expect.objectContaining({ employeeId: 1, employeeName: 'Олег', isLead: true, amount: 8000, sharePercent: 100 })]);
  });

  it('adds the next installer as non-lead and splits equally', () => {
    const result = addInstaller([installer(1, { isLead: true, amount: 8000 })], employee(2, 'Пётр'), 8000);

    expect(result.map(i => [i.employeeId, i.isLead, i.amount])).toEqual([[1, true, 4000], [2, false, 4000]]);
  });

  it('promotes the first remaining installer when the lead is removed, without mutating the input', () => {
    const items = [installer(1, { isLead: true }), installer(2, { isLead: false }), installer(3, { isLead: false })];

    const result = removeInstaller(items, 0, 9000);

    expect(result.map(i => [i.employeeId, i.isLead, i.amount])).toEqual([[2, true, 4500], [3, false, 4500]]);
    expect(items[1].isLead).toBe(false);
  });

  it('fixes an individual amount and derives its share', () => {
    const result = setInstallerAmount([installer(1), installer(2)], 1, 2500, 10000);

    expect(result[1]).toEqual(expect.objectContaining({ splitType: 'FIXED', amount: 2500, sharePercent: 25 }));
    expect(result[0]).toEqual(installer(1));
  });

  it('derives lead installer form fields', () => {
    const fields = leadInstallerFields([
      installer(1, { employeeName: 'Олег' }),
      installer(2, { employeeName: 'Пётр', isLead: true, employeeAvatarUrl: 'a.png' })
    ]);

    expect(fields).toMatchObject({ installedById: '2', installedByName: 'Пётр', installedByAvatarUrl: 'a.png' });
    expect(leadInstallerFields([])).toMatchObject({ installedById: '', installedByName: '' });
  });
});
