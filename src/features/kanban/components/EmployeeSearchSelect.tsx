import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, ChevronDown, Check, X, Phone, User } from 'lucide-react';
import type { Employee } from '../../../api/employees';
import { getAvatarGradient, getEmployeeInitials } from '../../../utils/avatarUtils';

export interface EmployeeSearchSelectProps {
  value: string;
  employees: Employee[];
  onChange: (employeeId: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  accentColor?: string;
  isWorker?: boolean;
}

export const EmployeeSearchSelect: React.FC<EmployeeSearchSelectProps> = ({
  value,
  employees,
  onChange,
  placeholder = 'Не назначен',
  icon,
  accentColor = 'var(--accent-primary)',
  isWorker
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedEmployee = employees.find(e => e.id.toString() === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const filteredEmployees = useMemo(() => {
    if (!search.trim()) return employees;
    const q = search.toLowerCase().trim();
    return employees.filter(e => 
      e.name.toLowerCase().includes(q) ||
      (e.position && e.position.toLowerCase().includes(q)) ||
      (e.phone && e.phone.toLowerCase().includes(q))
    );
  }, [employees, search]);

  const mountTimeRef = useRef(Date.now());

  const handleOpen = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) e.stopPropagation();
    if (isWorker) return;
    if (Date.now() - mountTimeRef.current < 350) return;
    setIsOpen(!isOpen);
    if (!isOpen) {
      setSearch('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 60);
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Selected Card / Trigger Button */}
      <div
        onClick={handleOpen}
        style={{
          width: '100%',
          padding: '8px 12px',
          background: selectedEmployee ? 'rgba(255, 255, 255, 0.04)' : 'var(--input-bg)',
          border: isOpen ? `1px solid ${accentColor}` : '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-md)',
          cursor: isWorker ? 'default' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          transition: 'all var(--transition-fast)',
          boxShadow: isOpen ? `0 0 0 2px rgba(59, 130, 246, 0.2)` : 'none'
        }}
      >
        {selectedEmployee ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.72rem',
              fontWeight: 700,
              color: '#fff',
              background: selectedEmployee.avatarUrl ? 'transparent' : getAvatarGradient(selectedEmployee.name),
              border: '1px solid rgba(255, 255, 255, 0.18)',
              flexShrink: 0
            }}>
              {selectedEmployee.avatarUrl ? (
                <img src={selectedEmployee.avatarUrl} alt={selectedEmployee.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                getEmployeeInitials(selectedEmployee.name)
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
              <span style={{ fontWeight: 600, fontSize: '0.86rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedEmployee.name}
              </span>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {selectedEmployee.position && <span>{selectedEmployee.position}</span>}
                {selectedEmployee.phone && (
                  <a
                    href={`tel:${selectedEmployee.phone.replace(/[^\d+]/g, '')}`}
                    onClick={(e) => e.stopPropagation()}
                    style={{ color: '#22c55e', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '2px', fontWeight: 600 }}
                  >
                    <Phone size={10} /> {selectedEmployee.phone}
                  </a>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.86rem' }}>
            {icon || <User size={16} style={{ opacity: 0.6 }} />}
            <span>{placeholder}</span>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {selectedEmployee && !isWorker && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px', display: 'flex' }}
              title="Сбросить назначение"
            >
              <X size={14} />
            </button>
          )}
          {!isWorker && (
            <ChevronDown 
              size={16} 
              style={{ 
                color: 'var(--text-secondary)', 
                transform: isOpen ? 'rotate(180deg)' : 'none', 
                transition: 'transform 0.2s ease', 
                flexShrink: 0 
              }} 
            />
          )}
        </div>
      </div>

      {/* Dropdown List */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          right: 0,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.45)',
          zIndex: 1000,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '260px'
        }}>
          {/* Search Input */}
          <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--glass-border)', background: 'rgba(0, 0, 0, 0.2)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Search size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
            <input
              ref={inputRef}
              type="text"
              placeholder="Поиск сотрудника..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                outline: 'none',
                fontSize: '0.84rem'
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px', display: 'flex' }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1, maxHeight: '200px' }}>
            {/* 'Не назначен' option */}
            <div
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
              style={{
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                color: !value ? accentColor : 'var(--text-secondary)',
                fontWeight: !value ? 600 : 400,
                fontSize: '0.84rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                background: !value ? 'rgba(255, 255, 255, 0.04)' : 'transparent'
              }}
            >
              <User size={14} />
              <span>Не назначен</span>
              {!value && <Check size={14} style={{ marginLeft: 'auto', color: accentColor }} />}
            </div>

            {filteredEmployees.length === 0 ? (
              <div style={{ padding: '14px 10px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                Сотрудник не найден
              </div>
            ) : (
              filteredEmployees.map(emp => {
                const isSelected = emp.id.toString() === value;
                return (
                  <div
                    key={emp.id}
                    onClick={() => {
                      onChange(emp.id.toString());
                      setIsOpen(false);
                    }}
                    style={{
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                      <div style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        color: '#fff',
                        background: emp.avatarUrl ? 'transparent' : getAvatarGradient(emp.name),
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        flexShrink: 0
                      }}>
                        {emp.avatarUrl ? (
                          <img src={emp.avatarUrl} alt={emp.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          getEmployeeInitials(emp.name)
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                        <span style={{ fontWeight: isSelected ? 700 : 500, fontSize: '0.84rem', color: isSelected ? accentColor : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {emp.name}
                        </span>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {emp.position && <span>{emp.position}</span>}
                          {emp.phone && <span>{emp.phone}</span>}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <Check size={14} style={{ color: accentColor, flexShrink: 0 }} />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
