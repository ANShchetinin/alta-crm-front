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

  beforeEach(() => {
    vi.useFakeTimers();
    onDropCard = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows click when no dragging occurs', () => {
    const { result } = renderHook(() =>
      useTouchKanbanDrag({
        boardRef,
        onDropCard
      })
    );

    expect(result.current.isClickAllowed()).toBe(true);
    expect(result.current.draggingCard).toBeNull();
  });

  it('activates dragging state immediately on grip handle touch', () => {
    const { result } = renderHook(() =>
      useTouchKanbanDrag({
        boardRef,
        onDropCard
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
      currentTarget: mockTarget,
      stopPropagation: vi.fn(),
      cancelable: true,
      preventDefault: vi.fn()
    } as any;

    act(() => {
      result.current.handleGripTouchStart(startEvent, mockOrder);
    });

    expect(result.current.draggingCard).toEqual(mockOrder);
    expect(result.current.dragPosition).toEqual({ x: 50, y: 120 });
    expect(result.current.ghostData).toEqual({
      card: mockOrder,
      width: 300,
      height: 120,
      offsetX: 30,
      offsetY: 20,
      initialX: 20,
      initialY: 100
    });
  });

  it('activates dragging state immediately on grip handle pointerdown', () => {
    const { result } = renderHook(() =>
      useTouchKanbanDrag({
        boardRef,
        onDropCard
      })
    );

    const mockTarget = document.createElement('div');
    mockTarget.setPointerCapture = vi.fn();
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
      clientX: 50,
      clientY: 120,
      pointerId: 1,
      currentTarget: mockTarget,
      stopPropagation: vi.fn(),
      cancelable: true,
      preventDefault: vi.fn()
    } as any;

    act(() => {
      result.current.handleGripPointerDown(startEvent, mockOrder);
    });

    expect(result.current.draggingCard).toEqual(mockOrder);
    expect(result.current.dragPosition).toEqual({ x: 50, y: 120 });
  });

  it('cancels drag on touchCancel', () => {
    const { result } = renderHook(() =>
      useTouchKanbanDrag({
        boardRef,
        onDropCard
      })
    );

    const mockTarget = document.createElement('div');
    act(() => {
      result.current.handleGripTouchStart(
        { touches: [{ clientX: 50, clientY: 120 }], currentTarget: mockTarget, stopPropagation: vi.fn() } as any,
        mockOrder
      );
    });

    expect(result.current.draggingCard).not.toBeNull();

    act(() => {
      result.current.handleTouchCancel();
    });

    expect(result.current.draggingCard).toBeNull();
    expect(result.current.isClickAllowed()).toBe(false);
  });
});
