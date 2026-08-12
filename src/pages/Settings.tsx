import { useTranslation } from 'react-i18next';
import { Globe, Moon, Sun, User, Building2, Eye, EyeOff } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { updateProfile, updateTenantSettings, uploadTenantLogo } from '../api/settings';
import { useState, useRef } from 'react';
import '../styles/clients.css'; // Reusing standard wrapper/header styles

export const Settings = () => {
  const { t } = useTranslation();
  const { theme, setTheme, language, setLanguage, tenantSettings, updateTenantSettingsLocally } = useAppStore();
  const { role, email } = useAuthStore();
  
  const [newEmail, setNewEmail] = useState(email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [primaryColor, setPrimaryColor] = useState(tenantSettings?.primaryColor || '#0ea5e9');
  const [profileSaving, setProfileSaving] = useState(false);
  const [tenantSaving, setTenantSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    if (newPassword && newPassword !== confirmPassword) {
      alert('Новые пароли не совпадают');
      setProfileSaving(false);
      return;
    }

    try {
      await updateProfile({ email: newEmail, currentPassword, password: newPassword });
      alert('Профиль обновлен (чтобы изменения email вступили в силу, перезайдите в систему)');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsEditingPassword(false);
    } catch (err: any) {
      if (err.response?.data?.message) {
        alert('Ошибка при обновлении профиля: ' + err.response.data.message);
      } else {
        alert('Ошибка при обновлении профиля');
      }
    } finally {
      setProfileSaving(false);
    }
  };

  const handleTenantSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setTenantSaving(true);
    try {
      const res = await updateTenantSettings({ primaryColor });
      updateTenantSettingsLocally(res);
      alert('Настройки компании обновлены');
    } catch (err) {
      alert('Ошибка при обновлении');
    } finally {
      setTenantSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await uploadTenantLogo(file);
      updateTenantSettingsLocally(res);
      alert('Логотип загружен');
    } catch (err) {
      alert('Ошибка при загрузке логотипа');
    }
  };

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
        
        <form onSubmit={handleProfileSave}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '4px' }}>
              Email
            </label>
            <input 
              type="email" 
              value={newEmail} 
              onChange={e => setNewEmail(e.target.value)} 
              className="search-input" 
              style={{ width: '100%' }}
            />
          </div>

          {isEditingPassword ? (
            <div style={{ marginBottom: '24px', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '4px' }}>
                  Текущий пароль
                </label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showCurrent ? "text" : "password"} 
                    value={currentPassword} 
                    onChange={e => setCurrentPassword(e.target.value)} 
                    className="search-input" 
                    style={{ width: '100%', paddingRight: '40px' }}
                  />
                  <button type="button" onClick={() => setShowCurrent(!showCurrent)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '4px' }}>
                  Новый пароль
                </label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showNew ? "text" : "password"} 
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)} 
                    className="search-input" 
                    style={{ width: '100%', paddingRight: '40px' }}
                  />
                  <button type="button" onClick={() => setShowNew(!showNew)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '4px' }}>
                  Подтвердите новый пароль
                </label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showConfirm ? "text" : "password"} 
                    value={confirmPassword} 
                    onChange={e => setConfirmPassword(e.target.value)} 
                    className="search-input" 
                    style={{ width: '100%', paddingRight: '40px' }}
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: '24px' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setIsEditingPassword(true)} style={{ width: '100%', justifyContent: 'flex-start', border: '1px dashed var(--glass-border)' }}>
                Изменить пароль
              </button>
            </div>
          )}

          <div style={{ marginBottom: '32px' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '4px' }}>
              {t('settings.role')}
            </div>
            <div style={{ fontWeight: 500 }}>{role}</div>
          </div>
          
          <button type="submit" className="btn btn-primary" disabled={profileSaving}>
            {profileSaving ? 'Сохранение...' : 'Сохранить профиль'}
          </button>
        </form>

        <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '24px 0' }} />

        {role === 'OWNER' && (
          <>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={20} />
              Настройки компании
            </h2>
            <form onSubmit={handleTenantSave}>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '4px' }}>
                  Логотип компании
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {tenantSettings?.logoUrl && (
                    <img src={tenantSettings.logoUrl} alt="Logo" style={{ width: 48, height: 48, objectFit: 'contain', background: 'var(--glass-bg)', borderRadius: 'var(--radius-md)', padding: 4 }} />
                  )}
                  <input type="file" accept="image/*" ref={fileInputRef} onChange={handleLogoUpload} style={{ display: 'none' }} />
                  <button type="button" className="btn btn-ghost" onClick={() => fileInputRef.current?.click()}>
                    Загрузить логотип
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '4px' }}>
                  Основной цвет (Primary Color)
                </label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input 
                    type="color" 
                    value={primaryColor} 
                    onChange={e => setPrimaryColor(e.target.value)}
                    style={{ width: 40, height: 40, border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'transparent' }}
                  />
                  <input 
                    type="text" 
                    value={primaryColor} 
                    onChange={e => setPrimaryColor(e.target.value)} 
                    className="search-input" 
                    style={{ flex: 1 }}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={tenantSaving}>
                {tenantSaving ? 'Сохранение...' : 'Сохранить настройки'}
              </button>
            </form>
            <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '24px 0' }} />
          </>
        )}

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
