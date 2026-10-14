import { isAxiosError } from 'axios';

/**
 * Сообщение бэкенда из тела ответа с ошибкой (`{ message }`), если оно есть.
 */
export const getServerErrorMessage = (err: unknown): string | undefined => {
  if (isAxiosError<{ message?: string }>(err) && err.response?.data?.message) {
    return err.response.data.message;
  }
  return undefined;
};

/**
 * Бэкенд отклонил изменение устаревших данных (409): их уже сохранил другой пользователь.
 */
export const isConflictError = (err: unknown): boolean => isAxiosError(err) && err.response?.status === 409;

/**
 * Текст ошибки для пользователя: сообщение бэкенда (`{ message }` в теле ответа), иначе текст исключения,
 * иначе запасной вариант.
 */
export const getErrorMessage = (err: unknown, fallback: string): string => {
  const serverMessage = getServerErrorMessage(err);
  if (serverMessage) {
    return serverMessage;
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return fallback;
};

/**
 * Заголовок ошибки с причиной от бэкенда: «Заголовок: причина», а без сообщения бэкенда — только заголовок
 * (технический текст исключения вроде «Request failed with status code 500» пользователю не показывается).
 */
export const formatErrorWithReason = (title: string, err: unknown): string => {
  const serverMessage = getServerErrorMessage(err);
  return serverMessage ? `${title}: ${serverMessage}` : title;
};
