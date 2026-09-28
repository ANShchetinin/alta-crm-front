import { isAxiosError } from 'axios';

/**
 * Текст ошибки для пользователя: сообщение бэкенда (`{ message }` в теле ответа), иначе текст исключения,
 * иначе запасной вариант.
 */
export const getErrorMessage = (err: unknown, fallback: string): string => {
  if (isAxiosError<{ message?: string }>(err) && err.response?.data?.message) {
    return err.response.data.message;
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return fallback;
};
