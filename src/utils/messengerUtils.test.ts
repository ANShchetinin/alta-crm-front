import { describe, it, expect } from 'vitest';
import { getWhatsAppLink, getTelegramLink } from './messengerUtils';

describe('messengerUtils', () => {
  describe('getWhatsAppLink', () => {
    it('returns empty string for null or undefined or empty value', () => {
      expect(getWhatsAppLink(null)).toBe('');
      expect(getWhatsAppLink(undefined)).toBe('');
      expect(getWhatsAppLink('')).toBe('');
      expect(getWhatsAppLink('   ')).toBe('');
    });

    it('returns raw URL if already prefixed with http/https', () => {
      expect(getWhatsAppLink('https://wa.me/79991234567')).toBe('https://wa.me/79991234567');
      expect(getWhatsAppLink('http://example.com')).toBe('http://example.com');
    });

    it('formats 8-prefixed Russian phone number to 7-prefixed international format', () => {
      expect(getWhatsAppLink('89991234567')).toBe('https://wa.me/79991234567');
      expect(getWhatsAppLink('+7 (999) 123-45-67')).toBe('https://wa.me/79991234567');
    });

    it('appends encoded pre-filled text when provided', () => {
      expect(getWhatsAppLink('+79991234567', 'Здравствуйте! Ваша заявка принята.')).toBe(
        'https://wa.me/79991234567?text=%D0%97%D0%B4%D1%80%D0%B0%D0%B2%D1%81%D1%82%D0%B2%D1%83%D0%B9%D1%82%D0%B5!%20%D0%92%D0%B0%D1%88%D0%B0%20%D0%B7%D0%B0%D1%8F%D0%B2%D0%BA%D0%B0%20%D0%BF%D1%80%D0%B8%D0%BD%D1%8F%D1%82%D0%B0.'
      );
    });
  });

  describe('getTelegramLink', () => {
    it('returns empty string for null, undefined or empty input', () => {
      expect(getTelegramLink(null)).toBe('');
      expect(getTelegramLink(undefined)).toBe('');
      expect(getTelegramLink('')).toBe('');
    });

    it('returns raw URL if full URL is given', () => {
      expect(getTelegramLink('https://t.me/mychannel')).toBe('https://t.me/mychannel');
    });

    it('strips leading @ and whitespace from username', () => {
      expect(getTelegramLink('@durov')).toBe('https://t.me/durov');
      expect(getTelegramLink('  @username_test  ')).toBe('https://t.me/username_test');
      expect(getTelegramLink('user_name')).toBe('https://t.me/user_name');
    });
  });
});
