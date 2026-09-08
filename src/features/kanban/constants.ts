import type { ActChecklistItem } from '../../api/kanban';

export const DEFAULT_ACT_CHECKLIST: ActChecklistItem[] = [
  { id: '1', name: 'Установка багета (Ал.)', checked: false },
  { id: '2', name: 'Установка багета (Пл.)', checked: false },
  { id: '3', name: 'Установка натяжного потолка', checked: false },
  { id: '4', name: 'Установка потолочного багета', checked: false },
  { id: '5', name: 'Установка маскировочной вставки', checked: false },
  { id: '6', name: 'Установка потолочного карниза (гардины)', checked: false },
  { id: '7', name: 'Установка светового оборудования', checked: false },
  { id: '8', name: 'Установка и разводка электропроводки', checked: false },
  { id: '9', name: 'Установки вентиляции', checked: false },
  { id: '10', name: 'Установка разделительного багета', checked: false },
  { id: '11', name: 'Установка пожарных сигнализаций, камер, и навесного оборудования', checked: false },
  { id: '12', name: 'Установка обвода трубы', checked: false },
  { id: '13', name: 'Демонтаж замена полотна', checked: false },
  { id: '14', name: 'Установка бруса и 2х уровневых конструкций', checked: false },
  { id: '15', name: 'Установка карниза', checked: false }
];

export const mergeActChecklist = (savedList?: ActChecklistItem[]): ActChecklistItem[] => {
  if (!savedList || savedList.length === 0) {
    return DEFAULT_ACT_CHECKLIST.map(item => ({ ...item, checked: false }));
  }
  const savedMap = new Map(savedList.map(it => [it.id, it.checked]));
  const savedNameMap = new Map(savedList.map(it => [it.name, it.checked]));

  const merged = DEFAULT_ACT_CHECKLIST.map(defItem => ({
    ...defItem,
    checked: savedMap.has(defItem.id)
      ? !!savedMap.get(defItem.id)
      : (savedNameMap.has(defItem.name) ? !!savedNameMap.get(defItem.name) : false)
  }));

  const defIds = new Set(DEFAULT_ACT_CHECKLIST.map(d => d.id));
  savedList.forEach(savedItem => {
    if (!defIds.has(savedItem.id)) {
      merged.push(savedItem);
    }
  });

  return merged;
};

export const isActFile = (fileName?: string, isActFlag?: boolean): boolean => {
  if (isActFlag) return true;
  if (!fileName) return false;
  const name = fileName.trim().toLowerCase();

  // Exclude common false positives containing 'act' or 'акт' inside other words
  if (/контракт|contract|contact|контакт|фактур|factur|react|action|abstract|fraction|impact|practice|практик/i.test(name)) {
    if (!/^(акт|act)[\s_\-.]/i.test(name) && !/акт\s+выполнен/i.test(name) && !/акт\s+при[её]м/i.test(name)) {
      return false;
    }
  }

  return /(^|[\s_\-–—(])(акт|act)($|[\s_\-–—).])/i.test(name)
    || /акт\s*выполнен/i.test(name)
    || /акт\s*при[её]м/i.test(name)
    || /completion\s*act/i.test(name);
};

/**
 * Splits client name / full name into up to 3 lines (e.g. Surname, First name, Patronymic).
 * Returns empty array if name is empty.
 * Returns 1 line for single-word names, 2 lines for 2-word names, 3 lines for 3+ words (combining 3rd and subsequent words).
 * Leaves no empty lines if some parts are missing.
 */
export const formatClientNameLines = (name?: string | null): string[] => {
  if (!name || !name.trim()) return [];
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 3) {
    return parts;
  }
  return [parts[0], parts[1], parts.slice(2).join(' ')];
};

