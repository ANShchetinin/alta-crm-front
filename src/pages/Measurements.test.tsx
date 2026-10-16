import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithQuery } from '../test-utils/queryWrapper';
import { Measurements } from './Measurements';
import type { Order } from '../api/kanban';

const orders: Order[] = [
  { id: 1, clientId: 1, clientName: 'Клиент без замера', statusId: 1, address: 'ул. Ленина, 1', description: '', totalPrice: 0 },
  { id: 2, clientId: 2, clientName: 'Клиент с замером', statusId: 1, address: 'ул. Мира, 2', description: '', totalPrice: 0, measured: true }
];

vi.mock('../hooks/queries/useOrdersQuery', () => ({
  ORDERS_QUERY_KEY: ['orders'],
  useOrdersQuery: () => ({ data: orders, isLoading: false })
}));
vi.mock('../hooks/queries/useStorageQuery', () => ({
  useMaterialsQuery: () => ({ data: [], isLoading: false })
}));
vi.mock('../features/measurements/components/MeasurementWizard', () => ({ MeasurementWizard: () => null }));

describe('Measurements', () => {
  it('hides orders that are already measured', () => {
    renderWithQuery(<Measurements />);
    fireEvent.click(screen.getByRole('button', { name: 'Все заявки' }));

    expect(screen.getByText('Клиент без замера')).toBeInTheDocument();
    expect(screen.queryByText('Клиент с замером')).not.toBeInTheDocument();
  });
});
