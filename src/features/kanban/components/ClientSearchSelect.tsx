import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, ChevronDown, Plus, Check, X, Phone, Building2, User, MessageCircle, Send } from 'lucide-react';
import type { Client } from '../../../api/clients';
import { getAvatarGradient, getClientInitials } from '../../../utils/avatarUtils';
import { getWhatsAppLink, getTelegramLink } from '../../../utils/messengerUtils';

export interface ClientSearchSelectProps {
  value: string;
  clients: Client[];
  onChange: (clientId: string) => void;
  onAddNewClient: () => void;
  isWorker?: boolean;
}

export const ClientSearchSelect: React.FC<ClientSearchSelectProps> = ({
  value,
  clients,
  onChange,
  onAddNewClient,
  isWorker
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedClient = clients.find(c => c.id.toString() === value);

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

  const filteredClients = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase().trim();
    return clients.filter(c => 
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.toLowerCase().includes(q)) ||
      (c.inn && c.inn.toLowerCase().includes(q)) ||
      (c.contactPerson && c.contactPerson.toLowerCase().includes(q))
    );
  }, [clients, search]);

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
          padding: '10px 14px',
          background: selectedClient ? 'rgba(255, 255, 255, 0.04)' : 'var(--input-bg)',
          border: isOpen ? '1px solid var(--accent-primary)' : '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-md)',
          cursor: isWorker ? 'default' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          transition: 'all var(--transition-fast)',
          boxShadow: isOpen ? '0 0 0 2px var(--accent-glow)' : 'none'
        }}
      >
        {selectedClient ? (() => {
          const isLegal = selectedClient.clientType === 'LEGAL_ENTITY';
          const cAvatar = selectedClient.avatarUrl;
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#fff',
                background: cAvatar ? 'transparent' : getAvatarGradient(selectedClient.name || (isLegal ? 'Компания' : 'Клиент')),
                border: '1.5px solid rgba(255, 255, 255, 0.18)',
                flexShrink: 0
              }}>
                {cAvatar ? (
                  <img src={cAvatar} alt={selectedClient.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  isLegal ? <Building2 size={18} /> : getClientInitials(selectedClient.name)
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedClient.name}
                  </span>
                  <span style={{
                    fontSize: '0.72rem',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: isLegal ? 'rgba(59, 130, 246, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                    color: isLegal ? '#60a5fa' : '#4ade80',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {isLegal ? '🏢 Юр. лицо' : '👤 Физ. лицо'}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '1px', flexWrap: 'wrap' }}>
                  {selectedClient.phone && (
                    <a
                      href={`tel:${selectedClient.phone.replace(/[^\d+]/g, '')}`}
                      onClick={(e) => e.stopPropagation()}
                      style={{ color: '#22c55e', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                      title={`Позвонить клиенту: ${selectedClient.phone}`}
                    >
                      <Phone size={12} /> {selectedClient.phone}
                    </a>
                  )}
                  {selectedClient.inn && <span>ИНН: {selectedClient.inn}</span>}
                  {selectedClient?.whatsapp && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(getWhatsAppLink(selectedClient.whatsapp!), '_blank');
                      }}
                      title={`Написать в WhatsApp: ${selectedClient.whatsapp}`}
                      className="contact-btn whatsapp-btn"
                      style={{ width: '24px', height: '24px' }}
                    >
                      <MessageCircle size={13} />
                    </button>
                  )}
                  {selectedClient?.telegram && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(getTelegramLink(selectedClient.telegram!), '_blank');
                      }}
                      title={`Написать в Telegram: ${selectedClient.telegram}`}
                      className="contact-btn telegram-btn"
                      style={{ width: '24px', height: '24px' }}
                    >
                      <Send size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })() : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
            <User size={18} style={{ opacity: 0.6 }} />
            <span>Выберите клиента из базы...</span>
          </div>
        )}
        {!isWorker && (
          <ChevronDown 
            size={18} 
            style={{ 
              color: 'var(--text-secondary)', 
              transform: isOpen ? 'rotate(180deg)' : 'none', 
              transition: 'transform 0.2s ease', 
              flexShrink: 0 
            }} 
          />
        )}
      </div>

      {/* Hidden input to fulfill HTML form validation if required */}
      <input type="text" value={value} required style={{ opacity: 0, height: 0, width: 0, position: 'absolute', pointerEvents: 'none' }} onChange={() => {}} />

      {/* Dropdown Menu / Bottom Sheet */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          right: 0,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '320px'
        }}>
          {/* Search Input Bar */}
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--glass-border)', background: 'rgba(0, 0, 0, 0.2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Search size={16} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
            <input
              ref={inputRef}
              type="text"
              placeholder="Поиск по имени, телефону, ИНН..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                outline: 'none',
                fontSize: '0.88rem'
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px', display: 'flex' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* "+ Создать клиента" Button inside dropdown */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onAddNewClient();
            }}
            style={{
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              border: 'none',
              borderBottom: '1px solid var(--glass-border)',
              background: 'rgba(59, 130, 246, 0.08)',
              color: 'var(--accent-primary)',
              fontWeight: 600,
              fontSize: '0.86rem',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.15s ease'
            }}
          >
            <Plus size={16} /> Создать нового клиента
          </button>

          {/* Clients List */}
          <div style={{ overflowY: 'auto', flex: 1, maxHeight: '220px' }}>
            {filteredClients.length === 0 ? (
              <div style={{ padding: '20px 14px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.86rem' }}>
                Клиент не найден
              </div>
            ) : (
              filteredClients.map(c => {
                const isSelected = c.id.toString() === value;
                const isLegal = c.clientType === 'LEGAL_ENTITY';
                const cAvatar = c.avatarUrl;

                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      onChange(c.id.toString());
                      setIsOpen(false);
                    }}
                    style={{
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: '#fff',
                        background: cAvatar ? 'transparent' : getAvatarGradient(c.name || (isLegal ? 'Компания' : 'Клиент')),
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        flexShrink: 0
                      }}>
                        {cAvatar ? (
                          <img src={cAvatar} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          isLegal ? <Building2 size={15} /> : getClientInitials(c.name)
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: isSelected ? 700 : 500, fontSize: '0.88rem', color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.name}
                          </span>
                          <span style={{
                            fontSize: '0.68rem',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            background: isLegal ? 'rgba(59, 130, 246, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                            color: isLegal ? '#60a5fa' : '#4ade80',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            flexShrink: 0
                          }}>
                            {isLegal ? 'Юр. лицо' : 'Физ. лицо'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '1px' }}>
                          {c.phone && (
                            <a
                              href={`tel:${c.phone.replace(/[^\d+]/g, '')}`}
                              onClick={(e) => e.stopPropagation()}
                              style={{ color: '#22c55e', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}
                              title={`Позвонить клиенту: ${c.phone}`}
                            >
                              <Phone size={11} /> {c.phone}
                            </a>
                          )}
                          {c.inn && <span>ИНН: {c.inn}</span>}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <Check size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
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
