import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

export interface SearchSelectOption {
  value: number | string;
  label: string;
  subLabel?: string;
  price?: number;
  unit?: string;
  stock?: number;
}

interface SearchSelectProps {
  options: SearchSelectOption[];
  value?: number | string;
  onChange: (value: any) => void;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export const SearchSelect: React.FC<SearchSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = '— Выберите из списка —',
  allowClear = true,
  disabled = false,
  style
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find(o => String(o.value) === String(value));

  // Закрытие при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Фокус на поиск при открытии
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearch('');
    }
  }, [isOpen]);

  const filteredOptions = options.filter(o => {
    if (!search) return true;
    const query = search.toLowerCase();
    return o.label.toLowerCase().includes(query) || (o.subLabel && o.subLabel.toLowerCase().includes(query));
  });

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', ...style }}>
      {/* Кнопка-триггер */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          width: '100%',
          minHeight: '38px',
          background: 'rgba(255, 255, 255, 0.05)',
          border: isOpen ? '1px solid var(--accent-primary, #3b82f6)' : '1px solid var(--glass-border, rgba(255,255,255,0.1))',
          borderRadius: 'var(--radius-sm, 6px)',
          color: selectedOption ? 'var(--text-primary, #fff)' : 'var(--text-secondary, #94a3b8)',
          padding: '4px 10px',
          fontSize: '0.86rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          boxSizing: 'border-box',
          gap: '6px',
          userSelect: 'none'
        }}
      >
        <div style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {selectedOption ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
              <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedOption.label}</span>
              {selectedOption.price != null && (
                <span style={{ fontSize: '0.78rem', color: '#4ade80', flexShrink: 0 }}>
                  ({selectedOption.price} ₽{selectedOption.unit ? `/${selectedOption.unit}` : ''})
                </span>
              )}
            </div>
          ) : (
            <span>{placeholder}</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          {allowClear && selectedOption && !disabled && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onChange(undefined);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={13} />
            </button>
          )}
          <ChevronDown size={14} style={{ color: 'var(--text-secondary)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
        </div>
      </div>

      {/* Выпадающий список */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: 'var(--card-bg, #1e293b)',
            border: '1px solid var(--glass-border, rgba(255, 255, 255, 0.15))',
            borderRadius: 'var(--radius-sm, 6px)',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            zIndex: 10050,
            overflow: 'hidden',
            maxHeight: '280px',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Поле живого поиска */}
          <div style={{ padding: '8px', borderBottom: '1px solid var(--glass-border, rgba(255, 255, 255, 0.1))', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Search size={14} style={{ color: 'var(--text-secondary, #94a3b8)', flexShrink: 0 }} />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск по названию..."
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: '0.82rem',
                outline: 'none'
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px' }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Список опций */}
          <div style={{ overflowY: 'auto', flex: 1, padding: '4px 0' }}>
            {allowClear && (
              <div
                onClick={() => {
                  onChange(undefined);
                  setIsOpen(false);
                }}
                style={{
                  padding: '7px 10px',
                  fontSize: '0.82rem',
                  color: 'var(--text-secondary, #94a3b8)',
                  cursor: 'pointer',
                  borderBottom: '1px dashed rgba(255,255,255,0.06)'
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {placeholder}
              </div>
            )}

            {filteredOptions.length === 0 ? (
              <div style={{ padding: '12px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Ничего не найдено
              </div>
            ) : (
              filteredOptions.map(opt => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <div
                    key={opt.value}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    style={{
                      padding: '7px 10px',
                      fontSize: '0.84rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                      color: isSelected ? 'var(--accent-primary, #60a5fa)' : 'var(--text-primary, #f8fafc)',
                      borderLeft: isSelected ? '3px solid var(--accent-primary, #3b82f6)' : '3px solid transparent'
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                      <div style={{ fontWeight: isSelected ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {opt.label}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary, #94a3b8)', display: 'flex', gap: '8px' }}>
                        {opt.price != null && (
                          <span style={{ color: '#4ade80' }}>
                            {opt.price} ₽{opt.unit ? `/${opt.unit}` : ''}
                          </span>
                        )}
                        {opt.stock != null && (
                          <span>• ост: {opt.stock} {opt.unit || ''}</span>
                        )}
                        {opt.subLabel && <span>• {opt.subLabel}</span>}
                      </div>
                    </div>
                    {isSelected && <Check size={14} style={{ color: 'var(--accent-primary, #60a5fa)', flexShrink: 0 }} />}
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
