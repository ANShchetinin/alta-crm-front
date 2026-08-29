export const getWhatsAppLink = (value?: string | null, text?: string): string => {
  if (!value) return '';
  const trimmed = value.trim();
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    return trimmed;
  }
  let cleaned = trimmed.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('8') && cleaned.length === 11) {
    cleaned = '7' + cleaned.slice(1);
  }
  return text ? `https://wa.me/${cleaned}?text=${encodeURIComponent(text)}` : `https://wa.me/${cleaned}`;
};

export const getTelegramLink = (value?: string | null): string => {
  if (!value) return '';
  const trimmed = value.trim();
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    return trimmed;
  }
  const cleaned = trimmed.replace(/^@/, '').replace(/\s/g, '');
  return `https://t.me/${cleaned}`;
};
