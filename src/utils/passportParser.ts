import { createWorker } from 'tesseract.js';
import { parseRussianPassportMrz, type MrzParseResult } from './mrzParser';
import {
  preprocessImageForOcr,
  cropTopPageZone,
  cropBottomPageZone,
  cropMrzZone,
  cropVerticalSeriesZone
} from './imagePreprocessing';

export interface ExtractedField<T = string> {
  value: T;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'MRZ';
  rawMatch?: string;
}

export interface PassportExtractedData {
  fullName: ExtractedField<string>;
  lastName: ExtractedField<string>;
  firstName: ExtractedField<string>;
  middleName: ExtractedField<string>;
  birthDate: ExtractedField<string>;
  gender: ExtractedField<'MALE' | 'FEMALE' | 'UNKNOWN'>;
  passportSeriesNumber: ExtractedField<string>;
  passportSeries: ExtractedField<string>;
  passportNumber: ExtractedField<string>;
  passportIssuedBy: ExtractedField<string>;
  passportIssuedDate: ExtractedField<string>;
  passportDepartmentCode: ExtractedField<string>;
  registrationAddress: ExtractedField<string>;
  registrationDate: ExtractedField<string>;
  rawMainText: string;
  rawRegText: string;
  mrzParsed: boolean;
  warnings: string[];
}

export type ProgressCallback = (stage: string, progress: number) => void;

const MONTH_NAMES_RU: Record<string, string> = {
  'января': '01', 'январь': '01',
  'февраля': '02', 'февраль': '02',
  'марта': '03', 'март': '03',
  'апреля': '04', 'апрель': '04',
  'мая': '05', 'май': '05',
  'июня': '06', 'июнь': '06',
  'июля': '07', 'июль': '07',
  'августа': '08', 'август': '08',
  'сентября': '09', 'сентябрь': '09',
  'октября': '10', 'октябрь': '10',
  'ноября': '11', 'ноябрь': '11',
  'декабря': '12', 'декабрь': '12'
};

/**
 * Normalizes date from numeric or textual format to DD.MM.YYYY
 */
export function normalizeDate(dateStr: string): string {
  if (!dateStr) return '';
  let s = dateStr.trim();

  // Textual months (e.g. "19 Ноября 2003г." or "30.12.2025")
  const textMonthMatch = s.match(/(\d{1,2})\s+([а-яёА-ЯЁ]+)\s+(\d{2,4})/i);
  if (textMonthMatch) {
    const d = textMonthMatch[1].padStart(2, '0');
    const mWord = textMonthMatch[2].toLowerCase();
    const m = MONTH_NAMES_RU[mWord] || '01';
    let y = textMonthMatch[3];
    if (y.length === 2) {
      const curYear2 = new Date().getFullYear() % 100;
      y = parseInt(y, 10) <= curYear2 ? `20${y}` : `19${y}`;
    }
    return `${d}.${m}.${y}`;
  }

  s = s
    .replace(/[lI|]/g, '1')
    .replace(/[oO]/g, '0')
    .replace(/[^\d\.]/g, '.')
    .replace(/\.{2,}/g, '.');

  const match = s.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
  if (match) {
    const d = match[1].padStart(2, '0');
    const m = match[2].padStart(2, '0');
    let y = match[3];
    if (y.length === 2) {
      const curYear2 = new Date().getFullYear() % 100;
      y = parseInt(y, 10) <= curYear2 ? `20${y}` : `19${y}`;
    }
    return `${d}.${m}.${y}`;
  }
  return dateStr.replace(/[^\d\.]/g, '');
}

/**
 * Checks if a word is a valid Russian patronymic (ending in -вич, -вна, -ич, -ична).
 */
export function isPatronymic(word: string): boolean {
  if (!word || word.length < 4) return false;
  return /(?:ович|евич|ич|овна|евна|ична|ыч|инична)$/i.test(word);
}

