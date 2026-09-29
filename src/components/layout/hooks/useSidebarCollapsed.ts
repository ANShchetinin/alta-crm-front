import { useCallback, useState } from 'react';

const STORAGE_KEY = 'altacrm_sidebar_collapsed';

const readCollapsed = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

const writeCollapsed = (collapsed: boolean) => {
  try {
    localStorage.setItem(STORAGE_KEY, String(collapsed));
  } catch {
    // Хранилище недоступно (приватный режим) — меню остается свернутым до перезагрузки
  }
};

/** Свернутое боковое меню на десктопе; выбор запоминается в браузере. */
export const useSidebarCollapsed = () => {
  const [isCollapsed, setIsCollapsed] = useState(readCollapsed);

  const toggle = useCallback(() => {
    setIsCollapsed(prev => {
      const next = !prev;
      writeCollapsed(next);
      return next;
    });
  }, []);

  return { isCollapsed, toggle };
};
