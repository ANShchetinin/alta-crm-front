import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Search, Plus, Edit2, Trash2, Camera, X, User, Crop } from 'lucide-react';
import type { Employee } from '../api/employees';
import { getEmployees, createEmployee, updateEmployee, deleteEmployee } from '../api/employees';
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
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  
  const [formData, setFormData] = useState({ 
    name: '', 
    phone: '', 
    position: '',
    avatarUrl: ''
  });

  const [rawImageToCrop, setRawImageToCrop] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const data = await getEmployees();
      setEmployees(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.phone && c.phone.includes(search)) ||
    (c.position && c.position.toLowerCase().includes(search.toLowerCase()))
  );

  const openAddModal = () => {
    setEditingEmployee(null);
    setFormData({ name: '', phone: '+7', position: '', avatarUrl: '' });
    setRawImageToCrop(null);
    setIsModalOpen(true);
  };

  const openEditModal = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({ 
      name: employee.name, 
      phone: employee.phone || '', 
      position: employee.position || '',
      avatarUrl: employee.avatarUrl || ''
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
    // Reset file input value so selecting the same file triggers onChange again
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingEmployee) {
        await updateEmployee(editingEmployee.id, {
          name: formData.name,
          phone: formData.phone,
          position: formData.position,
          avatarUrl: formData.avatarUrl || undefined
        });
      } else {
        await createEmployee({
          name: formData.name,
          phone: formData.phone,
          position: formData.position,
          avatarUrl: formData.avatarUrl || undefined
        });
      }

      setIsModalOpen(false);
      fetchEmployees();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Вы уверены, что хотите удалить этого сотрудника?')) {
      try {
        await deleteEmployee(id);
        fetchEmployees();
      } catch (err) {
        console.error(err);
      }
    }
  };

  if (loading) {
    return <div className="p-8" style={{ color: 'var(--text-secondary)' }}>Загрузка...</div>;
  }

  return (
    <div className="clients-wrapper">
      <div className="clients-header">
        <h1>{t('employees.title') || 'Сотрудники'}</h1>
        
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
              <th style={{textAlign: 'right'}}>{t('employees.columns.actions') || 'Действия'}</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={4} style={{textAlign: 'center', opacity: 0.5, padding: '32px'}}>
                  Сотрудники не найдены.
                </td>
              </tr>
            ) : (
              filteredEmployees.map(employee => (
                <tr key={employee.id}>
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
                        <div className="client-name" style={{ fontWeight: 600, fontSize: '0.95rem' }}>{employee.name}</div>
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
                    <div className="client-actions" style={{ justifyContent: 'flex-end' }}>
                      <button 
                        onClick={() => openEditModal(employee)}
                        className="action-btn"
                        title="Редактировать"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(employee.id)}
                        className="action-btn delete"
                        title="Удалить"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
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
          <div className="modal-content" style={{ maxWidth: '480px' }}>
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
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div className="modal-body">
                
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
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.4rem',
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
                      formData.name ? getEmployeeInitials(formData.name) : <User size={34} />
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
                        <Camera size={14} /> {formData.avatarUrl ? 'Заменить фото' : 'Выбрать фото'}
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
                            <X size={14} /> Удалить
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label>{t('employees.modal.name') || 'ФИО'}</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Иван Иванов"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
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
              <div className="modal-actions">
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

