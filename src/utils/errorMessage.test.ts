import { describe, it, expect } from 'vitest';
import { AxiosError, type AxiosResponse } from 'axios';
import { getErrorMessage } from './errorMessage';

const axiosError = (data: unknown) => {
  const error = new AxiosError('Request failed with status code 400');
  error.response = { data, status: 400 } as AxiosResponse;
  return error;
};

describe('getErrorMessage', () => {
  it('prefers the backend message from the response body', () => {
    expect(getErrorMessage(axiosError({ message: 'Клиент с таким телефоном уже есть' }), 'Ошибка')).toBe('Клиент с таким телефоном уже есть');
  });

  it('falls back to the exception text and then to the default', () => {
    expect(getErrorMessage(axiosError({}), 'Ошибка')).toBe('Request failed with status code 400');
    expect(getErrorMessage(new Error('Network Error'), 'Ошибка')).toBe('Network Error');
    expect(getErrorMessage('boom', 'Ошибка')).toBe('Ошибка');
    expect(getErrorMessage(null, 'Ошибка')).toBe('Ошибка');
  });
});
