import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PhoneInput } from './PhoneInput';

const Controlled = ({ initial = '', required = false, onSubmit = () => {} }: { initial?: string; required?: boolean; onSubmit?: () => void }) => {
  const [value, setValue] = useState(initial);
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
      <PhoneInput aria-label="Телефон" required={required} value={value} onChange={setValue} />
      <button type="submit">Сохранить</button>
    </form>
  );
};

const input = () => screen.getByLabelText('Телефон') as HTMLInputElement;

describe('PhoneInput', () => {
  it('показывает +7 в пустом поле', () => {
    render(<Controlled />);
    expect(input().value).toBe('+7');
    expect(input().type).toBe('tel');
  });

  it('форматирует введенный номер', () => {
    render(<Controlled />);
    fireEvent.change(input(), { target: { value: '89991234567' } });
    expect(input().value).toBe('+7 (999) 123-45-67');
  });

  it('показывает сохраненный номер старого формата по маске', () => {
    render(<Controlled initial="+79991234567" />);
    expect(input().value).toBe('+7 (999) 123-45-67');
  });

  it('позволяет заменить код страны', () => {
    render(<Controlled />);
    fireEvent.change(input(), { target: { value: '+' } });
    fireEvent.change(input(), { target: { value: '+375291234567' } });
    expect(input().value).toBe('+375291234567');
    expect(input().validity.valid).toBe(true);
  });

  it('не пропускает неполный номер', () => {
    render(<Controlled />);
    fireEvent.change(input(), { target: { value: '+7999123' } });
    expect(input().validity.valid).toBe(false);
    expect(input().validationMessage).toContain('+7 (999) 123-45-67');
  });

  it('не пропускает обязательное поле только с кодом страны', () => {
    const onSubmit = vi.fn();
    render(<Controlled required onSubmit={onSubmit} />);
    expect(input().validity.valid).toBe(false);
    expect(input().validationMessage).toBe('Введите номер телефона');
    fireEvent.change(input(), { target: { value: '+79991234567' } });
    expect(input().validity.valid).toBe(true);
  });

  it('пропускает пустое необязательное поле', () => {
    render(<Controlled />);
    expect(input().validity.valid).toBe(true);
  });

  it('передает наружу значение по маске', () => {
    const onChange = vi.fn();
    render(<PhoneInput aria-label="Телефон" value="+7" onChange={onChange} />);
    fireEvent.change(input(), { target: { value: '+79' } });
    expect(onChange).toHaveBeenCalledWith('+7 (9');
  });
});
