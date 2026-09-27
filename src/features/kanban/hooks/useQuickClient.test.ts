import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useQuickClient } from './useQuickClient';
import { createClient, type Client } from '../../../api/clients';

vi.mock('../../../api/clients', () => ({ createClient: vi.fn() }));
vi.mock('../../../utils/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }
}));

const submitEvent = () => ({ preventDefault: vi.fn() }) as unknown as React.FormEvent;

describe('useQuickClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a client with a custom lead source, notifies and resets the form', async () => {
    vi.mocked(createClient).mockResolvedValue({ id: 42, name: 'ООО Ромашка' } as Client);
    const onCreated = vi.fn();
    const { result } = renderHook(() => useQuickClient(onCreated));

    act(() => {
      result.current.open();
      result.current.modalProps.setClientType('LEGAL_ENTITY');
      result.current.modalProps.setName('  ООО Ромашка ');
      result.current.modalProps.setInn('7700000000');
      result.current.modalProps.setLeadSource('custom');
      result.current.modalProps.setCustomLeadSource('Выставка');
    });
    await act(() => result.current.modalProps.onSubmit(submitEvent()));

    expect(createClient).toHaveBeenCalledWith(expect.objectContaining({
      name: 'ООО Ромашка',
      clientType: 'LEGAL_ENTITY',
      inn: '7700000000',
      leadSource: 'Выставка'
    }));
    expect(onCreated).toHaveBeenCalledWith({ id: 42, name: 'ООО Ромашка' });
    expect(result.current.modalProps.isOpen).toBe(false);
    expect(result.current.modalProps.name).toBe('');
    expect(result.current.modalProps.clientType).toBe('LEGAL_ENTITY');
  });

  it('does not submit without a name', async () => {
    const { result } = renderHook(() => useQuickClient(vi.fn()));

    await act(() => result.current.modalProps.onSubmit(submitEvent()));

    expect(createClient).not.toHaveBeenCalled();
  });

  it('fills the name from a scanned passport', () => {
    const { result } = renderHook(() => useQuickClient(vi.fn()));

    act(() => {
      result.current.modalProps.setClientType('LEGAL_ENTITY');
      result.current.applyPassport({ name: 'Петров Пётр' } as never);
    });

    expect(result.current.modalProps.name).toBe('Петров Пётр');
    expect(result.current.modalProps.clientType).toBe('INDIVIDUAL');
  });
});
