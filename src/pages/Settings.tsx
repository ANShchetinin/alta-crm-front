import { useTranslation } from 'react-i18next';
import { Globe, Moon, Sun, User, Building2, Eye, EyeOff, FileText, Hash, Clock, Plus, Trash2, CheckSquare, ListChecks, HelpCircle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { updateProfile, updateTenantSettings, uploadTenantLogo, getProfile } from '../api/settings';
import type { TenantRequisites, ContractFieldDefinition } from '../api/settings';
import { useState, useRef, useEffect } from 'react';
import { PushNotificationSettings } from '../components/PushNotificationSettings';
import { EstimationServiceBuilder } from '../components/EstimationServiceBuilder';
import { getMaterials, type Material } from '../api/storage';
import { TIMEZONE_OPTIONS } from '../utils/dateUtils';
import { Sliders } from 'lucide-react';
import { toast } from '../utils/toast';
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

  const [contractFields, setContractFields] = useState<ContractFieldDefinition[]>(
    tenantSettings?.contractFieldDefinitions || []
  );
  const [actChecklist, setActChecklist] = useState<string[]>(
    tenantSettings?.actChecklistTemplate || []
  );
  const [newChecklistText, setNewChecklistText] = useState('');
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldPlaceholder, setNewFieldPlaceholder] = useState('');

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
  const [orderNumberFormat, setOrderNumberFormat] = useState(tenantSettings?.orderNumberFormat || 'А{ddMMyy}_{INDEX}');
  const [timezone, setTimezone] = useState(tenantSettings?.timezone || 'Europe/Moscow');
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
    landlinePhone: tenantSettings?.requisites?.landlinePhone || '',
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
    if (tenantSettings?.orderNumberFormat) {
      setOrderNumberFormat(tenantSettings.orderNumberFormat);
    }
    if (tenantSettings?.timezone) {
      setTimezone(tenantSettings.timezone);
    }
    if (tenantSettings?.contractFieldDefinitions) {
      setContractFields(tenantSettings.contractFieldDefinitions);
    }
    if (tenantSettings?.actChecklistTemplate) {
      setActChecklist(tenantSettings.actChecklistTemplate);
    }
  }, [tenantSettings]);

  const updateRequisiteField = (field: keyof TenantRequisites, value: string) => {
    setRequisites(prev => ({ ...prev, [field]: value }));
  };

  const getFormatPreview = (template: string) => {
    if (!template) return '—';
    const now = new Date();
    const yyyy = now.getFullYear().toString();
    const yy = yyyy.slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const ddMM = `${dd}${mm}`;
    const ddMMyy = `${dd}${mm}${yy}`;
    const ddMMyyyy = `${dd}${mm}${yyyy}`;
    const yyyymmdd = `${yyyy}${mm}${dd}`;

    let resolved = template
      .replace(/{YYYY}/g, yyyy)
      .replace(/{YY}/g, yy)
      .replace(/{MM}/g, mm)
      .replace(/{DD}/g, dd)
      .replace(/{ddMM}/g, ddMM)
      .replace(/{ddMMyy}/g, ddMMyy)
      .replace(/{ddMMyyyy}/g, ddMMyyyy)
      .replace(/{YYYYMMDD}/g, yyyymmdd);

    resolved = resolved.replace(/\{INDEX(?::(\d+))?\}/g, (_, padding) => {
      const padLen = padding ? parseInt(padding, 10) : 1;
      return '1'.padStart(padLen, '0');
    });

    return resolved;
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    if (newPassword && newPassword !== confirmPassword) {
      toast.warning('Новые пароли не совпадают');
      setProfileSaving(false);
      return;
    }

    try {
      await updateProfile({ email: newEmail, firstName, lastName, currentPassword, password: newPassword });
      toast.success('Профиль обновлен (чтобы изменения email вступили в силу, перезайдите в систему)');
    } catch (err: any) {
      if (err.response?.data?.message) {
        toast.error('Ошибка при обновлении профиля: ' + err.response.data.message);
      } else {
        toast.error('Ошибка при обновлении профиля');
      }
    } finally {
      setProfileSaving(false);
    }
  };

  const handleTenantSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setTenantSaving(true);
    try {
      const res = await updateTenantSettings({ 
        primaryColor, 
        requisites, 
        orderNumberFormat: orderNumberFormat.trim() || 'А{ddMMyy}_{INDEX}',
        timezone: timezone || 'Europe/Moscow'
      });
      updateTenantSettingsLocally(res);
      toast.success('Реквизиты и настройки компании успешно сохранены');
    } catch {
      toast.error('Ошибка при сохранении настроек компании');
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
      toast.success('Логотип загружен');
    } catch {
      toast.error('Ошибка при загрузке логотипа');
    }
  };

  const [materials, setMaterials] = useState<Material[]>([]);
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'ESTIMATION' | 'CONTRACT_CONFIG'>('GENERAL');

  const handleSaveContractConfig = async () => {
    // Validate empty labels or keys
    for (const f of contractFields) {
      if (!f.label.trim()) {
        toast.warning('Все поля спецификации должны иметь заполненное название!');
        return;
      }
      if (!f.key.trim()) {
        toast.warning(`Поле "${f.label}" должно иметь заполненный ключ метки!`);
        return;
      }
    }
    // Check for duplicate keys
    const keys = contractFields.map(f => f.key.trim().toLowerCase());
    const duplicates = keys.filter((key, idx) => keys.indexOf(key) !== idx);
    if (duplicates.length > 0) {
      const uniqueDups = [...new Set(duplicates)];
      toast.warning(`Обнаружены повторяющиеся ключи меток: ${uniqueDups.map(d => `{{${d}}}`).join(', ')}. Все метки в Word должны быть уникальными!`);
      return;
    }

    setTenantSaving(true);
    try {
      const res = await updateTenantSettings({
        contractFieldDefinitions: contractFields,
        actChecklistTemplate: actChecklist
      });
      updateTenantSettingsLocally(res);
      toast.success('Параметры договора и шаблон чек-листа успешно сохранены!');
    } catch {
      toast.error('Ошибка при сохранении параметров договора');
    } finally {
      setTenantSaving(false);
    }
  };

  const handleAddField = () => {
    if (!newFieldLabel.trim()) {
      toast.warning('Введите название поля');
      return;
    }
    const rawKey = newFieldKey.trim() || newFieldLabel.trim().toLowerCase().replace(/[^a-z0-9_]/gi, '_');
    const cleanKey = rawKey.replace(/^_+|_+$/g, '').toLowerCase();
    if (!cleanKey) {
      toast.warning('Укажите корректный ключ метки на латинице (например: length)');
      return;
    }
    const exists = contractFields.some(f => f.key.trim().toLowerCase() === cleanKey);
    if (exists) {
      toast.warning(`Поле с меткой "{{${cleanKey}}}" уже существует! Метки в Word должны быть уникальными.`);
      return;
    }
    const newField: ContractFieldDefinition = {
      id: Date.now().toString(),
      key: cleanKey,
      label: newFieldLabel.trim(),
      placeholder: newFieldPlaceholder.trim() || undefined
    };
    setContractFields(prev => [...prev, newField]);
    setNewFieldLabel('');
    setNewFieldKey('');
    setNewFieldPlaceholder('');
  };

  const handleDeleteField = (id: string) => {
    setContractFields(prev => prev.filter(f => f.id !== id));
  };

  const handleAddChecklistItem = () => {
    if (!newChecklistText.trim()) return;
    setActChecklist(prev => [...prev, newChecklistText.trim()]);
    setNewChecklistText('');
  };

  const handleDeleteChecklistItem = (index: number) => {
    setActChecklist(prev => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    getMaterials()
      .then(setMaterials)
      .catch(err => console.error('Ошибка загрузки материалов:', err));
  }, []);

  return (
    <div className="clients-wrapper">
      <div className="clients-header" style={{ marginBottom: '16px' }}>
        <h1>{t('settings.title')}</h1>
      </div>

      {/* Навигация по вкладкам настроек */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '20px',
        borderBottom: '1px solid var(--glass-border)',
        paddingBottom: '10px',
        flexWrap: 'wrap'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('GENERAL')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            background: activeTab === 'GENERAL' ? 'var(--accent-primary, #0ea5e9)' : 'rgba(255, 255, 255, 0.04)',
            color: activeTab === 'GENERAL' ? '#fff' : 'var(--text-primary)',
            border: '1px solid ' + (activeTab === 'GENERAL' ? 'var(--accent-primary, #0ea5e9)' : 'var(--glass-border)'),
            fontWeight: activeTab === 'GENERAL' ? 600 : 400,
            fontSize: '0.9rem',
            cursor: 'pointer'
          }}
        >
          <Building2 size={16} /> Общие настройки и профиль
        </button>

        {role === 'OWNER' && (
          <>
            <button
              type="button"
              onClick={() => setActiveTab('CONTRACT_CONFIG')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                background: activeTab === 'CONTRACT_CONFIG' ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255, 255, 255, 0.04)',
                color: activeTab === 'CONTRACT_CONFIG' ? '#fff' : 'var(--text-primary)',
                border: '1px solid ' + (activeTab === 'CONTRACT_CONFIG' ? '#10b981' : 'var(--glass-border)'),
                fontWeight: activeTab === 'CONTRACT_CONFIG' ? 600 : 400,
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              <ListChecks size={16} /> 📝 Поля договора и чек-лист
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ESTIMATION')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                background: activeTab === 'ESTIMATION' ? 'linear-gradient(135deg, #3b82f6, #6366f1)' : 'rgba(255, 255, 255, 0.04)',
                color: activeTab === 'ESTIMATION' ? '#fff' : 'var(--text-primary)',
                border: '1px solid ' + (activeTab === 'ESTIMATION' ? '#3b82f6' : 'var(--glass-border)'),
                fontWeight: activeTab === 'ESTIMATION' ? 600 : 400,
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              <Sliders size={16} /> 📐 Конструктор калькулятора
            </button>
          </>
        )}
      </div>

      {activeTab === 'ESTIMATION' && role === 'OWNER' ? (
        <EstimationServiceBuilder materials={materials} />
      ) : activeTab === 'CONTRACT_CONFIG' && role === 'OWNER' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '840px' }}>
          {/* Header Panel */}
          <div className="glass-panel" style={{ padding: '20px 24px', borderRadius: 'var(--radius-lg)' }}>
            <h2 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ListChecks size={20} style={{ color: '#10b981' }} />
              Параметры договора и чек-лист выполненных работ
            </h2>
            <p style={{ margin: '6px 0 0 0', fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Настройте список полей спецификации для договора и пункты чек-листа акта приема-передачи под специфику вашей компании.
            </p>
          </div>

          {/* Block 1: Contract Spec Fields */}
          <div className="glass-panel" style={{ padding: '20px 24px', borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ fontSize: '1.05rem', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} style={{ color: 'var(--accent-primary)' }} />
              1. Поля параметров спецификации договора
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '0 0 16px 0', lineHeight: 1.4 }}>
              Эти поля отображаются во вкладке «Договор» карточки заказа. Значения автоматически подставляются в шаблон Word по метке <code style={{ color: '#60a5fa' }}>{'{{ключ}}'}</code>.
            </p>

            {/* Instruction & Example Card */}
            <div style={{
              background: 'rgba(59, 130, 246, 0.05)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: 'var(--radius-md)',
              padding: '16px 18px',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--accent-primary, #60a5fa)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <HelpCircle size={16} /> Как добавлять и использовать поля:
              </div>
              <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                <div>• <strong>Название поля:</strong> как поле подписано для сотрудника в карточке заказа (например, <em>«Длина карниза (м)»</em> или <em>«Площадь потолка (м²)»</em>).</div>
                <div>• <strong>Ключ метки:</strong> латинское название без пробелов. По нему формируется тег для шаблона договора Word (например, ключ <code>length</code> создаст тег <code>{`{{length}}`}</code>).</div>
                <div>• <strong>Подсказка:</strong> серый текст внутри поля ввода, помогающий понять формат значения (например, <em>«13,20»</em> или <em>«Dooya DT52S»</em>).</div>
              </div>

              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Примеры заполнения:
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse', border: '1px solid var(--glass-border)' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.04)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                      <th style={{ padding: '6px 10px' }}>Название поля в CRM</th>
                      <th style={{ padding: '6px 10px' }}>Ключ (латиница)</th>
                      <th style={{ padding: '6px 10px' }}>Метка для шаблона Word</th>
                      <th style={{ padding: '6px 10px' }}>Подсказка (placeholder)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderTop: '1px solid var(--glass-border)' }}>
                      <td style={{ padding: '6px 10px' }}>Длина карниза (м)</td>
                      <td style={{ padding: '6px 10px', fontFamily: 'monospace' }}>length</td>
                      <td style={{ padding: '6px 10px' }}><code style={{ color: '#60a5fa' }}>{'{{length}}'}</code></td>
                      <td style={{ padding: '6px 10px', color: 'var(--text-secondary)' }}>13,20</td>
                    </tr>
                    <tr style={{ borderTop: '1px solid var(--glass-border)' }}>
                      <td style={{ padding: '6px 10px' }}>Модель двигателя</td>
                      <td style={{ padding: '6px 10px', fontFamily: 'monospace' }}>motor</td>
                      <td style={{ padding: '6px 10px' }}><code style={{ color: '#60a5fa' }}>{'{{motor}}'}</code></td>
                      <td style={{ padding: '6px 10px', color: 'var(--text-secondary)' }}>WIFI (4 шт)</td>
                    </tr>
                    <tr style={{ borderTop: '1px solid var(--glass-border)' }}>
                      <td style={{ padding: '6px 10px' }}>Площадь (м²)</td>
                      <td style={{ padding: '6px 10px', fontFamily: 'monospace' }}>area</td>
                      <td style={{ padding: '6px 10px' }}><code style={{ color: '#60a5fa' }}>{'{{area}}'}</code></td>
                      <td style={{ padding: '6px 10px', color: 'var(--text-secondary)' }}>70,3</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* List of Configured Fields */}
            {contractFields.length === 0 ? (
              <div style={{
                padding: '24px',
                textAlign: 'center',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px dashed var(--glass-border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-secondary)',
                fontSize: '0.88rem',
                marginBottom: '20px'
              }}>
                Поля спецификации еще не настроены (по умолчанию используются 8 базовых полей потолков). Добавьте нужные поля в форме ниже.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '130px 1.2fr 1fr 120px 40px',
                  gap: '8px',
                  padding: '4px 8px',
                  fontSize: '0.78rem',
                  color: 'var(--text-secondary)',
                  fontWeight: 600
                }}>
                  <div>Метка в Word</div>
                  <div>Название поля (в CRM)</div>
                  <div>Подсказка (placeholder)</div>
                  <div>Ключ (латиница)</div>
                  <div></div>
                </div>

                {contractFields.map((field, idx) => {
                  const normKey = field.key.trim().toLowerCase();
                  const isDuplicate = normKey !== '' && contractFields.filter(f => f.key.trim().toLowerCase() === normKey).length > 1;
                  return (
                    <div
                      key={field.id || idx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '130px 1.2fr 1fr 120px 40px',
                        gap: '8px',
                        alignItems: 'center',
                        padding: '8px',
                        background: isDuplicate ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid ' + (isDuplicate ? 'rgba(239, 68, 68, 0.5)' : 'var(--glass-border)'),
                        borderRadius: 'var(--radius-sm)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                        <code style={{
                          background: isDuplicate ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.15)',
                          color: isDuplicate ? '#f87171' : '#60a5fa',
                          padding: '3px 6px',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          fontWeight: 600
                        }}>
                          {`{{${field.key}}}`}
                        </code>
                        {isDuplicate && (
                          <span style={{ color: '#ef4444', fontSize: '0.7rem', fontWeight: 600 }} title="Дублирующаяся метка">
                            ⚠️ Дубль
                          </span>
                        )}
                      </div>
                      <div>
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => {
                            const val = e.target.value;
                            setContractFields(prev => prev.map((f, i) => i === idx ? { ...f, label: val } : f));
                          }}
                          className="search-input"
                          style={{ width: '100%', fontSize: '0.85rem', padding: '6px 8px' }}
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={field.placeholder || ''}
                          placeholder="Подсказка..."
                          onChange={(e) => {
                            const val = e.target.value;
                            setContractFields(prev => prev.map((f, i) => i === idx ? { ...f, placeholder: val } : f));
                          }}
                          className="search-input"
                          style={{ width: '100%', fontSize: '0.85rem', padding: '6px 8px' }}
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={field.key}
                          onChange={(e) => {
                            const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_');
                            setContractFields(prev => prev.map((f, i) => i === idx ? { ...f, key: val } : f));
                          }}
                          className="search-input"
                          style={{
                            width: '100%',
                            fontSize: '0.82rem',
                            fontFamily: 'monospace',
                            padding: '6px 8px',
                            borderColor: isDuplicate ? '#ef4444' : undefined
                          }}
                        />
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleDeleteField(field.id)}
                          className="btn btn-ghost"
                          style={{ padding: '6px', color: 'var(--danger)' }}
                          title="Удалить поле"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add New Field Form with Explicit Labels */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-md)',
              padding: '16px'
            }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Plus size={16} style={{ color: 'var(--accent-primary)' }} />
                Добавить новое поле спецификации:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, marginBottom: '5px', color: 'var(--text-secondary)' }}>
                    Название поля (в карточке заказа) <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Напр. Длина карниза (м)"
                    value={newFieldLabel}
                    onChange={(e) => setNewFieldLabel(e.target.value)}
                    className="search-input"
                    style={{ width: '100%', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, marginBottom: '5px', color: 'var(--text-secondary)' }}>
                    Ключ метки для Word (латиница)
                  </label>
                  <input
                    type="text"
                    placeholder="Напр. length"
                    value={newFieldKey}
                    onChange={(e) => setNewFieldKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                    className="search-input"
                    style={{ width: '100%', fontSize: '0.85rem', fontFamily: 'monospace' }}
                  />
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                    Тег в docx: <code>{`{{${newFieldKey.trim() || 'ключ'}}}`}</code>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, marginBottom: '5px', color: 'var(--text-secondary)' }}>
                    Подсказка для ввода (placeholder)
                  </label>
                  <input
                    type="text"
                    placeholder="Напр. 13,20"
                    value={newFieldPlaceholder}
                    onChange={(e) => setNewFieldPlaceholder(e.target.value)}
                    className="search-input"
                    style={{ width: '100%', fontSize: '0.85rem' }}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddField}
                className="btn btn-secondary"
                style={{ fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={15} /> Добавить поле
              </button>
            </div>
          </div>

          {/* Block 2: Act Checklist Template */}
          <div className="glass-panel" style={{ padding: '20px 24px', borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ fontSize: '1.05rem', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckSquare size={18} style={{ color: '#10b981' }} />
              2. Шаблон чек-листа выполненных работ (для Акта)
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '0 0 16px 0', lineHeight: 1.4 }}>
              Пункты работ, отображаемые монтажнику или менеджеру в карточке заказа для формирования Акта сдачи-приемки.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
              {actChecklist.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '6px 12px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-sm)'
                  }}
                >
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', width: '24px', textAlign: 'right' }}>
                    {idx + 1}.
                  </span>
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => {
                      const val = e.target.value;
                      setActChecklist(prev => prev.map((it, i) => i === idx ? val : it));
                    }}
                    className="search-input"
                    style={{ flex: 1, fontSize: '0.85rem', padding: '5px 8px' }}
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteChecklistItem(idx)}
                    className="btn btn-ghost"
                    style={{ padding: '6px', color: 'var(--danger)' }}
                    title="Удалить пункт"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Checklist Item Form */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Новый пункт чек-листа (например: Установка электродвигателя или Проверка багета)"
                value={newChecklistText}
                onChange={(e) => setNewChecklistText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddChecklistItem();
                  }
                }}
                className="search-input"
                style={{ flex: 1, fontSize: '0.85rem' }}
              />
              <button
                type="button"
                onClick={handleAddChecklistItem}
                className="btn btn-secondary"
                style={{ fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
              >
                <Plus size={15} /> Добавить пункт
              </button>
            </div>
          </div>

          {/* Bottom Save Action */}
          <div>
            <button
              type="button"
              onClick={handleSaveContractConfig}
              disabled={tenantSaving}
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 24px',
                fontSize: '0.95rem',
                fontWeight: 600,
                background: 'linear-gradient(135deg, #10b981, #059669)',
                border: 'none',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
              }}
            >
              <CheckSquare size={16} />
              {tenantSaving ? 'Сохранение...' : 'Сохранить параметры договора и чек-лист'}
            </button>
          </div>
        </div>
      ) : (
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

        <div style={{ marginTop: '24px' }}>
          <PushNotificationSettings />
        </div>

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
                  <img 
                    src={tenantSettings?.logoUrl || '/logo.png'} 
                    alt="Logo" 
                    style={{ width: 48, height: 48, objectFit: 'contain', background: 'transparent' }} 
                  />
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

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '6px' }}>
                  <Clock size={16} style={{ color: 'var(--primary-color, #0ea5e9)' }} />
                  Часовой пояс компании
                </label>
                <select
                  value={timezone}
                  onChange={e => setTimezone(e.target.value)}
                  className="search-input"
                  style={{ width: '100%', height: '42px', cursor: 'pointer', appearance: 'auto', padding: '0 12px' }}
                >
                  {TIMEZONE_OPTIONS.map(tz => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label} ({tz.offsetLabel})
                    </option>
                  ))}
                </select>
                <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '5px' }}>
                  Используется для корректного отображения времени уведомлений, журнала действий и заказов
                </span>
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

                    {/* Секция: Контакты юр. лица */}
                    <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Контактные данные
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                            Городской телефон (для шапки договора)
                          </label>
                          <input
                            type="text"
                            className="search-input"
                            style={{ width: '100%' }}
                            placeholder="+7 (8452) 323-989"
                            value={requisites.landlinePhone || ''}
                            onChange={e => updateRequisiteField('landlinePhone', e.target.value)}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                            Мобильный телефон
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
                            Email
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
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                            Городской телефон (для шапки договора)
                          </label>
                          <input
                            type="text"
                            className="search-input"
                            style={{ width: '100%' }}
                            placeholder="+7 (8452) 323-989"
                            value={requisites.landlinePhone || ''}
                            onChange={e => updateRequisiteField('landlinePhone', e.target.value)}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                            Мобильный телефон
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

              {/* Формат номера договора и заявок */}
              <div style={{ marginTop: '32px', marginBottom: '28px', borderTop: '1px dashed var(--glass-border)', paddingTop: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <h3 style={{ fontSize: '1.15rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Hash size={18} style={{ color: 'var(--primary-color, #0ea5e9)' }} />
                    Формат номера договора и заявок
                  </h3>
                </div>
                
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
                  Настройте шаблон автоматической нумерации договоров. Вы можете использовать переменные даты, года, месяца и порядкового номера. Номер также можно будет вручную изменить в любой заявке.
                </p>

                <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '6px' }}>
                    Шаблон номера договора
                  </label>
                  <input
                    type="text"
                    className="search-input"
                    style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.95rem' }}
                    placeholder="А{ddMMyy}_{INDEX}"
                    value={orderNumberFormat}
                    onChange={e => setOrderNumberFormat(e.target.value)}
                  />

                  {/* Быстрая вставка тегов */}
                  <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Вставить тег:</span>
                    {[
                      { tag: '{INDEX}', desc: '№ (1, 2...)' },
                      { tag: '{INDEX:3}', desc: '001, 002...' },
                      { tag: '{INDEX:4}', desc: '0001...' },
                      { tag: '{ddMM}', desc: '1708' },
                      { tag: '{ddMMyy}', desc: '170826' },
                      { tag: '{ddMMyyyy}', desc: '17082026' },
                      { tag: '{YYYY}', desc: '2026' },
                      { tag: '{YY}', desc: '26' },
                      { tag: '{MM}', desc: '08' },
                      { tag: '{DD}', desc: '17' },
                      { tag: 'ДОГ-', desc: 'Префикс' },
                      { tag: '№', desc: 'Символ' }
                    ].map(item => (
                      <button
                        key={item.tag}
                        type="button"
                        onClick={() => setOrderNumberFormat(prev => prev + item.tag)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '4px',
                          color: 'var(--text-primary)',
                          fontSize: '0.75rem',
                          padding: '3px 8px',
                          cursor: 'pointer',
                          fontFamily: 'monospace'
                        }}
                        title={item.desc}
                      >
                        + {item.tag}
                      </button>
                    ))}
                  </div>

                  {/* Live Preview */}
                  <div style={{
                    marginTop: '16px',
                    padding: '10px 14px',
                    background: 'rgba(59, 130, 246, 0.08)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Пример сгенерированного номера:
                    </span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent-primary)' }}>
                      {getFormatPreview(orderNumberFormat)}
                    </span>
                  </div>
                </div>
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
      )}
    </div>
  );
};
