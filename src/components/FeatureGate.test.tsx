import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeatureGate } from './FeatureGate';
import { useAppStore } from '../store/useAppStore';

describe('FeatureGate Component', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders children when feature is enabled', () => {
    useAppStore.setState({
      tenantSettings: {
        companyName: 'Тест',
        activeFeatures: ['FINANCES']
      } as any
    });

    render(
      <FeatureGate feature="FINANCES" fallback={<div>Disabled</div>}>
        <div>Finances Content</div>
      </FeatureGate>
    );

    expect(screen.getByText('Finances Content')).toBeInTheDocument();
    expect(screen.queryByText('Disabled')).not.toBeInTheDocument();
  });

  it('renders fallback when feature is disabled', () => {
    useAppStore.setState({
      tenantSettings: {
        companyName: 'Тест',
        activeFeatures: []
      } as any
    });

    render(
      <FeatureGate feature="FINANCES" fallback={<div>Disabled Fallback</div>}>
        <div>Finances Content</div>
      </FeatureGate>
    );

    expect(screen.queryByText('Finances Content')).not.toBeInTheDocument();
    expect(screen.getByText('Disabled Fallback')).toBeInTheDocument();
  });
});
