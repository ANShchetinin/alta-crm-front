import { NavLink } from 'react-router-dom';
import { X } from 'lucide-react';
import { PushNotificationSettings } from '../PushNotificationSettings';
import { CompanyList } from './CompanySwitcher';
import type { CompanySwitcher } from './hooks/useCompanySwitcher';
import type { UserProfileSummary } from './hooks/useUserProfile';
import { UserAvatar } from './UserAvatar';

interface ProfileModalProps {
  profile: UserProfileSummary;
  role: string | null;
  switcher: CompanySwitcher;
  onClose: () => void;
}

/** Окно профиля: кто вошел, переключение компаний и настройка push-уведомлений. */
export const ProfileModal = ({ profile, role, switcher, onClose }: ProfileModalProps) => (
  <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', padding: '24px' }}>
      <div className="modal-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <UserAvatar
            profile={profile}
            photoBorder="1px solid rgba(255, 255, 255, 0.2)"
            initialsBackground="var(--primary-gradient)"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '1rem',
              flexShrink: 0
            }}
          />
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{profile.name}</h3>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {profile.email || 'Пользователь CRM'} • <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{role}</span>
            </div>
          </div>
        </div>
        <button className="btn-icon" onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {role !== 'SUPERADMIN' && switcher.companiesCount > 1 && (
          <div
            style={{
              background: 'var(--bg-primary, #f8fafc)',
              border: '1px solid var(--glass-border, #e2e8f0)',
              borderRadius: 'var(--radius-md, 12px)',
              padding: '12px'
            }}
          >
            <div
              style={{
                fontSize: '0.78rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              🏢 Ваши компании
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <CompanyList switcher={switcher} large onBeforeSwitch={onClose} />
            </div>
          </div>
        )}

        <PushNotificationSettings />

        {role === 'OWNER' && (
          <div style={{ textAlign: 'center', marginTop: '4px' }}>
            <NavLink
              to="/settings"
              onClick={onClose}
              style={{ fontSize: '0.82rem', color: 'var(--accent-primary)', textDecoration: 'underline' }}
            >
              Перейти ко всем настройкам профиля и компании →
            </NavLink>
          </div>
        )}
      </div>
    </div>
  </div>
);
