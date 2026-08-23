import { useState, useRef, useCallback } from 'react';
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
  const [dragY, setDragY] = useState<number | null>(null);

  const stateRef = useRef<{
    draggingId: number | null;
    currentY: number;
    hasMoved: boolean;
  }>({
    draggingId: null,
    currentY: 0,
    hasMoved: false
  });

  const handleHandleTouchStart = useCallback((e: React.TouchEvent, colId: number) => {
    e.stopPropagation();
    const touch = e.touches[0];
    stateRef.current = {
      draggingId: colId,
      currentY: touch.clientY,
      hasMoved: false
    };

    setDraggingColId(colId);
    setTargetColId(colId);
    setDragY(touch.clientY);

    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(40);
      }
    } catch (_) {}
  }, []);

  const handleHandleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!stateRef.current.draggingId) return;
    if (e.cancelable) {
      e.preventDefault();
    }
    const touch = e.touches[0];
    stateRef.current.currentY = touch.clientY;
    stateRef.current.hasMoved = true;
    setDragY(touch.clientY);

    // Find column under touch
    if (typeof document !== 'undefined' && typeof document.elementFromPoint === 'function') {
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      const colEl = element?.closest('[data-column-id]');
      const colIdStr = colEl?.getAttribute('data-column-id');
      if (colIdStr) {
        const id = parseInt(colIdStr, 10);
        setTargetColId(id);
      }
    }
  }, []);

  const handleHandleTouchEnd = useCallback((e: React.TouchEvent) => {
    const { draggingId, hasMoved } = stateRef.current;
    if (!draggingId) return;

    if (e.cancelable) {
      e.preventDefault();
    }

    let finalTargetId = targetColId;
    if (typeof document !== 'undefined' && typeof document.elementFromPoint === 'function') {
      const touch = e.changedTouches[0];
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
            navigator.vibrate([20, 30]);
          }
        } catch (_) {}
      }
    }

    stateRef.current = {
      draggingId: null,
      currentY: 0,
      hasMoved: false
    };
    setDraggingColId(null);
    setTargetColId(null);
    setDragY(null);
  }, [columns, onReorder, targetColId]);

  const handleHandleTouchCancel = useCallback(() => {
    stateRef.current = {
      draggingId: null,
      currentY: 0,
      hasMoved: false
    };
    setDraggingColId(null);
    setTargetColId(null);
    setDragY(null);
  }, []);

  return {
    draggingColId,
    targetColId,
    dragY,
    handleHandleTouchStart,
    handleHandleTouchMove,
    handleHandleTouchEnd,
    handleHandleTouchCancel
  };
};
