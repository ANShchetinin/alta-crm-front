import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  featureName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error in feature:', this.props.featureName, error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          padding: '24px',
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: 'var(--radius-md, 10px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          gap: '12px',
          margin: '16px'
        }}>
          <AlertTriangle size={32} style={{ color: '#ef4444' }} />
          <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Ошибка отображения модуля {this.props.featureName ? `«${this.props.featureName}»` : ''}
          </div>
          <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', maxWidth: '480px' }}>
            Произошел непредвиденный сбой в работе компонента. Остальная часть системы продолжает функционировать в штатном режиме.
          </div>
          <button
            type="button"
            onClick={this.handleRetry}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}
          >
            <RefreshCw size={15} /> Повторить попытку
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
