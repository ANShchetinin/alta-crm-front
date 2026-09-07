import { useState, useRef, useCallback, useEffect } from 'react';
import type { OrderStatus } from '../api/kanban';

export interface UseTouchColumnReorderProps {
  columns: OrderStatus[];
  onReorder: (newColumns: OrderStatus[]) => Promise<void> | void;
}

export const useTouchColumnReorder = ({
  columns,
  onReorder
}: UseTouchColumnReorderProps) => {
  const [draggingColId, setDraggingColId] = useState<number | null>(null);
  const [targetColId, setTargetColId] = useState<number | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);

  const stateRef = useRef<{
    draggingId: number | null;
    currentX: number;
    currentY: number;
    hasMoved: boolean;
    targetColId: number | null;
  }>({
    draggingId: null,
    currentX: 0,
    currentY: 0,
    hasMoved: false,
    targetColId: null
  });

  const cleanupListeners = useRef<() => void>(() => {});

  const handleNativeTouchMove = useCallback((e: TouchEvent) => {
    if (!stateRef.current.draggingId) return;

    if (e.cancelable && e.preventDefault) {
      e.preventDefault();
    }
    if (e.stopPropagation) {
      e.stopPropagation();
    }

    const touch = e.touches[0];
    if (!touch) return;

    stateRef.current.currentX = touch.clientX;
    stateRef.current.currentY = touch.clientY;
    stateRef.current.hasMoved = true;
    setDragPosition({ x: touch.clientX, y: touch.clientY });

    // Auto-scroll window in list mode
    if (typeof window !== 'undefined') {
      const screenHeight = window.innerHeight;
      if (touch.clientY < 80) {
        window.scrollBy(0, -12);
      } else if (touch.clientY > screenHeight - 80) {
        window.scrollBy(0, 12);
      }
    }

    // Find column under touch coordinates
    if (typeof document !== 'undefined' && typeof document.elementFromPoint === 'function') {
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      const colEl = element?.closest('[data-column-id]');
      const colIdStr = colEl?.getAttribute('data-column-id');
      if (colIdStr) {
        const id = parseInt(colIdStr, 10);
        setTargetColId(id);
        stateRef.current.targetColId = id;
      }
    }
  }, []);

  const handleNativeTouchEnd = useCallback((e: TouchEvent) => {
    cleanupListeners.current();

    const { draggingId, hasMoved } = stateRef.current;
    if (!draggingId) return;

    if (e.cancelable) {
      e.preventDefault();
    }

    if (typeof document !== 'undefined') {
      document.body.style.userSelect = '';
      (document.body.style as any).webkitUserSelect = '';
      (document.body.style as any).touchAction = '';
    }

    let finalTargetId = stateRef.current.targetColId;
    if (typeof document !== 'undefined' && typeof document.elementFromPoint === 'function') {
      const touch = e.changedTouches?.[0];
      if (touch) {
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        const colEl = element?.closest('[data-column-id]');
        const colIdStr = colEl?.getAttribute('data-column-id');
        if (colIdStr) {
          finalTargetId = parseInt(colIdStr, 10);
        }
      }
    }

    if (hasMoved && finalTargetId && draggingId !== finalTargetId) {
      const sourceIndex = columns.findIndex(c => c.id === draggingId);
      const targetIndex = columns.findIndex(c => c.id === finalTargetId);
      if (sourceIndex > -1 && targetIndex > -1) {
        const newColumns = [...columns];
        const [removed] = newColumns.splice(sourceIndex, 1);
        newColumns.splice(targetIndex, 0, removed);
        newColumns.forEach((c, index) => {
          c.sortOrder = index + 1;
        });
        onReorder(newColumns);
        try {
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([30, 40]);
          }
        } catch {}
      }
    }

    stateRef.current = {
      draggingId: null,
      currentX: 0,
      currentY: 0,
      hasMoved: false,
      targetColId: null
    };
    setDraggingColId(null);
    setTargetColId(null);
    setDragPosition(null);
  }, [columns, onReorder]);

  const handleNativeTouchCancel = useCallback(() => {
    cleanupListeners.current();

    if (typeof document !== 'undefined') {
      document.body.style.userSelect = '';
      (document.body.style as any).webkitUserSelect = '';
      (document.body.style as any).touchAction = '';
    }

    stateRef.current = {
      draggingId: null,
      currentX: 0,
      currentY: 0,
      hasMoved: false,
      targetColId: null
    };
    setDraggingColId(null);
    setTargetColId(null);
    setDragPosition(null);
  }, []);

  const handleHandleTouchStart = useCallback((e: React.TouchEvent, colId: number) => {
    e.stopPropagation();
    if (e.cancelable) {
      e.preventDefault();
    }
    const touch = e.touches[0];
    stateRef.current = {
      draggingId: colId,
      currentX: touch.clientX,
      currentY: touch.clientY,
      hasMoved: false,
      targetColId: colId
    };

    setDraggingColId(colId);
    setTargetColId(colId);
    setDragPosition({ x: touch.clientX, y: touch.clientY });

    if (typeof document !== 'undefined') {
      document.body.style.userSelect = 'none';
      (document.body.style as any).webkitUserSelect = 'none';
      (document.body.style as any).touchAction = 'none';
    }

    // Attach native non-passive listeners
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

  const handleHandleTouchMove = useCallback((e: React.TouchEvent) => {
    handleNativeTouchMove(e.nativeEvent || (e as any));
  }, [handleNativeTouchMove]);

  const handleHandleTouchEnd = useCallback((e: React.TouchEvent) => {
    handleNativeTouchEnd(e.nativeEvent || (e as any));
  }, [handleNativeTouchEnd]);

  const handleHandleTouchCancel = useCallback(() => {
    handleNativeTouchCancel();
  }, [handleNativeTouchCancel]);

  useEffect(() => {
    return () => {
      cleanupListeners.current();
      if (typeof document !== 'undefined') {
        document.body.style.userSelect = '';
        (document.body.style as any).webkitUserSelect = '';
        (document.body.style as any).touchAction = '';
      }
    };
  }, []);

  return {
    draggingColId,
    targetColId,
    dragPosition,
    handleHandleTouchStart,
    handleHandleTouchMove,
    handleHandleTouchEnd,
    handleHandleTouchCancel
  };
};
