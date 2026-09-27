import { useAppStore } from '../store/useAppStore';
import type { FeatureKey } from '../api/features';
import type { TenantDto } from '../api/settings';

const STORAGE_KEY = 'altacrm_ft_overrides';

// Read dev overrides from localStorage; URL query parameters (?ft_finances=true) are honoured only in dev builds
const getDevOverrides = (): Record<string, boolean> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const overrides: Record<string, boolean> = stored ? JSON.parse(stored) : {};

    if (import.meta.env.DEV && typeof window !== 'undefined' && window.location) {
      const params = new URLSearchParams(window.location.search);
      let changed = false;
      params.forEach((value, key) => {
        if (key.startsWith('ft_')) {
          const featureName = key.substring(3).toUpperCase();
          const isEnabled = value === 'true' || value === '1' || value === 'yes';
          overrides[featureName] = isEnabled;
          changed = true;
        }
      });
      if (changed) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
      }
    }
    return overrides;
  } catch {
    return {};
  }
};

export const setDevFeatureOverride = (featureKey: FeatureKey, enabled: boolean | null) => {
  const overrides = getDevOverrides();
  if (enabled === null) {
    delete overrides[featureKey];
  } else {
    overrides[featureKey] = enabled;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  // Force re-render if needed
  window.dispatchEvent(new Event('storage'));
};

export const getDevFeatureOverrides = (): Record<string, boolean> => {
  return getDevOverrides();
};

/**
 * Итоговое состояние фичи. Локальный override в dev-сборке может и включить, и выключить фичу;
 * в production — только выключить (скрыть модуль у себя), иначе через localStorage открывались бы неоплаченные модули.
 */
const resolveFeature = (featureKey: FeatureKey, tenantSettings: TenantDto | null): boolean => {
  // Нет настроек тенанта — opt-out модель: всё включено
  const tenantEnabled = tenantSettings?.activeFeatures ? tenantSettings.activeFeatures.includes(featureKey) : true;

  const devOverrides = getDevOverrides();
  if (!(featureKey in devOverrides)) {
    return tenantEnabled;
  }
  const override = devOverrides[featureKey];
  return import.meta.env.DEV ? override : tenantEnabled && override;
};

/**
 * Pure helper function to check if a feature is enabled
 */
export const hasFeature = (featureKey: FeatureKey): boolean => {
  return resolveFeature(featureKey, useAppStore.getState().tenantSettings);
};

/**
 * React hook to check if a feature is enabled
 */
export const useFeature = (featureKey: FeatureKey): boolean => {
  const tenantSettings = useAppStore((state) => state.tenantSettings);
  return resolveFeature(featureKey, tenantSettings);
};
