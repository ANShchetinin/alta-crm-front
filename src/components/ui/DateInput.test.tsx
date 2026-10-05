import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { DateInput } from './DateInput';

const Controlled = ({ initial = '', required = false }: { initial?: string; required?: boolean }) => {
  const [value, setValue] = useState(initial);
  return <DateInput aria-label="Дата" required={required} value={value} onChange={setValue} />;
};

const input = () => screen.getByLabelText('Дата') as HTMLInputElement;

describe('DateInput', () => {
  it('показывает подсказку формата и цифровую клавиатуру', () => {
    render(<Controlled />);
    expect(input().value).toBe('');
    expect(input().placeholder).toBe('ДД.ММ.ГГГГ');
    expect(input().inputMode).toBe('numeric');
  });

  it('ставит точки автоматически', () => {
    render(<Controlled />);
    fireEvent.change(input(), { target: { value: '11122001' } });
    expect(input().value).toBe('11.12.2001');
    expect(input().validity.valid).toBe(true);
  });

  it('не пропускает неполную дату', () => {
    render(<Controlled />);
    fireEvent.change(input(), { target: { value: '1112001' } });
    expect(input().value).toBe('11.12.001');
    expect(input().validity.valid).toBe(false);
    expect(input().validationMessage).toBe('Введите дату в формате ДД.ММ.ГГГГ');
  });

  it('не пропускает несуществующую дату', () => {
    render(<Controlled />);
    fireEvent.change(input(), { target: { value: '31022020' } });
    expect(input().validity.valid).toBe(false);
  });

  it('показывает старую запись по маске', () => {
    render(<Controlled initial="1990-05-01" />);
    expect(input().value).toBe('01.05.1990');
    expect(input().validity.valid).toBe(true);
  });

  it('требует заполнить обязательное поле', () => {
    render(<Controlled required />);
    expect(input().validity.valid).toBe(false);
  });

  it('передает наружу значение по маске', () => {
    const onChange = vi.fn();
    render(<DateInput aria-label="Дата" value="11" onChange={onChange} />);
    fireEvent.change(input(), { target: { value: '111' } });
    expect(onChange).toHaveBeenCalledWith('11.1');
  });
});
