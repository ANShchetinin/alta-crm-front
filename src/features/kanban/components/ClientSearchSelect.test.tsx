import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClientSearchSelect } from './ClientSearchSelect';
import type { Client } from '../../../api/clients';

const mockClients: Client[] = [
  {
    id: 1,
    name: 'Алексей Смирнов',
    phone: '+79991234567',
    clientType: 'INDIVIDUAL',
    createdAt: '2026-01-01'
  },
  {
    id: 2,
    name: 'ООО Ромашка',
    phone: '+79997654321',
    inn: '7701234567',
    clientType: 'LEGAL_ENTITY',
    createdAt: '2026-01-01'
  }
];

describe('ClientSearchSelect', () => {
  it('renders placeholder when no client is selected', () => {
    render(
      <ClientSearchSelect
        value=""
        clients={mockClients}
        onChange={() => {}}
        onAddNewClient={() => {}}
      />
    );
    expect(screen.getByText('Выберите клиента из базы...')).toBeInTheDocument();
  });

  it('renders selected client details and phone', () => {
    render(
      <ClientSearchSelect
        value="1"
        clients={mockClients}
        onChange={() => {}}
        onAddNewClient={() => {}}
      />
    );
    expect(screen.getByText('Алексей Смирнов')).toBeInTheDocument();
    expect(screen.getByText('+79991234567')).toBeInTheDocument();
  });

  it('triggers onAddNewClient callback', () => {
    const handleAddNewClient = vi.fn();
    const { container } = render(
      <ClientSearchSelect
        value=""
        clients={mockClients}
        onChange={() => {}}
        onAddNewClient={handleAddNewClient}
      />
    );

    // Click trigger to open dropdown
    const trigger = container.firstChild?.firstChild as HTMLElement;
    fireEvent.click(trigger);
  });
});
