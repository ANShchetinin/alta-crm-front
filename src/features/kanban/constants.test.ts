import { describe, it, expect } from 'vitest';
import { DEFAULT_ACT_CHECKLIST, mergeActChecklist, formatClientNameLines } from './constants';

describe('kanban constants and helpers', () => {
  it('DEFAULT_ACT_CHECKLIST contains 15 default checklist items', () => {
    expect(DEFAULT_ACT_CHECKLIST).toHaveLength(15);
    expect(DEFAULT_ACT_CHECKLIST[0].name).toBe('Установка багета (Ал.)');
  });

  describe('mergeActChecklist', () => {
    it('returns fresh unchecked default list when input is empty or undefined', () => {
      const mergedUndefined = mergeActChecklist(undefined);
      expect(mergedUndefined).toHaveLength(15);
      expect(mergedUndefined.every(i => i.checked === false)).toBe(true);

      const mergedEmpty = mergeActChecklist([]);
      expect(mergedEmpty).toHaveLength(15);
    });

    it('merges saved checked state by id', () => {
      const saved = [
        { id: '1', name: 'Установка багета (Ал.)', checked: true },
        { id: '3', name: 'Установка натяжного потолка', checked: true }
      ];
      const merged = mergeActChecklist(saved);
      expect(merged.find(i => i.id === '1')?.checked).toBe(true);
      expect(merged.find(i => i.id === '3')?.checked).toBe(true);
      expect(merged.find(i => i.id === '2')?.checked).toBe(false);
    });

    it('preserves custom items not present in defaults', () => {
      const saved = [
        { id: 'custom-1', name: 'Специальный монтаж люстры', checked: true }
      ];
      const merged = mergeActChecklist(saved);
      expect(merged).toHaveLength(16);
      expect(merged.find(i => i.id === 'custom-1')?.checked).toBe(true);
    });

    it('uses custom template if provided', () => {
      const template = ['Проверка карниза', 'Проверка мотора', 'Подключение к питанию'];
      const merged = mergeActChecklist([], template);
      expect(merged).toHaveLength(3);
      expect(merged[0].name).toBe('Проверка карниза');
      expect(merged[1].name).toBe('Проверка мотора');
      expect(merged[2].name).toBe('Подключение к питанию');
      expect(merged.every(i => i.checked === false)).toBe(true);
    });

    it('overrides default ceiling items with custom template and matches checked state by name', () => {
      const template = ['Проверка карниза', 'Проверка мотора', 'Подключение к питанию'];
      const oldCeilingsList = [
        { id: '1', name: 'Установка багета (Ал.)', checked: true },
        { id: '2', name: 'Проверка мотора', checked: true },
        { id: '3', name: 'Установка натяжного потолка', checked: true }
      ];
      const merged = mergeActChecklist(oldCeilingsList, template);
      expect(merged).toHaveLength(3);
      expect(merged[0].name).toBe('Проверка карниза');
      expect(merged[0].checked).toBe(false);
      expect(merged[1].name).toBe('Проверка мотора');
      expect(merged[1].checked).toBe(true);
      expect(merged[2].name).toBe('Подключение к питанию');
      expect(merged[2].checked).toBe(false);
    });
  });

  describe('formatClientNameLines', () => {
    it('returns empty array for empty or nullish strings', () => {
      expect(formatClientNameLines(undefined)).toEqual([]);
      expect(formatClientNameLines(null)).toEqual([]);
      expect(formatClientNameLines('')).toEqual([]);
      expect(formatClientNameLines('   ')).toEqual([]);
    });

    it('returns single line for 1-word name without empty rows', () => {
      expect(formatClientNameLines('Иван')).toEqual(['Иван']);
    });

    it('returns 2 lines for 2-word name without empty rows', () => {
      expect(formatClientNameLines('Иванов Иван')).toEqual(['Иванов', 'Иван']);
    });

    it('returns 3 lines for 3-word name (Surname, Name, Patronymic)', () => {
      expect(formatClientNameLines('Иванов Иван Иванович')).toEqual(['Иванов', 'Иван', 'Иванович']);
    });

    it('returns 3 lines for names with more than 3 words (combining rest into 3rd line)', () => {
      expect(formatClientNameLines('ООО Ромашка Плюс Элит Сервис')).toEqual([
        'ООО',
        'Ромашка',
        'Плюс Элит Сервис'
      ]);
    });
  });
});
