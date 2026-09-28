import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { MeasurementWizard } from './MeasurementWizard';
import { renderWithQuery } from '../../../test-utils/queryWrapper';
import { getMaterials } from '../../../api/storage';
import { saveOrderMeasurement } from '../../../api/measurements';

vi.mock('../../../api/storage', () => ({
  getMaterials: vi.fn().mockResolvedValue([])
}));

vi.mock('../../../api/estimationServices', () => ({
  getActiveEstimationServices: vi.fn().mockResolvedValue([
    {
      id: 1,
      name: 'Монтаж натяжного потолка',
      isActive: true,
      slots: [
        {
          id: 10,
          name: 'Фактура полотна',
          slotType: 'DROPDOWN',
          calculationBasis: 'AREA',
          wasteCoefficient: 1.05,
          isRequired: true,
          materials: [
            { materialId: 100, materialName: 'MSD Premium', unit: 'м²', salePrice: 500, costPrice: 200, isDefault: true }
          ]
        }
      ]
    }
  ])
}));

vi.mock('../../../api/measurements', () => ({
  getMeasurementByOrderId: vi.fn().mockResolvedValue({
    orderId: 1,
    rooms: [
      {
        roomName: 'Гостиная',
        area: 20,
        perimeter: 18,
        height: 2.7,
        baseCorners: 4,
        extraCorners: 0,
        lightsCount: 4
      }
    ]
  }),
  calculateOrderMeasurement: vi.fn().mockResolvedValue({
    totalSalePrice: 15000,
    totalCostPrice: 6000,
    expectedProfit: 9000,
    profitMarginPercent: 60,
    totalArea: 20,
    totalPerimeter: 18,
    totalRoomsCount: 1,
    totalLightsCount: 4,
    totalPipesCount: 0,
    totalCorniceLength: 0,
    items: [
      {
        name: 'Полотно MSD Мат',
        type: 'MATERIAL',
        quantity: 21,
        unit: 'м²',
        unitSalePrice: 500,
        unitCostPrice: 200,
        totalSalePrice: 10500,
        totalCostPrice: 4200
      }
    ]
  }),
  calculateStandaloneMeasurement: vi.fn().mockResolvedValue({
    totalSalePrice: 15000,
    totalCostPrice: 6000,
    expectedProfit: 9000,
    profitMarginPercent: 60,
    totalArea: 20,
    totalPerimeter: 18,
    totalRoomsCount: 1,
    totalLightsCount: 4,
    totalPipesCount: 0,
    totalCorniceLength: 0,
    items: []
  }),
  saveOrderMeasurement: vi.fn().mockResolvedValue({
    id: 100,
    orderId: 1,
    rooms: []
  })
}));

describe('MeasurementWizard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with default room controls', async () => {
    renderWithQuery(
      <MeasurementWizard
        materials={[]}
        canViewFinances={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Гостиная')).toBeInTheDocument();
      expect(screen.getByText('Геометрия помещения')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Монтаж натяжного потолка/i })).toBeInTheDocument();
    });
  });

  it('allows adding a new room from presets', async () => {
    renderWithQuery(
      <MeasurementWizard
        materials={[]}
        canViewFinances={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('+ Спальня')).toBeInTheDocument();
    });

    const bedroomPresetBtn = screen.getByText('+ Спальня');
    fireEvent.click(bedroomPresetBtn);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Спальня')).toBeInTheDocument();
    });
  });

  it('loads materials from the API when none are passed', async () => {
    renderWithQuery(<MeasurementWizard materials={[]} canViewFinances={false} />);

    await waitFor(() => expect(getMaterials).toHaveBeenCalledTimes(1));
  });

  it('does not load materials when they are passed as a prop', async () => {
    const materials = [{ id: 1, name: 'Полотно', unit: 'м²', quantityInStock: 10, costPrice: 100 }];
    renderWithQuery(<MeasurementWizard materials={materials} canViewFinances={false} />);

    await waitFor(() => expect(screen.getByText('+ Спальня')).toBeInTheDocument());
    expect(getMaterials).not.toHaveBeenCalled();
  });

  it('adds a service to the estimate and recalculates it when the area changes', async () => {
    renderWithQuery(<MeasurementWizard orderId={1} materials={[]} canViewFinances />);

    fireEvent.click(await screen.findByRole('button', { name: /Монтаж натяжного потолка/i }));
    // 20 м² × отход 1.05 = 21 м² по 500 ₽
    expect(screen.getAllByText(/10\s500\s₽/).length).toBeGreaterThan(0);

    fireEvent.change(screen.getByDisplayValue('20'), { target: { value: '30' } });
    // 30 × 1.05 = 31.5 м²
    expect(screen.getAllByText(/15\s750\s₽/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /Монтаж натяжного потолка/i }));
    expect(screen.getAllByText(/Нет позиций в смете/).length).toBeGreaterThan(0);
  });

  it('saves rooms and items to the order and reports the totals', async () => {
    const onSaved = vi.fn();
    renderWithQuery(<MeasurementWizard orderId={1} materials={[]} canViewFinances onSaved={onSaved} />);

    fireEvent.click(await screen.findByRole('button', { name: /Монтаж натяжного потолка/i }));
    fireEvent.change(screen.getByPlaceholderText(/Особые указания/), { target: { value: 'Скрытая проводка' } });
    fireEvent.click(screen.getByText('Сохранить смету в заказ'));

    await waitFor(() => expect(saveOrderMeasurement).toHaveBeenCalledWith(1, expect.objectContaining({
      orderId: 1,
      notes: 'Скрытая проводка',
      totalPrice: 10500,
      totalCostPrice: 4200
    })));
    const dto = vi.mocked(saveOrderMeasurement).mock.calls[0][1];
    expect(dto.rooms).toHaveLength(1);
    expect(dto.items).toHaveLength(1);
    expect(onSaved).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ totalSalePrice: 10500, expectedProfit: 6300, totalArea: 20 }));
  });

  it('removes a room together with its estimate items', async () => {
    renderWithQuery(<MeasurementWizard orderId={1} materials={[]} canViewFinances />);

    fireEvent.click(await screen.findByText('+ Спальня'));
    fireEvent.click(screen.getAllByText('+ Своя позиция')[0]);
    expect(screen.getAllByDisplayValue('Дополнительная позиция / работа').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByText('Удалить комнату'));

    expect(screen.queryByDisplayValue('Спальня')).not.toBeInTheDocument();
    expect(screen.queryAllByDisplayValue('Дополнительная позиция / работа')).toHaveLength(0);
  });
});
