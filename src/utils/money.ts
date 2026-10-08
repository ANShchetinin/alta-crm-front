/** Сумма в рублях: «12 500 ₽». Пробел перед знаком неразрывный, чтобы «₽» не переносился на другую строку. */
export const formatRub = (value: number): string => `${value.toLocaleString('ru-RU')}\u00A0₽`;
