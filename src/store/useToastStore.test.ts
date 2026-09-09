import { describe, it, expect, beforeEach } from 'vitest';
import { useToastStore } from './useToastStore';
import { toast } from '../utils/toast';

describe('useToastStore & toast helper', () => {
  beforeEach(() => {
    useToastStore.getState().clearAll();
  });

  it('adds success toast', () => {
    toast.success('Заявка сохранена!');
    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toBe('Заявка сохранена!');
    expect(toasts[0].type).toBe('success');
  });

  it('adds error toast with longer default duration', () => {
    toast.error('Произошла ошибка');
    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].type).toBe('error');
    expect(toasts[0].duration).toBe(4500);
  });

  it('removes toast by id', () => {
    const id = toast.info('Инфо');
    expect(useToastStore.getState().toasts).toHaveLength(1);
    toast.dismiss(id);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('limits toasts to 4 items', () => {
    toast.info('1');
    toast.info('2');
    toast.info('3');
    toast.info('4');
    toast.info('5');
    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(4);
    expect(toasts[0].message).toBe('5');
  });
});
