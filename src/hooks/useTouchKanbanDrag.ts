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
const MOVE_THRESHOLD = 12;
// Suppression time for synthetic click events after touch/drag interactions
const CLICK_SUPPRESSION_MS = 600;

export const useTouchKanbanDrag = ({
  boardRef,
  onDropCard,
  onCardClick,
  longPressDelay = 260
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
    activePointerId: number | null;
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
    targetStatusId: null,
    activePointerId: null
  });

  const cleanupListeners = useRef<() => void>(() => {});

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

  const triggerVibration = (pattern: number | number[]) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(pattern);
      }
    } catch {}
  };

  const lockBodyStyles = () => {
    if (typeof document !== 'undefined') {
      document.body.style.userSelect = 'none';
      (document.body.style as any).webkitUserSelect = 'none';
      (document.body.style as any).touchAction = 'none';
    }
  };

  const unlockBodyStyles = () => {
    if (typeof document !== 'undefined') {
      document.body.style.userSelect = '';
      (document.body.style as any).webkitUserSelect = '';
      (document.body.style as any).touchAction = '';
    }
  };

  // Move processor (used by both native touchmove and pointermove)
  const processMove = useCallback((clientX: number, clientY: number) => {
    const { startX, startY, isDragging, timer } = stateRef.current;
    stateRef.current.currentX = clientX;
    stateRef.current.currentY = clientY;

    if (!isDragging) {
      const dist = Math.hypot(clientX - startX, clientY - startY);
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

    setDragPosition({ x: clientX, y: clientY });
    handleAutoScroll(clientX, clientY);
    updateTargetColumn(clientX, clientY);
  }, [handleAutoScroll, updateTargetColumn]);

  // End processor (used by both native touchend and pointerup)
  const processEnd = useCallback((clientX: number, clientY: number) => {
    cleanupListeners.current();

    const { timer, isDragging, card, startTime, startX, startY } = stateRef.current;
    if (timer) {
      clearTimeout(timer);
      stateRef.current.timer = null;
    }
    setPressingCardId(null);
    stopAutoScroll();
    unlockBodyStyles();

    if (isDragging && card) {
      let finalTargetId: number | null = null;
      if (typeof document !== 'undefined' && typeof document.elementFromPoint === 'function') {
        const element = document.elementFromPoint(clientX, clientY);
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
        triggerVibration([30, 40]);
      }

      stateRef.current.suppressClickUntil = Date.now() + CLICK_SUPPRESSION_MS;
      setDraggingCard(null);
      setDragPosition(null);
      setTargetStatusId(null);
      setGhostData(null);
      stateRef.current.isDragging = false;
      stateRef.current.card = null;
    } else if (card) {
      const endDist = Math.hypot(clientX - startX, clientY - startY);
      if (endDist > MOVE_THRESHOLD) {
        stateRef.current.hasMoved = true;
      }

      const duration = Date.now() - startTime;
      if (!stateRef.current.hasMoved && endDist <= MOVE_THRESHOLD && duration >= 30 && duration < 500) {
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

  // Cancel processor
  const processCancel = useCallback(() => {
    cleanupListeners.current();

    if (stateRef.current.timer) {
      clearTimeout(stateRef.current.timer);
      stateRef.current.timer = null;
    }
    setPressingCardId(null);
    stopAutoScroll();
    unlockBodyStyles();

    stateRef.current.hasMoved = true;
    stateRef.current.suppressClickUntil = Date.now() + CLICK_SUPPRESSION_MS;
    setDraggingCard(null);
    setDragPosition(null);
    setTargetStatusId(null);
    setGhostData(null);
    stateRef.current.isDragging = false;
    stateRef.current.card = null;
  }, [stopAutoScroll]);

  // Native touch listeners
  const handleNativeTouchMove = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;

    if (stateRef.current.isDragging) {
      if (e.cancelable && e.preventDefault) {
        e.preventDefault();
      }
      if (e.stopPropagation) {
        e.stopPropagation();
      }
    }

    processMove(touch.clientX, touch.clientY);
  }, [processMove]);

  const handleNativeTouchEnd = useCallback((e: TouchEvent) => {
    const touch = e.changedTouches?.[0] || e.touches[0];
    const clientX = touch ? touch.clientX : stateRef.current.currentX;
    const clientY = touch ? touch.clientY : stateRef.current.currentY;

    if (stateRef.current.isDragging && e.cancelable && e.preventDefault) {
      e.preventDefault();
    }

    processEnd(clientX, clientY);
  }, [processEnd]);

  const handleNativeTouchCancel = useCallback(() => {
    processCancel();
  }, [processCancel]);

  // Pointer event listeners
  const handleNativePointerMove = useCallback((e: PointerEvent) => {
    if (stateRef.current.activePointerId !== null && e.pointerId !== stateRef.current.activePointerId) return;

    if (stateRef.current.isDragging) {
      if (e.cancelable && e.preventDefault) {
        e.preventDefault();
      }
    }

    processMove(e.clientX, e.clientY);
  }, [processMove]);

  const handleNativePointerUp = useCallback((e: PointerEvent) => {
    if (stateRef.current.activePointerId !== null && e.pointerId !== stateRef.current.activePointerId) return;
    stateRef.current.activePointerId = null;

    if (stateRef.current.isDragging && e.cancelable && e.preventDefault) {
      e.preventDefault();
    }

    processEnd(e.clientX, e.clientY);
  }, [processEnd]);

  const handleNativePointerCancel = useCallback((e: PointerEvent) => {
    if (stateRef.current.activePointerId !== null && e.pointerId !== stateRef.current.activePointerId) return;
    stateRef.current.activePointerId = null;
    processCancel();
  }, [processCancel]);

  // Attach global listeners
  const attachGlobalListeners = useCallback((pointerId?: number) => {
    cleanupListeners.current();

    if (pointerId !== undefined) {
      stateRef.current.activePointerId = pointerId;
      window.addEventListener('pointermove', handleNativePointerMove, { passive: false });
      window.addEventListener('pointerup', handleNativePointerUp, { passive: false });
      window.addEventListener('pointercancel', handleNativePointerCancel, { passive: false });
    }

    window.addEventListener('touchmove', handleNativeTouchMove, { passive: false });
    window.addEventListener('touchend', handleNativeTouchEnd, { passive: false });
    window.addEventListener('touchcancel', handleNativeTouchCancel, { passive: false });

    cleanupListeners.current = () => {
      window.removeEventListener('pointermove', handleNativePointerMove);
      window.removeEventListener('pointerup', handleNativePointerUp);
      window.removeEventListener('pointercancel', handleNativePointerCancel);
      window.removeEventListener('touchmove', handleNativeTouchMove);
      window.removeEventListener('touchend', handleNativeTouchEnd);
      window.removeEventListener('touchcancel', handleNativeTouchCancel);
    };
  }, [handleNativePointerMove, handleNativePointerUp, handleNativePointerCancel, handleNativeTouchMove, handleNativeTouchEnd, handleNativeTouchCancel]);

  // Card Body Touch Start (for tap or long-press drag)
  const handleTouchStart = useCallback((e: React.TouchEvent, card: Order) => {
    const target = e.target as HTMLElement | null;
    if (target && target.closest('a, button, input, select, textarea, [data-no-card-click], .kanban-map-pill, .card-phone-btn, .card-messenger-btn, .card-complete-btn, .card-grip-handle')) {
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
      targetStatusId: card.statusId,
      activePointerId: null
    };

    attachGlobalListeners();

    const timer = setTimeout(() => {
      if (stateRef.current.hasMoved || stateRef.current.card?.id !== card.id) {
        setPressingCardId(null);
        return;
      }

      stateRef.current.isDragging = true;
      stateRef.current.hasMoved = true;
      stateRef.current.suppressClickUntil = Date.now() + CLICK_SUPPRESSION_MS;
      setPressingCardId(null);

      lockBodyStyles();

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

      triggerVibration(50);
    }, longPressDelay);

    stateRef.current.timer = timer;
  }, [longPressDelay, attachGlobalListeners]);

  // Immediate Drag on Grip Handle via PointerDown (Standard for modern touch & desktop)
  const handleGripPointerDown = useCallback((e: React.PointerEvent, card: Order) => {
    e.stopPropagation();
    if (e.cancelable && e.preventDefault) {
      e.preventDefault();
    }

    const cardEl = ((e.currentTarget as HTMLElement).closest('.kanban-card') || e.currentTarget) as HTMLElement;
    const rect = cardEl.getBoundingClientRect();

    const startX = e.clientX;
    const startY = e.clientY;
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
      targetStatusId: card.statusId,
      activePointerId: e.pointerId
    };

    lockBodyStyles();

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}

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

    attachGlobalListeners(e.pointerId);
    triggerVibration(50);
  }, [attachGlobalListeners]);

  // Immediate Drag on Grip Handle via TouchStart (Fallback & iOS WebKit support)
  const handleGripTouchStart = useCallback((e: React.TouchEvent, card: Order) => {
    e.stopPropagation();
    if (e.cancelable && e.preventDefault) {
      e.preventDefault();
    }

    const touch = e.touches[0];
    if (!touch) return;

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
      targetStatusId: card.statusId,
      activePointerId: null
    };

    lockBodyStyles();

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

    attachGlobalListeners();
    triggerVibration(50);
  }, [attachGlobalListeners]);

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
      unlockBodyStyles();
    };
  }, [stopAutoScroll]);

  return {
    draggingCard,
    pressingCardId,
    dragPosition,
    targetStatusId,
    ghostData,
    handleTouchStart,
    handleGripPointerDown,
    handleGripTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
    isClickAllowed
  };
};

