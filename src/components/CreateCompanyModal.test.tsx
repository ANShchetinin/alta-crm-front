import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateCompanyModal } from './CreateCompanyModal';
import { tenantsApi } from '../api/tenants';

vi.mock('../api/tenants', () => ({
  tenantsApi: {
    createByOwner: vi.fn(),
  }
}));

describe('CreateCompanyModal', () => {
  const onClose = vi.fn();
  const onSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    render(<CreateCompanyModal isOpen={false} onClose={onClose} onSuccess={onSuccess} />);
    expect(screen.queryByText('Новая компания')).toBeNull();
  });

  it('renders modal with form fields when isOpen is true', () => {
    render(<CreateCompanyModal isOpen={true} onClose={onClose} onSuccess={onSuccess} />);
    expect(screen.getByText('Новая компания')).toBeDefined();
    expect(screen.getByPlaceholderText(/Потолки Премиум Екатеринбург/i)).toBeDefined();
  });

  it('submits form and calls createByOwner and onSuccess', async () => {
    (tenantsApi.createByOwner as any).mockResolvedValueOnce({ token: 'mock-new-token' });

    render(<CreateCompanyModal isOpen={true} onClose={onClose} onSuccess={onSuccess} />);

    const input = screen.getByPlaceholderText(/Потолки Премиум Екатеринбург/i);
    fireEvent.change(input, { target: { value: 'Филиал Север' } });

    const submitBtn = screen.getByRole('button', { name: 'Создать компанию' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(tenantsApi.createByOwner).toHaveBeenCalledWith({
        name: 'Филиал Север',
        timezone: 'Europe/Moscow',
        primaryColor: '#3b82f6',
        requisites: undefined
      });
      expect(onSuccess).toHaveBeenCalledWith('mock-new-token');
    });
  });
});