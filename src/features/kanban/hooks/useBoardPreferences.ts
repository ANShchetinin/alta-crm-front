import { useEffect, useState } from 'react';
import type { OrderStatus } from '../../../api/kanban';

export type MobileViewMode = 'list' | 'board';

const MOBILE_BREAKPOINT = 768;

const readStorage = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStorage = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Хранилище недоступно (приватный режим) — настройка действует до перезагрузки
  }
};

const readCollapsedColumns = (): Record<number, boolean> => {
  try {
    const saved = readStorage('kanban_collapsed_columns');
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

/** Настройки вида доски в браузере: телефон или десктоп, список или доска, свернутые и пустые колонки. */
export const useBoardPreferences = (columns: OrderStatus[]) => {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT);
  const [mobileViewMode, setMobileViewModeState] = useState<MobileViewMode>(
    () => (readStorage('kanban_mobile_view_mode') as MobileViewMode | null) || 'list'
  );
  const [collapsedColumns, setCollapsedColumns] = useState<Record<number, boolean>>(readCollapsedColumns);
  const [hideEmptyColumns, setHideEmptyColumns] = useState(() => readStorage('kanban_hide_empty_columns') === 'true');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const setMobileViewMode = (mode: MobileViewMode) => {
    setMobileViewModeState(mode);
    writeStorage('kanban_mobile_view_mode', mode);
  };

  const saveCollapsed = (updated: Record<number, boolean>) => {
    writeStorage('kanban_collapsed_columns', JSON.stringify(updated));
    return updated;
  };

  const toggleColumnCollapse = (columnId: number) => {
    setCollapsedColumns(prev => {
      const isCollapsed = prev[columnId] !== undefined ? prev[columnId] : true;
      return saveCollapsed({ ...prev, [columnId]: !isCollapsed });
    });
  };

  const toggleAllColumns = (expand: boolean) => {
    const updated: Record<number, boolean> = {};
    columns.forEach(c => {
      updated[c.id] = !expand;
    });
    setCollapsedColumns(saveCollapsed(updated));
  };

  /** Раскрывает колонку, не запоминая это (при перетаскивании карточки над свернутой колонкой). */
  const expandColumnTemporarily = (columnId: number) => {
    setCollapsedColumns(prev => ({ ...prev, [columnId]: false }));
  };

  const toggleHideEmptyColumns = () => {
    const next = !hideEmptyColumns;
    setHideEmptyColumns(next);
    writeStorage('kanban_hide_empty_columns', String(next));
  };

  return {
    isMobile,
    mobileViewMode,
    setMobileViewMode,
    collapsedColumns,
    toggleColumnCollapse,
    toggleAllColumns,
    expandColumnTemporarily,
    hideEmptyColumns,
    toggleHideEmptyColumns
  };
};
