import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { MeasurementWizard } from './MeasurementWizard';
import { renderWithQuery } from '../test-utils/queryWrapper';
import { getMaterials } from '../api/storage';

vi.mock('../api/storage', () => ({
  getMaterials: vi.fn().mockResolvedValue([])
}));

vi.mock('../api/estimationServices', () => ({
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

vi.mock('../api/measurements', () => ({
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
});
