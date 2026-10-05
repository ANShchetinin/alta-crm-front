import { applyMaskedEdit, countDigits, type MaskedEdit } from './maskedInput';

/** Формат текстовых дат (паспорт, дата рождения, дата сдачи объекта): так их ждет бэкенд и шаблоны договоров. */
export const DATE_PLACEHOLDER = 'ДД.ММ.ГГГГ';

const MAX_DIGITS = 8;
const MIN_YEAR = 1900;
const MAX_YEAR = 2100;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/;
const SEPARATED_DATE = /^(\d{1,2})[./\-\s]+(\d{1,2})[./\-\s]+(\d{4})$/;
const WORDS_DATE = /(\d{1,2})\D*?([а-яё]{3,})\s*(\d{4})/i;
const MONTH_STEMS = [/^янв/, /^фев/, /^мар/, /^апр/, /^ма[йя]/, /^июн/, /^июл/, /^авг/, /^сен/, /^окт/, /^ноя/, /^дек/];

const pad = (value: string | number) => String(value).padStart(2, '0');

const applyMask = (digits: string) => {
  let result = digits.slice(0, 2);
  if (digits.length > 2) {
    result += `.${digits.slice(2, 4)}`;
  }
  if (digits.length > 4) {
    result += `.${digits.slice(4, MAX_DIGITS)}`;
  }
  return result;
};

/**
 * Приводит вводимую дату к маске ДД.ММ.ГГГГ: точки ставятся автоматически,
 * однозначный день или месяц перед введенной точкой дополняется нулем (1.5. → 01.05.), ISO-дата переставляется.
 */
export const formatDateInput = (value: string): string => {
  const trimmed = value.trim();
  const iso = ISO_DATE.exec(trimmed);
  if (iso) {
    return `${iso[3]}.${iso[2]}.${iso[1]}`;
  }
  const parts = trimmed.split(/\D+/);
  const digits = parts
    .map((part, index) => (index < parts.length - 1 && part.length === 1 ? pad(part) : part))
    .join('');
  return applyMask(digits.slice(0, MAX_DIGITS));
};

/**
 * Дата в формате ДД.ММ.ГГГГ из распространенных записей: 1.5.1990, 01/05/1990, 1990-05-01, 01051990,
 * «20» августа 2026 г. Нераспознанное значение возвращается без изменений.
 */
export const normalizeDate = (value?: string | null): string => {
  const trimmed = (value || '').trim();
  const iso = ISO_DATE.exec(trimmed);
  if (iso) {
    return `${iso[3]}.${iso[2]}.${iso[1]}`;
  }
  const separated = SEPARATED_DATE.exec(trimmed);
  if (separated) {
    return `${pad(separated[1])}.${pad(separated[2])}.${separated[3]}`;
  }
  if (/^\d{8}$/.test(trimmed)) {
    return applyMask(trimmed);
  }
  const words = WORDS_DATE.exec(trimmed);
  const month = words ? MONTH_STEMS.findIndex(stem => stem.test(words[2].toLowerCase())) : -1;
  if (words && month >= 0) {
    return `${pad(words[1])}.${pad(month + 1)}.${words[3]}`;
  }
  return trimmed;
};

/** Значение для поля ввода: старые записи со словами переводятся в ДД.ММ.ГГГГ, остальное — по маске. */
export const dateInputValue = (value?: string | null): string => {
  const text = value || '';
  return /[а-яёa-z]/i.test(text) ? normalizeDate(text) : formatDateInput(text);
};

const parseDate = (value: string) => {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value.trim());
  if (!match) {
    return null;
  }
  const [day, month, year] = match.slice(1).map(Number);
  return { day, month, year };
};

/** Текст ошибки поля даты или null, если значение допустимо (пустое необязательное поле допустимо). */
export const dateError = (value: string, required = false): string | null => {
  if (!value.trim()) {
    return required ? 'Введите дату' : null;
  }
  const parsed = parseDate(value);
  if (!parsed) {
    return `Введите дату в формате ${DATE_PLACEHOLDER}`;
  }
  const { day, month, year } = parsed;
  if (year < MIN_YEAR || year > MAX_YEAR) {
    return `Год должен быть от ${MIN_YEAR} до ${MAX_YEAR}`;
  }
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return 'Такой даты нет: проверьте день и месяц';
  }
  return null;
};

/** Значение для отправки на сервер: пустое поле — пустая строка, иначе дата в формате ДД.ММ.ГГГГ. */
export const dateForSave = (value?: string | null): string => normalizeDate(value);

/** Применяет правку поля даты и вычисляет курсор в отформатированном значении. */
export const editDate = (previous: string, raw: string, caret: number, forward = false): MaskedEdit =>
  applyMaskedEdit(previous, raw, caret, forward, formatDateInput, text => countDigits(formatDateInput(text)) - countDigits(text));
