import { useState, useRef, useEffect, useCallback } from 'react';
import type { Order } from '../api/kanban';

export interface TouchDragGhostData {
  card: Order;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  initialX: number;
  initialY: number;
}

export interface UseTouchKanbanDragProps {
  boardRef: React.RefObject<HTMLDivElement | null>;
  onDropCard: (cardId: number, targetStatusId: number) => void;
  onCardClick: (card: Order) => void;
  longPressDelay?: number;
}

// Distance in pixels beyond which a touch gesture is classified as scroll rather than tap/hold
const MOVE_THRESHOLD = 14;
// Suppression time for synthetic click events after touch interactions
const CLICK_SUPPRESSION_MS = 800;

export const useTouchKanbanDrag = ({
  boardRef,
  onDropCard,
  onCardClick,
  longPressDelay = 220
}: UseTouchKanbanDragProps) => {
  const [draggingCard, setDraggingCard] = useState<Order | null>(null);
  const [pressingCardId, setPressingCardId] = useState<number | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [targetStatusId, setTargetStatusId] = useState<number | null>(null);
  const [ghostData, setGhostData] = useState<TouchDragGhostData | null>(null);

  const stateRef = useRef<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    card: Order | null;
    timer: ReturnType<typeof setTimeout> | null;
    isDragging: boolean;
    hasMoved: boolean;
    startTime: number;
    suppressClickUntil: number;
    cardElement: HTMLElement | null;
    autoScrollTimer: number | null;
    targetStatusId: number | null;
  }>({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    card: null,
    timer: null,
    isDragging: false,
    hasMoved: false,
    startTime: 0,
    suppressClickUntil: 0,
    cardElement: null,
    autoScrollTimer: null,
    targetStatusId: null
  });

  const stopAutoScroll = useCallback(() => {
    if (stateRef.current.autoScrollTimer) {
      cancelAnimationFrame(stateRef.current.autoScrollTimer);
      stateRef.current.autoScrollTimer = null;
    }
  }, []);

  const handleAutoScroll = useCallback((x: number, y: number) => {
    stopAutoScroll();

    const EDGE_THRESHOLD = 80;
    const SCROLL_SPEED = 12;
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 400;
    const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

    const scrollLoop = () => {
      if (!stateRef.current.isDragging) return;

      // Horizontal board scroll
      if (boardRef.current) {
        if (stateRef.current.currentX < EDGE_THRESHOLD) {
          boardRef.current.scrollLeft -= SCROLL_SPEED;
        } else if (stateRef.current.currentX > screenWidth - EDGE_THRESHOLD) {
          boardRef.current.scrollLeft += SCROLL_SPEED;
        }
      }

      // Vertical window scroll (for list view)
      if (typeof window !== 'undefined') {
        if (stateRef.current.currentY < EDGE_THRESHOLD) {
          window.scrollBy(0, -SCROLL_SPEED);
        } else if (stateRef.current.currentY > screenHeight - EDGE_THRESHOLD) {
          window.scrollBy(0, SCROLL_SPEED);
        }
      }

      stateRef.current.autoScrollTimer = requestAnimationFrame(scrollLoop);
    };

    if (x < EDGE_THRESHOLD || x > screenWidth - EDGE_THRESHOLD || y < EDGE_THRESHOLD || y > screenHeight - EDGE_THRESHOLD) {
      stateRef.current.autoScrollTimer = requestAnimationFrame(scrollLoop);
    }
  }, [boardRef, stopAutoScroll]);

  const updateTargetColumn = useCallback((x: number, y: number) => {
    if (typeof document === 'undefined' || typeof document.elementFromPoint !== 'function') return;
    const element = document.elementFromPoint(x, y);
    if (!element) {
      setTargetStatusId(null);
      stateRef.current.targetStatusId = null;
      return;
    }
    const columnEl = element.closest('[data-column-id]');
    if (columnEl) {
      const colIdStr = columnEl.getAttribute('data-column-id');
      if (colIdStr) {
        const colId = parseInt(colIdStr, 10);
        setTargetStatusId(colId);
        stateRef.current.targetStatusId = colId;
        return;
      }
    }
    setTargetStatusId(null);
    stateRef.current.targetStatusId = null;
  }, []);

  const cleanupListeners = useRef<() => void>(() => {});

  const handleNativeTouchMove = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;

    const { startX, startY, isDragging, timer } = stateRef.current;
    stateRef.current.currentX = touch.clientX;
    stateRef.current.currentY = touch.clientY;

    if (!isDragging) {
      const dist = Math.hypot(touch.clientX - startX, touch.clientY - startY);
      if (dist > MOVE_THRESHOLD) {
        stateRef.current.hasMoved = true;
        stateRef.current.suppressClickUntil = Date.now() + CLICK_SUPPRESSION_MS;
        setPressingCardId(null);
        if (timer) {
          clearTimeout(timer);
          stateRef.current.timer = null;
        }
      }
      return;
    }

    // While dragging, prevent native page scrolling!
    if (e.cancelable && e.preventDefault) {
      e.preventDefault();
    }
    if (e.stopPropagation) {
      e.stopPropagation();
    }

    setDragPosition({ x: touch.clientX, y: touch.clientY });
    handleAutoScroll(touch.clientX, touch.clientY);
    updateTargetColumn(touch.clientX, touch.clientY);
  }, [handleAutoScroll, updateTargetColumn]);

  const handleNativeTouchEnd = useCallback((e: TouchEvent) => {
    cleanupListeners.current();

    const { timer, isDragging, card, startTime, startX, startY } = stateRef.current;
    if (timer) {
      clearTimeout(timer);
      stateRef.current.timer = null;
    }
    setPressingCardId(null);
    stopAutoScroll();

    if (typeof document !== 'undefined') {
      document.body.style.userSelect = '';
      (document.body.style as any).webkitUserSelect = '';
      (document.body.style as any).touchAction = '';
    }

    if (isDragging && card) {
      if (e.cancelable) {
        e.preventDefault();
      }

      let finalTargetId: number | null = null;
      if (typeof document !== 'undefined' && typeof document.elementFromPoint === 'function') {
        const element = document.elementFromPoint(
          stateRef.current.currentX,
          stateRef.current.currentY
        );
        const columnEl = element?.closest('[data-column-id]');
        const colIdStr = columnEl?.getAttribute('data-column-id');
        if (colIdStr) {
          finalTargetId = parseInt(colIdStr, 10);
        }
      }
      if (!finalTargetId) {
        finalTargetId = stateRef.current.targetStatusId;
      }

      if (finalTargetId && finalTargetId !== card.statusId) {
        onDropCard(card.id, finalTargetId);
        try {
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([30, 40]);
          }
        } catch {}
      }

      stateRef.current.suppressClickUntil = Date.now() + CLICK_SUPPRESSION_MS;
      setDraggingCard(null);
      setDragPosition(null);
      setTargetStatusId(null);
      setGhostData(null);
      stateRef.current.isDragging = false;
      stateRef.current.card = null;
    } else if (card) {
      const touch = e.changedTouches?.[0];
      const endDist = touch ? Math.hypot(touch.clientX - startX, touch.clientY - startY) : 0;
      if (endDist > MOVE_THRESHOLD) {
        stateRef.current.hasMoved = true;
      }

      const target = e.target as HTMLElement | null;
      const isInteractive = target && !!target.closest('a, button, input, select, textarea, [data-no-card-click], .kanban-map-pill, .card-phone-btn, .card-messenger-btn, .card-complete-btn');
      const duration = Date.now() - startTime;

      if (!stateRef.current.hasMoved && endDist <= MOVE_THRESHOLD && !isInteractive && duration >= 30 && duration < 500) {
        stateRef.current.suppressClickUntil = Date.now() + CLICK_SUPPRESSION_MS;
        stateRef.current.hasMoved = true;
        onCardClick(card);
      } else {
        stateRef.current.hasMoved = true;
        stateRef.current.suppressClickUntil = Date.now() + CLICK_SUPPRESSION_MS;
      }
      stateRef.current.card = null;
    }
  }, [onDropCard, onCardClick, stopAutoScroll]);

  const handleNativeTouchCancel = useCallback(() => {
    cleanupListeners.current();

    if (stateRef.current.timer) {
      clearTimeout(stateRef.current.timer);
      stateRef.current.timer = null;
    }
    setPressingCardId(null);
    stopAutoScroll();

    if (typeof document !== 'undefined') {
      document.body.style.userSelect = '';
      (document.body.style as any).webkitUserSelect = '';
      (document.body.style as any).touchAction = '';
    }

    stateRef.current.hasMoved = true;
    stateRef.current.suppressClickUntil = Date.now() + CLICK_SUPPRESSION_MS;
    setDraggingCard(null);
    setDragPosition(null);
    setTargetStatusId(null);
    setGhostData(null);
    stateRef.current.isDragging = false;
    stateRef.current.card = null;
  }, [stopAutoScroll]);

  const handleTouchStart = useCallback((e: React.TouchEvent, card: Order) => {
    const target = e.target as HTMLElement | null;
    if (target && target.closest('a, button, input, select, textarea, [data-no-card-click], .kanban-map-pill, .card-phone-btn, .card-messenger-btn, .card-complete-btn')) {
      return;
    }

    const touch = e.touches[0];
    const cardEl = e.currentTarget as HTMLElement;
    const rect = cardEl.getBoundingClientRect();

    const startX = touch.clientX;
    const startY = touch.clientY;
    const offsetX = startX - rect.left;
    const offsetY = startY - rect.top;

    if (stateRef.current.timer) {
      clearTimeout(stateRef.current.timer);
    }

    setPressingCardId(card.id);

    stateRef.current = {
      startX,
      startY,
      currentX: startX,
      currentY: startY,
      card,
      timer: null,
      isDragging: false,
      hasMoved: false,
      startTime: Date.now(),
      suppressClickUntil: stateRef.current.suppressClickUntil,
      cardElement: cardEl,
      autoScrollTimer: null,
      targetStatusId: card.statusId
    };

    // Attach native non-passive listeners to window to guarantee e.preventDefault() blocks browser scroll!
    window.addEventListener('touchmove', handleNativeTouchMove, { passive: false });
    window.addEventListener('touchend', handleNativeTouchEnd, { passive: false });
    window.addEventListener('touchcancel', handleNativeTouchCancel, { passive: false });

    cleanupListeners.current = () => {
      window.removeEventListener('touchmove', handleNativeTouchMove);
      window.removeEventListener('touchend', handleNativeTouchEnd);
      window.removeEventListener('touchcancel', handleNativeTouchCancel);
    };

    const timer = setTimeout(() => {
      if (stateRef.current.hasMoved || stateRef.current.card?.id !== card.id) {
        setPressingCardId(null);
        return;
      }

      stateRef.current.isDragging = true;
      stateRef.current.hasMoved = true;
      stateRef.current.suppressClickUntil = Date.now() + CLICK_SUPPRESSION_MS;
      setPressingCardId(null);

      // Lock body scrolling and text selection while dragging
      if (typeof document !== 'undefined') {
        document.body.style.userSelect = 'none';
        (document.body.style as any).webkitUserSelect = 'none';
        (document.body.style as any).touchAction = 'none';
      }

      setDraggingCard(card);
      setDragPosition({ x: startX, y: startY });
      setGhostData({
        card,
        width: rect.width,
        height: rect.height,
        offsetX,
        offsetY,
        initialX: rect.left,
        initialY: rect.top
      });
      setTargetStatusId(card.statusId);

      try {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(50);
        }
      } catch {}
    }, longPressDelay);

    stateRef.current.timer = timer;
  }, [longPressDelay, handleNativeTouchMove, handleNativeTouchEnd, handleNativeTouchCancel]);

  // Direct grip handle drag start with immediate activation (no timer delay!)
  const handleGripTouchStart = useCallback((e: React.TouchEvent, card: Order) => {
    e.stopPropagation();
    if (e.cancelable && e.preventDefault) {
      e.preventDefault();
    }

    const touch = e.touches[0];
    const cardEl = ((e.currentTarget as HTMLElement).closest('.kanban-card') || e.currentTarget) as HTMLElement;
    const rect = cardEl.getBoundingClientRect();

    const startX = touch.clientX;
    const startY = touch.clientY;
    const offsetX = startX - rect.left;
    const offsetY = startY - rect.top;

    if (stateRef.current.timer) {
      clearTimeout(stateRef.current.timer);
      stateRef.current.timer = null;
    }

    stateRef.current = {
      startX,
      startY,
      currentX: startX,
      currentY: startY,
      card,
      timer: null,
      isDragging: true,
      hasMoved: true,
      startTime: Date.now(),
      suppressClickUntil: Date.now() + CLICK_SUPPRESSION_MS,
      cardElement: cardEl,
      autoScrollTimer: null,
      targetStatusId: card.statusId
    };

    if (typeof document !== 'undefined') {
      document.body.style.userSelect = 'none';
      (document.body.style as any).webkitUserSelect = 'none';
      (document.body.style as any).touchAction = 'none';
    }

    setDraggingCard(card);
    setDragPosition({ x: startX, y: startY });
    setGhostData({
      card,
      width: rect.width,
      height: rect.height,
      offsetX,
      offsetY,
      initialX: rect.left,
      initialY: rect.top
    });
    setTargetStatusId(card.statusId);

    window.addEventListener('touchmove', handleNativeTouchMove, { passive: false });
    window.addEventListener('touchend', handleNativeTouchEnd, { passive: false });
    window.addEventListener('touchcancel', handleNativeTouchCancel, { passive: false });

    cleanupListeners.current = () => {
      window.removeEventListener('touchmove', handleNativeTouchMove);
      window.removeEventListener('touchend', handleNativeTouchEnd);
      window.removeEventListener('touchcancel', handleNativeTouchCancel);
    };

    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50);
      }
    } catch {}
  }, [handleNativeTouchMove, handleNativeTouchEnd, handleNativeTouchCancel]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    handleNativeTouchMove(e.nativeEvent || (e as any));
  }, [handleNativeTouchMove]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    handleNativeTouchEnd(e.nativeEvent || (e as any));
  }, [handleNativeTouchEnd]);

  const handleTouchCancel = useCallback(() => {
    handleNativeTouchCancel();
  }, [handleNativeTouchCancel]);

  const isClickAllowed = useCallback(() => {
    return Date.now() > stateRef.current.suppressClickUntil && !stateRef.current.hasMoved && !stateRef.current.isDragging;
  }, []);

  useEffect(() => {
    return () => {
      cleanupListeners.current();
      if (stateRef.current.timer) {
        clearTimeout(stateRef.current.timer);
      }
      stopAutoScroll();
      if (typeof document !== 'undefined') {
        document.body.style.userSelect = '';
        (document.body.style as any).webkitUserSelect = '';
        (document.body.style as any).touchAction = '';
      }
    };
  }, [stopAutoScroll]);

  return {
    draggingCard,
    pressingCardId,
    dragPosition,
    targetStatusId,
    ghostData,
    handleTouchStart,
    handleGripTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
    isClickAllowed
  };
};
