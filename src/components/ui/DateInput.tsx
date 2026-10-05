import type { InputHTMLAttributes } from 'react';
import { DATE_PLACEHOLDER, dateError, dateInputValue, editDate } from '../../utils/dateInput';
import { useMaskedInput } from './useMaskedInput';

export interface DateInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Текстовое поле даты с маской ДД.ММ.ГГГГ: точки ставятся автоматически, старые записи (1990-05-01, 1.5.1990)
 * показываются по маске. Неполная или несуществующая дата (и пустая при required) не дает отправить форму.
 */
export const DateInput = ({ value, onChange, required, placeholder = DATE_PLACEHOLDER, className = 'search-input', ...rest }: DateInputProps) => {
  const displayed = dateInputValue(value);
  const error = dateError(displayed, required);
  const { inputRef, handleChange } = useMaskedInput(displayed, error, editDate, onChange);

  return (
    <input
      {...rest}
      ref={inputRef}
      type="text"
      inputMode="numeric"
      autoComplete={rest.autoComplete ?? 'off'}
      required={required}
      placeholder={placeholder}
      className={`masked-input ${className}`}
      value={displayed}
      onChange={handleChange}
      title={error ?? rest.title}
    />
  );
};
