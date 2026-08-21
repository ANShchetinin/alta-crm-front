import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { 
  Search, Plus, Edit2, Trash2, FileText, ArrowRight, Phone, X, 
  ChevronDown, Tag, Building2, User, MapPin, CreditCard, Users, PlusCircle
} from 'lucide-react';
import type { Client, ClientContact } from '../api/clients';
import { getClients, createClient, updateClient, deleteClient } from '../api/clients';
import type { Order, OrderStatus } from '../api/kanban';
import { getOrdersByClient, getOrderStatuses, moveOrder } from '../api/kanban';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { formatDateInTimezone } from '../utils/dateUtils';
import '../styles/clients.css';

export const PRESET_LEAD_SOURCES = [
  'Авито',
  'Сайт',
  'Рекомендация',
  'ВКонтакте',
  'Яндекс',
  '2ГИС',
  'Офис продаж',
  'Telegram',
  'Звонок / Вывеска',
  'Повторный клиент',
  'Партнер'
];

export const PRESET_VAT_STATUSES = [
  { value: 'NO_VAT', label: 'Без НДС (УСН / Патент)' },
  { value: 'VAT_20', label: 'НДС 20%' },
  { value: 'VAT_10', label: 'НДС 10%' },
  { value: 'VAT_5', label: 'НДС 5%' },
  { value: 'VAT_7', label: 'НДС 7%' }
];

