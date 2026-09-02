import { describe, it, expect } from 'vitest';
import {
  calculateIcaoCheckDigit,
  transliterateLatinToCyrillic,
  parseMrzDate,
  parseRussianPassportMrz
} from './mrzParser';

describe('mrzParser', () => {
  it('calculates ICAO check digit correctly', () => {
    // 451412345: (4*7 + 5*3 + 1*1 + 4*7 + 1*3 + 2*1 + 3*7 + 4*3 + 5*1) % 10 = 115 % 10 = 5
    const check = calculateIcaoCheckDigit('451412345');
    expect(check).toBe(5);
  });

  it('transliterates Latin names to Russian correctly according to MVD standard', () => {
    expect(transliterateLatinToCyrillic('IVANOV')).toBe('Иванов');
    expect(transliterateLatinToCyrillic('ALEKSANDR')).toBe('Александр');
    expect(transliterateLatinToCyrillic('SHCHETININ')).toBe('Щетинин');
    expect(transliterateLatinToCyrillic('DMITRII')).toBe('Дмитрий');
    expect(transliterateLatinToCyrillic('ANDREY')).toBe('Андрей');
  });

  it('parses YYMMDD to DD.MM.YYYY', () => {
    expect(parseMrzDate('900115')).toBe('15.01.1990');
    expect(parseMrzDate('051230')).toBe('30.12.2005');
  });

  it('parses valid Russian Passport MRZ block', () => {
    const rawOcr = `
      Some other text above
      P<RUSIVANOV<<IVAN<IVANOVICH<<<<<<<<<<<<<<<<<
      45141234567RUS9001158M<<<<<<<<<<<<<<<<<<<2
      Some text below
    `;

    const result = parseRussianPassportMrz(rawOcr);
    expect(result).not.toBeNull();
    if (result) {
      expect(result.lastName).toBe('Иванов');
      expect(result.firstName).toBe('Иван');
      expect(result.middleName).toBe('Иванович');
      expect(result.fullName).toBe('Иванов Иван Иванович');
      expect(result.passportSeries).toBe('45 14');
      expect(result.passportNumber).toBe('123456');
      expect(result.passportSeriesNumber).toBe('45 14 123456');
      expect(result.birthDate).toBe('15.01.1990');
      expect(result.gender).toBe('MALE');
    }
  });
});
