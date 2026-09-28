import { useEffect } from 'react';

const FIELD_TAGS = ['INPUT', 'SELECT', 'TEXTAREA'];

/**
 * iOS Safari / WebKit: после скрытия клавиатуры страница остается сдвинутой. При потере фокуса полем ввода
 * возвращает окно наверх и заставляет WebKit пересчитать viewport.
 */
export const useIosKeyboardScrollFix = () => {
  useEffect(() => {
    const handleFocusOut = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || !FIELD_TAGS.includes(target.tagName)) {
        return;
      }
      setTimeout(() => {
        window.scrollTo(0, 0);
        document.body.style.transform = 'translateZ(0)';
        requestAnimationFrame(() => {
          document.body.style.transform = '';
        });
      }, 60);
    };

    window.addEventListener('focusout', handleFocusOut);
    return () => window.removeEventListener('focusout', handleFocusOut);
  }, []);
};
