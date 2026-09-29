import type { ReactNode } from 'react';
import { Share, Smartphone } from 'lucide-react';

const Step = ({ number, children }: { number: number; children: ReactNode }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
    <span
      style={{
        background: 'var(--accent-primary)',
        color: 'white',
        width: '22px',
        height: '22px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.75rem',
        fontWeight: 'bold'
      }}
    >
      {number}
    </span>
    <span>{children}</span>
  </div>
);

/** Инструкция по установке приложения на iPhone / iPad: в Safari нет системного диалога установки. */
export const IosInstallGuide = ({ onClose }: { onClose: () => void }) => (
  <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px', textAlign: 'center', padding: '24px' }}>
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          color: 'white'
        }}
      >
        <Smartphone size={28} />
      </div>
      <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem' }}>Установка на iPhone / iPad</h3>
      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 20px 0' }}>
        Чтобы открывать Alta CRM в полноэкранном режиме как приложение:
      </p>
      <div
        style={{
          textAlign: 'left',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          fontSize: '0.88rem',
          marginBottom: '20px'
        }}
      >
        <Step number={1}>
          Нажмите кнопку <strong>«Поделиться»</strong> <Share size={15} style={{ verticalAlign: 'middle', display: 'inline' }} /> внизу экрана Safari.
        </Step>
        <Step number={2}>
          Прокрутите вниз и выберите <strong>«На экран “Домой”»</strong>.
        </Step>
        <Step number={3}>
          Нажмите <strong>«Добавить»</strong> в правом верхнем углу.
        </Step>
      </div>
      <button type="button" className="btn btn-primary" onClick={onClose} style={{ width: '100%' }}>
        Понятно
      </button>
    </div>
  </div>
);
