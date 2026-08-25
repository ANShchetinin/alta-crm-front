import React, { useState, useEffect } from 'react';
import { Search, Plus, Copy, CheckCircle2, Eye, EyeOff, RefreshCcw, Building2, UserCheck, Check, Loader2 } from 'lucide-react';
import { tenantsApi } from '../api/tenants';
import type { Tenant, CreateTenantRequest, SuperAdminOwner } from '../api/tenants';
import '../styles/clients.css';

export const Tenants = () => {
  const [activeTab, setActiveTab] = useState<'tenants' | 'owners'>('tenants');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [owners, setOwners] = useState<SuperAdminOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showOwnerPassword, setShowOwnerPassword] = useState(false);
  const [copiedTokenId, setCopiedTokenId] = useState<number | null>(null);
  const [resetTenantId, setResetTenantId] = useState<number | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  // Modal for adding company to existing owner
  const [addCompanyForOwner, setAddCompanyForOwner] = useState<SuperAdminOwner | null>(null);
  const [newCompanyNameForOwner, setNewCompanyNameForOwner] = useState('');
  const [isSavingForOwner, setIsSavingForOwner] = useState(false);

  // Limit edits state: { [userId]: number }
  const [limitEdits, setLimitEdits] = useState<{ [userId: number]: number }>({});
  const [savingLimitUserId, setSavingLimitUserId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState<CreateTenantRequest>({
    name: '',
    ownerFirstName: '',
    ownerLastName: '',
    ownerEmail: '',
    ownerPassword: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tenantsData, ownersData] = await Promise.all([
        tenantsApi.getAll(),
        tenantsApi.getOwners().catch(() => [] as SuperAdminOwner[])
      ]);
      setTenants(tenantsData);
      setOwners(ownersData);
      const limits: { [userId: number]: number } = {};
      ownersData.forEach(o => {
        limits[o.userId] = o.maxCompaniesLimit;
      });
      setLimitEdits(limits);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredOwners = owners.filter(o =>
    o.email.toLowerCase().includes(search.toLowerCase()) ||
    (o.firstName && o.firstName.toLowerCase().includes(search.toLowerCase())) ||
    (o.lastName && o.lastName.toLowerCase().includes(search.toLowerCase())) ||
    o.companies.some(c => c.name.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await tenantsApi.create(formData);
      setIsModalOpen(false);
      setFormData({ name: '', ownerFirstName: '', ownerLastName: '', ownerEmail: '', ownerPassword: '' });
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Ошибка при создании компании');
    }
  };

  const handleCreateCompanyForOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addCompanyForOwner || !newCompanyNameForOwner.trim()) return;

    setIsSavingForOwner(true);
    try {
      await tenantsApi.createForOwner(addCompanyForOwner.userId, {
        name: newCompanyNameForOwner.trim(),
        ownerEmail: addCompanyForOwner.email,
        ownerPassword: ''
      });
      setAddCompanyForOwner(null);
      setNewCompanyNameForOwner('');
      fetchData();
    } catch (err: any) {
      console.error(err);
      alert('Ошибка при создании компании: ' + (err.response?.data || err.message));
    } finally {
      setIsSavingForOwner(false);
    }
  };

  const handleSaveLimit = async (userId: number) => {
    const limit = limitEdits[userId];
    if (limit === undefined || limit < 1) return;

    setSavingLimitUserId(userId);
    try {
      await tenantsApi.updateOwnerLimit(userId, limit);
      await fetchData();
    } catch (err: any) {
      console.error(err);
      alert('Ошибка при обновлении лимита');
    } finally {
      setSavingLimitUserId(null);
    }
  };

  const copyToClipboard = (token: string, id: number) => {
    navigator.clipboard.writeText(token);
    setCopiedTokenId(id);
    setTimeout(() => setCopiedTokenId(null), 2000);
  };

  const handleResetPassword = async (tenantId: number) => {
    if (!window.confirm('Вы уверены, что хотите сбросить пароль владельца этой компании?')) {
      return;
    }
    try {
      setResetTenantId(tenantId);
      const res = await tenantsApi.resetOwnerPassword(tenantId);
      setTempPassword(res.temporaryPassword);
    } catch (err) {
      console.error(err);
      alert('Ошибка при сбросе пароля');
    } finally {
      setResetTenantId(null);
    }
  };

  if (loading) {
    return <div className="p-8">Загрузка данных...</div>;
  }

  return (
    <div className="clients-wrapper">
      <div className="clients-header">
        <div>
          <h1>Компании и Владельцы (Superadmin)</h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            Управление организациями, лимитами мультикомпанейности и владельцами
          </p>
        </div>
        
        <div className="clients-actions">
          <div className="search-input-wrapper">
            <Search className="search-icon" size={18} />
            <input 
              type="text" 
              placeholder="Поиск..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
          </div>
          <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
            <Plus size={18} />
            <span>Новая компания + Владелец</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('tenants')}
          className={`btn ${activeTab === 'tenants' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Building2 size={16} />
          <span>Все компании ({tenants.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('owners')}
          className={`btn ${activeTab === 'owners' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <UserCheck size={16} />
          <span>Владельцы и лимиты ({owners.length})</span>
        </button>
      </div>

      {activeTab === 'tenants' ? (
        <div className="clients-table-container glass-panel">
          <table className="clients-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Название компании</th>
                <th>Webhook Token</th>
                <th>Дата создания</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{textAlign: 'center', opacity: 0.5}}>
                    Компании не найдены.
                  </td>
                </tr>
              ) : (
                filteredTenants.map(tenant => (
                  <tr key={tenant.id}>
                    <td>
                      <div className="client-name">#{tenant.id}</div>
                    </td>
                    <td>
                      <div className="client-name" style={{ fontWeight: 600 }}>{tenant.name}</div>
                    </td>
                    <td>
                      <div className="client-phone" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <code style={{ background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.78rem' }}>
                          {tenant.webhookToken}
                        </code>
                        <button 
                          onClick={() => copyToClipboard(tenant.webhookToken, tenant.id)}
                          className="action-btn"
                          title="Копировать токен"
                        >
                          {copiedTokenId === tenant.id ? <CheckCircle2 size={16} color="green" /> : <Copy size={16} />}
                        </button>
                      </div>
                    </td>
                    <td>
                      <div className="client-phone">
                        {new Date(tenant.createdAt).toLocaleDateString('ru-RU', {
                          year: 'numeric', month: 'long', day: 'numeric'
                        })}
                      </div>
                    </td>
                    <td>
                      <div className="client-actions" style={{ opacity: 1 }}>
                        <button 
                          onClick={() => handleResetPassword(tenant.id)}
                          className="action-btn"
                          title="Сбросить пароль владельца"
                          disabled={resetTenantId === tenant.id}
                        >
                          <RefreshCcw size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="clients-table-container glass-panel">
          <table className="clients-table">
            <thead>
              <tr>
                <th>Владелец</th>
                <th>Компании владельца</th>
                <th>Лимит компаний</th>
                <th style={{ textAlign: 'right' }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredOwners.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', opacity: 0.5, padding: '32px' }}>
                    Владельцы не найдены.
                  </td>
                </tr>
              ) : (
                filteredOwners.map(owner => {
                  const currentLimit = limitEdits[owner.userId] ?? owner.maxCompaniesLimit;
                  const isChanged = currentLimit !== owner.maxCompaniesLimit;
                  const isSaving = savingLimitUserId === owner.userId;

                  return (
                    <tr key={owner.userId}>
                      <td>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                            {[owner.firstName, owner.lastName].filter(Boolean).join(' ') || 'Владелец'}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {owner.email} • ID: {owner.userId}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {owner.companies.map(comp => (
                            <span
                              key={comp.tenantId}
                              style={{
                                fontSize: '0.78rem',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                background: 'rgba(59, 130, 246, 0.15)',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                color: '#60a5fa',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Building2 size={12} />
                              {comp.name} (#{comp.tenantId})
                            </span>
                          ))}
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', alignSelf: 'center', marginLeft: '4px' }}>
                            (Всего: {owner.companiesCount})
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="number"
                            min="1"
                            max="99"
                            value={currentLimit}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (!isNaN(val) && val >= 1) {
                                setLimitEdits({ ...limitEdits, [owner.userId]: val });
                              }
                            }}
                            className="search-input"
                            style={{ width: '68px', padding: '4px 8px', textAlign: 'center' }}
                          />
                          {isChanged && (
                            <button
                              type="button"
                              onClick={() => handleSaveLimit(owner.userId)}
                              disabled={isSaving}
                              className="btn btn-sm btn-primary"
                              style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                              title="Сохранить лимит"
                            >
                              {isSaving ? <Loader2 size={14} className="spinner" /> : <Check size={14} />}
                            </button>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="client-actions" style={{ justifyContent: 'flex-end', opacity: 1 }}>
                          <button
                            type="button"
                            onClick={() => {
                              setAddCompanyForOwner(owner);
                              setNewCompanyNameForOwner('');
                            }}
                            className="btn btn-sm btn-ghost"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
                            title="Добавить компанию этому владельцу"
                          >
                            <Plus size={14} />
                            <span>Создать компанию</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Create new Tenant + new Owner */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Добавить компанию</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Название компании</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Например, ООО Вектор"
                />
              </div>
              
              <h3 style={{ marginTop: '1.5rem', marginBottom: '1rem', fontSize: '1rem' }}>Первый пользователь (Владелец)</h3>
              
              <div className="form-group" style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label>Имя владельца</label>
                  <input 
                    type="text" 
                    value={formData.ownerFirstName}
                    onChange={(e) => setFormData({...formData, ownerFirstName: e.target.value})}
                    placeholder="Иван"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label>Фамилия владельца</label>
                  <input 
                    type="text" 
                    value={formData.ownerLastName}
                    onChange={(e) => setFormData({...formData, ownerLastName: e.target.value})}
                    placeholder="Иванов"
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Email владельца</label>
                <input 
                  type="email" 
                  required
                  value={formData.ownerEmail}
                  onChange={(e) => setFormData({...formData, ownerEmail: e.target.value})}
                  placeholder="owner@company.com"
                />
              </div>
              <div className="form-group" style={{ position: 'relative' }}>
                <label>Пароль владельца</label>
                <input 
                  type={showOwnerPassword ? 'text' : 'password'} 
                  required
                  value={formData.ownerPassword}
                  onChange={(e) => setFormData({...formData, ownerPassword: e.target.value})}
                  placeholder="Минимум 6 символов"
                  minLength={6}
                  style={{ paddingRight: '40px' }}
                />
                <button 
                  type="button"
                  className="btn-icon"
                  style={{ position: 'absolute', right: '12px', top: '38px', opacity: 0.5 }}
                  onClick={() => setShowOwnerPassword(!showOwnerPassword)}
                >
                  {showOwnerPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div className="modal-actions" style={{ marginTop: '2rem' }}>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-ghost"
                >
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary">
                  Создать компанию
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Tenant for existing Owner */}
      {addCompanyForOwner && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <h2>Новая компания для владельца</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Владелец: <strong>{[addCompanyForOwner.firstName, addCompanyForOwner.lastName].filter(Boolean).join(' ') || addCompanyForOwner.email}</strong> ({addCompanyForOwner.email})
            </p>

            <form onSubmit={handleCreateCompanyForOwner}>
              <div className="form-group">
                <label>Название новой компании <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Например: Потолки Премиум Филиал"
                  value={newCompanyNameForOwner}
                  onChange={(e) => setNewCompanyNameForOwner(e.target.value)}
                />
              </div>

              <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setAddCompanyForOwner(null)}
                  className="btn btn-ghost"
                  disabled={isSavingForOwner}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSavingForOwner || !newCompanyNameForOwner.trim()}
                >
                  {isSavingForOwner ? (
                    <>
                      <Loader2 size={16} className="spinner" style={{ marginRight: '6px' }} />
                      Создание...
                    </>
                  ) : (
                    'Создать'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {tempPassword && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ textAlign: 'center' }}>
            <h2>Пароль сброшен!</h2>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>Новый временный пароль владельца:</p>
            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)', fontSize: '1.25rem', fontWeight: 'bold', letterSpacing: '2px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px' }}>
              {tempPassword}
              <button onClick={() => { navigator.clipboard.writeText(tempPassword); alert('Скопировано!'); }} className="btn-icon">
                <Copy size={20} />
              </button>
            </div>
            <div className="modal-actions" style={{ marginTop: '2rem', justifyContent: 'center' }}>
              <button type="button" onClick={() => setTempPassword(null)} className="btn btn-primary">
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};