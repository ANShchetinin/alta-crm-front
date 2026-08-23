import { useAppStore } from '../store/useAppStore';
import type { FeatureKey } from '../api/features';

const STORAGE_KEY = 'altacrm_ft_overrides';

// Read dev overrides from localStorage and parse URL query parameters
const getDevOverrides = (): Record<string, boolean> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const overrides: Record<string, boolean> = stored ? JSON.parse(stored) : {};

    // Check URL parameters for overrides, e.g. ?ft_finances=true or ?ft_ai_summary=false
    if (typeof window !== 'undefined' && window.location) {
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
 * Pure helper function to check if a feature is enabled
 */
export const hasFeature = (featureKey: FeatureKey): boolean => {
  // 1. Check developer local overrides
  const devOverrides = getDevOverrides();
  if (featureKey in devOverrides) {
    return devOverrides[featureKey];
  }

  // 2. Check active features from tenant settings
  const tenantSettings = useAppStore.getState().tenantSettings;
  if (tenantSettings && tenantSettings.activeFeatures) {
    return tenantSettings.activeFeatures.includes(featureKey);
  }

  // 3. Default to true (Opt-out model)
  return true;
};

/**
 * React hook to check if a feature is enabled
 */
export const useFeature = (featureKey: FeatureKey): boolean => {
  const tenantSettings = useAppStore((state) => state.tenantSettings);

  // 1. Check developer local overrides
  const devOverrides = getDevOverrides();
  if (featureKey in devOverrides) {
    return devOverrides[featureKey];
  }

  // 2. Check active features from tenant settings
  if (tenantSettings && tenantSettings.activeFeatures) {
    return tenantSettings.activeFeatures.includes(featureKey);
  }

  // 3. Default to true
  return true;
};
