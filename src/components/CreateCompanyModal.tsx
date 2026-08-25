import React, { useState } from 'react';
import { X, Building2, Globe, Palette, Loader2 } from 'lucide-react';
import { tenantsApi, type CreateTenantByOwnerRequest } from '../api/tenants';

interface CreateCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newToken: string) => void;
}

const TIMEZONES = [
  { value: 'Europe/Kaliningrad', label: 'Калининград (UTC+2)' },
  { value: 'Europe/Moscow', label: 'Москва, СПб (UTC+3)' },
  { value: 'Europe/Samara', label: 'Самара (UTC+4)' },
  { value: 'Asia/Yekaterinburg', label: 'Екатеринбург (UTC+5)' },
  { value: 'Asia/Omsk', label: 'Омск (UTC+6)' },
  { value: 'Asia/Novosibirsk', label: 'Новосибирск (UTC+7)' },
  { value: 'Asia/Krasnoyarsk', label: 'Красноярск (UTC+7)' },
  { value: 'Asia/Irkutsk', label: 'Иркутск (UTC+8)' },
  { value: 'Asia/Yakutsk', label: 'Якутск (UTC+9)' },
  { value: 'Asia/Vladivostok', label: 'Владивосток (UTC+10)' },
];

export const CreateCompanyModal: React.FC<CreateCompanyModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('Europe/Moscow');
  const [primaryColor, setPrimaryColor] = useState('#3b82f6');
  const [requisites, setRequisites] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Введите название компании');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload: CreateTenantByOwnerRequest = {
        name: name.trim(),
        timezone,
        primaryColor,
        requisites: requisites.trim() || undefined
      };

      const res = await tenantsApi.createByOwner(payload);
      setName('');
      setRequisites('');
      onSuccess(res.token);
    } catch (err: any) {
      console.error('Failed to create company', err);
      setError(err?.response?.data?.message || err?.message || 'Не удалось создать компанию');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1100 }}>
      <div 
        className="modal-content glass-panel" 
        onClick={e => e.stopPropagation()} 
        style={{ maxWidth: '520px', width: '92%' }}
      >
        <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(59, 130, 246, 0.15)',
              color: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Building2 size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>Новая компания</h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Создание дополнительного филиала или направления бизнеса
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Закрыть">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{
            margin: '16px 0 0',
            padding: '10px 14px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#f87171',
            fontSize: '0.88rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Название компании <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              type="text"
              className="search-input"
              style={{ width: '100%', boxSizing: 'border-box' }}
              placeholder="Например: Потолки Премиум Екатеринбург"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <Globe size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
              Часовой пояс
            </label>
            <select
              className="search-input"
              style={{ width: '100%', boxSizing: 'border-box', background: 'var(--card-bg)' }}
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
            >
              {TIMEZONES.map(tz => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <Palette size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
              Фирменный цвет
            </label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="color"
                value={primaryColor}
                onChange={e => setPrimaryColor(e.target.value)}
                style={{ width: '38px', height: '38px', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'transparent' }}
              />
              <input
                type="text"
                className="search-input"
                style={{ flex: 1 }}
                value={primaryColor}
                onChange={e => setPrimaryColor(e.target.value)}
              />
            </div>
          </div>

          <div style={{
            padding: '12px',
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.82rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.4
          }}>
            ℹ️ Для новой компании будут автоматически созданы стандартные статусы воронки («Новый», «Замер», «В работе», «Завершен», «Отказ»). База клиентов и сотрудники останутся доступными.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
              Отмена
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || !name.trim()}>
              {loading ? (
                <>
                  <Loader2 size={16} className="spinner" style={{ marginRight: '6px' }} />
                  Создание...
                </>
              ) : (
                'Создать компанию'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};