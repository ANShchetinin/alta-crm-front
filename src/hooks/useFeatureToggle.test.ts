import { describe, it, expect, beforeEach } from 'vitest';
import { hasFeature, setDevFeatureOverride, getDevFeatureOverrides } from './useFeatureToggle';
import { useAppStore } from '../store/useAppStore';

describe('Feature Toggle System (useFeatureToggle / hasFeature)', () => {
  beforeEach(() => {
    localStorage.clear();
    useAppStore.setState({
      tenantSettings: {
        companyName: 'Тест',
        activeFeatures: ['AI_SUMMARY', 'FINANCES']
      } as any
    });
  });

  it('returns true for features active in tenantSettings', () => {
    expect(hasFeature('FINANCES')).toBe(true);
    expect(hasFeature('AI_SUMMARY')).toBe(true);
  });

  it('returns false for features disabled in tenantSettings', () => {
    expect(hasFeature('STORAGE')).toBe(false);
    expect(hasFeature('CALENDAR')).toBe(false);
  });

  it('allows developer local override to enable a disabled feature', () => {
    expect(hasFeature('STORAGE')).toBe(false);
    setDevFeatureOverride('STORAGE', true);
    expect(hasFeature('STORAGE')).toBe(true);
    expect(getDevFeatureOverrides()['STORAGE']).toBe(true);
  });

  it('allows developer local override to disable an active feature', () => {
    expect(hasFeature('FINANCES')).toBe(true);
    setDevFeatureOverride('FINANCES', false);
    expect(hasFeature('FINANCES')).toBe(false);
  });

  it('removes override when set to null', () => {
    setDevFeatureOverride('FINANCES', false);
    expect(hasFeature('FINANCES')).toBe(false);
    setDevFeatureOverride('FINANCES', null);
    expect(hasFeature('FINANCES')).toBe(true);
  });
});
