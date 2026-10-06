import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Order } from '../../../../api/kanban';
import { CardAddress, CardFinance } from './CardParts';

const order = (fields: Partial<Order>) => ({ id: 1, clientId: 1, statusId: 1, ...fields }) as Order;

describe('CardFinance', () => {
  it('hides the block when the order has no amounts, files, comments or margin', () => {
    const { container } = render(<CardFinance card={order({ totalPrice: 0, prepayment: 0 })} onOpenComments={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('shows the total and only the non-zero payment part', () => {
    render(<CardFinance card={order({ totalPrice: 50000, prepayment: 0 })} onOpenComments={vi.fn()} />);

    expect(screen.getByText(/50\s000 ₽/, { selector: '.card-price-main' })).toBeInTheDocument();
    expect(screen.getByText(/Остаток/)).toBeInTheDocument();
    expect(screen.queryByText(/Аванс/)).not.toBeInTheDocument();
  });

  it('hides the remainder of a fully prepaid order', () => {
    render(<CardFinance card={order({ totalPrice: 30000, prepayment: 30000 })} onOpenComments={vi.fn()} />);

    expect(screen.getByText(/Аванс/)).toBeInTheDocument();
    expect(screen.queryByText(/Остаток/)).not.toBeInTheDocument();
  });

  it('keeps comments without showing a zero total', () => {
    render(<CardFinance card={order({ totalPrice: 0, commentsCount: 2 })} onOpenComments={vi.fn()} />);

    expect(screen.getByTitle('Комментарии (2)')).toBeInTheDocument();
    expect(screen.queryByText('0 ₽')).not.toBeInTheDocument();
    expect(screen.queryByText(/Остаток/)).not.toBeInTheDocument();
  });
});

describe('CardAddress', () => {
  it('shows route links as icons next to the address', () => {
    render(<CardAddress card={order({ address: 'ул. Ленина, 1', entrance: '2' })} />);

    expect(screen.getByText(/ул\. Ленина, 1, п\.2/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Маршрут в Яндекс.Картах / Навигаторе' })).toHaveClass('card-map-icon');
    expect(screen.getByRole('link', { name: 'Маршрут в 2ГИС' })).toHaveClass('card-map-icon');
  });

  it('renders nothing without an address', () => {
    const { container } = render(<CardAddress card={order({ address: undefined })} />);

    expect(container).toBeEmptyDOMElement();
  });
});
