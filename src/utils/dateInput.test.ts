import { describe, expect, it } from 'vitest';
import { dateError, dateForSave, dateInputValue, editDate, formatDateInput, normalizeDate } from './dateInput';

describe('formatDateInput', () => {
  it('ставит точки по мере ввода', () => {
    expect(formatDateInput('1')).toBe('1');
    expect(formatDateInput('11')).toBe('11');
    expect(formatDateInput('111')).toBe('11.1');
    expect(formatDateInput('1112')).toBe('11.12');
    expect(formatDateInput('11122')).toBe('11.12.2');
    expect(formatDateInput('11122001')).toBe('11.12.2001');
  });

  it('обрезает лишние цифры и не угадывает неполную дату', () => {
    expect(formatDateInput('111220011')).toBe('11.12.2001');
    expect(formatDateInput('1112001')).toBe('11.12.001');
  });

  it('дополняет нулем день и месяц перед введенной точкой', () => {
    expect(formatDateInput('1.')).toBe('01');
    expect(formatDateInput('1.5.')).toBe('01.05');
    expect(formatDateInput('1.5.1990')).toBe('01.05.1990');
  });

  it('переставляет ISO-дату и убирает лишние символы', () => {
    expect(formatDateInput('2001-12-11')).toBe('11.12.2001');
    expect(formatDateInput('11a')).toBe('11');
    expect(formatDateInput('')).toBe('');
  });
});

describe('normalizeDate', () => {
  it('приводит распространенные записи к ДД.ММ.ГГГГ', () => {
    expect(normalizeDate('1.5.1990')).toBe('01.05.1990');
    expect(normalizeDate('01/05/1990')).toBe('01.05.1990');
    expect(normalizeDate('1990-05-01')).toBe('01.05.1990');
    expect(normalizeDate('01051990')).toBe('01.05.1990');
    expect(normalizeDate(' 01.05.1990 ')).toBe('01.05.1990');
  });

  it('понимает дату словами', () => {
    expect(normalizeDate('« 20 » августа 2026г.')).toBe('20.08.2026');
    expect(normalizeDate('1 мая 2020')).toBe('01.05.2020');
    expect(normalizeDate('3 марта 2020 г.')).toBe('03.03.2020');
  });

  it('оставляет нераспознанное значение как есть', () => {
    expect(normalizeDate('не указано')).toBe('не указано');
    expect(normalizeDate(null)).toBe('');
  });
});

describe('dateInputValue', () => {
  it('показывает старые записи по маске', () => {
    expect(dateInputValue('1990-05-01')).toBe('01.05.1990');
    expect(dateInputValue('20 августа 2026 г.')).toBe('20.08.2026');
    expect(dateInputValue('01.05.1990')).toBe('01.05.1990');
    expect(dateInputValue(undefined)).toBe('');
  });
});

describe('dateError', () => {
  it('пустое поле допустимо, если оно необязательное', () => {
    expect(dateError('')).toBeNull();
    expect(dateError('', true)).toBe('Введите дату');
  });

  it('требует полную существующую дату', () => {
    expect(dateError('11.12.001')).toBe('Введите дату в формате ДД.ММ.ГГГГ');
    expect(dateError('31.02.2020')).toBe('Такой даты нет: проверьте день и месяц');
    expect(dateError('32.01.2020')).toBe('Такой даты нет: проверьте день и месяц');
    expect(dateError('01.13.2020')).toBe('Такой даты нет: проверьте день и месяц');
    expect(dateError('01.01.1800')).toBe('Год должен быть от 1900 до 2100');
    expect(dateError('29.02.2020')).toBeNull();
    expect(dateError('11.12.2001', true)).toBeNull();
  });
});

describe('dateForSave', () => {
  it('сохраняет дату в формате ДД.ММ.ГГГГ', () => {
    expect(dateForSave('1990-05-01')).toBe('01.05.1990');
    expect(dateForSave('  ')).toBe('');
    expect(dateForSave(undefined)).toBe('');
  });
});

describe('editDate', () => {
  it('ставит курсор в конец при вводе в конец', () => {
    expect(editDate('11', '111', 3)).toEqual({ value: '11.1', caret: 4 });
  });

  it('дополняет день нулем при вводе точки', () => {
    expect(editDate('1', '1.', 2)).toEqual({ value: '01', caret: 2 });
  });

  it('стирает цифру перед удаленной точкой', () => {
    // Backspace после первой точки в "11.12.2": стерли точку, стирается вторая цифра дня
    expect(editDate('11.12.2', '1112.2', 2)).toEqual({ value: '11.22', caret: 1 });
  });

  it('не пропускает буквы', () => {
    expect(editDate('11', '11a', 3)).toEqual({ value: '11', caret: 2 });
  });
});
