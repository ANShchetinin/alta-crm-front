import { Building2, Check, ChevronDown, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { UserTenant } from '../../api/auth';
import { useAppStore } from '../../store/useAppStore';
import { FeatureGate } from '../FeatureGate';
import { COMPANY_TRIGGER_CLASS, type CompanySwitcher } from './hooks/useCompanySwitcher';

const formatCompaniesCount = (count: number) => {
  if (count === 1) {
    return `${count} компания`;
  }
  return `${count} ${count < 5 ? 'компании' : 'компаний'}`;
};

const DropdownChevron = ({ size, isOpen }: { size: number; isOpen: boolean }) => (
  <ChevronDown
    size={size}
    style={{
      color: 'var(--text-secondary)',
      transition: 'transform 0.2s ease',
      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
      flexShrink: 0
    }}
  />
);

const triggerStyle = (switcher: CompanySwitcher) => ({
  display: 'flex',
  alignItems: 'center',
  cursor: switcher.canOpenDropdown ? 'pointer' : 'default',
  borderRadius: 'var(--radius-sm, 8px)',
  transition: 'background 0.15s ease',
  userSelect: 'none' as const,
  background: switcher.isDropdownOpen ? 'var(--row-hover-bg, rgba(0, 0, 0, 0.05))' : 'transparent'
});

const BrandLogo = ({ logoUrl }: { logoUrl?: string | null }) => (
  logoUrl ? (
    <img src={logoUrl} alt="Logo" style={{ width: 30, height: 30, objectFit: 'contain', background: 'transparent', flexShrink: 0 }} />
  ) : (
    <img src="/logo.png" alt="Alta CRM" style={{ width: 30, height: 30, objectFit: 'contain', background: 'transparent', flexShrink: 0 }} />
  )
);

/** Шапка мобильного меню: логотип и название текущей компании, открывает список компаний. */
export const SidebarCompanyTrigger = ({ switcher }: { switcher: CompanySwitcher }) => {
  const { t } = useTranslation();
  const tenantSettings = useAppStore(state => state.tenantSettings);
  return (
    <div
      style={{ ...triggerStyle(switcher), gap: '10px', flex: 1, padding: '4px 6px', minWidth: 0 }}
      onClick={switcher.toggleDropdown}
      className={`${COMPANY_TRIGGER_CLASS} mobile-company-trigger`}
    >
      <BrandLogo logoUrl={tenantSettings?.logoUrl} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <h2 style={{ fontSize: '0.98rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {tenantSettings?.name || t('app.name')}
        </h2>
        {switcher.companiesCount > 1 && (
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            {formatCompaniesCount(switcher.companiesCount)}
          </span>
        )}
      </div>
      {switcher.canOpenDropdown && <DropdownChevron size={15} isOpen={switcher.isDropdownOpen} />}
    </div>
  );
};

/** Название текущей компании в верхней панели (десктоп), открывает список компаний. */
export const TopbarCompanyTrigger = ({ switcher }: { switcher: CompanySwitcher }) => {
  const { t } = useTranslation();
  const tenantSettings = useAppStore(state => state.tenantSettings);
  const companyName = tenantSettings?.name || t('app.name');
  return (
    <div
      style={{ ...triggerStyle(switcher), gap: '8px', padding: '4px 8px', maxWidth: '380px' }}
      onClick={switcher.toggleDropdown}
      className={`${COMPANY_TRIGGER_CLASS} topbar-company-trigger`}
      title={companyName}
    >
      {tenantSettings?.logoUrl ? (
        <img
          src={tenantSettings.logoUrl}
          alt="Logo"
          style={{ width: 22, height: 22, objectFit: 'contain', background: 'transparent', flexShrink: 0, borderRadius: '4px' }}
        />
      ) : (
        <Building2 size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
      )}
      <span
        style={{
          fontSize: '0.88rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}
      >
        {companyName}
      </span>
      {switcher.canOpenDropdown && <DropdownChevron size={14} isOpen={switcher.isDropdownOpen} />}
    </div>
  );
};

const CompanyLogo = ({ company, size }: { company: UserTenant; size: number }) => (
  company.logoUrl ? (
    <img src={company.logoUrl} alt="" style={{ width: size, height: size, objectFit: 'contain', borderRadius: '4px' }} />
  ) : (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '4px',
        background: company.primaryColor || '#3b82f6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontSize: `${size / 2}px`,
        fontWeight: 700
      }}
    >
      {company.name.charAt(0).toUpperCase()}
    </div>
  )
);

interface CompanyListProps {
  switcher: CompanySwitcher;
  /** Крупнее элементы и выделение активной компании жирным — для окна профиля. */
  large?: boolean;
  onBeforeSwitch?: () => void;
}

/** Кнопки компаний пользователя; активная отмечена галочкой и недоступна для выбора. */
export const CompanyList = ({ switcher, large = false, onBeforeSwitch }: CompanyListProps) => {
  const { myTenants } = switcher;
  if (!myTenants) {
    return null;
  }
  return (
    <>
      {myTenants.tenants.map(company => {
        const isActive = company.tenantId === myTenants.currentTenantId;
        return (
          <button
            key={company.tenantId}
            type="button"
            onClick={() => {
              onBeforeSwitch?.();
              switcher.switchCompany(company.tenantId);
            }}
            disabled={switcher.isSwitching || isActive}
            className={`company-dropdown-item ${isActive ? 'active' : ''}`}
            style={large ? { padding: '8px 12px' } : undefined}
          >
            <CompanyLogo company={company} size={large ? 24 : 22} />
            <span
              style={{
                flex: 1,
                fontSize: large ? '0.9rem' : '0.88rem',
                fontWeight: large && isActive ? 600 : undefined,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {company.name}
            </span>
            {isActive && <Check size={large ? 18 : 16} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />}
          </button>
        );
      })}
    </>
  );
};

/** Выпадающий список компаний с кнопкой создания новой (в пределах лимита тарифа). */
export const CompanyDropdown = ({ switcher, isMobile }: { switcher: CompanySwitcher; isMobile: boolean }) => {
  const { myTenants } = switcher;
  if (!switcher.isDropdownOpen) {
    return null;
  }
  return (
    <div
      ref={switcher.dropdownRef}
      className="company-dropdown-menu"
      style={!isMobile ? { position: 'absolute', top: 'calc(100% + 8px)', left: 0, minWidth: '260px', zIndex: 100050 } : undefined}
    >
      <div
        style={{
          padding: '6px 8px 4px',
          fontSize: '0.75rem',
          fontWeight: 600,
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}
      >
        Ваши компании
      </div>
      <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <CompanyList switcher={switcher} />
      </div>

      {myTenants?.canCreateCompany && (
        <>
          <div style={{ height: '1px', background: 'var(--glass-border)', margin: '4px 0' }} />
          <FeatureGate feature="OWNER_CREATE_COMPANY">
            <button type="button" onClick={switcher.openCreateModal} className="company-create-btn">
              <Plus size={16} />
              <span>Создать компанию</span>
              <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                {myTenants.currentCompaniesCount} из {myTenants.maxCompaniesLimit}
              </span>
            </button>
          </FeatureGate>
        </>
      )}
    </div>
  );
};
