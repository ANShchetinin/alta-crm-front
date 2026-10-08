import { describe, it, expect } from 'vitest';
import {
  buildContractOrderPayload,
  buildOrderPayload,
  calcOrderProfitability,
  createEmptyOrderForm,
  hasActAttachment,
  orderFormOverpayment,
  orderFormTotal,
  orderToFormData,
  resolveContractParams,
  specItemsFromMeasurement,
  withMeasurementResult
} from './orderForm';
import type { Order } from '../../../api/kanban';

const order: Order = {
  id: 5,
  clientId: 10,
  statusId: 2,
  address: 'Москва',
  description: 'Потолок',
  totalPrice: 50000,
  prepayment: 20000,
  installationPrice: 10000,
  installationDate: '2026-10-01T00:00:00',
  measurementDate: '2026-09-30T14:30:00',
  installedById: 7,
  installedByName: 'Олег'
};

describe('orderForm', () => {
  it('creates an empty form with the first status and default contract params', () => {
    const form = createEmptyOrderForm(3, ['Монтаж']);

    expect(form.statusId).toBe('3');
    expect(form.contractParams?.area).toBe('70,3');
    expect(form.contractParams?.actChecklist).toEqual([{ id: 'tpl_1', name: 'Монтаж', checked: false }]);
    expect(createEmptyOrderForm(undefined).statusId).toBe('');
  });

  it('maps an order to form values and restores the missing remainder', () => {
    const form = orderToFormData(order);

    expect(form).toMatchObject({
      clientId: '10',
      statusId: '2',
      totalPrice: '50000',
      prepayment: '20000',
      remainder: '30000',
      installationPrice: '10000',
      installationDate: '2026-10-01',
      measurementDate: '2026-09-30T14:30'
    });
  });

  it('turns a legacy single installer into the lead of the installers list', () => {
    expect(orderToFormData(order).installers).toEqual([
      expect.objectContaining({ employeeId: 7, employeeName: 'Олег', isLead: true, amount: 10000, sharePercent: 100 })
    ]);
  });

  it('keeps saved contract params and fills defaults for missing lists', () => {
    const form = orderToFormData({ ...order, contractParams: { area: '12', contractDate: '2026-01-02' } });

    expect(form.contractParams).toMatchObject({ area: '12', contractDate: '2026-01-02', specItems: [], customParams: {} });
  });

  it('builds the save payload and stamps installedAt only for a completed status without it', () => {
    const form = orderToFormData(order);
    const params = resolveContractParams(form.contractParams);

    const payload = buildOrderPayload(form, params, false);
    expect(payload).toMatchObject({
      clientId: 10,
      statusId: 2,
      totalPrice: 50000,
      remainder: 30000,
      installationDate: '2026-10-01T00:00:00',
      measurementDate: '2026-09-30T14:30:00',
      installedById: 7
    });
    expect(payload.installedAt).toBeUndefined();
    expect(buildOrderPayload(form, params, true).installedAt).toEqual(expect.any(String));
    expect(buildOrderPayload({ ...form, installedAt: '2026-01-01' }, params, true).installedAt).toBeUndefined();
  });

  it('falls back to the loaded order and includes materials in the contract payload', () => {
    const form = {
      ...createEmptyOrderForm(undefined),
      materials: [{ materialId: 1, quantity: 2, fixedCostPrice: 100, fixedSalePrice: 250, materialName: 'x' }]
    };

    const payload = buildContractOrderPayload(form, order, {}, 'Адрес из договора');

    expect(payload).toMatchObject({ clientId: 10, statusId: 2, totalPrice: 50000, address: 'Адрес из договора' });
    expect(payload.materials).toEqual([{ materialId: 1, quantity: 2, fixedCostPrice: 100, fixedSalePrice: 250 }]);
  });

  it('calculates profitability from the form', () => {
    const form = { ...orderToFormData(order), materials: [{ materialId: 1, quantity: 2, fixedCostPrice: 1500 }] };

    expect(calcOrderProfitability(form)).toEqual({ materialsCost: 3000, installationPrice: 10000, profit: 37000, marginPercent: 74 });
    expect(calcOrderProfitability(createEmptyOrderForm(undefined)).marginPercent).toBe(0);
  });

  it('does not count services as materials cost (installation is a separate line)', () => {
    const form = {
      ...orderToFormData(order),
      materials: [
        { materialId: 1, quantity: 2, fixedCostPrice: 1500, materialType: 'MATERIAL' as const },
        { materialId: 2, quantity: 1, fixedCostPrice: 700, materialType: 'SERVICE' as const }
      ]
    };

    expect(calcOrderProfitability(form).materialsCost).toBe(3000);
  });

  it('rounds materials cost and profit to whole rubles, like the server', () => {
    const form = {
      ...createEmptyOrderForm(undefined),
      totalPrice: '50000.5',
      installationPrice: '10000.4',
      materials: [{ materialId: 1, quantity: 1, fixedCostPrice: 1502.6 }]
    };

    expect(calcOrderProfitability(form)).toMatchObject({ materialsCost: 1503, profit: 38497 });
  });

  it('shows the order total and the client overpayment when the estimate is below the advance', () => {
    const form = { ...createEmptyOrderForm(undefined), totalPrice: '30000', prepayment: '40000', remainder: '' };

    expect(orderFormTotal(form)).toBe(30000);
    expect(orderFormOverpayment(form)).toBe(10000);
    expect(orderFormOverpayment({ ...form, totalPrice: '50000', remainder: '10000' })).toBe(0);
    expect(orderFormTotal({ ...form, totalPrice: '' })).toBe(40000);
  });

  it('takes the saved measurement result from the reloaded order and keeps other unsaved edits', () => {
    const edited = {
      ...orderToFormData(order),
      address: 'Новый адрес (не сохранен)',
      contractParams: { ...resolveContractParams(undefined), discount: '5%', area: '10' }
    };
    const saved = orderToFormData({
      ...order,
      totalPrice: 42000,
      remainder: 22000,
      installationPrice: 6000,
      installers: [{ employeeId: 7, amount: 6000, splitType: 'EQUAL' }],
      materials: [{ materialId: 100, materialName: 'Полотно', quantity: 20.5 }],
      contractParams: { area: '20.5', lightsCount: '6', specItems: [{ idx: 1, name: 'Полотно (Зал)', quantity: '20.5', unit: 'м²', price: 1000, total: 20500 }] }
    } as Order);

    const result = withMeasurementResult(edited, saved);

    expect(result).toMatchObject({ address: 'Новый адрес (не сохранен)', totalPrice: '42000', remainder: '22000', installationPrice: '6000' });
    expect(result.installers).toEqual(saved.installers);
    expect(result.materials).toEqual(saved.materials);
    expect(result.contractParams).toMatchObject({ area: '20.5', lightsCount: '6', discount: '5%' });
    expect(result.contractParams?.specItems).toHaveLength(1);
  });

  it('maps measurement items to contract spec rows', () => {
    expect(specItemsFromMeasurement([])).toEqual([]);
  });

  it('detects an act among uploaded or pending files', () => {
    expect(hasActAttachment([{ id: 1, fileName: 'scan.pdf', contentType: '', isAct: true }], [])).toBe(true);
    expect(hasActAttachment([], [new File([''], 'Акт выполненных работ.pdf')])).toBe(true);
    expect(hasActAttachment([{ id: 1, fileName: 'договор.pdf', contentType: '' }], [])).toBe(false);
  });
});
