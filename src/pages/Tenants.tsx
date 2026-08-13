import React, { useState, useEffect } from 'react';
import { Search, Plus, Copy, CheckCircle2, Eye, EyeOff, RefreshCcw } from 'lucide-react';
import { tenantsApi } from '../api/tenants';
import type { Tenant, CreateTenantRequest } from '../api/tenants';
import '../styles/clients.css';

export const Tenants = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showOwnerPassword, setShowOwnerPassword] = useState(false);
  const [copiedTokenId, setCopiedTokenId] = useState<number | null>(null);
  const [resetTenantId, setResetTenantId] = useState<number | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<CreateTenantRequest>({
    name: '',
    ownerFirstName: '',
    ownerLastName: '',
    ownerEmail: '',
    ownerPassword: '',
  });

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const data = await tenantsApi.getAll();
      setTenants(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await tenantsApi.create(formData);
      setIsModalOpen(false);
      setFormData({ name: '', ownerFirstName: '', ownerLastName: '', ownerEmail: '', ownerPassword: '' });
      fetchTenants();
    } catch (err) {
      console.error(err);
      alert('Ошибка при создании компании');
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
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="clients-wrapper">
      <div className="clients-header">
        <h1>Компании (Superadmin)</h1>
        
        <div className="clients-actions">
          <div className="search-input-wrapper">
            <Search className="search-icon" size={18} />
            <input 
              type="text" 
              placeholder="Поиск компаний..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
          </div>
          <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
            <Plus size={18} />
            <span>Добавить компанию</span>
          </button>
        </div>
      </div>

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
                <td colSpan={4} style={{textAlign: 'center', opacity: 0.5}}>
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
                    <div className="client-name">{tenant.name}</div>
                  </td>
                  <td>
                    <div className="client-phone" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <code style={{ background: 'rgba(0,0,0,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
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
