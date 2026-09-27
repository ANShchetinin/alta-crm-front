import React from 'react';
import { Ruler, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Order } from '../../../../../api/kanban';
import type { Employee } from '../../../../../api/employees';
import { EmployeeSearchSelect } from '../../EmployeeSearchSelect';
import type { OrderFormData, SetOrderFormData } from '../../../utils/orderForm';

interface OrderStaffSectionProps {
  formData: OrderFormData;
  setFormData: SetOrderFormData;
  employees: Employee[];
  currentOrder: Order | null;
  isWorker: boolean;
}

/**
 * Назначение ответственного менеджера и замерщика.
 */
export const OrderStaffSection: React.FC<OrderStaffSectionProps> = ({ formData, setFormData, employees, currentOrder, isWorker }) => {
  const { t } = useTranslation();
  const selectEmployee = (field: 'assignee' | 'measurer') => (employeeId: string) => {
    const emp = employees.find(e => e.id.toString() === employeeId);
    setFormData(prev => ({
      ...prev,
      [`${field}Id`]: employeeId,
      [`${field}Name`]: emp?.name || '',
      [`${field}AvatarUrl`]: emp?.avatarUrl || ''
    }));
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: '12px',
      marginBottom: '14px',
      padding: '14px',
      background: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid var(--glass-border)',
      borderRadius: 'var(--radius-md)'
    }}>
      {/* 1. Ответственный */}
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
          <Users size={15} style={{ color: 'var(--accent-primary)' }} />
          {t('kanban.modal.assignee') || 'Ответственный'}
        </label>
        <EmployeeSearchSelect
          value={formData.assigneeId}
          employees={employees}
          onChange={selectEmployee('assignee')}
          placeholder={t('kanban.modal.selectAssignee') || 'Без ответственного'}
          icon={<Users size={15} style={{ color: 'var(--accent-primary)' }} />}
          accentColor="var(--accent-primary)"
          isWorker={isWorker}
          fallbackName={formData.assigneeName || currentOrder?.assigneeName}
          fallbackAvatarUrl={formData.assigneeAvatarUrl || currentOrder?.assigneeAvatarUrl}
        />
      </div>

      {/* 2. Замерщик */}
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
          <Ruler size={15} style={{ color: '#a855f7' }} />
          Замерщик
        </label>
        <EmployeeSearchSelect
          value={formData.measurerId}
          employees={employees}
          onChange={selectEmployee('measurer')}
          placeholder="Не назначен"
          icon={<Ruler size={15} style={{ color: '#a855f7' }} />}
          accentColor="#a855f7"
          isWorker={isWorker}
          fallbackName={formData.measurerName || currentOrder?.measurerName}
          fallbackAvatarUrl={formData.measurerAvatarUrl || currentOrder?.measurerAvatarUrl}
        />
      </div>
    </div>
  );
};
