import { describe, it, expect } from 'vitest';
import {
  normalizeDate,
  cleanIssuerText,
  parseTopPageIssuerAndDate,
  parseBottomPageNamesAndBirth,
  parseSeriesAndNumber,
  parseRegistrationStamp
} from './passportParser';

describe('passportParser Zoned Parsers', () => {
  it('normalizes dates correctly', () => {
    expect(normalizeDate('15.01.1990')).toBe('15.01.1990');
    expect(normalizeDate('l7.l2.2004')).toBe('17.12.2004');
    expect(normalizeDate('15/01/1990')).toBe('15.01.1990');
    expect(normalizeDate('15-01-90')).toBe('15.01.1990');
    expect(normalizeDate('19 Ноября 2003г.')).toBe('19.11.2003');
    expect(normalizeDate('30.12.2025')).toBe('30.12.2025');
  });

  it('cleans issuer noise words and seal artifacts', () => {
    const raw = 'НЕЕ ОТДЕЛОМ ВНУТРЕННИХ ДЕЛ. eel pact | ОКТЯБРЬСКОГО ОКРУГА ~ ГОРОДА АРХАНГЕЛЬСКА';
    const cleaned = cleanIssuerText(raw);
    expect(cleaned).toContain('ОТДЕЛОМ ВНУТРЕННИХ ДЕЛ');
    expect(cleaned).toContain('ОКТЯБРЬСКОГО ОКРУГА');
    expect(cleaned).toContain('ГОРОДА АРХАНГЕЛЬСКА');
    expect(cleaned).not.toContain('eel');
    expect(cleaned).not.toContain('|');
    expect(cleaned).not.toContain('~');
  });

  it('parses Page 2 top zone (Issuer, Date, Code) from real sample', () => {
    const topText = `
      РОССИЙСКАЯ ФЕДЕРАЦИЯ
      Паспорт выдан ОТДЕЛОМ ВНУТРЕННИХ ДЕЛ
      ПЕРЕЛЮБСКОГО РАЙОНА
      САРАТОВСКОЙ ОБЛАСТИ
      01.03.2007 642-032
    `;

    const top = parseTopPageIssuerAndDate(topText);
    expect(top.departmentCode).toBe('642-032');
    expect(top.issuedDate).toBe('01.03.2007');
    expect(top.issuedBy).toContain('ОТДЕЛОМ ВНУТРЕННИХ ДЕЛ ПЕРЕЛЮБСКОГО РАЙОНА САРАТОВСКОЙ ОБЛАСТИ');
  });

  it('parses Page 3 bottom zone (Names, Birth Date, Gender) from real sample', () => {
    const botText = `
      Фамилия
      ЩЕТИНИН
      Имя
      АЛЕКСАНДР
      Отчество
      НИКОЛАЕВИЧ
      Пол МУЖ. Дата рождения 05.02.1987
      Место рождения ПОС. ЦЕЛИННЫЙ ПЕРЕЛЮБСКОГО Р-НА САРАТОВСКОЙ ОБЛ.
    `;

    const bot = parseBottomPageNamesAndBirth(botText);
    expect(bot.lastName).toBe('Щетинин');
    expect(bot.firstName).toBe('Александр');
    expect(bot.middleName).toBe('Николаевич');
    expect(bot.fullName).toBe('Щетинин Александр Николаевич');
    expect(bot.birthDate).toBe('05.02.1987');
    expect(bot.gender).toBe('MALE');
  });

  it('parses vertical series & number correctly', () => {
    expect(parseSeriesAndNumber('63 06 969595').seriesNumber).toBe('63 06 969595');
    expect(parseSeriesAndNumber('6306 969595').seriesNumber).toBe('63 06 969595');
  });

  it('extracts address from real registration stamp photo', () => {
    const regSample = `
      ЗАРЕГИСТРИРОВАН
      30.12.2025
      Г. САНКТ-ПЕТЕРБУРГ
      НАБ. МИКЛУХО-МАКЛАЯ
      Д. 3 К. 1 СТР. 1, КВ. 1030
      2 ОТДЕЛЕНИЕ ОВМ УМВД РОССИИ ПО
      ВАСИЛЕОСТРОВСКОМУ РАЙОНУ Г. САНКТ-ПЕТЕРБУРГА
      780-004 Заверил:
    `;

    const reg = parseRegistrationStamp(regSample);
    expect(reg.registrationDate).toBe('30.12.2025');
    expect(reg.address).toContain('САНКТ-ПЕТЕРБУРГ');
    expect(reg.address).toContain('МИКЛУХО-МАКЛАЯ');
    expect(reg.address).toContain('3');
    expect(reg.address).toContain('1030');
    expect(reg.address).not.toContain('ВАСИЛЕОСТРОВСКОМУ');
    expect(reg.address).not.toContain('Заверил');
  });
});
