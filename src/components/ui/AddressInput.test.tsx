import type { HTMLProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AddressInput } from './AddressInput';

const selected = { value: 'г Москва, ул Ленина, д 10', unrestricted_value: '101000, г Москва, ул Ленина, д 10', data: {} };

vi.mock('react-dadata', () => ({
  AddressSuggestions: ({ value, onChange, inputProps }: {
    value?: { value: string };
    onChange: (suggestion?: typeof selected) => void;
    inputProps: HTMLProps<HTMLInputElement>;
  }) => (
    <div>
      <input {...inputProps} value={value?.value ?? ''} />
      <button type="button" onClick={() => onChange(selected)}>Выбрать подсказку</button>
    </div>
  )
}));

describe('AddressInput', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('без ключа DaData работает как обычное поле', () => {
    vi.stubEnv('VITE_DADATA_API_KEY', '');
    const onChange = vi.fn();
    render(<AddressInput aria-label="Адрес" value="" onChange={onChange} />);
    expect(screen.queryByText('Выбрать подсказку')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Адрес'), { target: { value: 'ул. Мира' } });
    expect(onChange).toHaveBeenCalledWith('ул. Мира');
  });

  it('с ключом показывает подсказки и сохраняет свободный ввод', () => {
    vi.stubEnv('VITE_DADATA_API_KEY', 'token');
    const onChange = vi.fn();
    render(<AddressInput aria-label="Адрес" value="ул. Ми" onChange={onChange} />);
    expect(screen.getByLabelText('Адрес')).toHaveValue('ул. Ми');
    fireEvent.change(screen.getByLabelText('Адрес'), { target: { value: 'ул. Мира' } });
    expect(onChange).toHaveBeenCalledWith('ул. Мира');
  });

  it('подставляет адрес из выбранной подсказки', () => {
    vi.stubEnv('VITE_DADATA_API_KEY', 'token');
    const onChange = vi.fn();
    render(<AddressInput aria-label="Адрес" value="" onChange={onChange} />);
    fireEvent.click(screen.getByText('Выбрать подсказку'));
    expect(onChange).toHaveBeenCalledWith('г Москва, ул Ленина, д 10');
  });

  it('для реквизитов подставляет адрес с индексом', () => {
    vi.stubEnv('VITE_DADATA_API_KEY', 'token');
    const onChange = vi.fn();
    render(<AddressInput aria-label="Адрес" withPostalCode value="" onChange={onChange} />);
    fireEvent.click(screen.getByText('Выбрать подсказку'));
    expect(onChange).toHaveBeenCalledWith('101000, г Москва, ул Ленина, д 10');
  });
});
