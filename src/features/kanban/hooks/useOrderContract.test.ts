import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { useOrderContract } from './useOrderContract';
import { createEmptyOrderForm } from '../utils/orderForm';
import { getMeasurementByOrderId, type MeasurementDto } from '../../../api/measurements';
import { downloadContractDocx, updateOrder } from '../../../api/kanban';
import { updateClient, type Client } from '../../../api/clients';
import { toast } from '../../../utils/toast';

vi.mock('../../../api/kanban', () => ({
  downloadContractDocx: vi.fn(),
  getNextOrderNumber: vi.fn(),
  updateOrder: vi.fn()
}));
vi.mock('../../../api/clients', () => ({ updateClient: vi.fn() }));
vi.mock('../../../api/measurements', () => ({ getMeasurementByOrderId: vi.fn() }));
vi.mock('../../../utils/download', () => ({ downloadBlob: vi.fn() }));
vi.mock('../../../utils/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }
}));

const client = { id: 10, name: 'Иван', phone: '+7999', clientType: 'INDIVIDUAL', passportSeriesNumber: '1234 567890' } as Client;

const setup = (orderId: number | null) => renderHook(() => {
  const [form, setForm] = useState({ ...createEmptyOrderForm(1), clientId: '10', prepayment: '1000' });
  return {
    form,
    contract: useOrderContract({ orderId, formData: form, setFormData: setForm, currentOrder: null, clients: [client] })
  };
});

describe('useOrderContract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('recalculates a spec row total when quantity or price changes', () => {
    const { result } = setup(5);

    act(() => {
      result.current.contract.addSpecItem();
    });
    act(() => {
      result.current.contract.updateSpecItem(0, { quantity: '2,5' });
    });
    act(() => {
      result.current.contract.updateSpecItem(0, { price: 400 });
    });
    act(() => {
      result.current.contract.updateSpecItem(0, { name: 'Полотно' });
    });

    expect(result.current.contract.specItems[0]).toMatchObject({ name: 'Полотно', quantity: '2,5', price: 400, total: 1000 });
  });

  it('reindexes rows after removing one', () => {
    const { result } = setup(5);
    act(() => {
      result.current.contract.addSpecItem();
    });
    act(() => {
      result.current.contract.addSpecItem();
    });

    act(() => {
      result.current.contract.removeSpecItem(0);
    });

    expect(result.current.contract.specItems.map(i => i.idx)).toEqual([1]);
  });

  it('toggles act checklist items', () => {
    const { result } = setup(5);
    const firstId = result.current.contract.actChecklist[0].id;

    act(() => {
      result.current.contract.toggleActItem(firstId);
    });

    expect(result.current.contract.actChecklist[0].checked).toBe(true);
  });

  it('pulls measurement items into the spec and recalculates totals', async () => {
    vi.mocked(getMeasurementByOrderId).mockResolvedValue({
      rooms: [],
      items: [
        { name: 'Полотно', type: 'MATERIAL', quantity: 10, unit: 'м²', unitSalePrice: 500, unitCostPrice: 0, totalSalePrice: 5000, totalCostPrice: 0 }
      ]
    } as MeasurementDto);
    const { result } = setup(5);

    await act(() => result.current.contract.syncFromMeasurement());

    expect(result.current.form).toMatchObject({ totalPrice: '5000', remainder: '4000' });
    expect(result.current.contract.specItems).toHaveLength(1);
  });

  it('requires a saved order before generating a contract', () => {
    const { result } = setup(null);

    act(() => {
      result.current.contract.startGenerate();
    });

    expect(result.current.contract.isPromptOpen).toBe(false);
    expect(toast.warning).toHaveBeenCalled();
  });

  it('prefills the contract prompt, saves client and order, then downloads the document', async () => {
    vi.mocked(downloadContractDocx).mockResolvedValue(new Blob(['docx']));
    const { result } = setup(5);

    act(() => {
      result.current.contract.startGenerate();
    });
    expect(result.current.contract.promptData).toMatchObject({ clientId: 10, name: 'Иван', passportSeriesNumber: '1234 567890' });

    await act(() => result.current.contract.submitGenerate({ preventDefault: vi.fn() } as unknown as React.FormEvent));

    expect(updateClient).toHaveBeenCalledWith(10, expect.objectContaining({ passportSeriesNumber: '1234 567890' }));
    expect(updateOrder).toHaveBeenCalledWith(5, expect.objectContaining({ clientId: 10, contractParams: expect.any(Object) }));
    expect(downloadContractDocx).toHaveBeenCalledWith(5);
    expect(result.current.contract.isPromptOpen).toBe(false);
  });
});
