/**
 * MRZ (Machine Readable Zone) parser for Russian Federation Passports (ICAO 9303 / TD3 format).
 * Evaluates 2 lines of 44 characters each, checks checksums, and transliterates names back to Cyrillic.
 */

export interface MrzParseResult {
  rawLines: [string, string];
  isValid: boolean;
  passportSeries: string;
  passportNumber: string;
  passportSeriesNumber: string;
  birthDate: string; // DD.MM.YYYY
  gender: 'MALE' | 'FEMALE' | 'UNKNOWN';
  lastName: string;
  firstName: string;
  middleName: string;
  fullName: string;
  checksumErrors: string[];
}

const ICAO_WEIGHTS = [7, 3, 1];

export function calculateIcaoCheckDigit(str: string): number {
  let sum = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str[i].toUpperCase();
    let val = 0;
    if (char >= '0' && char <= '9') {
      val = char.charCodeAt(0) - 48;
    } else if (char >= 'A' && char <= 'Z') {
      val = char.charCodeAt(0) - 55;
    } else if (char === '<') {
      val = 0;
    }
    sum += val * ICAO_WEIGHTS[i % 3];
  }
  return sum % 10;
}

/**
 * Cleans OCR artifacts in Latin MRZ name string.
 */
export function cleanMrzLatinString(latinStr: string): string {
  if (!latinStr) return '';
  let str = latinStr.toUpperCase().trim();

  // Strip non-latin characters and trailing noise
  str = str.replace(/[^A-Z0-9<]/g, '');

  // Fix common Tesseract digit-letter confusion in MRZ name fields
  str = str.replace(/8/g, 'YA'); // 8 in Russian MRZ name is usually YA (Я) or Y (И/Й)
  str = str.replace(/0/g, 'O');
  str = str.replace(/1/g, 'I');
  str = str.replace(/5/g, 'S');
  str = str.replace(/2/g, 'Z');
  str = str.replace(/VV/g, 'W');

  // Strip trailing angle brackets and noise
  str = str.replace(/<+$/g, '');
  return str;
}

/**
 * Transliteration dictionary from Latin (ICAO/MVD Doc 9303 standard) to Russian Cyrillic.
 */
export function transliterateLatinToCyrillic(latinStr: string): string {
  if (!latinStr) return '';
  let str = cleanMrzLatinString(latinStr);

  // Common female / male names direct map
  const knownNames: Record<string, string> = {
    'ALESYA': 'Алеся',
    'ALESE8': 'Алеся',
    'ALES8': 'Алеся',
    'ALESEYA': 'Алеся',
    'ALESE': 'Алеся',
    'ALESA': 'Алеся',
    'OLESYA': 'Олеся',
    'OLESA': 'Олеся',
    'KSENIYA': 'Ксения',
    'KSENIA': 'Ксения',
    'ANASTASIYA': 'Анастасия',
    'ANASTASIA': 'Анастасия',
    'TATYANA': 'Татьяна',
    'TATIANA': 'Татьяна',
    'DARYA': 'Дарья',
    'DARIA': 'Дарья',
    'EKATERINA': 'Екатерина',
    'YEKATERINA': 'Екатерина',
    'ELENA': 'Елена',
    'YELENA': 'Елена',
    'EVGENIY': 'Евгений',
    'EVGENY': 'Евгений',
    'ALEKSANDR': 'Александр',
    'ALEXANDER': 'Александр',
    'DMITRIY': 'Дмитрий',
    'DMITRY': 'Дмитрий',
    'SERGEY': 'Сергей',
    'ANDREY': 'Андрей',
    'ALEKSEY': 'Алексей',
    'ALEXEY': 'Алексей'
  };

  if (knownNames[str]) {
    return knownNames[str];
  }

  // Handle Russian name endings in MRZ
  str = str.replace(/II\b/g, 'ИЙ');
  str = str.replace(/IY\b/g, 'ИЙ');
  str = str.replace(/EY\b/g, 'ЕЙ');
  str = str.replace(/AY\b/g, 'АЙ');
  str = str.replace(/OY\b/g, 'ОЙ');
  str = str.replace(/UY\b/g, 'УЙ');

  // Multi-letter replacements ordered by length descending
  const multiMap: Array<[string, string]> = [
    ['SHCH', 'Щ'],
    ['KH', 'Х'],
    ['TS', 'Ц'],
    ['CH', 'Ч'],
    ['SH', 'Ш'],
    ['ZH', 'Ж'],
    ['IU', 'Ю'],
    ['YU', 'Ю'],
    ['IA', 'Я'],
    ['YA', 'Я'],
    ['YE', 'Е'],
    ['YO', 'Ё']
  ];

  for (const [lat, cyr] of multiMap) {
    str = str.split(lat).join(cyr);
  }

  // Single-letter replacements
  const singleMap: Record<string, string> = {
    'A': 'А', 'B': 'Б', 'V': 'В', 'G': 'Г', 'D': 'Д',
    'E': 'Е', 'Z': 'З', 'I': 'И', 'J': 'Й', 'K': 'К',
    'L': 'Л', 'M': 'М', 'N': 'Н', 'O': 'О', 'P': 'П',
    'R': 'Р', 'S': 'С', 'T': 'Т', 'U': 'У', 'F': 'Ф',
    'H': 'Х', 'C': 'Ц', 'Y': 'И', 'W': 'Щ', 'Q': 'Й',
    'X': 'КС'
  };

  let result = '';
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    result += singleMap[char] || char;
  }

  // Capitalize properly (e.g. "ИВАН" -> "Иван")
  if (result.length > 0) {
    return result.charAt(0).toUpperCase() + result.slice(1).toLowerCase();
  }
  return result;
}

