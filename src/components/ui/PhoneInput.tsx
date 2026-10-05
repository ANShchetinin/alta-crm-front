import { useLayoutEffect, useRef, type ChangeEvent, type InputHTMLAttributes } from 'react';
import { editPhone, formatPhoneInput, PHONE_DEFAULT, PHONE_PLACEHOLDER, phoneError } from '../../utils/phone';

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
  const inputRef = useRef<HTMLInputElement>(null);
  const caretRef = useRef<number | null>(null);
  const displayed = value ? formatPhoneInput(value) : PHONE_DEFAULT;
  const error = phoneError(displayed, required);

  useLayoutEffect(() => {
    inputRef.current?.setCustomValidity(error ?? '');
  }, [error]);

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (caretRef.current !== null && input && document.activeElement === input) {
      input.setSelectionRange(caretRef.current, caretRef.current);
    }
    caretRef.current = null;
  }, [displayed]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const forward = (e.nativeEvent as InputEvent).inputType === 'deleteContentForward';
    const edit = editPhone(displayed, input.value, input.selectionStart ?? input.value.length, forward);
    if (edit.value === displayed) {
      // Значение не изменилось (введена не цифра) — возвращаем маску и курсор сразу, без перерисовки.
      input.value = displayed;
      input.setSelectionRange(edit.caret, edit.caret);
      return;
    }
    caretRef.current = edit.caret;
    onChange(edit.value);
  };

  return (
    <input
      {...rest}
      ref={inputRef}
      type="tel"
      inputMode="tel"
      autoComplete={rest.autoComplete ?? 'tel'}
      required={required}
      placeholder={placeholder}
      className={`phone-input ${className}`}
      value={displayed}
      onChange={handleChange}
      title={error ?? rest.title}
    />
  );
};
