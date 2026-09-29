import { afterEach, describe, expect, it, vi } from 'vitest';
import { isIosDevice } from './usePwaInstall';

const mockDevice = (userAgent: string, maxTouchPoints = 0) => {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(userAgent);
  // В jsdom нет maxTouchPoints — задаем свойство на время теста
  Object.defineProperty(navigator, 'maxTouchPoints', { value: maxTouchPoints, configurable: true });
};

describe('isIosDevice', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(navigator, 'maxTouchPoints');
  });

  it('detects iPhone', () => {
    mockDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', 5);
    expect(isIosDevice()).toBe(true);
  });

  it('detects iPadOS that presents itself as a Mac', () => {
    mockDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15', 5);
    expect(isIosDevice()).toBe(true);
  });

  it('does not treat a desktop Mac or Android as iOS', () => {
    mockDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15', 0);
    expect(isIosDevice()).toBe(false);
    mockDevice('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/128.0 Mobile Safari/537.36', 5);
    expect(isIosDevice()).toBe(false);
  });
});
