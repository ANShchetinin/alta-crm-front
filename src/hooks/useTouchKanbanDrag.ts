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
  onDropCard: (cardId: number, targetStatusId: number, targetCardId?: number | null, position?: 'before' | 'after') => void;
}

// Suppression time for synthetic click events after touch/drag interactions
const CLICK_SUPPRESSION_MS = 600;

export const useTouchKanbanDrag = ({
  boardRef,
  onDropCard
}: UseTouchKanbanDragProps) => {
  const [draggingCard, setDraggingCard] = useState<Order | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [targetStatusId, setTargetStatusId] = useState<number | null>(null);
  const [targetCardId, setTargetCardId] = useState<number | null>(null);
  const [targetCardPosition, setTargetCardPosition] = useState<'before' | 'after' | null>(null);
  const [ghostData, setGhostData] = useState<TouchDragGhostData | null>(null);

  const stateRef = useRef<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    card: Order | null;
    isDragging: boolean;
    hasMoved: boolean;
    startTime: number;
    suppressClickUntil: number;
    cardElement: HTMLElement | null;
    autoScrollTimer: number | null;
    targetStatusId: number | null;
    targetCardId: number | null;
    targetCardPosition: 'before' | 'after' | null;
    activePointerId: number | null;
  }>({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    card: null,
    isDragging: false,
    hasMoved: false,
    startTime: 0,
    suppressClickUntil: 0,
    cardElement: null,
    autoScrollTimer: null,
    targetStatusId: null,
    targetCardId: null,
    targetCardPosition: null,
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
    const currentCard = stateRef.current.card;
    if (!currentCard) return;

    const element = document.elementFromPoint(x, y);
    if (!element) {
      setTargetCardId(null);
      setTargetCardPosition(null);
      stateRef.current.targetCardId = null;
      stateRef.current.targetCardPosition = null;
      return;
    }

    // 1. Check if hovering over another card
    const cardEl = element.closest('[data-card-id]');
    if (cardEl) {
      const cardIdStr = cardEl.getAttribute('data-card-id');
      const cardColStr = cardEl.getAttribute('data-card-status-id');
      const id = cardIdStr ? parseInt(cardIdStr, 10) : null;
      const colId = cardColStr ? parseInt(cardColStr, 10) : null;

      if (id && id !== currentCard.id) {
        const rect = cardEl.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const pos: 'before' | 'after' = y < midY ? 'before' : 'after';

        setTargetCardId(id);
        setTargetCardPosition(pos);
        stateRef.current.targetCardId = id;
        stateRef.current.targetCardPosition = pos;

        const effectiveColId = colId || currentCard.statusId;
        setTargetStatusId(effectiveColId);
        stateRef.current.targetStatusId = effectiveColId;
        return;
      }
    }

    // 2. Check if hovering over a column container / column header / accordion
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

  const releasePointer = () => {
    if (stateRef.current.cardElement && stateRef.current.activePointerId !== null) {
      try {
        stateRef.current.cardElement.releasePointerCapture(stateRef.current.activePointerId);
      } catch {}
    }
  };

  // Move processor (used by both native touchmove and pointermove)
  const processMove = useCallback((clientX: number, clientY: number) => {
    if (!stateRef.current.isDragging) return;

    stateRef.current.currentX = clientX;
    stateRef.current.currentY = clientY;
    stateRef.current.hasMoved = true;

    setDragPosition({ x: clientX, y: clientY });
    handleAutoScroll(clientX, clientY);
    updateTargetColumn(clientX, clientY);
  }, [handleAutoScroll, updateTargetColumn]);

  // End processor (used by both native touchend and pointerup)
  const processEnd = useCallback((clientX: number, clientY: number) => {
    cleanupListeners.current();
    stopAutoScroll();
    releasePointer();
    unlockBodyStyles();

    const { isDragging, card, hasMoved } = stateRef.current;

    if (isDragging && card) {
      let finalTargetColId: number | null = stateRef.current.targetStatusId;
      let finalTargetCardId: number | null = stateRef.current.targetCardId;
      let finalTargetPos: 'before' | 'after' | null = stateRef.current.targetCardPosition;

      if (typeof document !== 'undefined' && typeof document.elementFromPoint === 'function') {
        const element = document.elementFromPoint(clientX, clientY);
        const cardEl = element?.closest('[data-card-id]');
        if (cardEl) {
          const cardIdStr = cardEl.getAttribute('data-card-id');
          const cardColStr = cardEl.getAttribute('data-card-status-id');
          const foundId = cardIdStr ? parseInt(cardIdStr, 10) : null;
          if (foundId && foundId !== card.id) {
            finalTargetCardId = foundId;
            const rect = cardEl.getBoundingClientRect();
            finalTargetPos = clientY < rect.top + rect.height / 2 ? 'before' : 'after';
          }
          if (cardColStr) {
            finalTargetColId = parseInt(cardColStr, 10);
          }
        }
        if (!finalTargetColId) {
          const columnEl = element?.closest('[data-column-id]');
          const colIdStr = columnEl?.getAttribute('data-column-id');
          if (colIdStr) {
            finalTargetColId = parseInt(colIdStr, 10);
          }
        }
      }

      if (!finalTargetColId) {
        finalTargetColId = card.statusId;
      }

      const isStatusChanged = finalTargetColId !== card.statusId;
      const isReorderedInSameStatus = hasMoved && finalTargetCardId && finalTargetCardId !== card.id;

      if (isStatusChanged || isReorderedInSameStatus) {
        onDropCard(card.id, finalTargetColId, finalTargetCardId, finalTargetPos || undefined);
        triggerVibration([30, 40]);
      }

      stateRef.current.suppressClickUntil = Date.now() + CLICK_SUPPRESSION_MS;
      setDraggingCard(null);
      setDragPosition(null);
      setTargetStatusId(null);
      setTargetCardId(null);
      setTargetCardPosition(null);
      setGhostData(null);
      stateRef.current.isDragging = false;
      stateRef.current.hasMoved = false;
      stateRef.current.card = null;
      stateRef.current.cardElement = null;
      stateRef.current.activePointerId = null;
      stateRef.current.targetCardId = null;
      stateRef.current.targetCardPosition = null;
    }
  }, [onDropCard, stopAutoScroll]);

  // Cancel processor
  const processCancel = useCallback(() => {
    cleanupListeners.current();
    stopAutoScroll();
    releasePointer();
    unlockBodyStyles();

    stateRef.current.hasMoved = false;
    stateRef.current.suppressClickUntil = Date.now() + CLICK_SUPPRESSION_MS;
    setDraggingCard(null);
    setDragPosition(null);
    setTargetStatusId(null);
    setTargetCardId(null);
    setTargetCardPosition(null);
    setGhostData(null);
    stateRef.current.isDragging = false;
    stateRef.current.card = null;
    stateRef.current.cardElement = null;
    stateRef.current.activePointerId = null;
    stateRef.current.targetCardId = null;
    stateRef.current.targetCardPosition = null;
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

  const startDrag = (
    clientX: number,
    clientY: number,
    card: Order,
    cardEl: HTMLElement,
    pointerId?: number
  ) => {
    if (stateRef.current.isDragging) return;

    const rect = cardEl.getBoundingClientRect();
    const offsetX = clientX - rect.left;
    const offsetY = clientY - rect.top;

    stateRef.current = {
      startX: clientX,
      startY: clientY,
      currentX: clientX,
      currentY: clientY,
      card,
      isDragging: true,
      hasMoved: false,
      startTime: Date.now(),
      suppressClickUntil: Date.now() + CLICK_SUPPRESSION_MS,
      cardElement: cardEl,
      autoScrollTimer: null,
      targetStatusId: card.statusId,
      targetCardId: null,
      targetCardPosition: null,
      activePointerId: pointerId !== undefined ? pointerId : null
    };

    lockBodyStyles();

    if (pointerId !== undefined) {
      try {
        cardEl.setPointerCapture(pointerId);
      } catch {}
    }

    setDraggingCard(card);
    setDragPosition({ x: clientX, y: clientY });
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

    attachGlobalListeners(pointerId);
    triggerVibration(50);
  };

  // Immediate Drag on Grip Handle via PointerDown (Standard for modern touch & desktop)
  const handleGripPointerDown = useCallback((e: React.PointerEvent, card: Order) => {
    e.stopPropagation();
    if (e.cancelable && e.preventDefault) {
      e.preventDefault();
    }

    const cardEl = ((e.currentTarget as HTMLElement).closest('.kanban-card') || e.currentTarget) as HTMLElement;
    startDrag(e.clientX, e.clientY, card, cardEl, e.pointerId);
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
    startDrag(touch.clientX, touch.clientY, card, cardEl);
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
    return Date.now() > stateRef.current.suppressClickUntil && !stateRef.current.isDragging;
  }, []);

  useEffect(() => {
    return () => {
      cleanupListeners.current();
      stopAutoScroll();
      releasePointer();
      unlockBodyStyles();
    };
  }, [stopAutoScroll]);

  return {
    draggingCard,
    dragPosition,
    targetStatusId,
    targetCardId,
    targetCardPosition,
    ghostData,
    handleGripPointerDown,
    handleGripTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
    isClickAllowed
  };
};

