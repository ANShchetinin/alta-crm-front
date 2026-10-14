import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { getMeasurementByOrderId, type MeasurementDto } from '../../../api/measurements';
import { createQueryWrapper } from '../../../test-utils/queryWrapper';
import { measurementState, useOrderMeasurementState } from './useOrderMeasurementState';

vi.mock('../../../api/measurements', () => ({ getMeasurementByOrderId: vi.fn() }));

const item = { name: 'Полотно', type: 'MATERIAL', quantity: 10, unit: 'м²', unitSalePrice: 500, unitCostPrice: 0, totalSalePrice: 5000, totalCostPrice: 0 };

describe('measurementState', () => {
  it('treats a measurement with rooms or items as present, and only items as an estimate', () => {
    expect(measurementState(undefined)).toEqual({ hasMeasurement: false, hasEstimate: false });
    expect(measurementState({ rooms: [], items: [] } as unknown as MeasurementDto)).toEqual({ hasMeasurement: false, hasEstimate: false });
    expect(measurementState({ rooms: [{ roomName: 'Кухня' }], items: [] } as unknown as MeasurementDto))
      .toEqual({ hasMeasurement: true, hasEstimate: false });
    expect(measurementState({ rooms: [], items: [item] } as unknown as MeasurementDto)).toEqual({ hasMeasurement: true, hasEstimate: true });
  });
});

describe('useOrderMeasurementState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads the saved measurement of the order', async () => {
    vi.mocked(getMeasurementByOrderId).mockResolvedValue({ rooms: [], items: [item] } as unknown as MeasurementDto);

    const { result } = renderHook(() => useOrderMeasurementState(5, true), { wrapper: createQueryWrapper() });

    await waitFor(() => expect(result.current.hasEstimate).toBe(true));
    expect(getMeasurementByOrderId).toHaveBeenCalledWith(5);
  });

  it('does not load anything for a new order or when disabled', () => {
    renderHook(() => useOrderMeasurementState(null, true), { wrapper: createQueryWrapper() });
    const { result } = renderHook(() => useOrderMeasurementState(5, false), { wrapper: createQueryWrapper() });

    expect(result.current).toEqual({ hasMeasurement: false, hasEstimate: false });
    expect(getMeasurementByOrderId).not.toHaveBeenCalled();
  });
});
