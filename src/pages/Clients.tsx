import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Search, Plus, Edit2, Trash2, FileText, ArrowRight, Phone, 
  ChevronDown, Tag, Building2, User, MapPin, CreditCard, Users, PlusCircle,
  MessageCircle, Send, CheckSquare, Square
} from 'lucide-react';
import type { Client, ClientContact } from '../api/clients';
import { getClients, createClient, updateClient, deleteClient } from '../api/clients';
import type { Order, OrderStatus } from '../api/kanban';
import { getOrdersByClient, getOrderStatuses, moveOrder } from '../api/kanban';
import { getMyTenants, type UserTenant } from '../api/auth';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { useFeature } from '../hooks/useFeatureToggle';
import { formatDateInTimezone } from '../utils/dateUtils';
import { getWhatsAppLink, getTelegramLink } from '../utils/messengerUtils';
import { AvatarUpload } from '../components/AvatarUpload';
import { getClientInitials, getAvatarGradient } from '../utils/avatarUtils';
import { PassportScannerModal, type PassportApplyResult } from '../components/PassportScannerModal';
import { PRESET_LEAD_SOURCES, PRESET_VAT_STATUSES } from '../constants/clients';
import { Sheet } from '../components/ui/Sheet';
import { toast } from '../utils/toast';
import { confirm } from '../utils/confirm';
import '../styles/clients.css';

