import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { getClientInitials, getEmployeeInitials, getAvatarGradient } from './avatarUtils';
import { useAvatarUpload } from '../hooks/useAvatarUpload';

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

  describe('useAvatarUpload', () => {
    it('should initialize with provided initialAvatarUrl', () => {
      const { result } = renderHook(() => useAvatarUpload('data:image/png;base64,initial'));
      expect(result.current.avatarUrl).toBe('data:image/png;base64,initial');
    });

    it('should notify onAvatarChange when crop is completed', () => {
      const onAvatarChange = vi.fn();
      const { result } = renderHook(() => useAvatarUpload('', onAvatarChange));

      act(() => {
        result.current.handleCropComplete('data:image/png;base64,cropped');
      });

      expect(result.current.avatarUrl).toBe('data:image/png;base64,cropped');
      expect(result.current.rawImageToCrop).toBeNull();
      expect(onAvatarChange).toHaveBeenCalledWith('data:image/png;base64,cropped');
    });

    it('should notify onAvatarChange with empty string when avatar is removed', () => {
      const onAvatarChange = vi.fn();
      const { result } = renderHook(() => useAvatarUpload('data:image/png;base64,existing', onAvatarChange));

      act(() => {
        result.current.handleRemoveAvatar();
      });

      expect(result.current.avatarUrl).toBe('');
      expect(onAvatarChange).toHaveBeenCalledWith('');
    });

    it('should sync when initialAvatarUrl changes externally', () => {
      let initial = 'data:image/png;base64,first';
      const { result, rerender } = renderHook(() => useAvatarUpload(initial));

      expect(result.current.avatarUrl).toBe('data:image/png;base64,first');

      initial = 'data:image/png;base64,second';
      rerender();

      expect(result.current.avatarUrl).toBe('data:image/png;base64,second');
    });
  });
});

