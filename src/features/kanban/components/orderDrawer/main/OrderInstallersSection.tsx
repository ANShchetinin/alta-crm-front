import React, { useState } from 'react';
import { Plus, Trash2, Wrench } from 'lucide-react';
import type { OrderInstaller } from '../../../../../api/kanban';
import type { Employee } from '../../../../../api/employees';
import { toast } from '../../../../../utils/toast';
import { EmployeeSearchSelect } from '../../EmployeeSearchSelect';
import {
  addInstaller,
  distributeInstallerAmounts,
  leadInstallerFields,
  removeInstaller,
  setInstallerAmount
} from '../../../utils/installers';
import type { SetOrderFormData } from '../../../utils/orderForm';
import { formatPhone } from '../../../../../utils/phone';

interface OrderInstallersSectionProps {
  installers: OrderInstaller[];
  installationPrice: string;
  setFormData: SetOrderFormData;
  employees: Employee[];
  isWorker: boolean;
}

/**
 * Монтажники заказа и распределение между ними стоимости монтажа (поровну или фиксированными суммами).
 */
export const OrderInstallersSection: React.FC<OrderInstallersSectionProps> = ({
  installers,
  installationPrice,
  setFormData,
  employees,
  isWorker
}) => {
  const [isAddingInstaller, setIsAddingInstaller] = useState(false);
  const totalInstPrice = parseFloat(installationPrice || '0') || 0;

  const handleAddInstaller = (employeeId: string) => {
    const emp = employees.find(e => e.id === parseInt(employeeId));
    if (!emp) {
      return;
    }
    if (installers.some(i => i.employeeId === emp.id)) {
      toast.info('Этот монтажник уже добавлен в заказ');
      return;
    }
    setFormData(prev => ({ ...prev, ...leadInstallerFields(addInstaller(installers, emp, totalInstPrice)) }));
  };

  const handleRemoveInstaller = (index: number) => {
    setFormData(prev => ({ ...prev, ...leadInstallerFields(removeInstaller(installers, index, totalInstPrice)) }));
  };

  const handleUpdateInstallerAmount = (index: number, amount: string) => {
    setFormData(prev => ({ ...prev, installers: setInstallerAmount(installers, index, parseFloat(amount) || 0, totalInstPrice) }));
  };

  const handleEqualizeInstallers = () => {
    setFormData(prev => ({ ...prev, installers: distributeInstallerAmounts(installers, totalInstPrice, true) }));
    toast.success('Оплата монтажа разделена поровну между монтажниками');
  };

  return (
    <div style={{
      marginBottom: '16px',
      padding: '14px',
      background: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid var(--glass-border)',
      borderRadius: 'var(--radius-md)',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }}>
      {/* Шапка блока */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', fontWeight: 600, margin: 0 }}>
            <Wrench size={16} style={{ color: '#22c55e' }} />
            Монтажники
          </label>
          {installers.length > 0 && (
            <span style={{
              fontSize: '0.75rem',
              background: 'rgba(34, 197, 94, 0.12)',
              color: '#22c55e',
              padding: '1px 8px',
              borderRadius: '10px',
              fontWeight: 600
            }}>
              {installers.length} {installers.length === 1 ? 'монтажник' : 'монтажника'}
            </span>
          )}
        </div>

        {!isWorker && installers.length > 1 && (
          <button
            type="button"
            onClick={handleEqualizeInstallers}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
              fontSize: '0.78rem',
              padding: '4px 10px',
              cursor: 'pointer',
              fontWeight: 500
            }}
            title="Разделить общую стоимость монтажа поровну"
          >
            ⚖️ Поровну
          </button>
        )}
      </div>

      {/* Список монтажников */}
      {installers.length === 0 ? (
        <div style={{
          padding: '12px',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px dashed var(--glass-border)',
          borderRadius: 'var(--radius-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Монтажники не назначены
          </div>
          {!isWorker && (
            <EmployeeSearchSelect
              value=""
              employees={employees}
              onChange={(val) => {
                if (val) {
                  handleAddInstaller(val);
                }
              }}
              placeholder="+ Назначить монтажника..."
              icon={<Wrench size={15} style={{ color: '#22c55e' }} />}
              accentColor="#22c55e"
              isWorker={isWorker}
            />
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {installers.map((inst, idx) => {
            const emp = employees.find(e => e.id === inst.employeeId);
            const empName = inst.employeeName || emp?.name || `Монтажник #${inst.employeeId}`;
            const avatarUrl = inst.employeeAvatarUrl || emp?.avatarUrl;

            return (
              <div
                key={inst.employeeId || idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  padding: '8px 12px',
                  background: 'var(--card-bg, rgba(255, 255, 255, 0.03))',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-sm)',
                  flexWrap: 'wrap'
                }}
              >
                {/* Инфо о монтажнике */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '180px', flex: '1 1 200px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: avatarUrl ? 'transparent' : 'rgba(34, 197, 94, 0.2)',
                    color: '#22c55e',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    flexShrink: 0
                  }}>
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={empName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      empName.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {empName}
                    </span>
                    {(inst.employeePhone || emp?.phone) && (
                      <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                        {formatPhone(inst.employeePhone || emp?.phone)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Финансовая часть (Сумма и процент) */}
                {!isWorker ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        value={inst.amount != null ? inst.amount : ''}
                        onChange={(e) => handleUpdateInstallerAmount(idx, e.target.value)}
                        style={{
                          width: '100px',
                          height: '32px',
                          textAlign: 'right',
                          padding: '0 24px 0 8px',
                          background: 'var(--input-bg, rgba(255, 255, 255, 0.05))',
                          border: '1px solid var(--glass-border)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-primary)',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          outline: 'none'
                        }}
                      />
                      <span style={{ position: 'absolute', right: '8px', fontSize: '0.78rem', color: 'var(--text-secondary)', pointerEvents: 'none' }}>
                        ₽
                      </span>
                    </div>

                    <span style={{
                      fontSize: '0.76rem',
                      color: 'var(--text-secondary)',
                      minWidth: '45px',
                      textAlign: 'right',
                      fontWeight: 500
                    }}>
                      {inst.sharePercent != null ? `${inst.sharePercent}%` : ''}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleRemoveInstaller(idx)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        borderRadius: '4px'
                      }}
                      title="Удалить монтажника из заказа"
                    >
                      <Trash2 size={15} style={{ color: 'var(--text-secondary)' }} />
                    </button>
                  </div>
                ) : (
                  inst.amount != null && (
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#22c55e' }}>
                      {inst.amount.toLocaleString('ru-RU')} ₽
                    </div>
                  )
                )}
              </div>
            );
          })}

          {/* Кнопка добавления следующего монтажника */}
          {!isWorker && (
            <div style={{ marginTop: '4px' }}>
              {isAddingInstaller ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <EmployeeSearchSelect
                      value=""
                      employees={employees.filter(e => !installers.some(i => i.employeeId === e.id))}
                      onChange={(val) => {
                        if (val) {
                          handleAddInstaller(val);
                          setIsAddingInstaller(false);
                        }
                      }}
                      placeholder="Выберите монтажника для добавления..."
                      icon={<Wrench size={15} style={{ color: '#22c55e' }} />}
                      accentColor="#22c55e"
                      isWorker={isWorker}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddingInstaller(false)}
                    style={{
                      padding: '8px 12px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-secondary)',
                      fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                  >
                    Отмена
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingInstaller(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'transparent',
                    border: '1px dashed var(--glass-border)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#22c55e',
                    fontSize: '0.82rem',
                    padding: '6px 12px',
                    cursor: 'pointer',
                    fontWeight: 500,
                    width: 'fit-content'
                  }}
                >
                  <Plus size={14} /> Добавить еще монтажника
                </button>
              )}
            </div>
          )}

          {/* Сводка баланса распределения */}
          {!isWorker && installers.length > 1 && (() => {
            const totalDistributed = installers.reduce((sum, i) => sum + (i.amount || 0), 0);
            const diff = Math.round((totalInstPrice - totalDistributed) * 100) / 100;
            const hasDiff = Math.abs(diff) > 0.05;

            return (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px',
                background: hasDiff ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                border: hasDiff ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.78rem',
                marginTop: '2px',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                <span style={{ color: 'var(--text-secondary)' }}>
                  Сумма монтажа: <b>{totalInstPrice.toLocaleString('ru-RU')} ₽</b> • Распределено: <b>{totalDistributed.toLocaleString('ru-RU')} ₽</b>
                </span>
                {hasDiff && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#ef4444', fontWeight: 600 }}>
                      ⚠️ Разница: {diff > 0 ? `+${diff}` : diff} ₽
                    </span>
                    <button
                      type="button"
                      onClick={handleEqualizeInstallers}
                      style={{
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: 'none',
                        color: '#ef4444',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontSize: '0.74rem',
                        cursor: 'pointer',
                        fontWeight: 600
                      }}
                    >
                      Поровну
                    </button>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};
