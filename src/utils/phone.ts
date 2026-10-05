/** Код России, подставляемый в пустое поле телефона. */
export const PHONE_DEFAULT = '+7';
export const PHONE_PLACEHOLDER = '+7 (999) 123-45-67';

const RU_CODE = '7';
const RU_LENGTH = 11;
const MIN_FOREIGN_LENGTH = 8;
const MAX_LENGTH = 15;

const onlyDigits = (value: string) => value.replace(/\D/g, '');

/**
 * Цифры номера вместе с кодом страны. Номер без «+» считается российским:
 * ведущая 8 заменяется на 7, номер без кода (9991234567) получает 7.
 */
export const phoneDigits = (value?: string | null): string => {
  const trimmed = (value || '').trim();
  const digits = onlyDigits(trimmed);
  if (!digits || trimmed.startsWith('+')) {
    return digits;
  }
  if (digits.startsWith('8')) {
    return RU_CODE + digits.slice(1);
  }
  return digits.startsWith(RU_CODE) ? digits : RU_CODE + digits;
};

const isRussian = (digits: string) => digits.startsWith(RU_CODE);

/** Маска +7 (999) 123-45-67; разделитель появляется только перед следующей цифрой. */
const formatRussian = (digits: string) => {
  const local = digits.slice(1, RU_LENGTH);
  let result = PHONE_DEFAULT;
  if (local.length > 0) {
    result += ` (${local.slice(0, 3)}`;
  }
  if (local.length > 3) {
    result += `) ${local.slice(3, 6)}`;
  }
  if (local.length > 6) {
    result += `-${local.slice(6, 8)}`;
  }
  if (local.length > 8) {
    result += `-${local.slice(8, 10)}`;
  }
  return result;
};

const formatDigits = (digits: string) => (isRussian(digits) ? formatRussian(digits) : `+${digits.slice(0, MAX_LENGTH)}`);

/** Приводит вводимый номер к маске: российский — +7 (999) 123-45-67, иностранный — +<цифры>. */
export const formatPhoneInput = (value: string): string => {
  if (!value.trim()) {
    return '';
  }
  const digits = phoneDigits(value);
  if (!digits) {
    return value.includes('+') ? '+' : '';
  }
  return formatDigits(digits);
};

/** Поле не заполнено: пусто или стоит только код по умолчанию. */
export const isPhoneBlank = (value?: string | null): boolean => ['', '+', PHONE_DEFAULT].includes(formatPhoneInput(value || ''));

/** Номер полный: российский — 11 цифр, иностранный — от 8 до 15 цифр с кодом страны. */
export const isValidPhone = (value?: string | null): boolean => {
  const digits = phoneDigits(value);
  if (isRussian(digits)) {
    return digits.length === RU_LENGTH;
  }
  return digits.length >= MIN_FOREIGN_LENGTH && digits.length <= MAX_LENGTH;
};

/** Текст ошибки поля телефона или null, если значение допустимо. */
export const phoneError = (value: string, required = false): string | null => {
  if (isPhoneBlank(value)) {
    return required ? 'Введите номер телефона' : null;
  }
  if (isValidPhone(value)) {
    return null;
  }
  return isRussian(phoneDigits(value))
    ? `Номер должен быть в формате ${PHONE_PLACEHOLDER}`
    : 'Номер с кодом страны должен содержать от 8 до 15 цифр';
};

/** Значение для отправки на сервер: незаполненное поле — пустая строка, иначе номер по маске. */
export const phoneForSave = (value?: string | null): string => (isPhoneBlank(value) ? '' : formatPhoneInput(value || ''));

/** Номер для показа: российский по маске, остальные — как сохранены. */
export const formatPhone = (value?: string | null): string => {
  const trimmed = (value || '').trim();
  const digits = phoneDigits(trimmed);
  return isRussian(digits) && digits.length === RU_LENGTH ? formatRussian(digits) : trimmed;
};

/** Ссылка для звонка (tel:+79991234567) или пустая строка, если цифр нет. */
export const phoneHref = (value?: string | null): string => {
  const digits = phoneDigits(value);
  return digits ? `tel:+${digits}` : '';
};

/** Поиск по телефону: по цифрам (8999, +7 999 и 999 находят один номер) или по тексту. */
export const phoneMatches = (value: string | null | undefined, query: string): boolean => {
  if (!value) {
    return false;
  }
  const q = query.trim();
  const queryDigits = onlyDigits(q);
  if (queryDigits && queryDigits.length === q.replace(/[\s()+-]/g, '').length) {
    const digits = phoneDigits(value);
    return digits.includes(queryDigits)
      || onlyDigits(value).includes(queryDigits)
      || (queryDigits.startsWith('8') && digits.startsWith(RU_CODE + queryDigits.slice(1)));
  }
  return value.toLowerCase().includes(q.toLowerCase());
};

const countDigits = (value: string) => onlyDigits(value).length;

/** Позиция курсора сразу после n-й цифры (n = 0 — после ведущего «+»). */
const indexAfterDigits = (value: string, n: number) => {
  if (n <= 0) {
    return value.startsWith('+') ? 1 : 0;
  }
  let seen = 0;
  for (let i = 0; i < value.length; i++) {
    if (/\d/.test(value[i])) {
      seen++;
      if (seen === n) {
        return i + 1;
      }
    }
  }
  return value.length;
};

export interface PhoneEdit {
  value: string;
  caret: number;
}

/**
 * Применяет правку поля телефона и вычисляет курсор в отформатированном значении.
 * Стертый разделитель маски удаляет соседнюю цифру (иначе маска вернула бы его на место),
 * а вставка полного номера в поле с «+7» не дублирует код страны.
 */
export const editPhone = (previous: string, raw: string, caret: number, forward = false): PhoneEdit => {
  let text = raw;
  let position = caret;
  const rawDigits = countDigits(raw);

  if (raw.length < previous.length && rawDigits === countDigits(previous) && rawDigits > 0) {
    const digitsBefore = countDigits(raw.slice(0, caret));
    const target = forward ? digitsBefore + 1 : digitsBefore;
    if (target > 0 && target <= rawDigits) {
      const index = indexAfterDigits(raw, target) - 1;
      text = raw.slice(0, index) + raw.slice(index + 1);
      position = forward ? caret : index;
    }
  }

  const isPaste = raw.length - previous.length > 1;
  const digits = onlyDigits(text);
  if (isPaste && text.trim().startsWith(PHONE_DEFAULT) && digits.length === RU_LENGTH + 1 && /^7[78]/.test(digits)) {
    const pasted = text.slice(text.indexOf(PHONE_DEFAULT) + PHONE_DEFAULT.length);
    return editPhone('', pasted, pasted.length);
  }

  const formatted = formatPhoneInput(text);
  if (position >= text.length) {
    return { value: formatted, caret: formatted.length };
  }
  const added = Math.max(0, phoneDigits(text).length - countDigits(text));
  return { value: formatted, caret: indexAfterDigits(formatted, countDigits(text.slice(0, position)) + added) };
};
