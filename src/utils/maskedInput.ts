/** Результат правки поля с маской: новое значение и позиция курсора. */
export interface MaskedEdit {
  value: string;
  caret: number;
}

export const countDigits = (value: string) => value.replace(/\D/g, '').length;

/** Позиция курсора сразу после n-й цифры (n = 0 — перед первой цифрой, например после ведущего «+»). */
export const indexAfterDigits = (value: string, n: number) => {
  if (n <= 0) {
    const first = value.search(/\d/);
    return first < 0 ? value.length : first;
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

/**
 * Применяет правку поля с маской из цифр и разделителей и вычисляет курсор в отформатированном значении.
 * Стертый разделитель удаляет соседнюю цифру (иначе маска вернула бы его на место).
 *
 * @param format приведение текста к маске
 * @param addedDigits сколько цифр маска добавляет перед введенными (например, код страны)
 */
export const applyMaskedEdit = (
  previous: string,
  raw: string,
  caret: number,
  forward: boolean,
  format: (text: string) => string,
  addedDigits: (text: string) => number = () => 0
): MaskedEdit => {
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

  const formatted = format(text);
  if (position >= text.length) {
    return { value: formatted, caret: formatted.length };
  }
  const added = Math.max(0, addedDigits(text));
  return { value: formatted, caret: indexAfterDigits(formatted, countDigits(text.slice(0, position)) + added) };
};
