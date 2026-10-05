import { describe, expect, it } from 'vitest';
import {
  editPhone,
  formatPhone,
  formatPhoneInput,
  isPhoneBlank,
  isValidPhone,
  phoneDigits,
  phoneError,
  phoneForSave,
  phoneHref,
  phoneMatches
} from './phone';

describe('phoneDigits', () => {
  it('приводит российский номер без «+» к коду 7', () => {
    expect(phoneDigits('8 (999) 123-45-67')).toBe('79991234567');
    expect(phoneDigits('9991234567')).toBe('79991234567');
    expect(phoneDigits('79991234567')).toBe('79991234567');
  });

  it('не трогает номер с «+»', () => {
    expect(phoneDigits('+375 29 123-45-67')).toBe('375291234567');
    expect(phoneDigits('')).toBe('');
    expect(phoneDigits(null)).toBe('');
  });
});

describe('formatPhoneInput', () => {
  it('форматирует номер по мере ввода', () => {
    expect(formatPhoneInput('+7')).toBe('+7');
    expect(formatPhoneInput('+79')).toBe('+7 (9');
    expect(formatPhoneInput('+7999')).toBe('+7 (999');
    expect(formatPhoneInput('+79991')).toBe('+7 (999) 1');
    expect(formatPhoneInput('+7999123')).toBe('+7 (999) 123');
    expect(formatPhoneInput('+79991234')).toBe('+7 (999) 123-4');
    expect(formatPhoneInput('+799912345')).toBe('+7 (999) 123-45');
    expect(formatPhoneInput('+7999123456')).toBe('+7 (999) 123-45-6');
    expect(formatPhoneInput('+79991234567')).toBe('+7 (999) 123-45-67');
  });

  it('обрезает лишние цифры российского номера', () => {
    expect(formatPhoneInput('+799912345678')).toBe('+7 (999) 123-45-67');
  });

  it('приводит 8 и номер без кода к +7', () => {
    expect(formatPhoneInput('89991234567')).toBe('+7 (999) 123-45-67');
    expect(formatPhoneInput('9')).toBe('+7 (9');
    expect(formatPhoneInput('8')).toBe('+7');
  });

  it('оставляет другой код страны без маски', () => {
    expect(formatPhoneInput('+375 (29) 123-45-67')).toBe('+375291234567');
    expect(formatPhoneInput('+')).toBe('+');
    expect(formatPhoneInput('')).toBe('');
    expect(formatPhoneInput('abc')).toBe('');
  });
});

describe('проверка номера', () => {
  it('считает незаполненными пустое поле и код по умолчанию', () => {
    expect(isPhoneBlank('')).toBe(true);
    expect(isPhoneBlank('+')).toBe(true);
    expect(isPhoneBlank('+7')).toBe(true);
    expect(isPhoneBlank(undefined)).toBe(true);
    expect(isPhoneBlank('+7 (9')).toBe(false);
  });

  it('требует 11 цифр для российского и 8–15 для иностранного номера', () => {
    expect(isValidPhone('+7 (999) 123-45-67')).toBe(true);
    expect(isValidPhone('+7 (999) 123-45')).toBe(false);
    expect(isValidPhone('+375291234567')).toBe(true);
    expect(isValidPhone('+3752')).toBe(false);
    expect(isValidPhone('+1234567890123456')).toBe(false);
  });

  it('возвращает текст ошибки', () => {
    expect(phoneError('+7')).toBeNull();
    expect(phoneError('+7', true)).toBe('Введите номер телефона');
    expect(phoneError('+7 (999) 12')).toContain('+7 (999) 123-45-67');
    expect(phoneError('+3752')).toContain('от 8 до 15 цифр');
    expect(phoneError('+7 (999) 123-45-67', true)).toBeNull();
  });
});

describe('phoneForSave', () => {
  it('отправляет пустую строку вместо кода по умолчанию', () => {
    expect(phoneForSave('+7')).toBe('');
    expect(phoneForSave('')).toBe('');
    expect(phoneForSave(undefined)).toBe('');
  });

  it('отправляет номер по маске', () => {
    expect(phoneForSave('89991234567')).toBe('+7 (999) 123-45-67');
  });
});

