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

export const useTouchKanbanDrag = ({
  boardRef,
  onDropCard,
  onCardClick,
  longPressDelay = 250
}: UseTouchKanbanDragProps) => {
  const [draggingCard, setDraggingCard] = useState<Order | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [targetStatusId, setTargetStatusId] = useState<number | null>(null);
  const [ghostData, setGhostData] = useState<TouchDragGhostData | null>(null);

  const touchStateRef = useRef<{
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
    autoScrollTimer: null
  });

  const stopAutoScroll = useCallback(() => {
    if (touchStateRef.current.autoScrollTimer) {
      cancelAnimationFrame(touchStateRef.current.autoScrollTimer);
      touchStateRef.current.autoScrollTimer = null;
    }
  }, []);

  const handleAutoScroll = useCallback((x: number) => {
    stopAutoScroll();
    if (!boardRef.current) return;

    const EDGE_THRESHOLD = 70;
    const SCROLL_SPEED = 10;
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 400;

    const scrollLoop = () => {
      if (!boardRef.current || !touchStateRef.current.isDragging) return;

      if (touchStateRef.current.currentX < EDGE_THRESHOLD) {
        boardRef.current.scrollLeft -= SCROLL_SPEED;
        touchStateRef.current.autoScrollTimer = requestAnimationFrame(scrollLoop);
      } else if (touchStateRef.current.currentX > screenWidth - EDGE_THRESHOLD) {
        boardRef.current.scrollLeft += SCROLL_SPEED;
        touchStateRef.current.autoScrollTimer = requestAnimationFrame(scrollLoop);
      }
    };

    if (x < EDGE_THRESHOLD || x > screenWidth - EDGE_THRESHOLD) {
      touchStateRef.current.autoScrollTimer = requestAnimationFrame(scrollLoop);
    }
  }, [boardRef, stopAutoScroll]);

  const updateTargetColumn = useCallback((x: number, y: number) => {
    if (typeof document === 'undefined' || typeof document.elementFromPoint !== 'function') return;
    const element = document.elementFromPoint(x, y);
    if (!element) {
      setTargetStatusId(null);
      return;
    }
    const columnEl = element.closest('[data-column-id]');
    if (columnEl) {
      const colIdStr = columnEl.getAttribute('data-column-id');
      if (colIdStr) {
        const colId = parseInt(colIdStr, 10);
        setTargetStatusId(colId);
        return;
      }
    }
    setTargetStatusId(null);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent, card: Order) => {
    const target = e.target as HTMLElement | null;
    if (target && target.closest('a, button, input, select, textarea, [data-no-card-click], .kanban-map-pill, .card-phone-btn, .card-complete-btn')) {
      // Touch is on an interactive link/button inside card - do not initiate touch drag or card click
      return;
    }

    const touch = e.touches[0];
    const cardEl = e.currentTarget as HTMLElement;
    const rect = cardEl.getBoundingClientRect();

    const startX = touch.clientX;
    const startY = touch.clientY;
    const offsetX = startX - rect.left;
    const offsetY = startY - rect.top;

    touchStateRef.current = {
      startX,
      startY,
      currentX: startX,
      currentY: startY,
      card,
      timer: null,
      isDragging: false,
      hasMoved: false,
      startTime: Date.now(),
      suppressClickUntil: 0,
      cardElement: cardEl,
      autoScrollTimer: null
    };

    const timer = setTimeout(() => {
      // Long press activated!
      touchStateRef.current.isDragging = true;
      touchStateRef.current.hasMoved = true;
      touchStateRef.current.suppressClickUntil = Date.now() + 400;

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

      // Haptic feedback
      try {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(50);
        }
      } catch (_) {}
    }, longPressDelay);

    touchStateRef.current.timer = timer;
  }, [longPressDelay]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const { startX, startY, isDragging, timer } = touchStateRef.current;
    touchStateRef.current.currentX = touch.clientX;
    touchStateRef.current.currentY = touch.clientY;

    if (!isDragging) {
      // If moved beyond natural finger tremor (16px), user is SCROLLING -> cancel drag timer
      const dist = Math.hypot(touch.clientX - startX, touch.clientY - startY);
      if (dist > 16) {
        touchStateRef.current.hasMoved = true;
        touchStateRef.current.suppressClickUntil = Date.now() + 400;
        if (timer) {
          clearTimeout(timer);
          touchStateRef.current.timer = null;
        }
      }
      return;
    }

    // Currently dragging card
    if (e.cancelable) {
      e.preventDefault();
    }
    setDragPosition({ x: touch.clientX, y: touch.clientY });
    handleAutoScroll(touch.clientX);
    updateTargetColumn(touch.clientX, touch.clientY);
  }, [handleAutoScroll, updateTargetColumn]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const { timer, isDragging, card, hasMoved, startTime } = touchStateRef.current;
    if (timer) {
      clearTimeout(timer);
      touchStateRef.current.timer = null;
    }
    stopAutoScroll();

    if (isDragging && card) {
      if (e.cancelable) {
        e.preventDefault();
      }

      let finalTargetId: number | null = null;
      if (typeof document !== 'undefined' && typeof document.elementFromPoint === 'function') {
        const element = document.elementFromPoint(
          touchStateRef.current.currentX,
          touchStateRef.current.currentY
        );
        const columnEl = element?.closest('[data-column-id]');
        const colIdStr = columnEl?.getAttribute('data-column-id');
        if (colIdStr) {
          finalTargetId = parseInt(colIdStr, 10);
        }
      }
      if (!finalTargetId) {
        finalTargetId = targetStatusId;
      }

      if (finalTargetId && finalTargetId !== card.statusId) {
        onDropCard(card.id, finalTargetId);
        try {
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([30, 40]);
          }
        } catch (_) {}
      }

      touchStateRef.current.suppressClickUntil = Date.now() + 400;
      setDraggingCard(null);
      setDragPosition(null);
      setTargetStatusId(null);
      setGhostData(null);
      touchStateRef.current.isDragging = false;
      touchStateRef.current.card = null;
    } else if (card) {
      const target = e.target as HTMLElement | null;
      const isInteractive = target && !!target.closest('a, button, input, select, textarea, [data-no-card-click], .kanban-map-pill, .card-phone-btn, .card-complete-btn');
      const duration = Date.now() - startTime;
      // Only trigger click if it was an intentional stationary TAP (not a scroll gesture) and NOT on an interactive button/link
      if (!hasMoved && !isInteractive && duration < 350) {
        if (e.cancelable) {
          e.preventDefault();
        }
        onCardClick(card);
      }
      touchStateRef.current.suppressClickUntil = isInteractive ? 0 : Date.now() + 400;
      touchStateRef.current.card = null;
    }
  }, [onDropCard, onCardClick, stopAutoScroll, targetStatusId]);

  const handleTouchCancel = useCallback(() => {
    if (touchStateRef.current.timer) {
      clearTimeout(touchStateRef.current.timer);
      touchStateRef.current.timer = null;
    }
    stopAutoScroll();
    touchStateRef.current.suppressClickUntil = Date.now() + 400;
    setDraggingCard(null);
    setDragPosition(null);
    setTargetStatusId(null);
    setGhostData(null);
    touchStateRef.current.isDragging = false;
    touchStateRef.current.card = null;
  }, [stopAutoScroll]);

  // Check if standard mouse click is allowed (or should be suppressed due to touch scroll/drag)
  const isClickAllowed = useCallback(() => {
    return Date.now() > touchStateRef.current.suppressClickUntil && !touchStateRef.current.hasMoved && !touchStateRef.current.isDragging;
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (touchStateRef.current.timer) {
        clearTimeout(touchStateRef.current.timer);
      }
      stopAutoScroll();
    };
  }, [stopAutoScroll]);

  return {
    draggingCard,
    dragPosition,
    targetStatusId,
    ghostData,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
    isClickAllowed
  };
};
