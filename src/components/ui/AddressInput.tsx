import { useMemo, type CSSProperties, type FormEvent } from 'react';
import { AddressSuggestions, type DaDataAddress, type DaDataSuggestion } from 'react-dadata';
import 'react-dadata/dist/react-dadata.css';

export interface AddressInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  /** Подставлять адрес с индексом и регионом (юридический адрес, адрес регистрации для реквизитов). */
  withPostalCode?: boolean;
  className?: string;
  style?: CSSProperties;
  id?: string;
  'aria-label'?: string;
}

/** Пауза перед запросом подсказок, чтобы не отправлять запрос на каждую букву. */
const SUGGESTIONS_DELAY_MS = 300;
const MIN_CHARS = 3;

const toSuggestion = (address: string): DaDataSuggestion<DaDataAddress> | undefined => (
  address ? { value: address, unrestricted_value: address, data: {} as DaDataAddress } : undefined
);

/**
 * Поле адреса с подсказками DaData. Свободный ввод сохраняется как есть, выбор подсказки подставляет
 * нормализованный адрес. Без ключа VITE_DADATA_API_KEY — обычное текстовое поле.
 */
export const AddressInput = ({
  value,
  onChange,
  placeholder,
  required,
  disabled,
  withPostalCode = false,
  className = 'search-input',
  style,
  id,
  'aria-label': ariaLabel
}: AddressInputProps) => {
  const token = import.meta.env.VITE_DADATA_API_KEY as string | undefined;
  const suggestion = useMemo(() => toSuggestion(value), [value]);
  const inputStyle: CSSProperties = { width: '100%', paddingLeft: '12px', paddingRight: '12px', boxSizing: 'border-box', ...style };
  const inputProps = { id, placeholder, required, disabled, className, style: inputStyle, 'aria-label': ariaLabel, autoComplete: 'off' };

  if (!token) {
    return <input type="text" {...inputProps} value={value} onChange={(e) => onChange(e.target.value)} />;
  }

  return (
    <AddressSuggestions
      token={token}
      value={suggestion}
      delay={SUGGESTIONS_DELAY_MS}
      minChars={MIN_CHARS}
      onChange={(selected) => {
        if (selected) {
          onChange(withPostalCode ? selected.unrestricted_value : selected.value);
        }
      }}
      inputProps={{
        ...inputProps,
        onChange: (e: FormEvent<HTMLInputElement>) => onChange(e.currentTarget.value)
      }}
    />
  );
};
