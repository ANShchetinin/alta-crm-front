import type { InputHTMLAttributes } from 'react';
import { editPhone, formatPhoneInput, PHONE_DEFAULT, PHONE_PLACEHOLDER, phoneError } from '../../utils/phone';
import { useMaskedInput } from './useMaskedInput';

export interface PhoneInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Поле телефона с маской +7 (999) 123-45-67: в пустом поле стоит +7, номер форматируется при вводе,
 * код страны можно заменить (стереть +7 и ввести свой).
 * Неполный номер (и пустой при required) отмечается как невалидный — форма не отправится.
 */
export const PhoneInput = ({ value, onChange, required, placeholder = PHONE_PLACEHOLDER, className = 'search-input', ...rest }: PhoneInputProps) => {
  const displayed = value ? formatPhoneInput(value) : PHONE_DEFAULT;
  const error = phoneError(displayed, required);
  const { inputRef, handleChange } = useMaskedInput(displayed, error, editPhone, onChange);

  return (
    <input
      {...rest}
      ref={inputRef}
      type="tel"
      inputMode="tel"
      autoComplete={rest.autoComplete ?? 'tel'}
      required={required}
      placeholder={placeholder}
      className={`masked-input ${className}`}
      value={displayed}
      onChange={handleChange}
      title={error ?? rest.title}
    />
  );
};
