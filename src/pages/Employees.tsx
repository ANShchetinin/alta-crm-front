import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Plus, Edit2, Trash2 } from 'lucide-react';
import type { Employee } from '../api/employees';
import { getEmployees, createEmployee, updateEmployee, deleteEmployee } from '../api/employees';
import '../styles/clients.css'; // We can reuse clients.css for layout

export const Employees = () => {
  const { t } = useTranslation();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  
  const [formData, setFormData] = useState({ name: '', phone: '', position: '' });

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
    setFormData({ name: '', phone: '+7', position: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({ name: employee.name, phone: employee.phone || '', position: employee.position || '' });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingEmployee) {
        await updateEmployee(editingEmployee.id, formData);
      } else {
        await createEmployee(formData);
      }
      setIsModalOpen(false);
      fetchEmployees();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure?')) {
      try {
        await deleteEmployee(id);
        fetchEmployees();
      } catch (err) {
        console.error(err);
      }
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
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
              <th>{t('employees.columns.name') || 'Имя'}</th>
              <th>{t('employees.columns.position') || 'Должность'}</th>
              <th>{t('employees.columns.phone') || 'Телефон'}</th>
              <th style={{textAlign: 'right'}}>{t('employees.columns.actions') || 'Действия'}</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={4} style={{textAlign: 'center', opacity: 0.5}}>
                  Сотрудники не найдены.
                </td>
              </tr>
            ) : (
              filteredEmployees.map(employee => (
                <tr key={employee.id}>
                  <td>
                    <div className="client-name">{employee.name}</div>
                  </td>
                  <td>
                    <div className="client-phone">{employee.position || '-'}</div>
                  </td>
                  <td>
                    <div className="client-phone">{employee.phone || '-'}</div>
                  </td>
                  <td>
                    <div className="client-actions">
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

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{editingEmployee ? (t('employees.modal.editTitle') || 'Редактировать сотрудника') : (t('employees.modal.addTitle') || 'Добавить сотрудника')}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>{t('employees.modal.name') || 'ФИО'}</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>{t('employees.modal.position') || 'Должность'}</label>
                <input 
                  type="text" 
                  value={formData.position}
                  onChange={(e) => setFormData({...formData, position: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>{t('employees.modal.phone') || 'Телефон'}</label>
                <input 
                  type="text" 
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
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
        </div>
      )}
    </div>
  );
};