describe('formatPhone', () => {
  it('показывает старые форматы российского номера по маске', () => {
    expect(formatPhone('+79991234567')).toBe('+7 (999) 123-45-67');
    expect(formatPhone('8 999 123 45 67')).toBe('+7 (999) 123-45-67');
    expect(formatPhone('9991234567')).toBe('+7 (999) 123-45-67');
  });

  it('оставляет как есть неполный, иностранный и пустой номер', () => {
    expect(formatPhone('+7 999 12')).toBe('+7 999 12');
    expect(formatPhone('+375 29 123-45-67')).toBe('+375 29 123-45-67');
    expect(formatPhone(null)).toBe('');
  });
});

describe('phoneHref', () => {
  it('строит ссылку для звонка с кодом страны', () => {
    expect(phoneHref('+7 (999) 123-45-67')).toBe('tel:+79991234567');
    expect(phoneHref('89991234567')).toBe('tel:+79991234567');
    expect(phoneHref('')).toBe('');
  });
});

describe('phoneMatches', () => {
  const phone = '+7 (999) 123-45-67';

  it('ищет по цифрам независимо от формата', () => {
    expect(phoneMatches(phone, '9991234')).toBe(true);
    expect(phoneMatches(phone, '+7 999 123')).toBe(true);
    expect(phoneMatches(phone, '8999')).toBe(true);
    expect(phoneMatches(phone, '89991234567')).toBe(true);
    expect(phoneMatches('89991234567', '+7 (999) 123')).toBe(true);
    expect(phoneMatches(phone, '555')).toBe(false);
  });

  it('ищет по тексту, если в запросе есть буквы', () => {
    expect(phoneMatches('доб. 12', 'доб')).toBe(true);
    expect(phoneMatches(phone, 'иван')).toBe(false);
    expect(phoneMatches(undefined, '999')).toBe(false);
  });
});

describe('editPhone', () => {
  it('ставит курсор в конец при вводе в конец', () => {
    expect(editPhone('+7 (999', '+7 (9991', 8)).toEqual({ value: '+7 (999) 1', caret: 10 });
  });

  it('сохраняет позицию курсора при правке в середине', () => {
    // В "+7 (999) 123-45-67" вставили 5 после первой 9: курсор остается за ней
    const edit = editPhone('+7 (999) 123-45-67', '+7 (9599) 123-45-67', 6);
    expect(edit.value).toBe('+7 (959) 912-34-56');
    expect(edit.caret).toBe(6);
  });

  it('стирает цифру перед удаленным разделителем', () => {
    // Backspace после «-» в "+7 (999) 123-4": стерли «-», стирается 3
    expect(editPhone('+7 (999) 123-4', '+7 (999) 1234', 12)).toEqual({ value: '+7 (999) 124', caret: 11 });
  });

  it('стирает цифру после разделителя при Delete', () => {
    // Delete перед «)» в "+7 (999) 123": стерли «)», стирается 1
    expect(editPhone('+7 (999) 123', '+7 (999 123', 7, true)).toEqual({ value: '+7 (999) 23', caret: 7 });
  });

  it('позволяет стереть код страны и ввести другой', () => {
    expect(editPhone('+7', '+', 1).value).toBe('+');
    expect(editPhone('+', '+3', 2).value).toBe('+3');
  });

  it('не дублирует код при вставке полного номера в поле с +7', () => {
    expect(editPhone('+7', '+78 (999) 123-45-67', 19).value).toBe('+7 (999) 123-45-67');
    expect(editPhone('+7', '+7+7 999 123 45 67', 18).value).toBe('+7 (999) 123-45-67');
    expect(editPhone('+7', '+79991234567', 12).value).toBe('+7 (999) 123-45-67');
  });

  it('приводит 8 к +7 при вводе в пустое поле', () => {
    expect(editPhone('', '8', 1)).toEqual({ value: '+7', caret: 2 });
    expect(editPhone('', '9', 1)).toEqual({ value: '+7 (9', caret: 5 });
  });
});
