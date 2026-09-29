import { useFeature } from '../../../hooks/useFeatureToggle';
import { useAuthStore } from '../../../store/useAuthStore';
import type { NavAccess } from '../navigation';

/** Роль, права пользователя и включенные для компании модули — все, от чего зависит меню. */
export const useNavAccess = (): NavAccess => {
  const role = useAuthStore(state => state.role);
  const canViewFinances = useAuthStore(state => state.canViewFinances);
  const canAccessMeasurements = useAuthStore(state => state.canAccessMeasurements);
  return {
    role,
    canViewFinances,
    canAccessMeasurements,
    features: {
      storage: useFeature('STORAGE'),
      calendar: useFeature('CALENDAR'),
      measurements: useFeature('MEASUREMENT_CALCULATOR'),
      finances: useFeature('FINANCES'),
      reports: useFeature('REPORTS'),
      contractTemplates: useFeature('CONTRACT_TEMPLATES'),
      siteAnalytics: useFeature('EXIT_INTENT_ANALYTICS'),
      siteRequests: useFeature('SITE_REQUESTS'),
      aiAssistant: useFeature('AI_ESTIMATE')
    }
  };
};
