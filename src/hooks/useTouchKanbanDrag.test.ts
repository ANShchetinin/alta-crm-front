import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTouchKanbanDrag } from './useTouchKanbanDrag';
import type { Order } from '../api/kanban';

describe('useTouchKanbanDrag Hook', () => {
  const mockOrder: Order = {
    id: 101,
    clientId: 1,
    statusId: 10,
    address: 'ул. Тестовая, д. 1',
    description: 'Тестовая заявка',
    totalPrice: 25000,
    prepayment: 5000,
    prepaymentPaid: true,
    remainder: 20000,
    remainderPaid: false,
    materials: [],
    attachments: []
  };

  const boardRef = { current: document.createElement('div') };
  let onDropCard = vi.fn();
  let onCardClick = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    onDropCard = vi.fn();
    onCardClick = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('triggers onCardClick on quick tap (no long press, no significant move)', () => {
    const { result } = renderHook(() =>
      useTouchKanbanDrag({
        boardRef,
        onDropCard,
        onCardClick,
        longPressDelay: 200
      })
    );

    const mockTarget = document.createElement('div');
    vi.spyOn(mockTarget, 'getBoundingClientRect').mockReturnValue({
      left: 20,
      top: 100,
      width: 300,
      height: 120,
      right: 320,
      bottom: 220,
      x: 20,
      y: 100,
      toJSON: () => {}
    });

    const startEvent = {
      touches: [{ clientX: 50, clientY: 120 }],
      currentTarget: mockTarget
    } as any;

    act(() => {
      result.current.handleTouchStart(startEvent, mockOrder);
    });

    // Advance timer by only 50ms (before longPressDelay of 200ms)
    act(() => {
      vi.advanceTimersByTime(50);
    });

    const endEvent = {
      touches: [],
      cancelable: true,
      preventDefault: vi.fn()
    } as any;

    act(() => {
      result.current.handleTouchEnd(endEvent);
    });

    expect(onCardClick).toHaveBeenCalledWith(mockOrder);
    expect(onDropCard).not.toHaveBeenCalled();
    expect(result.current.draggingCard).toBeNull();
  });

  it('activates dragging state after long press delay', () => {
    const { result } = renderHook(() =>
      useTouchKanbanDrag({
        boardRef,
        onDropCard,
        onCardClick,
        longPressDelay: 200
      })
    );

    const mockTarget = document.createElement('div');
    vi.spyOn(mockTarget, 'getBoundingClientRect').mockReturnValue({
      left: 20,
      top: 100,
      width: 300,
      height: 120,
      right: 320,
      bottom: 220,
      x: 20,
      y: 100,
      toJSON: () => {}
    });

    const startEvent = {
      touches: [{ clientX: 50, clientY: 120 }],
      currentTarget: mockTarget
    } as any;

    act(() => {
      result.current.handleTouchStart(startEvent, mockOrder);
    });

    expect(result.current.draggingCard).toBeNull();

    // Advance timer past long press threshold
    act(() => {
      vi.advanceTimersByTime(210);
    });

    expect(result.current.draggingCard).toEqual(mockOrder);
    expect(result.current.dragPosition).toEqual({ x: 50, y: 120 });
    expect(result.current.ghostData).toEqual({
      card: mockOrder,
      width: 300,
      height: 120,
      offsetX: 30, // 50 - 20
      offsetY: 20, // 120 - 100
      initialX: 20,
      initialY: 100
    });
  });

  it('cancels long press if user moves significantly before delay (scrolling)', () => {
    const { result } = renderHook(() =>
      useTouchKanbanDrag({
        boardRef,
        onDropCard,
        onCardClick,
        longPressDelay: 200
      })
    );

    const mockTarget = document.createElement('div');
    vi.spyOn(mockTarget, 'getBoundingClientRect').mockReturnValue({
      left: 20,
      top: 100,
      width: 300,
      height: 120,
      right: 320,
      bottom: 220,
      x: 20,
      y: 100,
      toJSON: () => {}
    });

    act(() => {
      result.current.handleTouchStart(
        { touches: [{ clientX: 50, clientY: 120 }], currentTarget: mockTarget } as any,
        mockOrder
      );
    });

    // Move finger 30px vertically after 40ms
    act(() => {
      vi.advanceTimersByTime(40);
      result.current.handleTouchMove({
        touches: [{ clientX: 50, clientY: 150 }],
        cancelable: true,
        preventDefault: vi.fn()
      } as any);
    });

    // Now advance past 200ms
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Should NOT be dragging
    expect(result.current.draggingCard).toBeNull();
  });
});
