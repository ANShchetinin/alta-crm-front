import { useEffect, useRef, type RefObject } from 'react';

/**
 * Вызывает `onOutside` при нажатии мыши вне элемента `ref` и вне элементов, подходящих под `ignoreSelector`
 * (например, кнопки, которая сама открывает и закрывает меню).
 */
export const useClickOutside = (
  ref: RefObject<HTMLElement | null>,
  onOutside: () => void,
  ignoreSelector?: string
) => {
  const onOutsideRef = useRef(onOutside);
  useEffect(() => {
    onOutsideRef.current = onOutside;
  });

  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!ref.current || ref.current.contains(target)) {
        return;
      }
      if (ignoreSelector && target.closest?.(ignoreSelector)) {
        return;
      }
      onOutsideRef.current();
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [ref, ignoreSelector]);
};
