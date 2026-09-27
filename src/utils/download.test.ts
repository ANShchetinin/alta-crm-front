import { describe, it, expect } from 'vitest';
import { readApiErrorMessage } from './download';

describe('readApiErrorMessage', () => {
  it('reads the message from a JSON error body', async () => {
    expect(await readApiErrorMessage({ response: { data: { message: 'Нет доступа' } } }, 'fallback')).toBe('Нет доступа');
  });

  it('reads the message from a Blob error body', async () => {
    const data = new Blob([JSON.stringify({ message: 'Файл не найден' })], { type: 'application/json' });

    expect(await readApiErrorMessage({ response: { data } }, 'fallback')).toBe('Файл не найден');
  });

  it('falls back when there is no readable message', async () => {
    expect(await readApiErrorMessage({ response: { data: new Blob(['not json']) } }, 'fallback')).toBe('fallback');
    expect(await readApiErrorMessage(new Error('network'), 'fallback')).toBe('fallback');
  });
});
