import { describe, it, expect } from 'vitest';
import { getClientInitials, getAvatarGradient } from '../pages/Clients';
import { getEmployeeInitials } from '../pages/Employees';

describe('Avatar Utilities', () => {
  describe('getClientInitials', () => {
    it('returns uppercase initials for full name with multiple words', () => {
      expect(getClientInitials('Иван Иванов')).toBe('ИИ');
      expect(getClientInitials('Алексей Смирнов Петрович')).toBe('АС');
    });

    it('returns first two letters if name is single word', () => {
      expect(getClientInitials('Алексей')).toBe('АЛ');
      expect(getClientInitials('Компания')).toBe('КО');
    });

    it('returns ?? for empty or null string', () => {
      expect(getClientInitials('')).toBe('??');
    });
  });

  describe('getEmployeeInitials', () => {
    it('returns uppercase initials for full name', () => {
      expect(getEmployeeInitials('Василий Пупкин')).toBe('ВП');
    });

    it('handles single word name', () => {
      expect(getEmployeeInitials('Менеджер')).toBe('МЕ');
    });

    it('returns ?? for empty string', () => {
      expect(getEmployeeInitials('')).toBe('??');
    });
  });

  describe('getAvatarGradient', () => {
    it('returns a valid css linear gradient string', () => {
      const gradient = getAvatarGradient('Иван Иванов');
      expect(gradient).toContain('linear-gradient(135deg,');
    });

    it('returns consistent gradient for the same input', () => {
      const gradient1 = getAvatarGradient('Тест');
      const gradient2 = getAvatarGradient('Тест');
      expect(gradient1).toBe(gradient2);
    });

    it('returns default gradient for empty string', () => {
      const gradient = getAvatarGradient('');
      expect(gradient).toBe('linear-gradient(135deg, #3b82f6, #1d4ed8)');
    });
  });
});
