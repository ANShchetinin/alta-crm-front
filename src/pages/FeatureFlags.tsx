import { useState, useEffect } from 'react';
import { Sliders, Search, CheckCircle2, XCircle, AlertCircle, RefreshCw, Layers, ShieldCheck, Power, Wrench } from 'lucide-react';
import { getFeatureMatrix, updateSystemFeature, updateTenantFeature, bulkUpdateTenantFeatures } from '../api/features';
import type { TenantFeatureMatrix, FeatureKey } from '../api/features';
import { getDevFeatureOverrides } from '../hooks/useFeatureToggle';
import '../styles/clients.css';

export const FeatureFlags = () => {
  const [matrix, setMatrix] = useState<TenantFeatureMatrix | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [devOverrides, setDevOverrides] = useState<Record<string, boolean>>({});
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchMatrix();
    setDevOverrides(getDevFeatureOverrides());
  }, []);

  const fetchMatrix = async () => {
    try {
      setLoading(true);
      const data = await getFeatureMatrix();
      setMatrix(data);
    } catch (err: any) {
      console.error('Failed to fetch feature matrix', err);
      showToast('Ошибка при загрузке матрицы фичей', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleToggleSystem = async (featureKey: FeatureKey, currentEnabled: boolean) => {
    const newEnabled = !currentEnabled;
    setUpdatingKey(`system_${featureKey}`);
    try {
      await updateSystemFeature(featureKey, newEnabled);
      setMatrix((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          features: prev.features.map((f) => f.key === featureKey ? { ...f, systemEnabled: newEnabled } : f),
          tenants: prev.tenants.map((t) => ({
            ...t,
            effectiveFeatures: {
              ...t.effectiveFeatures,
              [featureKey]: newEnabled && (t.features[featureKey] ?? true)
            }
          }))
        };
      });
      showToast(`Глобальный флаг «${featureKey}» переключен на: ${newEnabled ? 'ВКЛЮЧЕН' : 'ВЫКЛЮЧЕН'}`);
    } catch (err: any) {
      console.error('Failed to update system feature', err);
      showToast(err.response?.data?.message || 'Не удалось обновить глобальный флаг', 'error');
    } finally {
      setUpdatingKey(null);
    }
  };

  const handleToggleTenant = async (tenantId: number, featureKey: FeatureKey, currentEnabled: boolean) => {
    const newEnabled = !currentEnabled;
    setUpdatingKey(`tenant_${tenantId}_${featureKey}`);
    try {
      await updateTenantFeature(tenantId, featureKey, newEnabled);
      setMatrix((prev) => {
        if (!prev) return null;
        const systemFeature = prev.features.find((f) => f.key === featureKey);
        const sysEnabled = systemFeature ? systemFeature.systemEnabled : true;
        return {
          ...prev,
          tenants: prev.tenants.map((t) => {
            if (t.tenantId !== tenantId) return t;
            return {
              ...t,
              features: { ...t.features, [featureKey]: newEnabled },
              effectiveFeatures: { ...t.effectiveFeatures, [featureKey]: sysEnabled && newEnabled }
            };
          })
        };
      });
      showToast(`Модуль «${featureKey}» для компании #${tenantId} переключен`);
    } catch (err: any) {
      console.error('Failed to update tenant feature', err);
      showToast(err.response?.data?.message || 'Не удалось обновить статус фичи', 'error');
    } finally {
      setUpdatingKey(null);
    }
  };

  const handleBulkToggle = async (tenantId: number, enableAll: boolean) => {
    if (!matrix) return;
    const bulkMap: Record<string, boolean> = {};
    matrix.features.forEach((f) => {
      bulkMap[f.key] = enableAll;
    });

    setUpdatingKey(`bulk_${tenantId}`);
    try {
      await bulkUpdateTenantFeatures(tenantId, bulkMap);
      await fetchMatrix();
      showToast(`Все модули для компании #${tenantId} ${enableAll ? 'включены' : 'выключены'}`);
    } catch (err: any) {
      console.error('Failed to bulk update tenant features', err);
      showToast('Ошибка при пакетном обновлении фичей', 'error');
    } finally {
      setUpdatingKey(null);
    }
  };

  const handleResetDevOverrides = () => {
    localStorage.removeItem('altacrm_ft_overrides');
    setDevOverrides({});
    window.location.reload();
  };

  const filteredTenants = (matrix?.tenants || []).filter((t) =>
    t.tenantName.toLowerCase().includes(search.toLowerCase()) ||
    t.tenantId.toString().includes(search)
  );

  const hasActiveDevOverrides = Object.keys(devOverrides).length > 0;

  return (
    <div className="clients-page" style={{ paddingBottom: '60px' }}>
      {/* Toast Notification */}
      {statusMessage && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 9999,
          padding: '12px 18px',
          background: statusMessage.type === 'success' ? 'rgba(34, 197, 94, 0.95)' : 'rgba(239, 68, 68, 0.95)',
          color: '#fff',
          borderRadius: 'var(--radius-md, 8px)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.9rem',
          fontWeight: 600
        }}>
          {statusMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {statusMessage.text}
        </div>
      )}

      {/* Header */}
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sliders size={26} style={{ color: 'var(--accent-primary)' }} />
            Управление модулями (Feature Flags)
          </h1>
          <p className="page-subtitle" style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)' }}>
            Глобальные аварийные рубильники (Kill-Switches) и выборочное управление функционалом по компаниям
          </p>
        </div>
        <button
          type="button"
          onClick={fetchMatrix}
          disabled={loading}
          className="btn btn-ghost"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Обновить
        </button>
      </div>

      {/* Developer Override Debug Alert */}
      {hasActiveDevOverrides && (
        <div style={{
          marginBottom: '20px',
          padding: '12px 16px',
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: 'var(--radius-md, 8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Wrench size={20} style={{ color: '#fbbf24' }} />
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fbbf24' }}>
                В вашем браузере активны локальные dev-overrides
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {Object.entries(devOverrides).map(([k, v]) => `${k}: ${v ? 'ON' : 'OFF'}`).join(', ')}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetDevOverrides}
            className="btn btn-ghost"
            style={{ fontSize: '0.8rem', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.4)' }}
          >
            Сбросить локальные переопределения
          </button>
        </div>
      )}

      {/* 1. Глобальные мастер-рубильники системы */}
      <div style={{
        background: 'var(--card-bg, rgba(255, 255, 255, 0.03))',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-lg, 12px)',
        padding: '20px',
        marginBottom: '28px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <ShieldCheck size={20} style={{ color: 'var(--accent-primary)' }} />
          <h2 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 600 }}>
            Глобальные мастер-рубильники системы (System Master Switches)
          </h2>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '-8px', marginBottom: '16px' }}>
          Выключение мастер-рубильника мгновенно блокирует модуль во всей CRM для всех компаний (аварийный Kill-Switch).
        </p>

        {loading && !matrix ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>Загрузка...</div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '14px'
          }}>
            {matrix?.features.map((feature) => (
              <div
                key={feature.key}
                style={{
                  padding: '14px 16px',
                  background: feature.systemEnabled ? 'rgba(34, 197, 94, 0.05)' : 'rgba(239, 68, 68, 0.06)',
                  border: feature.systemEnabled ? '1px solid rgba(34, 197, 94, 0.25)' : '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--radius-md, 8px)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '10px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {feature.displayName}
                    </span>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: feature.systemEnabled ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      color: feature.systemEnabled ? '#4ade80' : '#f87171'
                    }}>
                      {feature.systemEnabled ? 'SYSTEM ACTIVE' : 'SYSTEM DISABLED'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {feature.description}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #71717a)', marginTop: '4px', fontFamily: 'monospace' }}>
                    KEY: {feature.key}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <button
                    type="button"
                    disabled={updatingKey === `system_${feature.key}`}
                    onClick={() => handleToggleSystem(feature.key, feature.systemEnabled)}
                    className="btn"
                    style={{
                      padding: '5px 12px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      background: feature.systemEnabled ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.2)',
                      color: feature.systemEnabled ? '#f87171' : '#4ade80',
                      border: feature.systemEnabled ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(34, 197, 94, 0.4)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Power size={14} />
                    {feature.systemEnabled ? 'Отключить глобально' : 'Включить глобально'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Матрица компаний и модулей */}
      <div style={{
        background: 'var(--card-bg, rgba(255, 255, 255, 0.03))',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-lg, 12px)',
        padding: '20px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '18px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={20} style={{ color: 'var(--accent-primary)' }} />
              <h2 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 600 }}>
                Матрица модулей по компаниям (Per-Tenant Management)
              </h2>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
              Индивидуальное включение/выключение модулей для каждой компании
            </p>
          </div>

          <div className="search-box" style={{ width: '280px' }}>
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Поиск по названию или ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
              style={{ paddingLeft: '34px', width: '100%' }}
            />
          </div>
        </div>

        {/* Таблица матрицы */}
        <div style={{ overflowX: 'auto' }}>
          <table className="clients-table" style={{ width: '100%', minWidth: '960px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--glass-border)' }}>
                <th style={{ padding: '12px 14px', textAlign: 'left', minWidth: '180px' }}>Компания</th>
                {matrix?.features.map((f) => (
                  <th key={f.key} style={{ padding: '12px 10px', textAlign: 'center', minWidth: '110px' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{f.displayName}</div>
                    {!f.systemEnabled && (
                      <span style={{ fontSize: '0.68rem', color: '#f87171', display: 'block', fontWeight: 500 }}>
                        (Master OFF)
                      </span>
                    )}
                  </th>
                ))}
                <th style={{ padding: '12px 14px', textAlign: 'center', minWidth: '130px' }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={(matrix?.features.length || 0) + 2} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Компании не найдены
                  </td>
                </tr>
              ) : (
                filteredTenants.map((tenant) => (
                  <tr key={tenant.tenantId} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                        {tenant.tenantName}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        ID #{tenant.tenantId}
                      </div>
                    </td>

                    {matrix?.features.map((feature) => {
                      const tenantEnabled = tenant.features[feature.key] ?? true;
                      const isSystemOff = !feature.systemEnabled;
                      const isPending = updatingKey === `tenant_${tenant.tenantId}_${feature.key}`;

                      return (
                        <td key={feature.key} style={{ padding: '10px', textAlign: 'center' }}>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleToggleTenant(tenant.tenantId, feature.key, tenantEnabled)}
                            style={{
                              cursor: 'pointer',
                              padding: '5px 10px',
                              borderRadius: '20px',
                              border: isSystemOff
                                ? '1px dashed rgba(245, 158, 11, 0.4)'
                                : (tenantEnabled ? '1px solid rgba(34, 197, 94, 0.35)' : '1px solid rgba(255, 255, 255, 0.1)'),
                              background: isSystemOff
                                ? 'rgba(245, 158, 11, 0.1)'
                                : (tenantEnabled ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.04)'),
                              color: isSystemOff ? '#fbbf24' : (tenantEnabled ? '#4ade80' : 'var(--text-secondary)'),
                              fontSize: '0.76rem',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.15s ease',
                              opacity: isPending ? 0.6 : 1
                            }}
                            title={isSystemOff ? 'Глобально выключено в системе. Индивидуальный статус: ' + (tenantEnabled ? 'ON' : 'OFF') : (tenantEnabled ? 'Включено' : 'Выключено')}
                          >
                            {tenantEnabled ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                            {tenantEnabled ? 'ON' : 'OFF'}
                          </button>
                        </td>
                      );
                    })}

                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button
                          type="button"
                          disabled={updatingKey === `bulk_${tenant.tenantId}`}
                          onClick={() => handleBulkToggle(tenant.tenantId, true)}
                          className="btn btn-ghost"
                          style={{ padding: '4px 8px', fontSize: '0.74rem', color: '#4ade80' }}
                          title="Включить все модули"
                        >
                          Все ON
                        </button>
                        <button
                          type="button"
                          disabled={updatingKey === `bulk_${tenant.tenantId}`}
                          onClick={() => handleBulkToggle(tenant.tenantId, false)}
                          className="btn btn-ghost"
                          style={{ padding: '4px 8px', fontSize: '0.74rem', color: '#f87171' }}
                          title="Выключить все модули"
                        >
                          Все OFF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
