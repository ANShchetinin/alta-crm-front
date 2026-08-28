import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MeasurementWizard } from './MeasurementWizard';

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
    render(
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
    render(
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
});
