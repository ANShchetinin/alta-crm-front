import React from 'react';
import { useFeature } from '../hooks/useFeatureToggle';
import type { FeatureKey } from '../api/features';

interface FeatureGateProps {
  feature: FeatureKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({ feature, children, fallback = null }) => {
  const isEnabled = useFeature(feature);
  if (!isEnabled) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
};