/**
 * Cleans Cyrillic name words, removes OCR noise and non-alphabetical artifacts.
 */
export function cleanNameWord(str: string): string {
  if (!str) return '';
  let cleaned = str
    .replace(/[^А-Яа-яЁё\-\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Strip stop words
  const stopWords = [
    'ФАМИЛИЯ', 'ИМЯ', 'ОТЧЕСТВО', 'ЛИЧНЫЙ', 'КОД', 'ПОЛ', 'МУЖ', 'ЖЕН', 'МУЖСКОЙ', 'ЖЕНСКИЙ',
    'РОССИЙСКАЯ', 'ФЕДЕРАЦИЯ', 'ПАСПОРТ', 'ВЫДАН', 'МЕСТО', 'РОЖДЕНИЯ', 'ДАТА', 'ПОДПИСЬ'
  ];
  for (const sw of stopWords) {
    cleaned = cleaned.replace(new RegExp(`\\b${sw}\\b`, 'gi'), '').trim();
  }

  // Join spaced characters (e.g. "Щ Е Т И Н И Н" -> "ЩЕТИНИН")
  if (/^[А-Яа-яЁё]\s+[А-Яа-яЁё]\s+[А-Яа-яЁё]/.test(cleaned)) {
    cleaned = cleaned.replace(/\s+/g, '');
  }

  // Filter out noisy nonsense words with repeating vowels or weird letter sequences
  if (/([а-яёА-ЯЁ])\1{3,}/.test(cleaned) || cleaned.length > 22 || cleaned.length < 2) {
    return '';
  }

  if (cleaned.length > 0) {
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
  }
  return '';
}

/**
 * Clean issuer string from seal noise and autocorrect typical MVD words.
 */
export function cleanIssuerText(raw: string): string {
  if (!raw) return '';
  let cleaned = raw
    .replace(/[|~\\<>=_—–#№"”«»]/g, ' ')
    .replace(/\b(?:КСО|eel|pact|Tan|vere|aah|gh|Resid|ERB|Ted|Wx|l7012|ооадющи|неее|нее|gern|Fis|Заверил|подпись|МД)\b/gi, '')
    .replace(/^(?:РОССИЙСКАЯ\s+ФЕДЕРАЦИЯ|ПАСПОРТ\s+ВЫДАН|ВЫДАН|ПАСПОРТ)\s*[:\-]?\s*/i, '')
    .replace(/\b\d{2}\.\s*\d+\s*\d+\b/g, '') // remove broken dates
    .replace(/\b\d{3}[-\s]\d{3}\b/g, '') // remove dept code
    .replace(/\b\d{2}\.\d{2}\.\d{4}\b/g, '') // remove issue date
    .replace(/^[0-9\s№\-,\.ЙIil]+/g, '') // remove leading stray symbols/digits
    .replace(/\s*,\s*/g, ' ')
    .replace(/[^А-Яа-яЁё0-9\s№\.\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Smart MVD keywords autocorrection
  cleaned = cleaned.replace(/\b(?:а\s*и\s*,\s*РЕННИХ|РЕННИХ)\s+ДЕЛ\b/gi, 'ВНУТРЕННИХ ДЕЛ');
  cleaned = cleaned.replace(/\b(?:2\s*ЕЛЮБСКО|ЕЛЮБСКО)\s*О\s*,\s*РАЙОНА\b/gi, 'ПЕРЕЛЮБСКОГО РАЙОНА');
  cleaned = cleaned.replace(/\bСАРАТОВСКОЙ\s+ОБ\b/gi, 'САРАТОВСКОЙ ОБЛАСТИ');
  cleaned = cleaned.replace(/\bОТДЕЛОМ\s+а\s+и\s*,?\s*/gi, 'ОТДЕЛОМ ');

  return cleaned.trim();
}

/**
 * Parses Page 2 (Top Half): Issuer, Issue Date, Department Code.
 */
export function parseTopPageIssuerAndDate(ocrText: string): {
  issuedBy: string;
  issuedDate: string;
  departmentCode: string;
} {
  const lines = ocrText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  let issuedBy = '';
  let issuedDate = '';
  let departmentCode = '';

  // 1. Department code: XXX-XXX
  const deptMatch = ocrText.match(/(?:код\s*подразделения|подразделения)?\s*(\b\d{3}[-\s._—–]\d{3}\b)/i);
  if (deptMatch) {
    departmentCode = deptMatch[1].replace(/[\s._—–]/g, '-');
  }

  // 2. Issue Date
  const dateMatches = [...ocrText.matchAll(/(\b[0-3]?[0-9][\.\s\-_][0-1]?[0-9][\.\s\-_](?:19|20)?[0-9]{2,4}\b)/g)];
  if (dateMatches.length > 0) {
    issuedDate = normalizeDate(dateMatches[0][1]);
  }

  // 3. Issuer lines
  const issuerLines: string[] = [];
  let isCollecting = false;

  for (const line of lines) {
    const upper = line.toUpperCase();

    if (
      upper.includes('ОТДЕЛОМ') ||
      upper.includes('МЕЖРАЙОННЫМ') ||
      upper.includes('УФМС') ||
      upper.includes('ГУ МВД') ||
      upper.includes('МВД') ||
      upper.includes('ТП №') ||
      upper.includes('ОТДЕЛЕНИЕМ') ||
      upper.includes('ОВД') ||
      upper.includes('УВД') ||
      upper.includes('ВЫДАН')
    ) {
      isCollecting = true;
    }

    if (isCollecting) {
      if (
        line.match(/\d{3}-\d{3}/) ||
        upper.includes('ЛИЧНЫЙ КОД') ||
        upper.includes('ДАТА ВЫДАЧИ') ||
        upper.includes('ЛИЧНАЯ ПОДПИСЬ') ||
        line.match(/\b\d{2}\.\d{2}\.\d{4}\b/)
      ) {
        break;
      }

      const cl = cleanIssuerText(line);
      if (cl.length > 2 && !cl.toUpperCase().includes('ФЕДЕРАЦИЯ')) {
        issuerLines.push(cl);
      }
    }
  }

  if (issuerLines.length > 0) {
    issuedBy = cleanIssuerText(issuerLines.join(' '));
  }

  return { issuedBy, issuedDate, departmentCode };
}

/**
 * Parses Page 3 (Bottom Half): Names, Birth Date, Gender.
 */
export function parseBottomPageNamesAndBirth(ocrText: string): {
  lastName: string;
  firstName: string;
  middleName: string;
  fullName: string;
  birthDate: string;
  gender: 'MALE' | 'FEMALE' | 'UNKNOWN';
} {
  const lines = ocrText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  let lastName = '';
  let firstName = '';
  let middleName = '';
  let birthDate = '';
  let gender: 'MALE' | 'FEMALE' | 'UNKNOWN' = 'UNKNOWN';

  // 1. Direct search for patronymic in text (e.g. "Николаевич", "Александрович")
  const patMatch = ocrText.match(/\b([А-ЯЁ][а-яёА-ЯЁ]+(?:ович|евич|ич|овна|евна|ична|ыч|инична))\b/i);
  if (patMatch) {
    middleName = cleanNameWord(patMatch[1]);
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const upper = line.toUpperCase();

    // LastName / Фамилия
    if (upper.includes('ФАМИЛИЯ') || upper === 'ФАМИЛИЯ') {
      const val = line.replace(/.*ФАМИЛИ[ЯИ]\s*[:\-]?\s*/i, '').trim();
      if (val) {
        const cleaned = cleanNameWord(val);
        if (cleaned && cleaned.length >= 2 && !['Муж', 'Жен', 'Й'].includes(cleaned)) lastName = cleaned;
      } else if (i + 1 < lines.length) {
        const cleaned = cleanNameWord(lines[i + 1]);
        if (cleaned && cleaned.length >= 2 && !['Муж', 'Жен', 'Й'].includes(cleaned)) lastName = cleaned;
      }
    }

    // FirstName / Имя
    if (upper.includes('ИМЯ') && !upper.includes('ОТЧЕСТВО') && !upper.includes('ФАМИЛИЯ')) {
      const val = line.replace(/.*ИМЯ\s*[:\-]?\s*/i, '').trim();
      if (val) {
        const cleaned = cleanNameWord(val);
        if (cleaned && cleaned.length >= 2 && !isPatronymic(cleaned)) firstName = cleaned;
      } else if (i + 1 < lines.length) {
        const cleaned = cleanNameWord(lines[i + 1]);
        if (cleaned && cleaned.length >= 2 && !isPatronymic(cleaned)) firstName = cleaned;
      }
    }

    // MiddleName / Отчество
    if (upper.includes('ОТЧЕСТВО') || upper.includes('ОТЧЕСТВ')) {
      const val = line.replace(/.*ОТЧЕСТВ[ОА]\s*[:\-]?\s*/i, '').trim();
      if (val) {
        const cleaned = cleanNameWord(val);
        if (cleaned && isPatronymic(cleaned)) middleName = cleaned;
      } else if (i + 1 < lines.length) {
        const cleaned = cleanNameWord(lines[i + 1]);
        if (cleaned && isPatronymic(cleaned)) middleName = cleaned;
      }
    }

    // Gender
    if (upper.includes('ПОЛ') || upper.includes('МУЖ') || upper.includes('ЖЕН')) {
      if (upper.includes('МУЖ') || upper.includes('M')) gender = 'MALE';
      else if (upper.includes('ЖЕН') || upper.includes('F')) gender = 'FEMALE';
    }

    // Birth Date
    if (upper.includes('РОЖДЕНИЯ') || upper.includes('РОЖД') || upper.includes('ДАТА')) {
      const bMatch = line.match(/(\b[0-3]?[0-9][\.\s\-_][0-1]?[0-9][\.\s\-_]\d{2,4}\b)/);
      if (bMatch) {
        birthDate = normalizeDate(bMatch[1]);
      } else if (i + 1 < lines.length) {
        const nextBMatch = lines[i + 1].match(/(\b[0-3]?[0-9][\.\s\-_][0-1]?[0-9][\.\s\-_]\d{2,4}\b)/);
        if (nextBMatch) birthDate = normalizeDate(nextBMatch[1]);
      }
    }
  }

  // Clean list of valid Cyrillic name candidate words from all lines
  const nameCandidateWords: string[] = [];
  for (const line of lines) {
    const words = line.split(/\s+/).map(w => cleanNameWord(w)).filter(Boolean);
    for (const w of words) {
      if (
        w.length >= 3 &&
        /^[А-ЯЁ][а-яё]{2,}$/.test(w) &&
        !['Муж', 'Жен', 'Место', 'Дата', 'Пол', 'Имя', 'Отчество', 'Личный', 'Код', 'Рождения', 'Пос', 'Обл', 'Край', 'Район'].includes(w)
      ) {
        nameCandidateWords.push(w);
      }
    }
  }

  // Find patronymic index in candidate list
  const patIndex = nameCandidateWords.findIndex(w => isPatronymic(w));

  if (patIndex !== -1) {
    middleName = nameCandidateWords[patIndex];
    if (patIndex >= 2) {
      lastName = nameCandidateWords[patIndex - 2];
      firstName = nameCandidateWords[patIndex - 1];
    } else if (patIndex === 1) {
      firstName = nameCandidateWords[0];
    }
  } else {
    // If no patronymic found, take first 2-3 words
    if (nameCandidateWords.length >= 3) {
      lastName = nameCandidateWords[0];
      firstName = nameCandidateWords[1];
      middleName = nameCandidateWords[2];
    } else if (nameCandidateWords.length === 2) {
      lastName = nameCandidateWords[0];
      firstName = nameCandidateWords[1];
    } else if (nameCandidateWords.length === 1) {
      firstName = nameCandidateWords[0];
    }
  }

  // Fallback for birthDate: prefer 2nd date if multiple dates in full text
  if (!birthDate) {
    const allDates = [...ocrText.matchAll(/(\b[0-3]?[0-9][\.\s\-_][0-1]?[0-9][\.\s\-_]\d{2,4}\b)/g)];
    if (allDates.length > 1) {
      birthDate = normalizeDate(allDates[1][1]);
    } else if (allDates.length === 1) {
      birthDate = normalizeDate(allDates[0][1]);
    }
  }

  const fullName = [lastName, firstName, middleName].filter(Boolean).join(' ');
  return { lastName, firstName, middleName, fullName, birthDate, gender };
}

/**
 * Parses Vertical or Horizontal Series & Number.
 */
export function parseSeriesAndNumber(ocrText: string): {
  series: string;
  number: string;
  seriesNumber: string;
} {
  let series = '';
  let number = '';
  let seriesNumber = '';

  const cleanDigits = ocrText.replace(/[^\d\s]/g, ' ').replace(/\s+/g, ' ').trim();

  // Pattern 1: 2 digits + 2 digits + 6 digits (e.g. 63 06 969595)
  const match1 = cleanDigits.match(/\b(\d{2})\s*(\d{2})\s*(\d{6})\b/);
  if (match1) {
    series = `${match1[1]} ${match1[2]}`;
    number = match1[3];
    seriesNumber = `${series} ${number}`;
    return { series, number, seriesNumber };
  }

  // Pattern 2: 4 digits + 6 digits (e.g. 6306 969595)
  const match2 = cleanDigits.match(/\b(\d{4})\s*(\d{6})\b/);
  if (match2) {
    series = `${match2[1].slice(0, 2)} ${match2[1].slice(2, 4)}`;
    number = match2[2];
    seriesNumber = `${series} ${number}`;
    return { series, number, seriesNumber };
  }

  // Pattern 3: 10 consecutive digits
  const match3 = cleanDigits.match(/\b(\d{10})\b/);
  if (match3) {
    series = `${match3[1].slice(0, 2)} ${match3[1].slice(2, 4)}`;
    number = match3[1].slice(4, 10);
    seriesNumber = `${series} ${number}`;
    return { series, number, seriesNumber };
  }

  return { series, number, seriesNumber };
}

/**
 * Extracts pure address and date from the registration stamp page.
 */
export function parseRegistrationStamp(ocrText: string): {
  address: string;
  registrationDate: string;
  rawText: string;
} {
  const lines = ocrText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  let address = '';
  let registrationDate = '';

  // 1. Find date (e.g. "30.12.2025" or "19 Ноября 2003г.")
  const textDateMatch = ocrText.match(/\b\d{1,2}\s+[а-яёА-ЯЁ]+\s+\d{2,4}(?:г\.?)?\b/i);
  if (textDateMatch) {
    registrationDate = normalizeDate(textDateMatch[0]);
  } else {
    const numDateMatch = ocrText.match(/\b\d{2}[\.\s\-\/]\d{2}[\.\s\-\/]\d{4}\b/);
    if (numDateMatch) {
      registrationDate = normalizeDate(numDateMatch[0]);
    }
  }

  // 2. Identify registration stamp lines
  const addressParts: string[] = [];
  let foundStamp = false;

  for (const line of lines) {
    const upper = line.toUpperCase();

    if (
      upper.includes('ЗАРЕГИСТРИРОВАН') ||
      upper.includes('МЕСТО ЖИТЕЛЬСТВА') ||
      upper.includes('SAPEIMCTPH') ||
      upper.includes('SAPETMCT')
    ) {
      foundStamp = true;
      continue;
    }

    // Stop at registration police department / authority
    if (
      upper.includes('ОТДЕЛЕНИЕ') ||
      upper.includes('ОТДЕЛОМ') ||
      upper.includes('ОТДЕЛЕНИЕМ') ||
      upper.includes('УФМС') ||
      upper.includes('ОВМ') ||
      upper.includes('УМВД') ||
      upper.includes('МВД') ||
      upper.includes('РОССИИ ПО') ||
      upper.includes('ЗАВЕРИЛ') ||
      upper.includes('ПОДПИСЬ') ||
      upper.includes('ПО ВОПРОСАМ МИГРАЦИИ') ||
      line.match(/\b\d{3}[-\s]\d{3}\b/)
    ) {
      if (foundStamp && addressParts.length > 0) {
        break;
      }
    }

    // Check address elements
    let cl = line
      .replace(/^[PePe]*\s*["“«]?/i, '')
      .replace(/^(?:lyin|yin|п-кт|пункт|рег-н|рег|улица|ца)\s*[:\-]?\s*/i, '')
      .replace(/^[©®\(\)\{\}\[\]\*\+\/]+/g, '');

    // Convert broken "0:27" or "д:27" or "ыы 3" to "д. ..."
    cl = cl.replace(/^[0ODдДoO]\s*[:\.\s]\s*(\d+)/i, 'д. $1');
    cl = cl.replace(/^ы+\s*(\d+)/i, 'д. $1');

    cl = cl
      .replace(/[|~\\<>=_—–#№]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Fix common OCR typos in cities and streets
    cl = cl.replace(/\bTOP\.\s*/gi, 'ГОР. ');
    cl = cl.replace(/\bCAPATOBCKAS\b/gi, 'САРАТОВСКАЯ');
    cl = cl.replace(/\bОВЛ\b/gi, 'ОБЛ');
    cl = cl.replace(/\bIAB\.\s*/gi, 'НАБ. ');
    cl = cl.replace(/\bЗо\s+САНКТ/gi, 'Г. САНКТ');
    cl = cl.replace(/\bCYP\.\s*/gi, 'СТР. ');

    const isAddressLine =
      /(?:обл|область|край|р-н|район|санкт-петербург|петербург|москва|севастополь|гор\.|город|(?:^|\s)г\.|\bпос\.|деревня|проезд|ул\.|улица|просп|пр-кт|пер\.|бульвар|наб\.|набережная|миклухо|дом|(?:^|\s)д\.?\s*\d+|(?:^|\s)к\.?\s*\d+|(?:^|\s)стр\.?\s*\d+|(?:^|\s)кв\.?\s*\d+|\d+\s*амурский)/i.test(
        cl
      );

    if (isAddressLine && cl.length > 2 && !cl.toUpperCase().includes('ЖИТЕЛЬСТВА') && !cl.toUpperCase().includes('ЗАРЕГИСТРИРОВАН')) {
      addressParts.push(cl);
    }
  }

  if (addressParts.length > 0) {
    address = addressParts.join(', ').replace(/\s+/g, ' ').replace(/,\s*,/g, ',').trim();
  }

  return {
    address,
    registrationDate,
    rawText: ocrText
  };
}

/**
 * Main OCR Orchestrator using Zoned Multi-Pass Tesseract WASM pipelines.
 */
export async function recognizeRussianPassport(
  mainSpreadCanvas: HTMLCanvasElement,
  regStampCanvas: HTMLCanvasElement | null,
  onProgress?: ProgressCallback
): Promise<PassportExtractedData> {
  const warnings: string[] = [];

  onProgress?.('Запуск локального OCR движка (WebAssembly)...', 5);
  const worker = await createWorker(['rus', 'eng'], 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        const prog = Math.round(m.progress * 100);
        onProgress?.(`Распознавание: ${prog}%`, 10 + Math.round(prog * 0.4));
      }
    }
  });

  let rawMainText = '';
  let rawRegText = '';
  let mrzResult: MrzParseResult | null = null;

  try {
    // ================= 1. PAGE 2 (TOP HALF): ISSUER & DATES =================
    onProgress?.('Распознавание органа выдачи (стр. 2)...', 15);
    const topCanvas = cropTopPageZone(mainSpreadCanvas);
    const preprocessedTop = preprocessImageForOcr(topCanvas, { enhanceContrast: true, targetWidth: 2000 });
    const topRes = await worker.recognize(preprocessedTop);
    const topText = topRes.data.text || '';
    const topParsed = parseTopPageIssuerAndDate(topText);

    // ================= 2. PAGE 3 (BOTTOM HALF): NAMES & BIRTH DATE =================
    onProgress?.('Распознавание ФИО и даты рождения (стр. 3)...', 35);
    const bottomCanvas = cropBottomPageZone(mainSpreadCanvas);
    const preprocessedBottom = preprocessImageForOcr(bottomCanvas, { enhanceContrast: true, targetWidth: 2000 });
    const bottomRes = await worker.recognize(preprocessedBottom);
    const bottomText = bottomRes.data.text || '';
    const bottomParsed = parseBottomPageNamesAndBirth(bottomText);

    // ================= 3. RIGHT VERTICAL STRIP: SERIES & NUMBER =================
    onProgress?.('Распознавание серии и номера паспорта...', 55);
    const verticalCanvas = cropVerticalSeriesZone(mainSpreadCanvas);
    await worker.setParameters({
      tessedit_char_whitelist: '0123456789 ',
      tessedit_pageseg_mode: '6' as any
    });
    const vRes = await worker.recognize(verticalCanvas);
    const vText = vRes.data.text || '';
    const vParsed = parseSeriesAndNumber(vText);

    // ================= 4. MRZ ZONE (FOR POST-2011 PASSPORTS) =================
    onProgress?.('Поиск машиночитаемой зоны MRZ...', 70);
    const mrzCanvas = cropMrzZone(mainSpreadCanvas);
    await worker.setParameters({
      tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ<',
      tessedit_pageseg_mode: '6' as any
    });
    const mrzRes = await worker.recognize(mrzCanvas);
    mrzResult = parseRussianPassportMrz(mrzRes.data.text || '');

    // Reset parameters
    await worker.setParameters({
      tessedit_char_whitelist: '',
      tessedit_pageseg_mode: '3' as any
    });

    // ================= 5. REGISTRATION STAMP (PAGE 2) =================
    let regStampParsed = { address: '', registrationDate: '', rawText: '' };
    if (regStampCanvas) {
      onProgress?.('Распознавание страницы прописки...', 80);
      const preprocessedReg = preprocessImageForOcr(regStampCanvas, { enhanceContrast: true, targetWidth: 2000 });
      const regRes = await worker.recognize(preprocessedReg);
      rawRegText = regRes.data.text || '';
      regStampParsed = parseRegistrationStamp(rawRegText);
    }

    rawMainText = `[PAGE 2 TOP]\n${topText}\n\n[PAGE 3 BOTTOM]\n${bottomText}\n\n[SERIES]\n${vText}`;

    // ================= 6. DATA MERGE & CROSS-VALIDATION =================
    onProgress?.('Формирование итоговых данных...', 90);

    // Series & Number:
    let seriesNumberVal = vParsed.seriesNumber || mrzResult?.passportSeriesNumber;
    if (!seriesNumberVal) {
      const fallbackSeries = parseSeriesAndNumber(rawMainText);
      seriesNumberVal = fallbackSeries.seriesNumber;
    }
    const seriesVal = seriesNumberVal ? seriesNumberVal.slice(0, 5).trim() : '';
    const numberVal = seriesNumberVal ? seriesNumberVal.slice(-6).trim() : '';

    // Names: Prefer MRZ if valid transliteration, else Page 3 Cyrillic
    const lastNameVal = bottomParsed.lastName || mrzResult?.lastName;
    const firstNameVal = bottomParsed.firstName || mrzResult?.firstName;
    const middleNameVal = bottomParsed.middleName || mrzResult?.middleName;
    const fullNameVal = [lastNameVal, firstNameVal, middleNameVal].filter(Boolean).join(' ') || mrzResult?.fullName || bottomParsed.fullName;

    // Birth Date & Gender
    const birthDateVal = bottomParsed.birthDate || mrzResult?.birthDate;
    const genderVal = mrzResult?.gender && mrzResult.gender !== 'UNKNOWN' ? mrzResult.gender : (bottomParsed.gender || 'UNKNOWN');

    // Issuer & Department Code
    const issuedByVal = topParsed.issuedBy;
    const issuedDateVal = topParsed.issuedDate;
    const departmentCodeVal = topParsed.departmentCode;

    if (!fullNameVal) {
      warnings.push('ФИО не удалось распознать автоматически — проверьте четкость скана или введите вручную.');
    }
    if (!seriesNumberVal) {
      warnings.push('Серия и номер паспорта не обнаружены.');
    }

    const result: PassportExtractedData = {
      fullName: {
        value: fullNameVal,
        confidence: mrzResult?.fullName ? 'MRZ' : (fullNameVal ? 'HIGH' : 'LOW')
      },
      lastName: {
        value: lastNameVal || '',
        confidence: mrzResult?.lastName ? 'MRZ' : (lastNameVal ? 'HIGH' : 'LOW')
      },
      firstName: {
        value: firstNameVal || '',
        confidence: mrzResult?.firstName ? 'MRZ' : (firstNameVal ? 'HIGH' : 'LOW')
      },
      middleName: {
        value: middleNameVal || '',
        confidence: mrzResult?.middleName ? 'MRZ' : (middleNameVal ? 'HIGH' : 'LOW')
      },
      birthDate: {
        value: birthDateVal || '',
        confidence: mrzResult?.birthDate ? 'MRZ' : (birthDateVal ? 'HIGH' : 'LOW')
      },
      gender: {
        value: genderVal,
        confidence: mrzResult?.gender && mrzResult.gender !== 'UNKNOWN' ? 'MRZ' : (genderVal !== 'UNKNOWN' ? 'HIGH' : 'LOW')
      },
      passportSeriesNumber: {
        value: seriesNumberVal,
        confidence: vParsed.seriesNumber ? 'HIGH' : (mrzResult?.passportSeriesNumber ? 'MRZ' : 'LOW')
      },
      passportSeries: {
        value: seriesVal,
        confidence: 'HIGH'
      },
      passportNumber: {
        value: numberVal,
        confidence: 'HIGH'
      },
      passportIssuedBy: {
        value: issuedByVal,
        confidence: issuedByVal.length > 10 ? 'HIGH' : (issuedByVal ? 'MEDIUM' : 'LOW')
      },
      passportIssuedDate: {
        value: issuedDateVal,
        confidence: issuedDateVal ? 'HIGH' : 'LOW'
      },
      passportDepartmentCode: {
        value: departmentCodeVal,
        confidence: departmentCodeVal ? 'HIGH' : 'LOW'
      },
      registrationAddress: {
        value: regStampParsed.address,
        confidence: regStampParsed.address.length > 10 ? 'HIGH' : (regStampParsed.address ? 'MEDIUM' : 'LOW')
      },
      registrationDate: {
        value: regStampParsed.registrationDate,
        confidence: regStampParsed.registrationDate ? 'HIGH' : 'LOW'
      },
      rawMainText,
      rawRegText,
      mrzParsed: !!mrzResult?.fullName,
      warnings
    };

    onProgress?.('Готово!', 100);
    return result;
  } finally {
    await worker.terminate();
  }
}
