import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTouchColumnReorder } from './useTouchColumnReorder';
import type { OrderStatus } from '../api/kanban';

describe('useTouchColumnReorder Hook', () => {
  const mockColumns: OrderStatus[] = [
    { id: 1, name: 'Новые', sortOrder: 1, color: '#3b82f6' },
    { id: 2, name: 'В работе', sortOrder: 2, color: '#f59e0b' },
    { id: 3, name: 'Завершенные', sortOrder: 3, color: '#22c55e' }
  ];

  let onReorder = vi.fn();

  beforeEach(() => {
    onReorder = vi.fn();
    document.elementFromPoint = vi.fn();
  });

  it('starts drag on handle touch start', () => {
    const { result } = renderHook(() =>
      useTouchColumnReorder({
        columns: mockColumns,
        onReorder
      })
    );

    const startEvent = {
      stopPropagation: vi.fn(),
      touches: [{ clientX: 300, clientY: 150 }]
    } as any;

    act(() => {
      result.current.handleHandleTouchStart(startEvent, 1);
    });

    expect(result.current.draggingColId).toBe(1);
    expect(result.current.dragPosition).toEqual({ x: 300, y: 150 });
  });

  it('reorders columns when dragged to another target column on touch end', () => {
    const { result } = renderHook(() =>
      useTouchColumnReorder({
        columns: mockColumns,
        onReorder
      })
    );

    const startEvent = {
      stopPropagation: vi.fn(),
      touches: [{ clientX: 300, clientY: 100 }]
    } as any;

    act(() => {
      result.current.handleHandleTouchStart(startEvent, 1);
    });

    const moveEvent = {
      cancelable: true,
      preventDefault: vi.fn(),
      touches: [{ clientX: 300, clientY: 250 }]
    } as any;

    act(() => {
      result.current.handleHandleTouchMove(moveEvent);
    });

    // Mock document.elementFromPoint finding column 3
    const mockCol3 = document.createElement('div');
    mockCol3.setAttribute('data-column-id', '3');
    vi.spyOn(document, 'elementFromPoint').mockReturnValue(mockCol3);

    const endEvent = {
      cancelable: true,
      preventDefault: vi.fn(),
      changedTouches: [{ clientX: 300, clientY: 250 }]
    } as any;

    act(() => {
      result.current.handleHandleTouchEnd(endEvent);
    });

    expect(onReorder).toHaveBeenCalled();
    const reordered: OrderStatus[] = onReorder.mock.calls[0][0];
    expect(reordered.map(c => c.id)).toEqual([2, 3, 1]);
    expect(reordered.map(c => c.sortOrder)).toEqual([1, 2, 3]);
  });
});
