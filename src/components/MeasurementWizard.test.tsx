import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MeasurementWizard } from './MeasurementWizard';

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

    expect(screen.getByText('Гостиная')).toBeInTheDocument();
    expect(screen.getByText('📐 Геометрия помещения')).toBeInTheDocument();
    expect(screen.getByText('📦 Материалы со склада')).toBeInTheDocument();
    expect(screen.getByText('💡 Освещение и доп. работы')).toBeInTheDocument();
  });

  it('allows adding a new room from presets', async () => {
    render(
      <MeasurementWizard
        materials={[]}
        canViewFinances={false}
      />
    );

    const bedroomPresetBtn = screen.getByText('+ Спальня');
    fireEvent.click(bedroomPresetBtn);

    // Должна появиться кнопка/таб Спальня
    expect(screen.getByText('Спальня')).toBeInTheDocument();
  });
});
