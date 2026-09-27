import DOMPurify from 'dompurify';

/**
 * Очищает HTML от исполняемого содержимого (script, обработчики on*, javascript:-ссылки)
 * перед вставкой в DOM через innerHTML. Разметка и inline-стили документа сохраняются.
 */
export const sanitizeHtml = (html: string): string => DOMPurify.sanitize(html);
