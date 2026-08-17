import { useTranslation } from 'react-i18next';
import { Globe, Moon, Sun, User, Building2, Eye, EyeOff, FileText } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { updateProfile, updateTenantSettings, uploadTenantLogo, getProfile } from '../api/settings';
import type { TenantRequisites } from '../api/settings';
import { useState, useRef, useEffect } from 'react';
import '../styles/clients.css'; // Reusing standard wrapper/header styles

export const Settings = () => {
  const { t } = useTranslation();
  const { theme, setTheme, language, setLanguage, tenantSettings, updateTenantSettingsLocally } = useAppStore();
  const { role, email } = useAuthStore();
  
  const [newEmail, setNewEmail] = useState(email || '');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profile = await getProfile();
        setNewEmail(profile.email || '');
        setFirstName(profile.firstName || '');
        setLastName(profile.lastName || '');
      } catch (err) {
        console.error("Failed to load profile", err);
      }
    };
    fetchProfile();
  }, []);
  
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [primaryColor, setPrimaryColor] = useState(tenantSettings?.primaryColor || '#0ea5e9');
  const [profileSaving, setProfileSaving] = useState(false);
  const [tenantSaving, setTenantSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [requisites, setRequisites] = useState<TenantRequisites>({
    companyType: tenantSettings?.requisites?.companyType || 'LEGAL_ENTITY',
    fullName: tenantSettings?.requisites?.fullName || '',
    shortName: tenantSettings?.requisites?.shortName || '',
    legalAddress: tenantSettings?.requisites?.legalAddress || '',
    actualAddress: tenantSettings?.requisites?.actualAddress || '',
    inn: tenantSettings?.requisites?.inn || '',
    kpp: tenantSettings?.requisites?.kpp || '',
    ogrn: tenantSettings?.requisites?.ogrn || '',
    ogrnip: tenantSettings?.requisites?.ogrnip || '',
    bankName: tenantSettings?.requisites?.bankName || '',
    bik: tenantSettings?.requisites?.bik || '',
    checkingAccount: tenantSettings?.requisites?.checkingAccount || '',
    correspondentAccount: tenantSettings?.requisites?.correspondentAccount || '',
    signerPosition: tenantSettings?.requisites?.signerPosition || '',
    signerName: tenantSettings?.requisites?.signerName || '',
    signerAuthority: tenantSettings?.requisites?.signerAuthority || '',
    phone: tenantSettings?.requisites?.phone || '',
    email: tenantSettings?.requisites?.email || '',
    taxSystem: tenantSettings?.requisites?.taxSystem || '',
    authorityDoc: tenantSettings?.requisites?.authorityDoc || ''
  });

  useEffect(() => {
    if (tenantSettings?.requisites) {
      setRequisites(prev => ({
        ...prev,
        ...tenantSettings.requisites,
        companyType: tenantSettings.requisites?.companyType || 'LEGAL_ENTITY'
      }));
    }
    if (tenantSettings?.primaryColor) {
      setPrimaryColor(tenantSettings.primaryColor);
    }
  }, [tenantSettings]);

  const updateRequisiteField = (field: keyof TenantRequisites, value: string) => {
    setRequisites(prev => ({ ...prev, [field]: value }));
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    if (newPassword && newPassword !== confirmPassword) {
      alert('Новые пароли не совпадают');
      setProfileSaving(false);
      return;
    }

    try {
      await updateProfile({ email: newEmail, firstName, lastName, currentPassword, password: newPassword });
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
      const res = await updateTenantSettings({ primaryColor, requisites });
      updateTenantSettingsLocally(res);
      alert('Реквизиты и настройки компании успешно сохранены');
    } catch (err) {
      alert('Ошибка при сохранении настроек компании');
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

          <div style={{ marginBottom: '16px', display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '4px' }}>
                Имя
              </label>
              <input 
                type="text" 
                value={firstName} 
                onChange={e => setFirstName(e.target.value)} 
                className="search-input" 
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '4px' }}>
                Фамилия
              </label>
              <input 
                type="text" 
                value={lastName} 
                onChange={e => setLastName(e.target.value)} 
                className="search-input" 
                style={{ width: '100%' }}
              />
            </div>
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

              {/* Реквизиты для договоров и счетов */}
              <div style={{ marginTop: '32px', marginBottom: '28px', borderTop: '1px dashed var(--glass-border)', paddingTop: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                  <h3 style={{ fontSize: '1.15rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={18} style={{ color: 'var(--primary-color, #0ea5e9)' }} />
                    Реквизиты для договоров и счетов
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Используются при формировании бланков и счетов
                  </span>
                </div>

                {/* Переключатель типа организации */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                  <button
                    type="button"
                    onClick={() => updateRequisiteField('companyType', 'LEGAL_ENTITY')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '14px 18px',
                      borderRadius: 'var(--radius-md)',
                      border: requisites.companyType === 'LEGAL_ENTITY' ? '2px solid var(--primary-color, #0ea5e9)' : '1px solid var(--glass-border)',
                      background: requisites.companyType === 'LEGAL_ENTITY' ? 'rgba(14, 165, 233, 0.12)' : 'var(--glass-bg)',
                      cursor: 'pointer',
                      color: 'var(--text-primary)',
                      fontWeight: requisites.companyType === 'LEGAL_ENTITY' ? 600 : 400,
                      transition: 'all 0.2s ease',
                      textAlign: 'left'
                    }}
                  >
                    <Building2 size={24} style={{ color: requisites.companyType === 'LEGAL_ENTITY' ? 'var(--primary-color, #0ea5e9)' : 'var(--text-secondary)' }} />
                    <div>
                      <div style={{ fontSize: '0.95rem' }}>Юридическое лицо</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>ООО, АО, ПАО и др.</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => updateRequisiteField('companyType', 'IE')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '14px 18px',
                      borderRadius: 'var(--radius-md)',
                      border: requisites.companyType === 'IE' ? '2px solid var(--primary-color, #0ea5e9)' : '1px solid var(--glass-border)',
                      background: requisites.companyType === 'IE' ? 'rgba(14, 165, 233, 0.12)' : 'var(--glass-bg)',
                      cursor: 'pointer',
                      color: 'var(--text-primary)',
                      fontWeight: requisites.companyType === 'IE' ? 600 : 400,
                      transition: 'all 0.2s ease',
                      textAlign: 'left'
                    }}
                  >
                    <User size={24} style={{ color: requisites.companyType === 'IE' ? 'var(--primary-color, #0ea5e9)' : 'var(--text-secondary)' }} />
                    <div>
                      <div style={{ fontSize: '0.95rem' }}>Индивидуальный предприниматель</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>ИП (физическое лицо)</div>
                    </div>
                  </button>
                </div>

                {requisites.companyType === 'LEGAL_ENTITY' ? (
                  /* Юридическое лицо */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Секция: Наименования */}
                    <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Наименование организации
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                            Полное наименование (как в Уставе)
                          </label>
                          <input
                            type="text"
                            className="search-input"
                            style={{ width: '100%' }}
                            placeholder="Общество с ограниченной ответственностью «Эколайн»"
                            value={requisites.fullName || ''}
                            onChange={e => updateRequisiteField('fullName', e.target.value)}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                            Сокращённое наименование
                          </label>
                          <input
                            type="text"
                            className="search-input"
                            style={{ width: '100%' }}
                            placeholder="ООО «Эколайн»"
                            value={requisites.shortName || ''}
                            onChange={e => updateRequisiteField('shortName', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Секция: Адреса */}
                    <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Адреса организации
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                            Юридический адрес (с индексом)
                          </label>
                          <input
                            type="text"
                            className="search-input"
                            style={{ width: '100%' }}
                            placeholder="123456, г. Москва, ул. Ленина, д. 10, оф. 5"
                            value={requisites.legalAddress || ''}
                            onChange={e => updateRequisiteField('legalAddress', e.target.value)}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                            Фактический адрес (если отличается)
                          </label>
                          <input
                            type="text"
                            className="search-input"
                            style={{ width: '100%' }}
                            placeholder="123456, г. Москва, ул. Мира, д. 20"
                            value={requisites.actualAddress || ''}
                            onChange={e => updateRequisiteField('actualAddress', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Секция: Коды и регистрация */}
                    <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Регистрационные коды
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                            ИНН (10 цифр)
                          </label>
                          <input
                            type="text"
                            className="search-input"
                            style={{ width: '100%' }}
                            placeholder="7701234567"
                            maxLength={10}
                            value={requisites.inn || ''}
                            onChange={e => updateRequisiteField('inn', e.target.value)}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                            КПП (9 цифр)
                          </label>
                          <input
                            type="text"
                            className="search-input"
                            style={{ width: '100%' }}
                            placeholder="770101001"
                            maxLength={9}
                            value={requisites.kpp || ''}
                            onChange={e => updateRequisiteField('kpp', e.target.value)}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                            ОГРН (13 цифр)
                          </label>
                          <input
                            type="text"
                            className="search-input"
                            style={{ width: '100%' }}
                            placeholder="1027700123456"
                            maxLength={13}
                            value={requisites.ogrn || ''}
                            onChange={e => updateRequisiteField('ogrn', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Секция: Банковские реквизиты */}
                    <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Банковские реквизиты
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                            Расчётный счёт (20 цифр)
                          </label>
                          <input
                            type="text"
                            className="search-input"
                            style={{ width: '100%' }}
                            placeholder="40702810000000000000"
                            maxLength={20}
                            value={requisites.checkingAccount || ''}
                            onChange={e => updateRequisiteField('checkingAccount', e.target.value)}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                            БИК банка (9 цифр)
                          </label>
                          <input
                            type="text"
                            className="search-input"
                            style={{ width: '100%' }}
                            placeholder="044525225"
                            maxLength={9}
                            value={requisites.bik || ''}
                            onChange={e => updateRequisiteField('bik', e.target.value)}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                            Полное наименование банка
                          </label>
                          <input
                            type="text"
                            className="search-input"
                            style={{ width: '100%' }}
                            placeholder="ПАО СБЕРБАНК г. Москва"
                            value={requisites.bankName || ''}
                            onChange={e => updateRequisiteField('bankName', e.target.value)}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                            Корреспондентский счёт (20 цифр)
                          </label>
                          <input
                            type="text"
                            className="search-input"
                            style={{ width: '100%' }}
                            placeholder="30101810400000000225"
                            maxLength={20}
                            value={requisites.correspondentAccount || ''}
                            onChange={e => updateRequisiteField('correspondentAccount', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Секция: Подписант */}
                    <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Данные о подписанте договоров
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                            Должность подписанта
                          </label>
                          <input
                            type="text"
                            className="search-input"
                            style={{ width: '100%' }}
                            placeholder="Генеральный директор"
                            value={requisites.signerPosition || ''}
                            onChange={e => updateRequisiteField('signerPosition', e.target.value)}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                            ФИО подписанта
                          </label>
                          <input
                            type="text"
                            className="search-input"
                            style={{ width: '100%' }}
                            placeholder="Иванов Иван Иванович"
                            value={requisites.signerName || ''}
                            onChange={e => updateRequisiteField('signerName', e.target.value)}
                          />
                        </div>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                          Основание полномочий (Устав / Доверенность)
                        </label>
                        <input
                          type="text"
                          className="search-input"
                          style={{ width: '100%' }}
                          placeholder="Устава или Доверенности № 12 от 10.01.2026 г."
                          value={requisites.signerAuthority || ''}
                          onChange={e => updateRequisiteField('signerAuthority', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Индивидуальный предприниматель (ИП) */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Сведения об ИП */}
                    <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Сведения об ИП
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                            ФИО с указанием статуса «ИП»
                          </label>
                          <input
                            type="text"
                            className="search-input"
                            style={{ width: '100%' }}
                            placeholder="Индивидуальный предприниматель Иванов Иван Иванович"
                            value={requisites.fullName || ''}
                            onChange={e => updateRequisiteField('fullName', e.target.value)}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                            Адрес регистрации (место жительства с индексом)
                          </label>
                          <input
                            type="text"
                            className="search-input"
                            style={{ width: '100%' }}
                            placeholder="123456, г. Москва, ул. Пушкина, д. 5, кв. 12"
                            value={requisites.legalAddress || ''}
                            onChange={e => updateRequisiteField('legalAddress', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Регистрационные коды */}
                    <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Регистрационные коды
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                            ИНН предпринимателя (12 цифр)
                          </label>
                          <input
                            type="text"
                            className="search-input"
                            style={{ width: '100%' }}
                            placeholder="770123456789"
                            maxLength={12}
                            value={requisites.inn || ''}
                            onChange={e => updateRequisiteField('inn', e.target.value)}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                            ОГРНИП (15 цифр)
                          </label>
                          <input
                            type="text"
                            className="search-input"
                            style={{ width: '100%' }}
                            placeholder="304770000123456"
                            maxLength={15}
                            value={requisites.ogrnip || ''}
                            onChange={e => updateRequisiteField('ogrnip', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Банковские реквизиты */}
                    <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Банковские реквизиты
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                            Расчётный счёт (20 цифр)
                          </label>
                          <input
                            type="text"
                            className="search-input"
                            style={{ width: '100%' }}
                            placeholder="40802810000000000000"
                            maxLength={20}
                            value={requisites.checkingAccount || ''}
                            onChange={e => updateRequisiteField('checkingAccount', e.target.value)}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                            БИК банка (9 цифр)
                          </label>
                          <input
                            type="text"
                            className="search-input"
                            style={{ width: '100%' }}
                            placeholder="044525225"
                            maxLength={9}
                            value={requisites.bik || ''}
                            onChange={e => updateRequisiteField('bik', e.target.value)}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                            Полное наименование банка
                          </label>
                          <input
                            type="text"
                            className="search-input"
                            style={{ width: '100%' }}
                            placeholder="АО «ТИНЬКОФФ БАНК» г. Москва"
                            value={requisites.bankName || ''}
                            onChange={e => updateRequisiteField('bankName', e.target.value)}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                            Корреспондентский счёт (20 цифр)
                          </label>
                          <input
                            type="text"
                            className="search-input"
                            style={{ width: '100%' }}
                            placeholder="30101810145250000974"
                            maxLength={20}
                            value={requisites.correspondentAccount || ''}
                            onChange={e => updateRequisiteField('correspondentAccount', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Дополнительно: Контакты, налоги, основание */}
                    <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Контакты и налоговый режим
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                            Контактный телефон
                          </label>
                          <input
                            type="text"
                            className="search-input"
                            style={{ width: '100%' }}
                            placeholder="+7 (999) 000-00-00"
                            value={requisites.phone || ''}
                            onChange={e => updateRequisiteField('phone', e.target.value)}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                            Контактный Email
                          </label>
                          <input
                            type="email"
                            className="search-input"
                            style={{ width: '100%' }}
                            placeholder="info@company.ru"
                            value={requisites.email || ''}
                            onChange={e => updateRequisiteField('email', e.target.value)}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                            Налоговый режим
                          </label>
                          <select
                            className="search-input"
                            style={{ width: '100%' }}
                            value={requisites.taxSystem || ''}
                            onChange={e => updateRequisiteField('taxSystem', e.target.value)}
                          >
                            <option value="">Выберите режим...</option>
                            <option value="УСН (доходы)">УСН (доходы, 6%)</option>
                            <option value="УСН (доходы минус расходы)">УСН (доходы минус расходы, 15%)</option>
                            <option value="Патентная система (ПСН)">Патентная система (ПСН)</option>
                            <option value="Общая система (ОСНО)">Общая система налогообложения (ОСНО)</option>
                            <option value="НПД (Самозанятый)">НПД (Налог на профессиональный доход)</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                            Основание деятельности
                          </label>
                          <input
                            type="text"
                            className="search-input"
                            style={{ width: '100%' }}
                            placeholder="Свидетельства о гос. регистрации / Листа записи ЕГРИП"
                            value={requisites.authorityDoc || ''}
                            onChange={e => updateRequisiteField('authorityDoc', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button type="submit" className="btn btn-primary" disabled={tenantSaving}>
                {tenantSaving ? 'Сохранение...' : 'Сохранить настройки и реквизиты'}
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
