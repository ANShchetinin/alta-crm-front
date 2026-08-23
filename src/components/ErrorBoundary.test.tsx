import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

const BuggyComponent = () => {
  throw new Error('Test crash in component');
};

describe('ErrorBoundary Component', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Normal content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Normal content')).toBeInTheDocument();
  });

  it('catches render errors and renders fallback UI with module name', () => {
    // Suppress console.error output during deliberate test error
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary featureName="Финансы">
        <BuggyComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Ошибка отображения модуля «Финансы»/)).toBeInTheDocument();
    expect(screen.getByText(/Произошел непредвиденный сбой/)).toBeInTheDocument();
    expect(screen.getByText('Повторить попытку')).toBeInTheDocument();

    spy.mockRestore();
  });
});
