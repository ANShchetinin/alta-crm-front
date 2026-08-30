/**
 * Получение инициалов по имени пользователя или названию компании.
 */
export const getInitials = (name: string): string => {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
};

export const getClientInitials = getInitials;
export const getEmployeeInitials = getInitials;

/**
 * Генерация стабильного цветного градиента для аватара на основе строки (имени).
 */
export const getAvatarGradient = (str: string): string => {
  if (!str) return 'linear-gradient(135deg, #3b82f6, #1d4ed8)';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    'linear-gradient(135deg, #10b981, #047857)',
    'linear-gradient(135deg, #8b5cf6, #6d28d9)',
    'linear-gradient(135deg, #f59e0b, #b45309)',
    'linear-gradient(135deg, #ec4899, #be185d)',
    'linear-gradient(135deg, #06b6d4, #0e7490)',
    'linear-gradient(135deg, #6366f1, #4338ca)',
  ];
  return colors[Math.abs(hash) % colors.length];
};