export const Clients = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { tenantSettings } = useAppStore();
  const [clients, setClients] = useState<Client[]>([]);
  const [statuses, setStatuses] = useState<OrderStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [clientTypeFilter, setClientTypeFilter] = useState<'ALL' | 'INDIVIDUAL' | 'LEGAL_ENTITY'>('ALL');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyClient, setHistoryClient] = useState<Client | null>(null);
  const [clientHistory, setClientHistory] = useState<Order[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    clientType: 'INDIVIDUAL' as 'INDIVIDUAL' | 'LEGAL_ENTITY',
    name: '',
    legalName: '',
    phone: '',
    birthDate: '',
    passportSeriesNumber: '',
    passportIssuedBy: '',
    passportIssuedDate: '',
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
    customLeadSource: ''
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const [data, statusesData] = await Promise.all([
        getClients(),
        getOrderStatuses()
      ]);
      setClients(data);
      setStatuses(statusesData.sort((a, b) => a.sortOrder - b.sortOrder));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(c => {
    const type = c.clientType || 'INDIVIDUAL';
    if (clientTypeFilter !== 'ALL' && type !== clientTypeFilter) {
      return false;
    }
    
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();

    return (
      c.name.toLowerCase().includes(q) ||
      (c.legalName && c.legalName.toLowerCase().includes(q)) ||
      c.phone.includes(q) ||
      (c.inn && c.inn.includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.contactPerson && c.contactPerson.toLowerCase().includes(q)) ||
      (c.leadSource && c.leadSource.toLowerCase().includes(q)) ||
      (c.passportSeriesNumber && c.passportSeriesNumber.includes(q)) ||
      (c.contacts && c.contacts.some(cnt => cnt.name.toLowerCase().includes(q) || (cnt.phone && cnt.phone.includes(q))))
    );
  });

  const openAddModal = (type: 'INDIVIDUAL' | 'LEGAL_ENTITY' = 'INDIVIDUAL') => {
    setEditingClient(null);
    setFormData({
      clientType: type,
      name: '',
      legalName: '',
      phone: '+7',
      birthDate: '',
      passportSeriesNumber: '',
      passportIssuedBy: '',
      passportIssuedDate: '',
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
      customLeadSource: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    const source = client.leadSource || '';
    const isPreset = PRESET_LEAD_SOURCES.includes(source);
    setFormData({
      clientType: client.clientType || 'INDIVIDUAL',
      name: client.name || '',
      legalName: client.legalName || '',
      phone: client.phone || '',
      birthDate: client.birthDate || '',
      passportSeriesNumber: client.passportSeriesNumber || '',
      passportIssuedBy: client.passportIssuedBy || '',
      passportIssuedDate: client.passportIssuedDate || '',
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
      customLeadSource: !isPreset && source ? source : ''
    });
    setIsModalOpen(true);
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
        name: formData.name.trim(),
        legalName: formData.legalName.trim() || undefined,
        phone: formData.phone.trim(),
        birthDate: formData.birthDate.trim() || undefined,
        passportSeriesNumber: formData.passportSeriesNumber.trim() || undefined,
        passportIssuedBy: formData.passportIssuedBy.trim() || undefined,
        passportIssuedDate: formData.passportIssuedDate.trim() || undefined,
        registrationAddress: formData.registrationAddress.trim() || undefined,
        email: formData.email.trim() || undefined,
        inn: formData.inn.trim() || undefined,
        kpp: formData.kpp.trim() || undefined,
        ogrn: formData.ogrn.trim() || undefined,
        legalAddress: formData.legalAddress.trim() || undefined,
        actualAddress: formData.actualAddress.trim() || undefined,
        bankName: formData.bankName.trim() || undefined,
        bik: formData.bik.trim() || undefined,
        checkingAccount: formData.checkingAccount.trim() || undefined,
        correspondentAccount: formData.correspondentAccount.trim() || undefined,
        vatStatus: formData.vatStatus || undefined,
        contactPerson: formData.contactPerson.trim() || (validContacts.find(c => c.isPrimary)?.name || undefined),
        contactPosition: formData.contactPosition.trim() || (validContacts.find(c => c.isPrimary)?.position || undefined),
        contacts: validContacts.length > 0 ? validContacts : undefined,
        leadSource: finalLeadSource || undefined
      };

      if (editingClient) {
        await updateClient(editingClient.id, payload);
      } else {
        await createClient(payload);
      }
      setIsModalOpen(false);
      fetchClients();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Вы уверены, что хотите удалить клиента?')) {
      try {
        await deleteClient(id);
        fetchClients();
      } catch (err) {
        console.error(err);
      }
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

      {/* Table */}
      <div className="clients-table-container glass-panel">
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
                  <tr key={client.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <div style={{
                          padding: '6px',
                          borderRadius: '8px',
                          background: isLegal ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                          color: isLegal ? 'var(--accent-primary)' : 'var(--text-secondary)',
                          marginTop: '2px',
                          flexShrink: 0
                        }}>
                          {isLegal ? <Building2 size={16} /> : <User size={16} />}
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
                            href={`tel:${client.phone}`} 
                            title="Позвонить"
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
                      <div className="client-actions">
                        {client.phone && (
                          <a 
                            href={`tel:${client.phone}`}
                            className="action-btn"
                            style={{ color: 'var(--success)' }}
                            title="Позвонить клиенту"
                          >
                            <Phone size={16} />
                          </a>
                        )}
                        <button 
                          onClick={() => openHistoryModal(client)}
                          className="action-btn"
                          title="История заявок"
                        >
                          <FileText size={16} />
                        </button>
                        <button 
                          onClick={() => openEditModal(client)}
                          className="action-btn"
                          title={t('clients.modal.editTitle')}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(client.id)}
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

      {/* Modal Overlay */}
      {isModalOpen && createPortal(
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: formData.clientType === 'LEGAL_ENTITY' ? '680px' : '480px', width: '95%' }}>
            <div className="modal-header">
              <h2>{editingClient ? t('clients.modal.editTitle') : (formData.clientType === 'LEGAL_ENTITY' ? 'Новая компания / Юрлицо' : t('clients.modal.addTitle'))}</h2>
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                className="btn-icon"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div className="modal-body">
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
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileText size={16} /> Данные для договора (необязательно)
                      </h4>
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
              </div>

              <div className="modal-actions">
                <div className="modal-action-btns">
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
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* History Modal Overlay */}
      {isHistoryModalOpen && historyClient && createPortal(
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px', width: '90%' }}>
            <div className="modal-header">
              <h2>История заявок: {historyClient.name}</h2>
              <button 
                type="button" 
                onClick={() => setIsHistoryModalOpen(false)}
                className="btn-icon"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              {loadingHistory ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>Загрузка истории...</div>
              ) : (
                <div className="clients-table-container glass-panel" style={{ maxHeight: '400px', overflowY: 'auto' }}>
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
                                  onClick={() => {
                                    setIsHistoryModalOpen(false);
                                    navigate(`/?orderId=${order.id}`);
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
              )}
            </div>
            <div className="modal-actions">
              <button 
                type="button" 
                onClick={() => setIsHistoryModalOpen(false)}
                className="btn btn-primary"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
