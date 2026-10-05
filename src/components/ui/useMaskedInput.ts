import { useLayoutEffect, useRef, type ChangeEvent } from 'react';
import type { MaskedEdit } from '../../utils/maskedInput';

type Edit = (previous: string, raw: string, caret: number, forward: boolean) => MaskedEdit;

/**
 * Общая логика поля с маской: применяет правку, сохраняет позицию курсора после переформатирования
 * и сообщает браузеру об ошибке (setCustomValidity) — форма с невалидным значением не отправится.
 */
export const useMaskedInput = (displayed: string, error: string | null, edit: Edit, onChange: (value: string) => void) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const caretRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    inputRef.current?.setCustomValidity(error ?? '');
  }, [error]);

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (caretRef.current !== null && input && document.activeElement === input) {
      input.setSelectionRange(caretRef.current, caretRef.current);
    }
    caretRef.current = null;
  }, [displayed]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const forward = (e.nativeEvent as InputEvent).inputType === 'deleteContentForward';
    const next = edit(displayed, input.value, input.selectionStart ?? input.value.length, forward);
    if (next.value === displayed) {
      // Значение не изменилось (введена не цифра) — возвращаем маску и курсор сразу, без перерисовки.
      input.value = displayed;
      input.setSelectionRange(next.caret, next.caret);
      return;
    }
    caretRef.current = next.caret;
    onChange(next.value);
  };

  return { inputRef, handleChange };
};
