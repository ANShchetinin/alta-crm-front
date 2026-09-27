import { useRef, useState } from 'react';

const CLOSE_ANIMATION_MS = 240;
const DISMISS_THRESHOLD_PX = 80;

/**
 * Свайп вниз для закрытия нижней шторки на мобильных и плавная анимация закрытия.
 *
 * @param onDismissRequest вызывается, когда шторку протянули дальше порога (может спросить подтверждение)
 * @param onClosed вызывается после завершения анимации smoothClose
 */
export const useSwipeToDismiss = (onDismissRequest: () => void, onClosed: () => void) => {
  const [translateY, setTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const startYRef = useRef<number | null>(null);
  const currentDeltaRef = useRef(0);

  const smoothClose = () => {
    setIsClosing(true);
    setTranslateY(window.innerHeight || 800);
    setTimeout(() => {
      onClosed();
      setIsClosing(false);
      setTranslateY(0);
    }, CLOSE_ANIMATION_MS);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
    currentDeltaRef.current = 0;
    setIsDragging(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (startYRef.current === null) {
      return;
    }
    const deltaY = e.touches[0].clientY - startYRef.current;
    if (deltaY > 0) {
      currentDeltaRef.current = deltaY;
      setTranslateY(deltaY);
    }
  };

  const onTouchEnd = () => {
    if (startYRef.current === null) {
      return;
    }
    startYRef.current = null;
    setIsDragging(false);
    if (currentDeltaRef.current > DISMISS_THRESHOLD_PX) {
      onDismissRequest();
    } else {
      setTranslateY(0);
    }
  };

  const sheetStyle: React.CSSProperties | undefined = translateY > 0 || isClosing ? {
    transform: `translateY(${translateY}px)`,
    transition: isDragging ? 'none' : `transform ${CLOSE_ANIMATION_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`
  } : undefined;

  return {
    isClosing,
    sheetStyle,
    smoothClose,
    touchHandlers: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: onTouchEnd }
  };
};