export const Clients = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { tenantSettings } = useAppStore();
  const isPassportOcrEnabled = useFeature('PASSPORT_OCR');
  const [clients, setClients] = useState<Client[]>([]);
  const [statuses, setStatuses] = useState<OrderStatus[]>([]);
  const [myTenants, setMyTenants] = useState<UserTenant[]>([]);
  const [currentTenantId, setCurrentTenantId] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [clientTypeFilter, setClientTypeFilter] = useState<'ALL' | 'INDIVIDUAL' | 'LEGAL_ENTITY'>('ALL');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isPassportScannerOpen, setIsPassportScannerOpen] = useState(false);
  
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyClient, setHistoryClient] = useState<Client | null>(null);
  const [clientHistory, setClientHistory] = useState<Order[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    clientType: 'INDIVIDUAL' as 'INDIVIDUAL' | 'LEGAL_ENTITY',
    avatarUrl: '',
    name: '',
    legalName: '',
    phone: '',
    birthDate: '',
    passportSeriesNumber: '',
    passportIssuedBy: '',
    passportIssuedDate: '',
    passportDepartmentCode: '',
    registrationAddress: '',
    email: '',
    inn: '',
    kpp: '',
    ogrn: '',
    legalAddress: '',
    actualAddress: '',
    bankName: '',
    bik: '',
    checkingAccount: '',
    correspondentAccount: '',
    vatStatus: 'NO_VAT',
    contactPerson: '',
    contactPosition: '',
    contacts: [] as ClientContact[],
    leadSource: '',
    customLeadSource: '',
    whatsapp: '',
    telegram: '',
    allowedTenantIds: [] as number[]
  });



  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const [data, statusesData, tenantsResp] = await Promise.all([
        getClients(),
        getOrderStatuses().catch(() => [] as OrderStatus[]),
        getMyTenants().catch(() => null)
      ]);
      setClients(Array.isArray(data) ? data : []);
      setStatuses(Array.isArray(statusesData) ? statusesData.sort((a, b) => a.sortOrder - b.sortOrder) : []);
      if (tenantsResp) {
        setMyTenants(Array.isArray(tenantsResp.tenants) ? tenantsResp.tenants : []);
        setCurrentTenantId(tenantsResp.currentTenantId || 1);
      }
    } catch (err) {
      console.error(err);
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = (Array.isArray(clients) ? clients : []).filter(c => {
    if (!c) return false;
    const type = c.clientType || 'INDIVIDUAL';
    if (clientTypeFilter !== 'ALL' && type !== clientTypeFilter) {
      return false;
    }
    
    if (!search || !search.trim()) return true;
    const q = search.toLowerCase().trim();

    return (
      (c.name && typeof c.name === 'string' && c.name.toLowerCase().includes(q)) ||
      (c.legalName && typeof c.legalName === 'string' && c.legalName.toLowerCase().includes(q)) ||
      (c.phone && typeof c.phone === 'string' && c.phone.includes(q)) ||
      (c.inn && typeof c.inn === 'string' && c.inn.includes(q)) ||
      (c.email && typeof c.email === 'string' && c.email.toLowerCase().includes(q)) ||
      (c.contactPerson && typeof c.contactPerson === 'string' && c.contactPerson.toLowerCase().includes(q)) ||
      (c.leadSource && typeof c.leadSource === 'string' && c.leadSource.toLowerCase().includes(q)) ||
      (c.passportSeriesNumber && typeof c.passportSeriesNumber === 'string' && c.passportSeriesNumber.includes(q)) ||
      (c.whatsapp && typeof c.whatsapp === 'string' && c.whatsapp.toLowerCase().includes(q)) ||
      (c.telegram && typeof c.telegram === 'string' && c.telegram.toLowerCase().includes(q)) ||
      (Array.isArray(c.contacts) && c.contacts.some(cnt => (cnt?.name && cnt.name.toLowerCase().includes(q)) || (cnt?.phone && cnt.phone.includes(q))))
    );
  });

  const openAddModal = (type: 'INDIVIDUAL' | 'LEGAL_ENTITY' = 'INDIVIDUAL') => {
    setEditingClient(null);
    setFormData({
      clientType: type,
      avatarUrl: '',
      name: '',
      legalName: '',
      phone: '+7',
      birthDate: '',
      passportSeriesNumber: '',
      passportIssuedBy: '',
      passportIssuedDate: '',
      passportDepartmentCode: '',
      registrationAddress: '',
      email: '',
      inn: '',
      kpp: '',
      ogrn: '',
      legalAddress: '',
      actualAddress: '',
      bankName: '',
      bik: '',
      checkingAccount: '',
      correspondentAccount: '',
      vatStatus: 'NO_VAT',
      contactPerson: '',
      contactPosition: '',
      contacts: [],
      leadSource: '',
      customLeadSource: '',
      whatsapp: '',
      telegram: '',
      allowedTenantIds: [currentTenantId]
    });
    setIsModalOpen(true);
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    const source = client.leadSource || '';
    const isPreset = PRESET_LEAD_SOURCES.includes(source);
    setFormData({
      clientType: client.clientType || 'INDIVIDUAL',
      avatarUrl: client.avatarUrl || '',
      name: client.name || '',
      legalName: client.legalName || '',
      phone: client.phone || '',
      birthDate: client.birthDate || '',
      passportSeriesNumber: client.passportSeriesNumber || '',
      passportIssuedBy: client.passportIssuedBy || '',
      passportIssuedDate: client.passportIssuedDate || '',
      passportDepartmentCode: client.passportDepartmentCode || '',
      registrationAddress: client.registrationAddress || '',
      email: client.email || '',
      inn: client.inn || '',
      kpp: client.kpp || '',
      ogrn: client.ogrn || '',
      legalAddress: client.legalAddress || '',
      actualAddress: client.actualAddress || '',
      bankName: client.bankName || '',
      bik: client.bik || '',
      checkingAccount: client.checkingAccount || '',
      correspondentAccount: client.correspondentAccount || '',
      vatStatus: client.vatStatus || 'NO_VAT',
      contactPerson: client.contactPerson || '',
      contactPosition: client.contactPosition || '',
      contacts: client.contacts ? [...client.contacts] : [],
      leadSource: isPreset || !source ? source : 'custom',
      customLeadSource: !isPreset && source ? source : '',
      whatsapp: client.whatsapp || '',
      telegram: client.telegram || '',
      allowedTenantIds: (client.allowedTenantIds && client.allowedTenantIds.length > 0) ? client.allowedTenantIds : [currentTenantId]
    });
    setIsModalOpen(true);
  };

  const handleAvatarChange = (url: string) => {
    setFormData(prev => ({ ...prev, avatarUrl: url }));
  };

  const openHistoryModal = async (client: Client) => {
    setHistoryClient(client);
    setClientHistory([]);
    setIsHistoryModalOpen(true);
    setLoadingHistory(true);
    try {
      const orders = await getOrdersByClient(client.id);
      setClientHistory(orders);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleAddContact = () => {
    setFormData(prev => ({
      ...prev,
      contacts: [
        ...prev.contacts,
        { name: '', position: '', phone: '', email: '', isPrimary: prev.contacts.length === 0 }
      ]
    }));
  };

  const handleUpdateContact = (index: number, field: keyof ClientContact, value: any) => {
    setFormData(prev => {
      const updated = [...prev.contacts];
      if (field === 'isPrimary' && value === true) {
        updated.forEach((c, i) => {
          c.isPrimary = i === index;
        });
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return { ...prev, contacts: updated };
    });
  };

  const handleRemoveContact = (index: number) => {
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const finalLeadSource = formData.leadSource === 'custom' 
        ? formData.customLeadSource.trim() 
        : formData.leadSource;

      // Filter out empty contacts
      const validContacts = formData.contacts.filter(c => c.name.trim().length > 0);

      const payload = {
        clientType: formData.clientType,
        avatarUrl: formData.avatarUrl || null,
        name: formData.name.trim(),
        legalName: formData.legalName.trim() || null,
        phone: formData.phone.trim(),
        birthDate: formData.birthDate.trim() || null,
        passportSeriesNumber: formData.passportSeriesNumber.trim() || null,
        passportIssuedBy: formData.passportIssuedBy.trim() || null,
        passportIssuedDate: formData.passportIssuedDate.trim() || null,
        passportDepartmentCode: formData.passportDepartmentCode.trim() || null,
        registrationAddress: formData.registrationAddress.trim() || null,
        email: formData.email.trim() || null,
        inn: formData.inn.trim() || null,
        kpp: formData.kpp.trim() || null,
        ogrn: formData.ogrn.trim() || null,
        legalAddress: formData.legalAddress.trim() || null,
        actualAddress: formData.actualAddress.trim() || null,
        bankName: formData.bankName.trim() || null,
        bik: formData.bik.trim() || null,
        checkingAccount: formData.checkingAccount.trim() || null,
        correspondentAccount: formData.correspondentAccount.trim() || null,
        vatStatus: formData.vatStatus || null,
        contactPerson: formData.contactPerson.trim() || (validContacts.find(c => c.isPrimary)?.name || null),
        contactPosition: formData.contactPosition.trim() || (validContacts.find(c => c.isPrimary)?.position || null),
        contacts: validContacts.length > 0 ? validContacts : [],
        leadSource: finalLeadSource || null,
        whatsapp: formData.whatsapp.trim() || null,
        telegram: formData.telegram.trim() || null,
        allowedTenantIds: (formData.allowedTenantIds && formData.allowedTenantIds.length > 0) ? formData.allowedTenantIds : [currentTenantId]
      };

      if (editingClient) {
        await updateClient(editingClient.id, payload);
        toast.success('Клиент успешно обновлен');
      } else {
        await createClient(payload);
        toast.success('Клиент успешно создан');
      }
      setIsModalOpen(false);
      fetchClients();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || err.message || 'Ошибка при сохранении клиента');
    }
  };

  const handleDelete = async (id: number) => {
    const ok = await confirm({
      title: 'Удаление клиента',
      message: 'Вы уверены, что хотите удалить клиента?',
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      danger: true,
    });
    if (!ok) return;

    try {
      await deleteClient(id);
      toast.success('Клиент удален');
      fetchClients();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || err.message || 'Ошибка при удалении клиента');
    }
  };

  if (loading) {
    return <div className="p-8" style={{ color: 'var(--text-secondary)' }}>Загрузка клиентов...</div>;
  }

  return (
    <div className="clients-wrapper">
      {/* Header */}
      <div className="clients-header">
        <div>
          <h1>{t('clients.title')}</h1>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button
              onClick={() => setClientTypeFilter('ALL')}
              className={`btn btn-sm ${clientTypeFilter === 'ALL' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.8rem', padding: '4px 12px', height: '32px' }}
            >
              Все ({clients.length})
            </button>
            <button
              onClick={() => setClientTypeFilter('INDIVIDUAL')}
              className={`btn btn-sm ${clientTypeFilter === 'INDIVIDUAL' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.8rem', padding: '4px 12px', height: '32px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <User size={14} /> Физлица ({clients.filter(c => (c.clientType || 'INDIVIDUAL') === 'INDIVIDUAL').length})
            </button>
            <button
              onClick={() => setClientTypeFilter('LEGAL_ENTITY')}
              className={`btn btn-sm ${clientTypeFilter === 'LEGAL_ENTITY' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.8rem', padding: '4px 12px', height: '32px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Building2 size={14} /> Компании / Юрлица ({clients.filter(c => c.clientType === 'LEGAL_ENTITY').length})
            </button>
          </div>
        </div>
        
        <div className="clients-actions">
          <div className="search-input-wrapper">
            <Search className="search-icon" size={18} />
            <input 
              type="text" 
              placeholder="Поиск по имени, ИНН, телефону..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
          </div>
          <button onClick={() => openAddModal('INDIVIDUAL')} className="btn btn-primary">
            <Plus size={18} />
            <span>{t('clients.addClient')}</span>
          </button>
        </div>
      </div>

      {/* Table (Desktop) */}
      <div className="clients-table-container glass-panel desktop-table-view">
        <table className="clients-table">
          <thead>
            <tr>
              <th>{t('clients.columns.name')}</th>
              <th>Контакты / ЛПР</th>
              <th>{t('clients.columns.phone')}</th>
              <th>{t('clients.columns.leadSource', 'Источник лида')}</th>
              <th>{t('clients.columns.createdAt')}</th>
              <th style={{textAlign: 'right'}}>{t('clients.columns.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.length === 0 ? (
              <tr>
                <td colSpan={6} style={{textAlign: 'center', opacity: 0.5, padding: '32px'}}>
                  Клиенты не найдены.
                </td>
              </tr>
            ) : (
              filteredClients.map(client => {
                const isLegal = client.clientType === 'LEGAL_ENTITY';
                return (
                  <tr 
                    key={client.id}
                    onClick={() => openEditModal(client)}
                    style={{ cursor: 'pointer' }}
                    className="client-row-hover"
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          color: '#fff',
                          background: client.avatarUrl ? 'transparent' : getAvatarGradient(client.name || (isLegal ? 'Компания' : 'Клиент')),
                          border: '1.5px solid rgba(255, 255, 255, 0.15)',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                          flexShrink: 0
                        }}>
                          {client.avatarUrl ? (
                            <img 
                              src={client.avatarUrl} 
                              alt={client.name} 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            />
                          ) : (
                            isLegal ? <Building2 size={18} /> : getClientInitials(client.name)
                          )}
                        </div>
                        <div>
                          <div className="client-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{client.name}</span>
                            {isLegal && (
                              <span style={{
                                fontSize: '0.7rem',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                background: 'rgba(59, 130, 246, 0.15)',
                                color: 'var(--accent-primary)',
                                fontWeight: 600
                              }}>
                                ЮРЛИЦО
                              </span>
                            )}
                          </div>
                          {isLegal && client.inn && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              ИНН: <span style={{ fontFamily: 'monospace' }}>{client.inn}</span>
                              {client.kpp ? ` • КПП: ${client.kpp}` : ''}
                            </div>
                          )}
                          {myTenants.length > 1 && client.allowedTenantIds && client.allowedTenantIds.length > 0 && (
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                              {client.allowedTenantIds.map(tid => {
                                const t = myTenants.find(x => x.tenantId === tid);
                                if (!t) return null;
                                const isCurrent = t.tenantId === currentTenantId;
                                return (
                                  <span 
                                    key={tid}
                                    style={{
                                      fontSize: '0.68rem',
                                      padding: '1px 6px',
                                      borderRadius: '4px',
                                      background: isCurrent ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                      border: `1px solid ${isCurrent ? 'rgba(59, 130, 246, 0.3)' : 'var(--glass-border)'}`,
                                      color: isCurrent ? '#60a5fa' : 'var(--text-secondary)',
                                      fontWeight: 500
                                    }}
                                  >
                                    {t.name}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      {isLegal ? (
                        <div>
                          {client.contactPerson ? (
                            <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                              {client.contactPerson}
                              {client.contactPosition ? (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '6px' }}>
                                  ({client.contactPosition})
                                </span>
                              ) : null}
                            </div>
                          ) : client.contacts && client.contacts.length > 0 ? (
                            <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                              {client.contacts[0].name}
                              {client.contacts[0].position ? (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '6px' }}>
                                  ({client.contacts[0].position})
                                </span>
                              ) : null}
                              {client.contacts.length > 1 && (
                                <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', marginLeft: '6px' }}>
                                  +{client.contacts.length - 1}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-secondary)', opacity: 0.4 }}>—</span>
                          )}
                          {client.email && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              {client.email}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', opacity: 0.4 }}>—</span>
                      )}
                    </td>
                    <td>
                      <div className="client-phone">
                        {client.phone ? (
                          <a 
                            href={`tel:${client.phone.replace(/[^\d+]/g, '')}`} 
                            title="Позвонить"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              color: 'var(--text-primary)',
                              textDecoration: 'none',
                              padding: '4px 8px',
                              borderRadius: 'var(--radius-sm)',
                              background: 'rgba(34, 197, 94, 0.1)',
                              border: '1px solid rgba(34, 197, 94, 0.2)',
                              fontWeight: 500,
                              whiteSpace: 'nowrap'
                            }}
                          >
                            <Phone size={13} style={{ color: 'var(--success)', flexShrink: 0 }} />
                            <span style={{ whiteSpace: 'nowrap' }}>{client.phone}</span>
                          </a>
                        ) : '-'}
                        {client.whatsapp && (
                          <a
                            href={getWhatsAppLink(client.whatsapp)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`Написать в WhatsApp: ${client.whatsapp}`}
                            onClick={(e) => e.stopPropagation()}
                            className="messenger-link whatsapp-link"
                          >
                            <MessageCircle size={13} />
                          </a>
                        )}
                        {client.telegram && (
                          <a
                            href={getTelegramLink(client.telegram)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`Написать в Telegram: ${client.telegram}`}
                            onClick={(e) => e.stopPropagation()}
                            className="messenger-link telegram-link"
                          >
                            <Send size={13} />
                          </a>
                        )}
                      </div>
                    </td>
                    <td>
                      {client.leadSource ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(59, 130, 246, 0.1)',
                          border: '1px solid rgba(59, 130, 246, 0.25)',
                          color: '#60a5fa',
                          fontSize: '0.8rem',
                          fontWeight: 500,
                          whiteSpace: 'nowrap'
                        }}>
                          <Tag size={12} style={{ opacity: 0.8 }} />
                          {client.leadSource}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', opacity: 0.4, fontSize: '0.85rem' }}>—</span>
                      )}
                    </td>
                    <td>
                      <div className="client-date">
                        {formatDateInTimezone(client.createdAt, tenantSettings?.timezone)}
                      </div>
                    </td>
                    <td>
                      <div className="client-actions" onClick={(e) => e.stopPropagation()}>
                        {client.phone && (
                          <a 
                            href={`tel:${client.phone}`}
                            className="action-btn"
                            style={{ color: 'var(--success)' }}
                            title="Позвонить клиенту"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Phone size={16} />
                          </a>
                        )}
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); openHistoryModal(client); }}
                          className="action-btn"
                          title="История заявок"
                        >
                          <FileText size={16} />
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); openEditModal(client); }}
                          className="action-btn"
                          title={t('clients.modal.editTitle')}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDelete(client.id); }}
                          className="action-btn delete"
                          title="Удалить"
                        >
                          <Trash2 size={16} />
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

      {/* Mobile Cards List */}
      <div className="mobile-card-view">
        {filteredClients.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', opacity: 0.6, padding: '32px 16px', borderRadius: 'var(--radius-md)' }}>
            Клиенты не найдены.
          </div>
        ) : (
          <div className="mobile-cards-list">
            {filteredClients.map(client => {
              const isLegal = client.clientType === 'LEGAL_ENTITY';
              return (
                <div 
                  key={client.id}
                  onClick={() => openEditModal(client)}
                  className="mobile-data-card"
                >
                  <div className="mobile-data-card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        color: '#fff',
                        background: client.avatarUrl ? 'transparent' : getAvatarGradient(client.name || (isLegal ? 'Компания' : 'Клиент')),
                        border: '1.5px solid rgba(255, 255, 255, 0.15)',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                        flexShrink: 0
                      }}>
                        {client.avatarUrl ? (
                          <img 
                            src={client.avatarUrl} 
                            alt={client.name} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          />
                        ) : (
                          isLegal ? <Building2 size={18} /> : getClientInitials(client.name)
                        )}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {client.name}
                        </div>
                        {isLegal && client.legalName && client.legalName !== client.name && (
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {client.legalName}
                          </div>
                        )}
                      </div>
                    </div>
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: isLegal ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                      color: isLegal ? '#60a5fa' : 'var(--text-secondary)',
                      fontWeight: 600,
                      flexShrink: 0
                    }}>
                      {isLegal ? 'ЮРЛИЦО' : 'ФИЗЛИЦО'}
                    </span>
                  </div>

                  <div className="mobile-data-card-body">
                    {/* Contacts & Messengers */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                      {client.phone ? (
                        <a 
                          href={`tel:${client.phone.replace(/[^\d+]/g, '')}`} 
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: 'var(--success, #22c55e)',
                            textDecoration: 'none',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            background: 'rgba(34, 197, 94, 0.1)',
                            border: '1px solid rgba(34, 197, 94, 0.25)',
                            fontWeight: 600,
                            fontSize: '0.82rem'
                          }}
                        >
                          <Phone size={13} />
                          <span>{client.phone}</span>
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Без телефона</span>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {client.whatsapp && (
                          <a
                            href={getWhatsAppLink(client.whatsapp)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="messenger-link whatsapp-link"
                            title="WhatsApp"
                          >
                            <MessageCircle size={14} />
                          </a>
                        )}
                        {client.telegram && (
                          <a
                            href={getTelegramLink(client.telegram)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="messenger-link telegram-link"
                            title="Telegram"
                          >
                            <Send size={14} />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Legal Contacts / INN */}
                    {isLegal && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '2px', background: 'rgba(255,255,255,0.03)', padding: '6px 8px', borderRadius: '6px' }}>
                        {client.contactPerson && (
                          <div>ЛПР: <strong>{client.contactPerson}</strong>{client.contactPosition ? ` (${client.contactPosition})` : ''}</div>
                        )}
                        {client.inn && (
                          <div>ИНН: <span style={{ fontFamily: 'monospace' }}>{client.inn}</span>{client.kpp ? ` • КПП: ${client.kpp}` : ''}</div>
                        )}
                      </div>
                    )}

                    {/* Multitenants tags */}
                    {myTenants.length > 1 && client.allowedTenantIds && client.allowedTenantIds.length > 0 && (
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                        {client.allowedTenantIds.map(tid => {
                          const t = myTenants.find(x => x.tenantId === tid);
                          if (!t) return null;
                          const isCurrent = t.tenantId === currentTenantId;
                          return (
                            <span 
                              key={tid}
                              style={{
                                fontSize: '0.68rem',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                background: isCurrent ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                border: `1px solid ${isCurrent ? 'rgba(59, 130, 246, 0.3)' : 'var(--glass-border)'}`,
                                color: isCurrent ? '#60a5fa' : 'var(--text-secondary)',
                                fontWeight: 500
                              }}
                            >
                              {t.name}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Metadata: Lead source & Date */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {client.leadSource ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: 'rgba(59, 130, 246, 0.1)',
                          color: '#60a5fa',
                          fontWeight: 500
                        }}>
                          <Tag size={11} /> {client.leadSource}
                        </span>
                      ) : (
                        <span />
                      )}
                      <span>{formatDateInTimezone(client.createdAt, tenantSettings?.timezone)}</span>
                    </div>
                  </div>

                  <div className="mobile-data-card-actions" onClick={(e) => e.stopPropagation()}>
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openHistoryModal(client); }}
                      className="btn btn-ghost"
                      style={{ fontSize: '0.78rem', padding: '4px 8px', height: '28px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <FileText size={13} /> История
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); openEditModal(client); }}
                        className="btn btn-ghost"
                        style={{ fontSize: '0.78rem', padding: '4px 8px', height: '28px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Edit2 size={13} /> Изменить
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDelete(client.id); }}
                        className="btn btn-ghost text-danger"
                        style={{ fontSize: '0.78rem', padding: '4px 8px', height: '28px', color: '#ef4444' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Client Edit/Add Slide-over Sheet */}
      <Sheet
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingClient ? t('clients.modal.editTitle') : (formData.clientType === 'LEGAL_ENTITY' ? 'Новая компания / Юрлицо' : t('clients.modal.addTitle'))}
        description={formData.clientType === 'LEGAL_ENTITY' ? 'Карточка юридического лица' : 'Карточка физического лица'}
        size={formData.clientType === 'LEGAL_ENTITY' ? 'lg' : 'md'}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
                {/* Client Type Selector */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, clientType: 'INDIVIDUAL' })}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: formData.clientType === 'INDIVIDUAL' ? 'var(--accent-primary)' : 'transparent',
                      color: formData.clientType === 'INDIVIDUAL' ? '#fff' : 'var(--text-secondary)',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.85rem'
                    }}
                  >
                    <User size={16} />
                    <span>Физлицо</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, clientType: 'LEGAL_ENTITY' })}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: formData.clientType === 'LEGAL_ENTITY' ? 'var(--accent-primary)' : 'transparent',
                      color: formData.clientType === 'LEGAL_ENTITY' ? '#fff' : 'var(--text-secondary)',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.85rem'
                    }}
                  >
                    <Building2 size={16} />
                    <span>Юрлицо / Компания</span>
                  </button>
                </div>

                {/* Avatar / Photo / Logo Upload */}
                <AvatarUpload
                  label={formData.clientType === 'LEGAL_ENTITY' ? 'Логотип / Фото компании' : 'Фотография клиента'}
                  name={formData.clientType === 'LEGAL_ENTITY' ? (formData.name || 'Компания') : formData.name}
                  initialAvatarUrl={formData.avatarUrl || ''}
                  onAvatarUrlChange={handleAvatarChange}
                  fallbackIcon={formData.clientType === 'LEGAL_ENTITY' ? <Building2 size={30} /> : <User size={30} />}
                />

                {formData.clientType === 'INDIVIDUAL' ? (
                  <>
                    <div className="form-group">
                      <label>{t('clients.modal.name')} *</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Иван Иванов"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="search-input"
                        style={{ width: '100%', paddingLeft: '12px' }}
                      />
                    </div>
                    <div className="form-group">
                      <label>{t('clients.modal.phone')} *</label>
                      <input 
                        type="text" 
                        required
                        placeholder="+7 (999) 000-00-00"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="search-input"
                        style={{ width: '100%', paddingLeft: '12px' }}
                      />
                    </div>
                    {/* WhatsApp и Telegram */}
                    <div className="form-row">
                      <div className="form-group">
                        <label>WhatsApp</label>
                        <div className="input-with-icon">
                          <MessageCircle className="input-icon" size={16} />
                          <input
                            type="text"
                            placeholder="+7 (900) 123-45-67 или никнейм"
                            value={formData.whatsapp}
                            onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                            className="search-input"
                            style={{ width: '100%', paddingLeft: '36px' }}
                          />
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Telegram</label>
                        <div className="input-with-icon">
                          <Send className="input-icon" size={16} />
                          <input
                            type="text"
                            placeholder="@username"
                            value={formData.telegram}
                            onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
                            className="search-input"
                            style={{ width: '100%', paddingLeft: '36px' }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Email</label>
                      <input 
                        type="email" 
                        placeholder="client@mail.ru"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="search-input"
                        style={{ width: '100%', paddingLeft: '12px' }}
                      />
                    </div>

                    {/* Данные для договора (необязательные) */}
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--glass-border)',
                      padding: '14px',
                      borderRadius: 'var(--radius-md)',
                      marginTop: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                        <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <FileText size={16} /> Данные паспорта и договора
                        </h4>
                        {isPassportOcrEnabled && (
                          <button
                            type="button"
                            onClick={() => setIsPassportScannerOpen(true)}
                            className="btn btn-secondary"
                            style={{
                              fontSize: '0.78rem',
                              padding: '4px 10px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              background: 'rgba(59, 130, 246, 0.15)',
                              borderColor: 'rgba(59, 130, 246, 0.3)',
                              color: '#60a5fa'
                            }}
                          >
                            📷 Распознать паспорт РФ
                          </button>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label>Дата рождения</label>
                          <input
                            type="text"
                            placeholder="ДД.ММ.ГГГГ"
                            value={formData.birthDate}
                            onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                            className="search-input"
                            style={{ width: '100%', paddingLeft: '12px' }}
                          />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label>Серия и номер паспорта</label>
                          <input
                            type="text"
                            placeholder="63 10 123456"
                            value={formData.passportSeriesNumber}
                            onChange={(e) => setFormData({ ...formData, passportSeriesNumber: e.target.value })}
                            className="search-input"
                            style={{ width: '100%', paddingLeft: '12px' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label>Кем выдан</label>
                          <input
                            type="text"
                            placeholder="Отделом УФМС России по..."
                            value={formData.passportIssuedBy}
                            onChange={(e) => setFormData({ ...formData, passportIssuedBy: e.target.value })}
                            className="search-input"
                            style={{ width: '100%', paddingLeft: '12px' }}
                          />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label>Когда выдан</label>
                          <input
                            type="text"
                            placeholder="ДД.ММ.ГГГГ"
                            value={formData.passportIssuedDate}
                            onChange={(e) => setFormData({ ...formData, passportIssuedDate: e.target.value })}
                            className="search-input"
                            style={{ width: '100%', paddingLeft: '12px' }}
                          />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label>Код подразделения</label>
                          <input
                            type="text"
                            placeholder="770-001"
                            value={formData.passportDepartmentCode}
                            onChange={(e) => setFormData({ ...formData, passportDepartmentCode: e.target.value })}
                            className="search-input"
                            style={{ width: '100%', paddingLeft: '12px' }}
                          />
                        </div>
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label>Адрес по прописке (регистрации)</label>
                        <input
                          type="text"
                          placeholder="101000, г. Москва, ул. Ленина, д. 10, кв. 5"
                          value={formData.registrationAddress}
                          onChange={(e) => setFormData({ ...formData, registrationAddress: e.target.value })}
                          className="search-input"
                          style={{ width: '100%', paddingLeft: '12px' }}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  /* LEGAL ENTITY FORM */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Organization Basic Info */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', padding: '14px', borderRadius: 'var(--radius-md)' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Building2 size={16} /> Данные организации
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label>Краткое наименование *</label>
                          <input 
                            type="text" 
                            required
                            placeholder="ООО «Альфа» или ИП Иванов И.И."
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            className="search-input"
                            style={{ width: '100%', paddingLeft: '12px' }}
                          />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label>Полное наименование (по уставу)</label>
                          <input 
                            type="text" 
                            placeholder="Общество с ограниченной ответственностью «Альфа»"
                            value={formData.legalName}
                            onChange={(e) => setFormData({...formData, legalName: e.target.value})}
                            className="search-input"
                            style={{ width: '100%', paddingLeft: '12px' }}
                          />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label>Рабочий телефон организации *</label>
                          <input 
                            type="text" 
                            required
                            placeholder="+7 (495) 000-00-00"
                            value={formData.phone}
                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                            className="search-input"
                            style={{ width: '100%', paddingLeft: '12px' }}
                          />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label>Корпоративный Email</label>
                          <input 
                            type="email" 
                            placeholder="info@company.ru"
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            className="search-input"
                            style={{ width: '100%', paddingLeft: '12px' }}
                          />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label>WhatsApp</label>
                          <div className="input-with-icon">
                            <MessageCircle className="input-icon" size={16} />
                            <input
                              type="text"
                              placeholder="+7 (900) 123-45-67 или никнейм"
                              value={formData.whatsapp}
                              onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                              className="search-input"
                              style={{ width: '100%', paddingLeft: '36px' }}
                            />
                          </div>
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label>Telegram</label>
                          <div className="input-with-icon">
                            <Send className="input-icon" size={16} />
                            <input
                              type="text"
                              placeholder="@username"
                              value={formData.telegram}
                              onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
                              className="search-input"
                              style={{ width: '100%', paddingLeft: '36px' }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Requisites */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', padding: '14px', borderRadius: 'var(--radius-md)' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileText size={16} /> Реквизиты и Налогообложение
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label>ИНН</label>
                          <input 
                            type="text" 
                            placeholder="7701234567"
                            value={formData.inn}
                            onChange={(e) => setFormData({...formData, inn: e.target.value})}
                            className="search-input"
                            style={{ width: '100%', paddingLeft: '12px' }}
                          />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label>КПП</label>
                          <input 
                            type="text" 
                            placeholder="770101001"
                            value={formData.kpp}
                            onChange={(e) => setFormData({...formData, kpp: e.target.value})}
                            className="search-input"
                            style={{ width: '100%', paddingLeft: '12px' }}
                          />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label>ОГРН / ОГРНИП</label>
                          <input 
                            type="text" 
                            placeholder="1027700132195"
                            value={formData.ogrn}
                            onChange={(e) => setFormData({...formData, ogrn: e.target.value})}
                            className="search-input"
                            style={{ width: '100%', paddingLeft: '12px' }}
                          />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label>Статус НДС</label>
                          <div className="custom-select-wrapper">
                            <select
                              value={formData.vatStatus}
                              onChange={(e) => setFormData({ ...formData, vatStatus: e.target.value })}
                              className="custom-select"
                            >
                              {PRESET_VAT_STATUSES.map(s => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                              ))}
                            </select>
                            <ChevronDown className="custom-select-icon" size={16} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Addresses */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', padding: '14px', borderRadius: 'var(--radius-md)' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={16} /> Адреса
                      </h4>
                      <div className="form-group" style={{ marginBottom: '10px' }}>
                        <label>Юридический адрес</label>
                        <input 
                          type="text" 
                          placeholder="101000, г. Москва, ул. Ленина, д. 10, оф. 101"
                          value={formData.legalAddress}
                          onChange={(e) => setFormData({...formData, legalAddress: e.target.value})}
                          className="search-input"
                          style={{ width: '100%', paddingLeft: '12px' }}
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <label style={{ margin: 0 }}>Фактический адрес</label>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, actualAddress: formData.legalAddress })}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--accent-primary)',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              padding: 0
                            }}
                          >
                            Скопировать из юридического
                          </button>
                        </div>
                        <input 
                          type="text" 
                          placeholder="101000, г. Москва, ул. Ленина, д. 10, оф. 101"
                          value={formData.actualAddress}
                          onChange={(e) => setFormData({...formData, actualAddress: e.target.value})}
                          className="search-input"
                          style={{ width: '100%', paddingLeft: '12px' }}
                        />
                      </div>
                    </div>

                    {/* Bank Requisites */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', padding: '14px', borderRadius: 'var(--radius-md)' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CreditCard size={16} /> Банковские реквизиты
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label>БИК банка</label>
                          <input 
                            type="text" 
                            placeholder="044525225"
                            value={formData.bik}
                            onChange={(e) => setFormData({...formData, bik: e.target.value})}
                            className="search-input"
                            style={{ width: '100%', paddingLeft: '12px' }}
                          />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label>Наименование банка</label>
                          <input 
                            type="text" 
                            placeholder="ПАО Сбербанк"
                            value={formData.bankName}
                            onChange={(e) => setFormData({...formData, bankName: e.target.value})}
                            className="search-input"
                            style={{ width: '100%', paddingLeft: '12px' }}
                          />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label>Расчетный счет (р/с)</label>
                          <input 
                            type="text" 
                            placeholder="40702810938000012345"
                            value={formData.checkingAccount}
                            onChange={(e) => setFormData({...formData, checkingAccount: e.target.value})}
                            className="search-input"
                            style={{ width: '100%', paddingLeft: '12px' }}
                          />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label>Корреспондентский счет (к/с)</label>
                          <input 
                            type="text" 
                            placeholder="30101810400000000225"
                            value={formData.correspondentAccount}
                            onChange={(e) => setFormData({...formData, correspondentAccount: e.target.value})}
                            className="search-input"
                            style={{ width: '100%', paddingLeft: '12px' }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Company Contacts / Representatives */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', padding: '14px', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Users size={16} /> Представители и контакты
                        </h4>
                        <button
                          type="button"
                          onClick={handleAddContact}
                          className="btn btn-sm btn-ghost"
                          style={{ color: 'var(--accent-primary)', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px' }}
                        >
                          <PlusCircle size={14} /> Добавить представителя
                        </button>
                      </div>

                      {formData.contacts.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '12px', fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.01)', borderRadius: 'var(--radius-sm)' }}>
                          Нет добавленных представителей. Нажмите «Добавить представителя», чтобы указать директора, бухгалтера или менеджера.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {formData.contacts.map((contact, index) => (
                            <div key={index} style={{ background: 'rgba(255,255,255,0.04)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,255,255,0.05)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-primary)', cursor: 'pointer', margin: 0 }}>
                                  <input
                                    type="checkbox"
                                    checked={contact.isPrimary || false}
                                    onChange={(e) => handleUpdateContact(index, 'isPrimary', e.target.checked)}
                                  />
                                  <span style={{ fontWeight: contact.isPrimary ? 600 : 400, color: contact.isPrimary ? 'var(--accent-primary)' : 'inherit' }}>
                                    Основной контакт (ЛПР)
                                  </span>
                                </label>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveContact(index)}
                                  className="action-btn delete"
                                  title="Удалить представителя"
                                  style={{ padding: '2px' }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
                                <input
                                  type="text"
                                  placeholder="ФИО представителя *"
                                  value={contact.name}
                                  onChange={(e) => handleUpdateContact(index, 'name', e.target.value)}
                                  className="search-input"
                                  style={{ width: '100%', paddingLeft: '8px', fontSize: '0.85rem' }}
                                />
                                <input
                                  type="text"
                                  placeholder="Должность (Ген. директор...)"
                                  value={contact.position || ''}
                                  onChange={(e) => handleUpdateContact(index, 'position', e.target.value)}
                                  className="search-input"
                                  style={{ width: '100%', paddingLeft: '8px', fontSize: '0.85rem' }}
                                />
                                <input
                                  type="tel"
                                  placeholder="Телефон"
                                  value={contact.phone || ''}
                                  onChange={(e) => handleUpdateContact(index, 'phone', e.target.value)}
                                  className="search-input"
                                  style={{ width: '100%', paddingLeft: '8px', fontSize: '0.85rem' }}
                                />
                                <input
                                  type="email"
                                  placeholder="Email"
                                  value={contact.email || ''}
                                  onChange={(e) => handleUpdateContact(index, 'email', e.target.value)}
                                  className="search-input"
                                  style={{ width: '100%', paddingLeft: '8px', fontSize: '0.85rem' }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Lead Source */}
                <div className="form-group" style={{ marginTop: '16px' }}>
                  <label>{t('clients.modal.leadSource', 'Источник лида')}</label>
                  <div className="custom-select-wrapper" style={{ marginBottom: formData.leadSource === 'custom' ? '8px' : '0' }}>
                    <select
                      value={formData.leadSource}
                      onChange={(e) => setFormData({ ...formData, leadSource: e.target.value })}
                      className="custom-select"
                    >
                      <option value="">Не указан</option>
                      {PRESET_LEAD_SOURCES.map(source => (
                        <option key={source} value={source}>{source}</option>
                      ))}
                      <option value="custom">Другой вариант (ввести вручную)...</option>
                    </select>
                    <ChevronDown className="custom-select-icon" size={16} />
                  </div>
                  {formData.leadSource === 'custom' && (
                    <input
                      type="text"
                      required
                      placeholder="Укажите источник (например: Листовка, Баннер...)"
                      value={formData.customLeadSource}
                      onChange={(e) => setFormData({ ...formData, customLeadSource: e.target.value })}
                      className="search-input"
                      style={{ width: '100%', paddingLeft: '12px', marginTop: '6px' }}
                      autoFocus
                    />
                  )}
                </div>

                {/* Блок Выбора компаний/филиалов клиента */}
                {myTenants.length > 1 && (
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
                      {myTenants.map(t => {
                        const isChecked = formData.allowedTenantIds.includes(t.tenantId);
                        return (
                          <div
                            key={t.tenantId}
                            onClick={() => {
                              const next = isChecked
                                ? formData.allowedTenantIds.filter(id => id !== t.tenantId)
                                : [...formData.allowedTenantIds, t.tenantId];
                              setFormData({
                                ...formData,
                                allowedTenantIds: next.length ? next : [t.tenantId]
                              });
                            }}
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
                              {t.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--glass-border)' }}>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-ghost"
                >
                  {t('clients.modal.cancel')}
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingClient ? t('clients.modal.save', 'Сохранить') : (formData.clientType === 'LEGAL_ENTITY' ? 'Создать компанию' : t('clients.modal.create', 'Создать клиента'))}
                </button>
              </div>
            </form>
          </Sheet>

      {/* History Slide-over Sheet */}
      <Sheet
        isOpen={isHistoryModalOpen && !!historyClient}
        onClose={() => setIsHistoryModalOpen(false)}
        title={`История заявок: ${historyClient?.name || ''}`}
        description={historyClient?.clientType === 'LEGAL_ENTITY' ? 'Компания / Юридическое лицо' : 'Физическое лицо'}
        size="xl"
      >
        <div>
          {loadingHistory ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Загрузка истории...</div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="clients-table-container glass-panel desktop-table-view" style={{ maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' }}>
                <table className="clients-table">
                  <thead>
                    <tr>
                      <th>№ Заявки / Договора</th>
                      <th>Статус</th>
                      <th>Адрес</th>
                      <th>Стоимость</th>
                      <th>Дата</th>
                      <th style={{textAlign: 'right'}}>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientHistory.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', opacity: 0.5 }}>У клиента нет заявок.</td>
                      </tr>
                    ) : (
                      clientHistory.map(order => {
                        const currentStatus = statuses.find(s => s.id === order.statusId);
                        return (
                          <tr key={order.id}>
                            <td>
                              <strong style={{ fontFamily: 'monospace', color: 'var(--accent-primary)', fontSize: '0.85rem' }}>
                                № {order.orderNumber || order.id}
                              </strong>
                            </td>
                            <td>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <span 
                                  style={{ 
                                    width: '8px', 
                                    height: '8px', 
                                    borderRadius: '50%', 
                                    backgroundColor: currentStatus?.color || '#3b82f6',
                                    flexShrink: 0
                                  }} 
                                />
                                <select
                                  value={order.statusId}
                                  onChange={async (e) => {
                                    const newStatusId = Number(e.target.value);
                                    try {
                                      await moveOrder(order.id, newStatusId);
                                      setClientHistory(prev => prev.map(o => o.id === order.id ? { ...o, statusId: newStatusId } : o));
                                    } catch (err) {
                                      console.error(err);
                                    }
                                  }}
                                  style={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    color: 'var(--text-primary)',
                                    borderRadius: '4px',
                                    padding: '3px 6px',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {statuses.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                  ))}
                                </select>
                              </div>
                            </td>
                            <td>{order.address || '-'}</td>
                            <td>
                              <div>{(order.totalPrice || 0).toLocaleString('ru-RU')} ₽</div>
                              {(order.prepayment != null || order.remainder != null) && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                  Ав: {(order.prepayment || 0).toLocaleString('ru-RU')} • Ост: {((order.remainder != null ? order.remainder : order.totalPrice) || 0).toLocaleString('ru-RU')} ₽
                                </div>
                              )}
                            </td>
                            <td>{order.createdAt ? formatDateInTimezone(order.createdAt, tenantSettings?.timezone) : '-'}</td>
                            <td style={{textAlign: 'right'}}>
                              <button 
                                type="button"
                                onClick={() => {
                                  setIsHistoryModalOpen(false);
                                  navigate(`/kanban?orderId=${order.id}`);
                                }}
                                className="action-btn"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '0.8rem' }}
                              >
                                Перейти <ArrowRight size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View */}
              <div className="mobile-card-view" style={{ maxHeight: 'calc(90vh - 120px)', overflowY: 'auto', gap: '8px', paddingRight: '2px' }}>
                {clientHistory.length === 0 ? (
                  <div style={{ textAlign: 'center', opacity: 0.5, padding: '24px' }}>У клиента нет заявок.</div>
                ) : (
                  clientHistory.map(order => {
                    const currentStatus = statuses.find(s => s.id === order.statusId);
                    return (
                      <div 
                        key={order.id} 
                        className="mobile-data-card"
                        style={{ padding: '10px 12px', gap: '8px' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <strong style={{ fontFamily: 'monospace', color: 'var(--accent-primary)', fontSize: '0.9rem' }}>
                            № {order.orderNumber || order.id}
                          </strong>
                          
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <span 
                              style={{ 
                                width: '8px', 
                                height: '8px', 
                                borderRadius: '50%', 
                                backgroundColor: currentStatus?.color || '#3b82f6',
                                flexShrink: 0
                              }} 
                            />
                            <select
                              value={order.statusId}
                              onChange={async (e) => {
                                const newStatusId = Number(e.target.value);
                                try {
                                  await moveOrder(order.id, newStatusId);
                                  setClientHistory(prev => prev.map(o => o.id === order.id ? { ...o, statusId: newStatusId } : o));
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                              style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: 'var(--text-primary)',
                                borderRadius: '4px',
                                padding: '2px 6px',
                                fontSize: '0.75rem',
                                cursor: 'pointer'
                              }}
                            >
                              {statuses.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {order.address && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <MapPin size={12} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{order.address}</span>
                          </div>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', background: 'rgba(255,255,255,0.03)', padding: '6px 8px', borderRadius: '6px' }}>
                          <div>
                            <div style={{ fontWeight: 700, color: '#4ade80' }}>
                              {(order.totalPrice || 0).toLocaleString('ru-RU')} ₽
                            </div>
                            {(order.prepayment != null || order.remainder != null) && (
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                Аванс: {(order.prepayment || 0).toLocaleString('ru-RU')} • Ост: {((order.remainder != null ? order.remainder : order.totalPrice) || 0).toLocaleString('ru-RU')} ₽
                              </div>
                            )}
                          </div>

                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                            {order.createdAt ? formatDateInTimezone(order.createdAt, tenantSettings?.timezone) : '-'}
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px' }}>
                          <button 
                            type="button"
                            onClick={() => {
                              setIsHistoryModalOpen(false);
                              navigate(`/kanban?orderId=${order.id}`);
                            }}
                            className="btn btn-primary btn-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '0.78rem', height: '28px' }}
                          >
                            Открыть сделку <ArrowRight size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </Sheet>

      {/* Local Passport OCR Scanner Modal */}
      <PassportScannerModal
        isOpen={isPassportScannerOpen}
        onClose={() => setIsPassportScannerOpen(false)}
        showInstallationAddressOption={false}
        onApply={(result: PassportApplyResult) => {
          setFormData(prev => ({
            ...prev,
            name: result.name || prev.name,
            birthDate: result.birthDate || prev.birthDate,
            passportSeriesNumber: result.passportSeriesNumber || prev.passportSeriesNumber,
            passportIssuedBy: result.passportIssuedBy || prev.passportIssuedBy,
            passportIssuedDate: result.passportIssuedDate || prev.passportIssuedDate,
            passportDepartmentCode: result.passportDepartmentCode || prev.passportDepartmentCode,
            registrationAddress: result.registrationAddress || prev.registrationAddress
          }));
        }}
      />

    </div>
  );
};
