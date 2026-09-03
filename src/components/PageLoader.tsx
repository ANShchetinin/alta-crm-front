import React from 'react';

export const PageLoader: React.FC = () => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      width: '100%',
      gap: '16px',
      color: 'var(--text-secondary, #94a3b8)'
    }}>
      <div style={{
        width: '42px',
        height: '42px',
        border: '3px solid rgba(255, 255, 255, 0.1)',
        borderTopColor: 'var(--accent-primary, #3b82f6)',
        borderRadius: '50%',
        animation: 'page-loader-spin 0.8s linear infinite'
      }} />
      <style>{`
        @keyframes page-loader-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default PageLoader;
