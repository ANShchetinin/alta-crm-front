import { LogOut, Smartphone, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useWhatsNew } from '../../features/whatsNew/hooks/useWhatsNew';
import '../../styles/whats-new.css';

const APP_VERSION = import.meta.env.VITE_APP_VERSION || 'v1.0.0';

const installButtonStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  width: '100%',
  padding: '10px 14px',
  color: 'var(--accent-primary)',
  background: 'rgba(59, 130, 246, 0.08)',
  border: '1px solid rgba(59, 130, 246, 0.2)',
  borderRadius: 'var(--radius-md)',
  marginBottom: '8px',
  fontSize: '0.88rem',
  fontWeight: 500,
  cursor: 'pointer'
};

interface SidebarFooterProps {
  canInstallPwa: boolean;
  onInstallPwa: () => void;
  onLogout: () => void;
  /** Закрыть мобильное меню перед открытием окна «Что нового». */
  onCloseMobile: () => void;
}

/** Низ бокового меню: установка приложения, «Что нового», выход и версия (версия тоже открывает «Что нового»). */
export const SidebarFooter = ({ canInstallPwa, onInstallPwa, onLogout, onCloseMobile }: SidebarFooterProps) => {
  const { t } = useTranslation();
  const whatsNew = useWhatsNew();

  const openWhatsNew = () => {
    onCloseMobile();
    whatsNew.open();
  };

  return (
    <div className="sidebar-footer">
      {canInstallPwa && (
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onInstallPwa}
          style={installButtonStyle}
          title="Установить Alta CRM на телефон или рабочий стол"
        >
          <Smartphone size={18} />
          <span>Установить PWA</span>
        </button>
      )}
      <button
        type="button"
        className="btn btn-ghost whats-new-btn"
        onClick={openWhatsNew}
        title={whatsNew.hasUnseen ? 'Что нового — есть обновления' : 'Что нового'}
      >
        <span className="whats-new-btn__icon">
          <Sparkles size={20} />
          {whatsNew.hasUnseen && <span className="whats-new-dot" aria-label="есть новое" />}
        </span>
        <span>Что нового</span>
      </button>
      <button className="btn btn-ghost logout-btn" onClick={onLogout}>
        <LogOut size={20} />
        <span>{t('nav.signout')}</span>
      </button>
      <button type="button" className="app-version-badge" onClick={openWhatsNew} title="Что нового в этой версии">
        {APP_VERSION}
      </button>
    </div>
  );
};
