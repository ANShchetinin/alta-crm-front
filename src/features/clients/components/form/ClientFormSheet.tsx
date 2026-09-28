import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, CheckSquare, ChevronDown, Square, User } from 'lucide-react';
import type { UserTenant } from '../../../../api/auth';
import { PRESET_LEAD_SOURCES } from '../../../../constants/clients';
import { Sheet } from '../../../../components/ui/Sheet';
import { AvatarUpload } from '../../../../components/AvatarUpload';
import type { ClientEditor } from '../../hooks/useClientEditor';
import { CUSTOM_LEAD_SOURCE, toggleTenant, type ClientType } from '../../utils/clientForm';
import { IndividualFields } from './IndividualFields';
import { LegalEntityFields } from './LegalEntityFields';

interface ClientFormSheetProps {
  editor: ClientEditor;
  tenants: UserTenant[];
  /** Открыть распознавание паспорта; не задано — функция выключена. */
  onScanPassport?: () => void;
}

const CLIENT_TYPES: { value: ClientType; label: string; icon: typeof User }[] = [
  { value: 'INDIVIDUAL', label: 'Физлицо', icon: User },
  { value: 'LEGAL_ENTITY', label: 'Юрлицо / Компания', icon: Building2 }
];

/** Боковая панель создания и редактирования клиента (физлица или юрлица). */
export const ClientFormSheet = ({ editor, tenants, onScanPassport }: ClientFormSheetProps) => {
  const { t } = useTranslation();
  const { form, patch, editingClient } = editor;
  const isLegal = form.clientType === 'LEGAL_ENTITY';

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    editor.save();
  };

  const title = editingClient
    ? t('clients.modal.editTitle')
    : (isLegal ? 'Новая компания / Юрлицо' : t('clients.modal.addTitle'));
  const submitLabel = editingClient
    ? t('clients.modal.save', 'Сохранить')
    : (isLegal ? 'Создать компанию' : t('clients.modal.create', 'Создать клиента'));

  return (
    <Sheet
      isOpen={editor.isOpen}
      onClose={editor.close}
      title={title}
      description={isLegal ? 'Карточка юридического лица' : 'Карточка физического лица'}
      size={isLegal ? 'lg' : 'md'}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
            {CLIENT_TYPES.map(({ value, label, icon: Icon }) => {
              const active = form.clientType === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => patch({ clientType: value })}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: active ? 'var(--accent-primary)' : 'transparent',
                    color: active ? '#fff' : 'var(--text-secondary)',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.85rem'
                  }}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          <AvatarUpload
            label={isLegal ? 'Логотип / Фото компании' : 'Фотография клиента'}
            name={isLegal ? (form.name || 'Компания') : form.name}
            initialAvatarUrl={form.avatarUrl || ''}
            onAvatarUrlChange={(url) => patch({ avatarUrl: url })}
            fallbackIcon={isLegal ? <Building2 size={30} /> : <User size={30} />}
          />

          {isLegal
            ? <LegalEntityFields form={form} patch={patch} contacts={editor.contacts} />
            : <IndividualFields form={form} patch={patch} onScanPassport={onScanPassport} />}

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label>{t('clients.modal.leadSource', 'Источник лида')}</label>
            <div className="custom-select-wrapper" style={{ marginBottom: form.leadSource === CUSTOM_LEAD_SOURCE ? '8px' : '0' }}>
              <select value={form.leadSource} onChange={(e) => patch({ leadSource: e.target.value })} className="custom-select">
                <option value="">Не указан</option>
                {PRESET_LEAD_SOURCES.map(source => (
                  <option key={source} value={source}>{source}</option>
                ))}
                <option value={CUSTOM_LEAD_SOURCE}>Другой вариант (ввести вручную)...</option>
              </select>
              <ChevronDown className="custom-select-icon" size={16} />
            </div>
            {form.leadSource === CUSTOM_LEAD_SOURCE && (
              <input
                type="text"
                required
                placeholder="Укажите источник (например: Листовка, Баннер...)"
                value={form.customLeadSource}
                onChange={(e) => patch({ customLeadSource: e.target.value })}
                className="search-input"
                style={{ width: '100%', paddingLeft: '12px', marginTop: '6px' }}
                autoFocus
              />
            )}
          </div>

          {tenants.length > 1 && (
            <div style={{
              marginTop: '16px',
              padding: '16px',
              background: 'rgba(59, 130, 246, 0.05)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: 'var(--radius-md)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <Building2 size={18} style={{ color: '#60a5fa' }} />
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>Привязка к компаниям / филиалам</div>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                Клиент будет доступен в выбранных компаниях владельца
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {tenants.map(tenant => {
                  const isChecked = form.allowedTenantIds.includes(tenant.tenantId);
                  return (
                    <div
                      key={tenant.tenantId}
                      onClick={() => patch({ allowedTenantIds: toggleTenant(form.allowedTenantIds, tenant.tenantId) })}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        background: isChecked ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                        border: isChecked ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {isChecked ? (
                        <CheckSquare size={16} style={{ color: '#60a5fa', flexShrink: 0 }} />
                      ) : (
                        <Square size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      )}
                      <span style={{ fontSize: '0.82rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {tenant.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--glass-border)' }}>
          <button type="button" onClick={editor.close} className="btn btn-ghost">
            {t('clients.modal.cancel')}
          </button>
          <button type="submit" className="btn btn-primary">
            {submitLabel}
          </button>
        </div>
      </form>
    </Sheet>
  );
};
