import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useSwipeToDismiss } from './useSwipeToDismiss';

const touch = (clientY: number) => ({ touches: [{ clientY }] }) as unknown as React.TouchEvent;

describe('useSwipeToDismiss', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('requests closing after a long swipe down', () => {
    const onDismissRequest = vi.fn();
    const { result } = renderHook(() => useSwipeToDismiss(onDismissRequest, vi.fn()));

    act(() => {
      result.current.touchHandlers.onTouchStart(touch(100));
      result.current.touchHandlers.onTouchMove(touch(250));
    });
    expect(result.current.sheetStyle?.transform).toBe('translateY(150px)');
    act(() => {
      result.current.touchHandlers.onTouchEnd();
    });

    expect(onDismissRequest).toHaveBeenCalledTimes(1);
  });

  it('snaps back after a short swipe', () => {
    const onDismissRequest = vi.fn();
    const { result } = renderHook(() => useSwipeToDismiss(onDismissRequest, vi.fn()));

    act(() => {
      result.current.touchHandlers.onTouchStart(touch(100));
      result.current.touchHandlers.onTouchMove(touch(150));
    });
    act(() => {
      result.current.touchHandlers.onTouchEnd();
    });

    expect(onDismissRequest).not.toHaveBeenCalled();
    expect(result.current.sheetStyle).toBeUndefined();
  });

  it('closes after the slide-out animation', () => {
    vi.useFakeTimers();
    const onClosed = vi.fn();
    const { result } = renderHook(() => useSwipeToDismiss(vi.fn(), onClosed));

    act(() => {
      result.current.smoothClose();
    });
    expect(result.current.isClosing).toBe(true);
    act(() => {
      vi.advanceTimersByTime(240);
    });

    expect(onClosed).toHaveBeenCalledTimes(1);
    expect(result.current.isClosing).toBe(false);
  });
});
