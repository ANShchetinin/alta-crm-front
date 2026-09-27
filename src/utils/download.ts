/**
 * Скачивает Blob как файл через временную ссылку.
 */
export const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/**
 * Текст ошибки API. Для запросов с responseType 'blob' тело ошибки тоже приходит Blob'ом с JSON внутри.
 */
export const readApiErrorMessage = async (err: unknown, fallback: string): Promise<string> => {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (data instanceof Blob) {
    try {
      const json = JSON.parse(await data.text());
      return json.message || fallback;
    } catch {
      return fallback;
    }
  }
  const message = (data as { message?: string } | undefined)?.message;
  return message || fallback;
};