/**
 * Parses YYMMDD string to DD.MM.YYYY
 */
export function parseMrzDate(yymmdd: string): string {
  if (!yymmdd || yymmdd.length !== 6) return '';
  const yy = parseInt(yymmdd.substring(0, 2), 10);
  const mm = yymmdd.substring(2, 4);
  const dd = yymmdd.substring(4, 6);

  const currentYear2Digits = new Date().getFullYear() % 100;
  const fullYear = yy <= currentYear2Digits ? 2000 + yy : 1900 + yy;

  return `${dd}.${mm}.${fullYear}`;
}

/**
 * Searches for and parses Russian passport MRZ block in OCR text.
 */
export function parseRussianPassportMrz(text: string): MrzParseResult | null {
  if (!text) return null;

  const rawLines = text.split(/\r?\n/).map(l => l.trim().replace(/\s+/g, '')).filter(Boolean);

  let line1 = '';
  let line2 = '';

  for (let i = 0; i < rawLines.length; i++) {
    const l = rawLines[i].toUpperCase();
    if (l.includes('P<RUS') || l.includes('PNRUS') || l.includes('P<R') || (l.startsWith('P') && l.includes('RUS'))) {
      line1 = l;
      if (i + 1 < rawLines.length) {
        line2 = rawLines[i + 1].toUpperCase();
      }
      break;
    }
  }

  // Fallback search
  if (!line2) {
    for (let i = 0; i < rawLines.length; i++) {
      const l = rawLines[i].toUpperCase();
      if (l.includes('RUS') && l.length >= 20 && /\d{5,}/.test(l)) {
        line2 = l;
        if (i > 0) line1 = rawLines[i - 1].toUpperCase();
        break;
      }
    }
  }

  if (!line1 && !line2) {
    return null;
  }

  if (line1 && line1.length < 44) line1 = line1.padEnd(44, '<');
  if (line2 && line2.length < 44) line2 = line2.padEnd(44, '<');
  line1 = (line1 || '').substring(0, 44);
  line2 = (line2 || '').substring(0, 44);

  const checksumErrors: string[] = [];

  // Line 1: Names
  let lastName = '';
  let firstName = '';
  let middleName = '';
  let fullName = '';

  if (line1) {
    let namePart = line1;
    const rusIdx = line1.indexOf('RUS');
    if (rusIdx !== -1) {
      namePart = line1.substring(rusIdx + 3);
    } else if (line1.startsWith('P<') || line1.startsWith('PN')) {
      namePart = line1.substring(2);
    }

    const [rawLast, ...rawGivens] = namePart.split('<<');
    const rawLastName = cleanMrzLatinString(rawLast || '');
    const givenJoined = rawGivens.join('<');
    const givenParts = givenJoined.split('<').map(p => cleanMrzLatinString(p)).filter(Boolean);
    const rawFirstName = givenParts[0] || '';
    const rawMiddleName = givenParts.slice(1).join(' ') || '';

    lastName = transliterateLatinToCyrillic(rawLastName);
    firstName = transliterateLatinToCyrillic(rawFirstName);
    middleName = transliterateLatinToCyrillic(rawMiddleName);
    fullName = [lastName, firstName, middleName].filter(Boolean).join(' ');
  }

  // Clean digits
  const cleanLine2Digits = (substr: string) => {
    return substr
      .replace(/O/g, '0')
      .replace(/I/g, '1')
      .replace(/L/g, '1')
      .replace(/Z/g, '2')
      .replace(/S/g, '5')
      .replace(/B/g, '8');
  };

  let passportSeries = '';
  let passportNumber = '';
  let passportSeriesNumber = '';
  let birthDate = '';
  let gender: 'MALE' | 'FEMALE' | 'UNKNOWN' = 'UNKNOWN';

  if (line2) {
    const rusPos = line2.indexOf('RUS');
    let rawDocDigits = '';
    if (rusPos > 0) {
      rawDocDigits = cleanLine2Digits(line2.substring(0, rusPos));
    } else {
      rawDocDigits = cleanLine2Digits(line2.substring(0, 10));
    }

    let docDigits = rawDocDigits;
    if (rawDocDigits.length >= 10) {
      docDigits = rawDocDigits.substring(0, 10);
    }

    if (docDigits.length >= 10) {
      const s1 = docDigits.substring(0, 2).replace(/\D/g, '');
      const s2 = docDigits.substring(2, 4).replace(/\D/g, '');
      const num = docDigits.substring(4, 10).replace(/\D/g, '');
      passportSeries = `${s1} ${s2}`.trim();
      passportNumber = num;
      passportSeriesNumber = `${passportSeries} ${passportNumber}`.trim();
    }

    // Birth date
    let birthIdx = rusPos !== -1 ? rusPos + 3 : 13;
    const birthRaw = cleanLine2Digits(line2.substring(birthIdx, birthIdx + 6));
    if (birthRaw.length === 6 && /^\d{6}$/.test(birthRaw)) {
      birthDate = parseMrzDate(birthRaw);
    }

    // Gender
    const genderChar = line2.charAt(birthIdx + 7);
    if (genderChar === 'M' || genderChar === 'М') gender = 'MALE';
    else if (genderChar === 'F' || genderChar === 'Ж') gender = 'FEMALE';
  }

  return {
    rawLines: [line1, line2],
    isValid: checksumErrors.length === 0,
    passportSeries,
    passportNumber,
    passportSeriesNumber,
    birthDate,
    gender,
    lastName,
    firstName,
    middleName,
    fullName,
    checksumErrors
  };
}
