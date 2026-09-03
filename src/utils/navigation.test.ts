import { describe, it, expect } from 'vitest';
import { buildFullAddress, getYandexMapsUrl, get2GisUrl } from './navigation';

describe('navigation utils', () => {
  describe('buildFullAddress', () => {
    it('returns base address when no entrance or floor provided', () => {
      expect(buildFullAddress('г. Москва, ул. Ленина, д. 10')).toBe('г. Москва, ул. Ленина, д. 10');
    });

    it('appends entrance and floor when provided', () => {
      expect(buildFullAddress('ул. Пушкина, д. 5', '2', '4')).toBe('ул. Пушкина, д. 5, подъезд 2, этаж 4');
    });

    it('appends only entrance when floor is missing', () => {
      expect(buildFullAddress('ул. Пушкина, д. 5', '3')).toBe('ул. Пушкина, д. 5, подъезд 3');
    });

    it('appends only floor when entrance is missing', () => {
      expect(buildFullAddress('ул. Пушкина, д. 5', undefined, '7')).toBe('ул. Пушкина, д. 5, этаж 7');
    });
  });

  describe('getYandexMapsUrl', () => {
    it('generates valid Yandex Maps auto-route URL', () => {
      const url = getYandexMapsUrl('ул. Тверская, 1', '1');
      expect(url).toContain('https://yandex.ru/maps/?text=');
      expect(url).toContain('&rtt=auto');
      expect(url).toContain(encodeURIComponent('ул. Тверская, 1, подъезд 1'));
    });
  });

  describe('get2GisUrl', () => {
    it('generates valid 2GIS search URL', () => {
      const url = get2GisUrl('ул. Арбат, 10');
      expect(url).toBe(`https://2gis.ru/search/${encodeURIComponent('ул. Арбат, 10')}`);
    });
  });
});
