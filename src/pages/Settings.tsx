import { useTranslation } from 'react-i18next';
import { Globe, Moon, Sun, User } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import '../styles/clients.css'; // Reusing standard wrapper/header styles

export const Settings = () => {
  const { t } = useTranslation();
  const { theme, setTheme, language, setLanguage } = useAppStore();
  
  // Decoded user data could be obtained from the JWT token, but for now we'll mock it or get it if it's in the store
  const userEmail = "admin@ecoline.ru";
  const userRole = "OWNER";

  return (
    <div className="clients-wrapper">
      <div className="clients-header">
        <h1>{t('settings.title')}</h1>
      </div>

      <div className="glass-panel" style={{ padding: '24px', maxWidth: '600px', borderRadius: 'var(--radius-lg)' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <User size={20} />
          {t('settings.profile')}
        </h2>
        
        <div style={{ marginBottom: '24px' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '4px' }}>
            Email
          </div>
          <div style={{ fontWeight: 500 }}>{userEmail}</div>
        </div>

        <div style={{ marginBottom: '32px' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '4px' }}>
            {t('settings.role')}
          </div>
          <div style={{ fontWeight: 500 }}>{userRole}</div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '24px 0' }} />

        <h2 style={{ fontSize: '1.25rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Globe size={20} />
          {t('settings.preferences')}
        </h2>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <div style={{ fontWeight: 500 }}>{t('settings.language')}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {language === 'ru' ? 'Русский' : 'English'}
            </div>
          </div>
          <button 
            className="btn btn-ghost" 
            onClick={() => setLanguage(language === 'ru' ? 'en' : 'ru')}
          >
            {t('settings.changeLanguage')}
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
              {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
              {t('settings.theme')}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {theme === 'dark' ? t('settings.themeDark') : t('settings.themeLight')}
            </div>
          </div>
          <button 
            className="btn btn-ghost" 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {t('settings.changeTheme')}
          </button>
        </div>

      </div>
    </div>
  );
};
