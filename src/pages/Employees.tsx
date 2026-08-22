import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Search, Plus, Edit2, Trash2, Camera, X, User, Crop, Key, Shield, CheckSquare, Square, Eye, EyeOff, FileText, Wallet } from 'lucide-react';
import type { Employee } from '../api/employees';
import { getEmployees, createEmployee, updateEmployee, deleteEmployee } from '../api/employees';
import { getOrderStatuses } from '../api/kanban';
import type { OrderStatus } from '../api/kanban';
import { ImageCropModal } from '../components/ImageCropModal';
import '../styles/clients.css';

export const getEmployeeInitials = (name: string): string => {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
};

export const getAvatarGradient = (str: string): string => {
  if (!str) return 'linear-gradient(135deg, #3b82f6, #1d4ed8)';
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const colors = [
    'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    'linear-gradient(135deg, #10b981, #047857)',
    'linear-gradient(135deg, #8b5cf6, #6d28d9)',
    'linear-gradient(135deg, #f59e0b, #b45309)',
    'linear-gradient(135deg, #ec4899, #be185d)',
    'linear-gradient(135deg, #06b6d4, #0e7490)',
    'linear-gradient(135deg, #6366f1, #4338ca)',
  ];
  return colors[Math.abs(hash) % colors.length];
};

export const Employees = () => {
  const { t } = useTranslation();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [statuses, setStatuses] = useState<OrderStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({ 
    name: '', 
    phone: '', 
    position: '',
    avatarUrl: '',
    birthDate: '',
    passportSeriesNumber: '',
    passportIssuedBy: '',
    passportIssuedDate: '',
    passportDepartmentCode: '',
    registrationAddress: '',
    hasAccount: false,
    email: '',
    password: '',
    allowedStatusIds: [] as number[]
  });

  const [rawImageToCrop, setRawImageToCrop] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [empData, statusData] = await Promise.all([
        getEmployees(),
        getOrderStatuses().catch(() => [] as OrderStatus[])
      ]);
      setEmployees(empData);
      setStatuses(statusData);
    } catch (err) {
      console.error('Failed to load initial data', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeesList = async () => {
    try {
      const data = await getEmployees();
      setEmployees(data);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredEmployees = employees.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.phone && c.phone.includes(search)) ||
    (c.position && c.position.toLowerCase().includes(search.toLowerCase())) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
    (c.passportSeriesNumber && c.passportSeriesNumber.includes(search)) ||
    (c.registrationAddress && c.registrationAddress.toLowerCase().includes(search.toLowerCase()))
  );

  const openAddModal = () => {
    setEditingEmployee(null);
    setShowPassword(false);
    setFormData({ 
      name: '', 
      phone: '+7', 
      position: '', 
      avatarUrl: '',
      birthDate: '',
      passportSeriesNumber: '',
      passportIssuedBy: '',
      passportIssuedDate: '',
      passportDepartmentCode: '',
      registrationAddress: '',
      hasAccount: false,
      email: '',
      password: '',
      allowedStatusIds: [],
      canViewFinances: false
    });
    setRawImageToCrop(null);
    setIsModalOpen(true);
  };

  const openEditModal = (employee: Employee) => {
    setEditingEmployee(employee);
    setShowPassword(false);
    setFormData({ 
      name: employee.name, 
      phone: employee.phone || '', 
      position: employee.position || '',
      avatarUrl: employee.avatarUrl || '',
      birthDate: employee.birthDate || '',
      passportSeriesNumber: employee.passportSeriesNumber || '',
      passportIssuedBy: employee.passportIssuedBy || '',
      passportIssuedDate: employee.passportIssuedDate || '',
      passportDepartmentCode: employee.passportDepartmentCode || '',
      registrationAddress: employee.registrationAddress || '',
      hasAccount: !!employee.hasAccount,
      email: employee.email || '',
      password: '',
      allowedStatusIds: employee.allowedStatusIds || [],
      canViewFinances: !!employee.canViewFinances
    });
    setRawImageToCrop(null);
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setRawImageToCrop(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleCropComplete = (croppedDataUrl: string) => {
    setFormData(prev => ({ ...prev, avatarUrl: croppedDataUrl }));
    setRawImageToCrop(null);
  };

  const handleRemoveAvatar = () => {
    setRawImageToCrop(null);
    setFormData(prev => ({ ...prev, avatarUrl: '' }));
  };

  const toggleStatusSelection = (statusId: number) => {
    setFormData(prev => {
      const exists = prev.allowedStatusIds.includes(statusId);
      const next = exists 
        ? prev.allowedStatusIds.filter(id => id !== statusId)
        : [...prev.allowedStatusIds, statusId];
      return { ...prev, allowedStatusIds: next };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: Partial<Employee> = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        position: formData.position.trim(),
        avatarUrl: formData.avatarUrl || undefined,
        birthDate: formData.birthDate.trim() || undefined,
        passportSeriesNumber: formData.passportSeriesNumber.trim() || undefined,
        passportIssuedBy: formData.passportIssuedBy.trim() || undefined,
        passportIssuedDate: formData.passportIssuedDate.trim() || undefined,
        passportDepartmentCode: formData.passportDepartmentCode.trim() || undefined,
        registrationAddress: formData.registrationAddress.trim() || undefined,
        allowedStatusIds: formData.allowedStatusIds
      };

      if (formData.hasAccount) {
        if (!formData.email.trim()) {
          alert('Пожалуйста, укажите Email (логин) для доступа в систему');
          return;
        }
        payload.email = formData.email.trim();
        if (formData.password.trim()) {
          payload.password = formData.password.trim();
        } else if (!editingEmployee?.hasAccount) {
          alert('Пожалуйста, укажите пароль для нового аккаунта сотрудника');
          return;
        }
      }

      if (editingEmployee) {
        await updateEmployee(editingEmployee.id, payload);
      } else {
        await createEmployee(payload);
      }

      setIsModalOpen(false);
      fetchEmployeesList();
    } catch (err: any) {
      console.error(err);
      alert('Ошибка при сохранении сотрудника: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Вы уверены, что хотите удалить этого сотрудника? Если у него была учетная запись, она также будет удалена.')) {
      try {
        await deleteEmployee(id);
        fetchEmployeesList();
      } catch (err: any) {
        console.error(err);
        alert('Ошибка при удалении: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  if (loading) {
    return <div className="p-8" style={{ color: 'var(--text-secondary)' }}>Загрузка...</div>;
  }

  return (
    <div className="clients-wrapper">
      <div className="clients-header">
        <div>
          <h1>{t('employees.title') || 'Сотрудники'}</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Управление персоналом, выдача учетных записей и настройка прав доступа к заявкам
          </p>
        </div>
        
        <div className="clients-actions">
          <div className="search-input-wrapper">
            <Search className="search-icon" size={18} />
            <input 
              type="text" 
              placeholder={t('employees.search') || 'Поиск сотрудников...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
          </div>
          <button onClick={openAddModal} className="btn btn-primary">
            <Plus size={18} />
            <span>{t('employees.addEmployee') || 'Добавить сотрудника'}</span>
          </button>
        </div>
      </div>

      <div className="clients-table-container glass-panel">
        <table className="clients-table">
          <thead>
            <tr>
              <th>{t('employees.columns.name') || 'Сотрудник'}</th>
              <th>{t('employees.columns.position') || 'Должность'}</th>
              <th>{t('employees.columns.phone') || 'Телефон'}</th>
              <th>Доступ в CRM</th>
              <th>Разрешенные статусы</th>
              <th style={{textAlign: 'right'}}>{t('employees.columns.actions') || 'Действия'}</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={6} style={{textAlign: 'center', opacity: 0.5, padding: '32px'}}>
                  Сотрудники не найдены.
                </td>
              </tr>
            ) : (
              filteredEmployees.map(employee => {
                const allowedStatusNames = statuses
                  .filter(s => employee.allowedStatusIds?.includes(s.id))
                  .map(s => s.name);

                return (
                  <tr 
                    key={employee.id}
                    onClick={() => openEditModal(employee)}
                    style={{ cursor: 'pointer' }}
                    className="client-row-hover"
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '50%',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.95rem',
                          fontWeight: 700,
                          color: '#fff',
                          background: employee.avatarUrl ? 'transparent' : getAvatarGradient(employee.name),
                          border: '2px solid rgba(255, 255, 255, 0.12)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                          flexShrink: 0
                        }}>
                          {employee.avatarUrl ? (
                            <img 
                              src={employee.avatarUrl} 
                              alt={employee.name} 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            />
                          ) : (
                            getEmployeeInitials(employee.name)
                          )}
                        </div>
                        <div>
                          <div className="client-name" style={{ fontWeight: 600, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{employee.name}</span>
                            {employee.passportSeriesNumber && (
                              <span 
                                title={`Паспорт: ${employee.passportSeriesNumber}${employee.birthDate ? ', Д.Р.: ' + employee.birthDate : ''}${employee.registrationAddress ? ', Прописка: ' + employee.registrationAddress : ''}`} 
                                style={{ 
                                  display: 'inline-flex', 
                                  alignItems: 'center', 
                                  gap: '4px', 
                                  fontSize: '0.72rem', 
                                  color: '#38bdf8', 
                                  background: 'rgba(56, 189, 248, 0.12)', 
                                  border: '1px solid rgba(56, 189, 248, 0.25)', 
                                  padding: '1px 6px', 
                                  borderRadius: '6px',
                                  cursor: 'default'
                                }}
                              >
                                <FileText size={11} /> Паспорт
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="client-phone">{employee.position || '—'}</div>
                    </td>
                    <td>
                      <div className="client-phone">{employee.phone || '—'}</div>
                    </td>
                    <td>
                      {employee.hasAccount ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '12px', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#4ade80', fontSize: '0.8rem', fontWeight: 600 }}>
                          <Key size={13} />
                          <span>{employee.email || 'Активен'}</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Без доступа</span>
                      )}
                    </td>
                    <td>
                      {allowedStatusNames.length > 0 ? (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '280px' }}>
                          {allowedStatusNames.map((name, idx) => (
                            <span key={idx} style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', color: '#a5b4fc', fontWeight: 500 }}>
                              {name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Все статусы</span>
                      )}
                    </td>
                    <td>
                      <div className="client-actions" style={{ justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); openEditModal(employee); }}
                          className="action-btn"
                          title="Редактировать сотрудника и права"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDelete(employee.id); }}
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

      {/* Image Crop Modal */}
      {rawImageToCrop && (
        <ImageCropModal
          imageSrc={rawImageToCrop}
          onCrop={handleCropComplete}
          onClose={() => setRawImageToCrop(null)}
        />
      )}

      {/* Modal Overlay */}
      {isModalOpen && createPortal(
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '540px', maxHeight: '90vh' }}>
            <div className="modal-header">
              <h2>{editingEmployee ? (t('employees.modal.editTitle') || 'Редактировать сотрудника') : (t('employees.modal.addTitle') || 'Добавить сотрудника')}</h2>
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                className="btn-icon"
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <div className="modal-body" style={{ overflowY: 'auto', paddingRight: '6px' }}>
                
                {/* Аватарка */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '18px',
                  padding: '14px 16px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '16px'
                }}>
                  <div style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.3rem',
                    fontWeight: 700,
                    color: '#fff',
                    background: formData.avatarUrl ? 'transparent' : getAvatarGradient(formData.name || 'Сотрудник'),
                    border: '2.5px solid rgba(255, 255, 255, 0.18)',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
                    flexShrink: 0
                  }}>
                    {formData.avatarUrl ? (
                      <img 
                        src={formData.avatarUrl} 
                        alt="Avatar preview" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                    ) : (
                      formData.name ? getEmployeeInitials(formData.name) : <User size={30} />
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Фотография сотрудника</div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        accept="image/*" 
                        style={{ display: 'none' }} 
                        onChange={handleFileChange} 
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="btn btn-sm btn-ghost"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '6px 12px' }}
                      >
                        <Camera size={14} /> {formData.avatarUrl ? 'Заменить' : 'Выбрать фото'}
                      </button>
                      {formData.avatarUrl && (
                        <>
                          <button
                            type="button"
                            onClick={() => setRawImageToCrop(formData.avatarUrl)}
                            className="btn btn-sm btn-ghost"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', padding: '6px 10px' }}
                            title="Кадрировать"
                          >
                            <Crop size={14} /> Кадрировать
                          </button>
                          <button
                            type="button"
                            onClick={handleRemoveAvatar}
                            className="btn btn-sm"
                            style={{
                              background: 'rgba(239, 68, 68, 0.15)',
                              color: 'var(--danger)',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.8rem',
                              padding: '6px 10px'
                            }}
                          >
                            <X size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label>{t('employees.modal.name') || 'ФИО'} <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input 
                    type="text" 
                    required
                    placeholder="Иван Иванов"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label>{t('employees.modal.position') || 'Должность'}</label>
                    <input 
                      type="text" 
                      placeholder="Монтажник / Замерщик"
                      value={formData.position}
                      onChange={(e) => setFormData({...formData, position: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('employees.modal.phone') || 'Телефон'}</label>
                    <input 
                      type="text" 
                      placeholder="+7 (999) 000-00-00"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                </div>

                {/* Блок Паспортных данных сотрудника */}
                <div style={{
                  marginTop: '16px',
                  padding: '16px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-md)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <FileText size={16} style={{ color: '#38bdf8' }} />
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>Паспортные данные</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.8rem' }}>Серия и номер паспорта</label>
                      <input 
                        type="text" 
                        placeholder="6305 123456"
                        value={formData.passportSeriesNumber}
                        onChange={(e) => setFormData({ ...formData, passportSeriesNumber: e.target.value })}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.8rem' }}>Дата рождения</label>
                      <input 
                        type="date" 
                        value={formData.birthDate}
                        onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.8rem' }}>Дата выдачи паспорта</label>
                      <input 
                        type="date" 
                        value={formData.passportIssuedDate}
                        onChange={(e) => setFormData({ ...formData, passportIssuedDate: e.target.value })}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.8rem' }}>Код подразделения</label>
                      <input 
                        type="text" 
                        placeholder="640-001"
                        value={formData.passportDepartmentCode}
                        onChange={(e) => setFormData({ ...formData, passportDepartmentCode: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginTop: '12px', marginBottom: 0 }}>
                    <label style={{ fontSize: '0.8rem' }}>Кем выдан паспорт</label>
                    <input 
                      type="text" 
                      placeholder="Отделом УФМС России по Саратовской обл."
                      value={formData.passportIssuedBy}
                      onChange={(e) => setFormData({ ...formData, passportIssuedBy: e.target.value })}
                    />
                  </div>

                  <div className="form-group" style={{ marginTop: '12px', marginBottom: 0 }}>
                    <label style={{ fontSize: '0.8rem' }}>Адрес регистрации (прописка)</label>
                    <textarea 
                      rows={2}
                      placeholder="г. Саратов, ул. Московская, д. 10, кв. 25"
                      value={formData.registrationAddress}
                      onChange={(e) => setFormData({ ...formData, registrationAddress: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--glass-border)',
                        color: 'var(--text-main)',
                        fontSize: '0.875rem',
                        resize: 'vertical',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* Блок Учетной записи в CRM */}
                <div style={{
                  marginTop: '18px',
                  padding: '16px',
                  background: 'rgba(99, 102, 241, 0.05)',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  borderRadius: 'var(--radius-md)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: formData.hasAccount ? '14px' : 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Key size={17} style={{ color: '#818cf8' }} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>Доступ в CRM (роль Исполнитель)</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Сотрудник сможет входить в систему и видеть только свои заявки</div>
                      </div>
                    </div>
                    <label style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={formData.hasAccount} 
                        onChange={(e) => setFormData({ ...formData, hasAccount: e.target.checked })}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                    </label>
                  </div>

                  {formData.hasAccount && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '0.8rem' }}>Email для входа (Логин) <span style={{ color: 'var(--danger)' }}>*</span></label>
                        <input 
                          type="email" 
                          required={formData.hasAccount}
                          placeholder="worker@company.ru"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
                          <span>{editingEmployee?.hasAccount ? 'Новый пароль (опционально)' : 'Пароль учетной записи *'}</span>
                        </label>
                        <div style={{ position: 'relative' }}>
                          <input 
                            type={showPassword ? 'text' : 'password'}
                            required={formData.hasAccount && !editingEmployee?.hasAccount}
                            placeholder={editingEmployee?.hasAccount ? 'Оставьте пустым, чтобы не менять' : 'Минимум 6 символов'}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            style={{ paddingRight: '40px' }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{
                              position: 'absolute',
                              right: '10px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Блок разрешенных статусов заявок */}
                <div style={{
                  marginTop: '16px',
                  padding: '16px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-md)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Shield size={16} style={{ color: '#60a5fa' }} />
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>Разрешенные статусы Канбана</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                    Выберите статусы/колонки, которые будут видны сотруднику. Если ничего не выбрано, сотрудник увидит заявки во всех статусах, где он назначен.
                  </div>

                  {statuses.length === 0 ? (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Статусы заявок не найдены</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {statuses.map(status => {
                        const isSelected = formData.allowedStatusIds.includes(status.id);
                        return (
                          <div 
                            key={status.id}
                            onClick={() => toggleStatusSelection(status.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '8px 10px',
                              borderRadius: '8px',
                              background: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                              border: isSelected ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {isSelected ? (
                              <CheckSquare size={16} style={{ color: '#60a5fa', flexShrink: 0 }} />
                            ) : (
                              <Square size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                              <span 
                                style={{ 
                                  width: '8px', 
                                  height: '8px', 
                                  borderRadius: '50%', 
                                  background: status.color || '#6366f1',
                                  flexShrink: 0 
                                }} 
                              />
                              <span style={{ fontSize: '0.82rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {status.name}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Блок Доступа к разделу Финансы */}
                <div style={{
                  marginTop: '16px',
                  padding: '16px',
                  background: 'rgba(34, 197, 94, 0.05)',
                  border: '1px solid rgba(34, 197, 94, 0.2)',
                  borderRadius: 'var(--radius-md)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Wallet size={18} style={{ color: '#4ade80', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>Доступ к разделу «Финансы»</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Разрешить сотруднику (менеджеру) просмотр кассы, оплат, дебиторки и расходов</div>
                      </div>
                    </div>
                    <label style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={formData.canViewFinances} 
                        onChange={(e) => setFormData({ ...formData, canViewFinances: e.target.checked })}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                    </label>
                  </div>
                </div>

              </div>
              <div className="modal-actions" style={{ padding: '16px', borderTop: '1px solid var(--glass-border)' }}>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-ghost"
                >
                  {t('employees.modal.cancel') || 'Отмена'}
                </button>
                <button type="submit" className="btn btn-primary">
                  {t('employees.modal.save') || 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
