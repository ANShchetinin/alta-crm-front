import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  MoreVertical,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronsDown,
  ChevronsUp,
  Paperclip,
  Download,
  Eye,
  EyeOff,
  Mic,
  Phone,
  MapPin,
  X,
  Search,
  Tag,
  Building2,
  User,
  Users,
  Ruler,
  Wrench,
  RefreshCw,
  RotateCcw,
  FileText,
  AlertCircle,
  AlertTriangle,
  FileCheck,
  CheckCircle2,
  Check,
  CalendarDays,
  Bell,
  Camera,
  MessageSquare,
  Sparkles,
  Send,
  Copy,
  FileDown,
  Bot,
  Coins,
  MessageCircle
} from 'lucide-react';
import { AddressSuggestions } from 'react-dadata';
import 'react-dadata/dist/react-dadata.css';
import { useTranslation } from 'react-i18next';
import { getOrderStatuses, getOrders, moveOrder, completeOrder, createOrder, updateOrder, uploadAttachment, toggleAttachmentIsAct, fetchAttachmentBlob, deleteAttachment, renameAttachment, deleteOrder, createOrderStatus, updateOrderStatus, deleteOrderStatus, reorderOrderStatuses, getAiSummary, uploadAudio, getNextOrderNumber, downloadContractDocx, analyzeAudioWithPrompt, chatWithOrderAi, clearOrderAiChat } from '../api/kanban';
import type { OrderStatus, Order, OrderMaterial, OrderAttachment, OrderAiSummary, ContractParams, ChatMessage } from '../api/kanban';
import { getOrderAiUsage, type OrderAiCostDto } from '../api/aiUsage';
import { SYSTEM_PROMPT_SUMMARY, SYSTEM_PROMPT_SALES_ADVICE, SYSTEM_PROMPT_CHAT_ASSISTANT } from '../constants/aiPrompts';
import { getClients, createClient, updateClient } from '../api/clients';
import type { Client } from '../api/clients';
import { getContractTemplateStatus } from '../api/settings';
import type { ContractTemplateStatus } from '../api/settings';
import { PRESET_LEAD_SOURCES, getClientInitials } from './Clients';
import { getMaterials } from '../api/storage';
import type { Material } from '../api/storage';
import { getEmployees } from '../api/employees';
import type { Employee } from '../api/employees';
import { getAvatarGradient, getEmployeeInitials } from './Employees';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { useFeature } from '../hooks/useFeatureToggle';
import { formatDateTimeInTimezone, localInputToUtcIso, utcToLocalInput, parseUtcDate, formatDateOnly } from '../utils/dateUtils';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getYandexMapsUrl, get2GisUrl } from '../utils/navigation';
import { OrderRemindersSection } from '../components/OrderRemindersSection';
import { getMyReminders, type OrderReminderDto } from '../api/reminders';
import { useTouchKanbanDrag } from '../hooks/useTouchKanbanDrag';
import { useTouchColumnReorder } from '../hooks/useTouchColumnReorder';
import { DocumentScannerModal } from '../components/DocumentScannerModal';
import { ActUploadActionSheet } from '../components/ActUploadActionSheet';
import { getWhatsAppLink, getTelegramLink } from '../utils/messengerUtils';
import '../styles/kanban.css';
interface MaterialSearchSelectProps {
  value: number;
  materials: Material[];
  onChange: (materialId: number) => void;
}

const MaterialSearchSelect: React.FC<MaterialSearchSelectProps> = ({ value, materials, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedMaterial = materials.find(m => m.id === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filtered = useMemo(() => {
    if (!search.trim()) return materials;
    const q = search.toLowerCase().trim();
    return materials.filter(m => m.name.toLowerCase().includes(q));
  }, [materials, search]);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', minWidth: 0, flex: 3 }}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearch('');
        }}
        className="material-select-btn"
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: selectedMaterial ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
          {selectedMaterial ? (
            <span>
              <span style={{ fontWeight: 600 }}>{selectedMaterial.name}</span>
              {selectedMaterial.unit && (
                <span style={{ opacity: 0.6, marginLeft: '4px', fontSize: '0.75rem' }}>
                  ({selectedMaterial.unit})
                </span>
              )}
            </span>
          ) : 'Выберите позицию...'}
        </span>
        <ChevronDown size={14} style={{ opacity: 0.6, flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>

      {isOpen && (
        <div className="material-select-dropdown">
          <div className="material-select-search-box">
            <Search size={13} className="material-select-search-icon" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск по названию..."
              className="material-select-search-input"
              onClick={e => e.stopPropagation()}
            />
          </div>

          <div className="material-select-list">
            {filtered.length === 0 ? (
              <div className="material-select-empty">
                Ничего не найдено
              </div>
            ) : (
              filtered.map(m => {
                const isSelected = m.id === value;
                return (
                  <div
                    key={m.id}
                    className={`material-select-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      onChange(m.id);
                      setIsOpen(false);
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
                    {m.unit && <span style={{ fontSize: '0.72rem', opacity: 0.6, marginLeft: '6px', flexShrink: 0 }}>{m.unit}</span>}
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

interface ClientSearchSelectProps {
  value: string;
  clients: Client[];
  onChange: (clientId: string) => void;
  onAddNewClient: () => void;
  isWorker?: boolean;
}

const ClientSearchSelect: React.FC<ClientSearchSelectProps> = ({ value, clients, onChange, onAddNewClient, isWorker }) => {
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

  const handleOpen = () => {
    if (isWorker) return;
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
                        window.open(getWhatsAppLink(selectedClient.whatsapp), '_blank');
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
                        window.open(getTelegramLink(selectedClient.telegram), '_blank');
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

interface EmployeeSearchSelectProps {
  value: string;
  employees: Employee[];
  onChange: (employeeId: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  accentColor?: string;
  isWorker?: boolean;
}

const EmployeeSearchSelect: React.FC<EmployeeSearchSelectProps> = ({
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

  const handleOpen = () => {
    if (isWorker) return;
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
      {/* Selected Card / Trigger */}
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
          minHeight: '44px'
        }}
      >
        {selectedEmployee ? (() => {
          const eAvatar = selectedEmployee.avatarUrl;
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
              <div style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#fff',
                background: eAvatar ? 'transparent' : getAvatarGradient(selectedEmployee.name),
                border: '1px solid rgba(255, 255, 255, 0.2)',
                flexShrink: 0
              }}>
                {eAvatar ? (
                  <img src={eAvatar} alt={selectedEmployee.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  getEmployeeInitials(selectedEmployee.name)
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                <span style={{ fontWeight: 600, fontSize: '0.86rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedEmployee.name}
                </span>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {selectedEmployee.position && <span>{selectedEmployee.position}</span>}
                  {selectedEmployee.phone && (
                    <a
                      href={`tel:${selectedEmployee.phone.replace(/[^\d+]/g, '')}`}
                      onClick={(e) => e.stopPropagation()}
                      style={{ color: '#22c55e', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}
                      title={`Позвонить: ${selectedEmployee.phone}`}
                    >
                      <Phone size={10} /> {selectedEmployee.phone}
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })() : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            {icon || <User size={15} style={{ opacity: 0.6 }} />}
            <span>{placeholder}</span>
          </div>
        )}

        {!isWorker && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {selectedEmployee && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  borderRadius: '50%',
                  opacity: 0.7
                }}
                title="Снять выбор"
              >
                <X size={13} />
              </button>
            )}
            <ChevronDown 
              size={16} 
              style={{ 
                color: 'var(--text-secondary)', 
                transform: isOpen ? 'rotate(180deg)' : 'none', 
                transition: 'transform 0.2s ease', 
                flexShrink: 0 
              }} 
            />
          </div>
        )}
      </div>

      {/* Dropdown Menu */}
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
          maxHeight: '280px'
        }}>
          {/* Search Bar */}
          <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--glass-border)', background: 'rgba(0, 0, 0, 0.2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                <X size={13} />
              </button>
            )}
          </div>

          {/* Option: Не назначен / Снять выбор */}
          <div
            onClick={() => {
              onChange('');
              setIsOpen(false);
            }}
            style={{
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              cursor: 'pointer',
              borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
              background: !value ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
              color: !value ? 'var(--accent-primary)' : 'var(--text-secondary)',
              fontSize: '0.82rem',
              fontWeight: !value ? 600 : 400
            }}
          >
            <span>— {placeholder}</span>
            {!value && <Check size={14} style={{ color: 'var(--accent-primary)' }} />}
          </div>

          {/* List of employees */}
          <div style={{ overflowY: 'auto', flex: 1, maxHeight: '200px' }}>
            {filteredEmployees.length === 0 ? (
              <div style={{ padding: '16px 12px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                Сотрудник не найден
              </div>
            ) : (
              filteredEmployees.map(e => {
                const isSelected = e.id.toString() === value;
                const eAvatar = e.avatarUrl;

                return (
                  <div
                    key={e.id}
                    onClick={() => {
                      onChange(e.id.toString());
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
                      borderBottom: '1px solid rgba(255, 255, 255, 0.02)',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(ev) => {
                      if (!isSelected) ev.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                    }}
                    onMouseLeave={(ev) => {
                      if (!isSelected) ev.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        color: '#fff',
                        background: eAvatar ? 'transparent' : getAvatarGradient(e.name),
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        flexShrink: 0
                      }}>
                        {eAvatar ? (
                          <img src={eAvatar} alt={e.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          getEmployeeInitials(e.name)
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                        <span style={{ fontWeight: isSelected ? 700 : 500, fontSize: '0.84rem', color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {e.name}
                        </span>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {e.position && <span>{e.position}</span>}
                          {e.phone && (
                            <a
                              href={`tel:${e.phone.replace(/[^\d+]/g, '')}`}
                              onClick={(ev) => ev.stopPropagation()}
                              style={{ color: '#22c55e', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '2px', fontWeight: 600 }}
                              title={`Позвонить: ${e.phone}`}
                            >
                              <Phone size={10} /> {e.phone}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <Check size={14} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
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

const Kanban = () => {
  const { t } = useTranslation();
  const role = useAuthStore(state => state.role);
  const isWorker = role === 'WORKER';
  const hasAiSummary = useFeature('AI_SUMMARY');
  const hasContractTemplates = useFeature('CONTRACT_TEMPLATES');
  const hasStorage = useFeature('STORAGE');
  const hasDocumentScanner = useFeature('DOCUMENT_SCANNER');
  const { setNewOrdersCount, fetchLowStockMaterials, tenantSettings } = useAppStore();
  const [columns, setColumns] = useState<OrderStatus[]>([]);
  const [cards, setCards] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [allMaterials, setAllMaterials] = useState<Material[]>([]);
  const [templateStatus, setTemplateStatus] = useState<ContractTemplateStatus | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [isMobile, setIsMobile] = useState<boolean>(() => typeof window !== 'undefined' && window.innerWidth <= 768);
  const [mobileViewMode, setMobileViewMode] = useState<'list' | 'board'>(() => {
    if (typeof window === 'undefined') return 'list';
    return (localStorage.getItem('kanban_mobile_view_mode') as 'list' | 'board') || 'list';
  });
  const [collapsedColumns, setCollapsedColumns] = useState<Record<number, boolean>>(() => {
    try {
      const saved = localStorage.getItem('kanban_collapsed_columns');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleColumnCollapse = (columnId: number) => {
    setCollapsedColumns(prev => {
      const isCurrentlyCollapsed = prev[columnId] !== undefined ? prev[columnId] : true;
      const updated = { ...prev, [columnId]: !isCurrentlyCollapsed };
      localStorage.setItem('kanban_collapsed_columns', JSON.stringify(updated));
      return updated;
    });
  };

  const toggleAllColumns = (expand: boolean) => {
    const updated: Record<number, boolean> = {};
    columns.forEach(c => {
      updated[c.id] = !expand;
    });
    setCollapsedColumns(updated);
    localStorage.setItem('kanban_collapsed_columns', JSON.stringify(updated));
  };
  
  const [remindersMap, setRemindersMap] = useState<Record<number, OrderReminderDto[]>>({});
  const [reminderFilter, setReminderFilter] = useState<'all' | 'today' | 'overdue'>('all');
  const [hideEmptyColumns, setHideEmptyColumns] = useState<boolean>(() => localStorage.getItem('kanban_hide_empty_columns') === 'true');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [initialFormDataJson, setInitialFormDataJson] = useState<string>('');
  const [isUnsavedConfirmOpen, setIsUnsavedConfirmOpen] = useState(false);

  // Quick Client Creation
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [newClientType, setNewClientType] = useState<'INDIVIDUAL' | 'LEGAL_ENTITY'>('INDIVIDUAL');
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientWhatsapp, setNewClientWhatsapp] = useState('');
  const [newClientTelegram, setNewClientTelegram] = useState('');
  const [newClientInn, setNewClientInn] = useState('');
  const [newClientContactPerson, setNewClientContactPerson] = useState('');
  const [newClientLeadSource, setNewClientLeadSource] = useState('');
  const [newClientCustomLeadSource, setNewClientCustomLeadSource] = useState('');
  const [creatingClient, setCreatingClient] = useState(false);

  const [formData, setFormData] = useState({
    clientId: '',
    statusId: '',
    assigneeId: '',
    measurerId: '',
    measurerName: '',
    measurerAvatarUrl: '',
    installedById: '',
    installedByName: '',
    installedByAvatarUrl: '',
    installedAt: '',
    orderNumber: '',
    address: '',
    entrance: '',
    floor: '',
    description: '',
    totalPrice: '',
    prepayment: '',
    prepaymentPaid: false,
    prepaymentPaidAt: '',
    remainder: '',
    remainderPaid: false,
    remainderPaidAt: '',
    installationPrice: '',
    installationDate: '',
    measurementDate: '',
    contractParams: undefined as ContractParams | undefined,
    materials: [] as OrderMaterial[],
    attachments: [] as OrderAttachment[]
  });
  const [uploadingFile, setUploadingFile] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [editingAttachmentId, setEditingAttachmentId] = useState<number | null>(null);
  const [editingAttachmentName, setEditingAttachmentName] = useState('');
  const [renamingAttachment, setRenamingAttachment] = useState(false);
  
  const [isActActionSheetOpen, setIsActActionSheetOpen] = useState(false);
  const [actionSheetMode, setActionSheetMode] = useState<'ACT' | 'GENERAL'>('ACT');
  const [isDocScannerOpen, setIsDocScannerOpen] = useState(false);
  const [docScannerIsAct, setDocScannerIsAct] = useState(true);
  const actFileInputRef = useRef<HTMLInputElement | null>(null);
  const generalFileInputRef = useRef<HTMLInputElement | null>(null);

  const [aiSummary, setAiSummary] = useState<OrderAiSummary | null>(null);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const audioFileInputRef = useRef<HTMLInputElement | null>(null);
  const [aiSubTab, setAiSubTab] = useState<'ANALYSIS' | 'CHAT'>('ANALYSIS');
  const [aiPromptPreset, setAiPromptPreset] = useState<'SUMMARY' | 'SALES_ADVICE' | 'CUSTOM'>('SUMMARY');
  const [customSystemPrompt, setCustomSystemPrompt] = useState('');
  const [isAnalyzingAudio, setIsAnalyzingAudio] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInputText, setChatInputText] = useState('');
  const [isChatReplying, setIsChatReplying] = useState(false);
  const [copyFeedbackText, setCopyFeedbackText] = useState<string | null>(null);
  const [orderAiCost, setOrderAiCost] = useState<OrderAiCostDto | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const orderChatCacheRef = useRef<Record<number, ChatMessage[]>>({});
  
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [editingColumnId, setEditingColumnId] = useState<number | null>(null);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnColor, setNewColumnColor] = useState('#3b82f6');
  const [newColumnIncludeInFinances, setNewColumnIncludeInFinances] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Order Modal Tab State
  const [orderModalTab, setOrderModalTab] = useState<'MAIN' | 'CONTRACT' | 'MATERIALS' | 'FILES' | 'AI'>('MAIN');

  // Contract Generation & Prompt Modal State
  const [isContractPromptOpen, setIsContractPromptOpen] = useState(false);
  const [contractPromptLoading, setContractPromptLoading] = useState(false);
  const [contractPromptData, setContractPromptData] = useState({
    clientId: 0,
    name: '',
    phone: '',
    secondPhone: '',
    birthDate: '',
    passportSeriesNumber: '',
    passportIssuedBy: '',
    passportIssuedDate: '',
    registrationAddress: '',
    installationAddress: '',
    // Ceiling params
    area: '70,3',
    perimeter: '110,5',
    canvasesCount: '5',
    insertLength: '20',
    pipeCount: '0',
    lightsCount: '30',
    timberLength: '17',
    canvasArticle: 'Полотно Мат 303',
    discount: '',
    handoverDate: ''
  });

  const DEFAULT_ACT_CHECKLIST: import('../api/kanban').ActChecklistItem[] = [
    { id: '1', name: 'Установка багета (Ал.)', checked: false },
    { id: '2', name: 'Установка багета (Пл.)', checked: false },
    { id: '3', name: 'Установка натяжного потолка', checked: false },
    { id: '4', name: 'Установка потолочного багета', checked: false },
    { id: '5', name: 'Установка маскировочной вставки', checked: false },
    { id: '6', name: 'Установка потолочного карниза (гардины)', checked: false },
    { id: '7', name: 'Установка светового оборудования', checked: false },
    { id: '8', name: 'Установка и разводка электропроводки', checked: false },
    { id: '9', name: 'Установки вентиляции', checked: false },
    { id: '10', name: 'Установка разделительного багета', checked: false },
    { id: '11', name: 'Установка пожарных сигнализаций, камер, и навесного оборудования', checked: false },
    { id: '12', name: 'Установка обвода трубы', checked: false },
    { id: '13', name: 'Демонтаж замена полотна', checked: false },
    { id: '14', name: 'Установка бруса и 2х уровневых конструкций', checked: false },
    { id: '15', name: 'Установка карниза', checked: false }
  ];

  const mergeActChecklist = (savedList?: import('../api/kanban').ActChecklistItem[]): import('../api/kanban').ActChecklistItem[] => {
    if (!savedList || savedList.length === 0) {
      return DEFAULT_ACT_CHECKLIST.map(item => ({ ...item, checked: false }));
    }
    const savedMap = new Map(savedList.map(it => [it.id, it.checked]));
    const savedNameMap = new Map(savedList.map(it => [it.name, it.checked]));

    const merged = DEFAULT_ACT_CHECKLIST.map(defItem => ({
      ...defItem,
      checked: savedMap.has(defItem.id)
        ? !!savedMap.get(defItem.id)
        : (savedNameMap.has(defItem.name) ? !!savedNameMap.get(defItem.name) : false)
    }));

    const defIds = new Set(DEFAULT_ACT_CHECKLIST.map(d => d.id));
    savedList.forEach(savedItem => {
      if (!defIds.has(savedItem.id)) {
        merged.push(savedItem);
      }
    });

    return merged;
  };

  const openEditModal = (order: Order) => {
    const prep = order.prepayment != null ? order.prepayment : 0;
    const rem = order.remainder != null ? order.remainder : (order.totalPrice != null ? Math.max(0, order.totalPrice - prep) : 0);
    const tot = order.totalPrice != null ? order.totalPrice : (prep + rem);

    const initialContractParams: ContractParams = order.contractParams ? {
      ...order.contractParams,
      contractDate: order.contractParams.contractDate || new Date().toISOString().slice(0, 10),
      actChecklist: mergeActChecklist(order.contractParams.actChecklist),
      specItems: order.contractParams.specItems || []
    } : {
      area: '70,3',
      perimeter: '110,5',
      canvasesCount: '5',
      insertLength: '20',
      pipeCount: '0',
      lightsCount: '30',
      timberLength: '17',
      canvasArticle: 'Полотно Мат 303',
      contractDate: new Date().toISOString().slice(0, 10),
      discount: '',
      handoverDate: '',
      specItems: [],
      actChecklist: DEFAULT_ACT_CHECKLIST.map(item => ({ ...item, checked: false }))
    };

    const initialData = {
      clientId: order.clientId ? order.clientId.toString() : '',
      statusId: order.statusId ? order.statusId.toString() : (columns[0]?.id ? columns[0].id.toString() : ''),
      assigneeId: order.assigneeId ? order.assigneeId.toString() : '',
      measurerId: order.measurerId ? order.measurerId.toString() : '',
      measurerName: order.measurerName || '',
      measurerAvatarUrl: order.measurerAvatarUrl || '',
      installedById: order.installedById ? order.installedById.toString() : '',
      installedByName: order.installedByName || '',
      installedByAvatarUrl: order.installedByAvatarUrl || '',
      installedAt: order.installedAt || '',
      orderNumber: order.orderNumber || '',
      address: order.address || '',
      entrance: order.entrance || '',
      floor: order.floor || '',
      description: order.description || '',
      totalPrice: (tot != null && tot > 0) ? tot.toString() : '',
      prepayment: (prep != null && prep > 0) ? prep.toString() : '',
      prepaymentPaid: !!order.prepaymentPaid,
      prepaymentPaidAt: order.prepaymentPaidAt || '',
      remainder: (rem != null && rem > 0) ? rem.toString() : '',
      remainderPaid: !!order.remainderPaid,
      remainderPaidAt: order.remainderPaidAt || '',
      installationPrice: (order.installationPrice != null && order.installationPrice > 0) ? order.installationPrice.toString() : '',
      installationDate: order.installationDate ? order.installationDate.slice(0, 10) : '',
      measurementDate: utcToLocalInput(order.measurementDate),
      materials: order.materials ? [...order.materials] : [],
      attachments: order.attachments ? [...order.attachments] : [],
      contractParams: initialContractParams
    };

    setEditingOrderId(order.id);
    setOrderModalTab('MAIN');
    setFormData(initialData);
    setInitialFormDataJson(JSON.stringify({ formData: initialData, pendingFilesCount: 0 }));
    setPendingFiles([]);
    setAiSummary(null);
    setAiSubTab('ANALYSIS');
    setAiPromptPreset('SUMMARY');
    const cachedChat = orderChatCacheRef.current[order.id] || [];
    setChatMessages(cachedChat);
    setChatInputText('');
    setIsModalOpen(true);
    getAiSummary(order.id).then((summary) => {
      setAiSummary(summary);
      if (summary?.chatHistory) {
        try {
          const parsed = typeof summary.chatHistory === 'string' ? JSON.parse(summary.chatHistory) : summary.chatHistory;
          if (Array.isArray(parsed)) {
            setChatMessages(parsed);
            orderChatCacheRef.current[order.id] = parsed;
          }
        } catch (e) {
          console.error("Failed to parse chatHistory from DB", e);
        }
      }
    }).catch(() => setAiSummary(null));
    setOrderAiCost(null);
    getOrderAiUsage(order.id).then(setOrderAiCost).catch(() => setOrderAiCost(null));
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Reactive listener for opening order modal from notifications or external navigation
  useEffect(() => {
    const orderIdParam = searchParams.get('orderId');
    if (!orderIdParam) return;
    const targetId = parseInt(orderIdParam);
    if (isNaN(targetId)) return;

    const orderToOpen = cards.find(o => o.id === targetId);
    if (orderToOpen) {
      openEditModal(orderToOpen);
      searchParams.delete('orderId');
      setSearchParams(searchParams, { replace: true });
    } else if (!loading && cards.length > 0) {
      // If cards are loaded but order is missing, fetch fresh list
      getOrders().then(orders => {
        setCards(orders);
        const freshOrder = orders.find(o => o.id === targetId);
        if (freshOrder) {
          openEditModal(freshOrder);
          searchParams.delete('orderId');
          setSearchParams(searchParams, { replace: true });
        }
      }).catch(err => console.error("Failed to load order from query param", err));
    }
  }, [searchParams, cards, loading]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statuses, orders, clientsData, materialsData, employeesData, tStatus, remindersData] = await Promise.all([
        getOrderStatuses().catch(() => []),
        getOrders().catch(() => []),
        !isWorker ? getClients().catch(() => []) : Promise.resolve([]),
        !isWorker ? getMaterials().catch(() => []) : Promise.resolve([]),
        !isWorker ? getEmployees().catch(() => []) : Promise.resolve([]),
        !isWorker ? getContractTemplateStatus().catch(() => null) : Promise.resolve(null),
        !isWorker ? getMyReminders('all').catch(() => []) : Promise.resolve([])
      ]);
      const sortedColumns = statuses.sort((a, b) => a.sortOrder - b.sortOrder);
      setColumns(sortedColumns);
      setCards(orders);
      setClients(clientsData);
      setAllMaterials(materialsData);
      setEmployees(employeesData);
      if (tStatus) setTemplateStatus(tStatus);

      const rMap: Record<number, OrderReminderDto[]> = {};
      (remindersData as OrderReminderDto[]).forEach(r => {
        if (r.orderId) {
          if (!rMap[r.orderId]) rMap[r.orderId] = [];
          rMap[r.orderId].push(r);
        }
      });
      setRemindersMap(rMap);
      
      const firstStatus = sortedColumns.find(s => s.sortOrder === 1);
      if (firstStatus) {
        setNewOrdersCount(orders.filter(o => o.statusId === firstStatus.id).length);
      }
      
      const orderIdParam = searchParams.get('orderId');
      if (orderIdParam) {
        const orderToOpen = orders.find(o => o.id === parseInt(orderIdParam));
        if (orderToOpen) {
          openEditModal(orderToOpen);
        }
        searchParams.delete('orderId');
        setSearchParams(searchParams, { replace: true });
      }

    } catch (error) {
      console.error("Failed to fetch kanban data", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshRemindersOnly = async () => {
    if (isWorker) return;
    try {
      const remindersData = await getMyReminders('all');
      const rMap: Record<number, OrderReminderDto[]> = {};
      (remindersData as OrderReminderDto[]).forEach(r => {
        if (r.orderId) {
          if (!rMap[r.orderId]) rMap[r.orderId] = [];
          rMap[r.orderId].push(r);
        }
      });
      setRemindersMap(rMap);
    } catch (e) {
      console.error('Failed to refresh reminders', e);
    }
  };

  const handleDragStart = (e: React.DragEvent, id: number) => {
    e.dataTransfer.setData('cardId', id.toString());
  };

  const handleDrop = async (e: React.DragEvent, statusId: number) => {
    const cardIdStr = e.dataTransfer.getData('cardId');
    if (!cardIdStr) return;
    const cardId = parseInt(cardIdStr);
    const updatedCards = cards.map(c => c.id === cardId ? { ...c, statusId } : c);
    setCards(updatedCards);
    
    // Update badge count if needed
    const firstStatus = columns.find(s => s.sortOrder === 1);
    if (firstStatus) {
      setNewOrdersCount(updatedCards.filter(o => o.statusId === firstStatus.id).length);
    }

    try {
      await moveOrder(cardId, statusId);
    } catch (err) {
      console.error("Failed to move order", err);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const {
    draggingCard: touchDraggingCard,
    dragPosition: touchDragPosition,
    targetStatusId: touchTargetStatusId,
    ghostData: touchGhostData,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
    isClickAllowed
  } = useTouchKanbanDrag({
    boardRef,
    onDropCard: async (cardId, targetId) => {
      const updatedCards = cards.map(c => c.id === cardId ? { ...c, statusId: targetId } : c);
      setCards(updatedCards);
      const firstStatus = columns.find(s => s.sortOrder === 1);
      if (firstStatus) {
        setNewOrdersCount(updatedCards.filter(o => o.statusId === firstStatus.id).length);
      }
      try {
        await moveOrder(cardId, targetId);
      } catch (err) {
        console.error("Failed to move order via touch drag", err);
      }
    },
    onCardClick: (card) => {
      openEditModal(card);
    },
    longPressDelay: 250
  });

  const {
    draggingColId,
    targetColId: touchTargetColId,
    dragPosition: touchColDragPosition,
    handleHandleTouchStart,
    handleHandleTouchMove,
    handleHandleTouchEnd,
    handleHandleTouchCancel
  } = useTouchColumnReorder({
    columns,
    onReorder: async (newColumns) => {
      setColumns(newColumns);
      const firstStatus = newColumns.find(s => s.sortOrder === 1);
      if (firstStatus) {
        setNewOrdersCount(cards.filter(o => o.statusId === firstStatus.id).length);
      }
      try {
        await reorderOrderStatuses(newColumns.map(c => c.id));
      } catch (err) {
        console.error("Failed to reorder columns via touch drag", err);
      }
    }
  });

  const openCreateModal = () => {
    const initialData = {
      clientId: '',
      statusId: columns[0]?.id ? columns[0].id.toString() : '',
      assigneeId: '',
      measurerId: '',
      measurerName: '',
      measurerAvatarUrl: '',
      installedById: '',
      installedByName: '',
      installedByAvatarUrl: '',
      installedAt: '',
      orderNumber: '',
      address: '',
      entrance: '',
      floor: '',
      description: '',
      totalPrice: '',
      prepayment: '',
      prepaymentPaid: false,
      prepaymentPaidAt: '',
      remainder: '',
      remainderPaid: false,
      remainderPaidAt: '',
      installationPrice: '',
      installationDate: '',
      measurementDate: '',
      contractParams: {
        area: '70,3',
        perimeter: '110,5',
        canvasesCount: '5',
        insertLength: '20',
        pipeCount: '0',
        lightsCount: '30',
        timberLength: '17',
        canvasArticle: 'Полотно Мат 303',
        discount: '',
        handoverDate: '',
        specItems: [],
        actChecklist: DEFAULT_ACT_CHECKLIST.map(item => ({ ...item, checked: false }))
      },
      materials: [],
      attachments: []
    };
    setEditingOrderId(null);
    setOrderModalTab('MAIN');
    setFormData(initialData);
    setInitialFormDataJson(JSON.stringify({ formData: initialData, pendingFilesCount: 0 }));
    setPendingFiles([]);
    setAiSummary(null);
    setIsModalOpen(true);
  };

  const handleQuickCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim() || !newClientPhone.trim()) return;
    
    setCreatingClient(true);
    try {
      const finalSource = newClientLeadSource === 'custom' ? newClientCustomLeadSource.trim() : newClientLeadSource;
      const created = await createClient({ 
        clientType: newClientType,
        name: newClientName.trim(), 
        phone: newClientPhone.trim(),
        inn: newClientType === 'LEGAL_ENTITY' && newClientInn.trim() ? newClientInn.trim() : undefined,
        contactPerson: newClientType === 'LEGAL_ENTITY' && newClientContactPerson.trim() ? newClientContactPerson.trim() : undefined,
        leadSource: finalSource || undefined,
        whatsapp: newClientWhatsapp.trim() || undefined,
        telegram: newClientTelegram.trim() || undefined
      });
      setClients(prev => [created, ...prev]);
      setFormData(prev => ({ ...prev, clientId: created.id.toString() }));
      setIsNewClientModalOpen(false);
      setNewClientType('INDIVIDUAL');
      setNewClientName('');
      setNewClientPhone('');
      setNewClientWhatsapp('');
      setNewClientTelegram('');
      setNewClientInn('');
      setNewClientContactPerson('');
      setNewClientLeadSource('');
      setNewClientCustomLeadSource('');
    } catch (err: any) {
      console.error("Failed to create client", err);
      alert(err.response?.data?.message || 'Не удалось создать клиента');
    } finally {
      setCreatingClient(false);
    }
  };

  const submitOrderForm = async () => {
    if (!columns.length) return;
    
    const prep = parseFloat(formData.prepayment || '0');
    const rem = parseFloat(formData.remainder || '0');
    const total = prep + rem;

    const payload = {
      clientId: parseInt(formData.clientId),
      assigneeId: formData.assigneeId ? parseInt(formData.assigneeId) : undefined,
      measurerId: formData.measurerId ? parseInt(formData.measurerId) : undefined,
      installedById: formData.installedById ? parseInt(formData.installedById) : undefined,
      installedAt: formData.installedAt || undefined,
      statusId: formData.statusId ? parseInt(formData.statusId) : (editingOrderId ? cards.find(c => c.id === editingOrderId)?.statusId || columns[0].id : columns[0].id),
      orderNumber: (formData.orderNumber && formData.orderNumber.trim()) ? formData.orderNumber.trim() : null,
      address: formData.address,
      entrance: formData.entrance || undefined,
      floor: formData.floor || undefined,
      description: formData.description,
      prepayment: prep,
      prepaymentPaid: formData.prepaymentPaid,
      prepaymentPaidAt: formData.prepaymentPaidAt || undefined,
      remainder: rem,
      remainderPaid: formData.remainderPaid,
      remainderPaidAt: formData.remainderPaidAt || undefined,
      totalPrice: total,
      installationPrice: parseFloat(formData.installationPrice || '0'),
      installationDate: formData.installationDate || undefined,
      measurementDate: localInputToUtcIso(formData.measurementDate),
      contractParams: formData.contractParams,
      materials: formData.materials.map(m => ({
        materialId: m.materialId,
        quantity: typeof m.quantity === 'string' ? parseFloat(m.quantity) : m.quantity
      }))
    };

    try {
      if (editingOrderId) {
        await updateOrder(editingOrderId, payload);
      } else {
        const created = await createOrder(payload);
        if (pendingFiles.length > 0) {
          for (const f of pendingFiles) {
            await uploadAttachment(created.id, f);
          }
        }
      }
      setIsModalOpen(false);
      fetchData(); 
      fetchLowStockMaterials();
    } catch (err) {
      console.error("Failed to save order", err);
      alert('Ошибка при сохранении заявки');
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (orderModalTab === 'AI') {
      return; // Do not submit order form from AI analysis & chat tab
    }
    await submitOrderForm();
  };

  const handleRequestCloseModal = () => {
    if (isDirty) {
      setIsUnsavedConfirmOpen(true);
    } else {
      setIsModalOpen(false);
    }
  };

  const handleConfirmSaveAndClose = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsUnsavedConfirmOpen(false);
    await submitOrderForm();
  };

  const handleConfirmDiscardAndClose = () => {
    setIsUnsavedConfirmOpen(false);
    setIsModalOpen(false);
  };

  const handleCancelChanges = () => {
    if (!editingOrderId) {
      setIsModalOpen(false);
      return;
    }
    if (initialFormDataJson) {
      try {
        const parsed = JSON.parse(initialFormDataJson);
        if (parsed.formData) {
          setFormData(parsed.formData);
          setPendingFiles([]);
        }
      } catch (e) {
        setIsModalOpen(false);
      }
    } else {
      setIsModalOpen(false);
    }
  };

  const handleDeleteOrder = async () => {
    if (!editingOrderId) return;
    if (window.confirm("Are you sure you want to delete this order?")) {
      try {
        await deleteOrder(editingOrderId);
        setIsModalOpen(false);
        fetchData();
        fetchLowStockMaterials();
      } catch (err) {
        console.error("Failed to delete order", err);
      }
    }
  };

  const handleStartGenerateContract = async () => {
    if (!formData.clientId) {
      alert('Пожалуйста, выберите клиента для формирования договора');
      return;
    }

    const client = clients.find(c => c.id === parseInt(formData.clientId));
    if (!client) return;

    const isLegal = client.clientType === 'LEGAL_ENTITY';
    const isMissingPassport = !isLegal && (
      !client.name?.trim() ||
      !client.phone?.trim() ||
      !client.birthDate?.trim() ||
      !client.passportSeriesNumber?.trim() ||
      !client.passportIssuedBy?.trim() ||
      !client.passportIssuedDate?.trim() ||
      !client.registrationAddress?.trim() ||
      !formData.address?.trim()
    );

    if (isMissingPassport) {
      const cp = getContractParams();
      setContractPromptData({
        clientId: client.id,
        name: client.name || '',
        phone: client.phone || '',
        secondPhone: cp.secondPhone || (client.contacts?.[0]?.phone || ''),
        birthDate: client.birthDate || '',
        passportSeriesNumber: client.passportSeriesNumber || '',
        passportIssuedBy: client.passportIssuedBy || '',
        passportIssuedDate: client.passportIssuedDate || '',
        registrationAddress: client.registrationAddress || '',
        installationAddress: formData.address || (client.actualAddress || ''),
        area: cp.area || '70,3',
        perimeter: cp.perimeter || '110,5',
        canvasesCount: cp.canvasesCount || '5',
        insertLength: cp.insertLength || '20',
        pipeCount: cp.pipeCount || '0',
        lightsCount: cp.lightsCount || '30',
        timberLength: cp.timberLength || '17',
        canvasArticle: cp.canvasArticle || 'Полотно Мат 303',
        discount: cp.discount || '',
        handoverDate: cp.handoverDate || ''
      });
      setIsContractPromptOpen(true);
    } else {
      await executeContractDownload(client.id, getContractParams());
    }
  };

  const executeContractDownload = async (clientId: number, currentContractParams?: ContractParams) => {
    try {
      setContractPromptLoading(true);

      // Ensure order has orderNumber
      let currentOrderNumber = formData.orderNumber?.trim();
      if (!currentOrderNumber) {
        currentOrderNumber = await getNextOrderNumber();
        setFormData(prev => ({ ...prev, orderNumber: currentOrderNumber }));
      }

      let targetOrderId = editingOrderId;
      const prep = parseFloat(formData.prepayment || '0');
      const rem = parseFloat(formData.remainder || '0');
      const total = prep + rem;
      const effectiveContractParams = currentContractParams || getContractParams();

      const payload = {
        clientId,
        statusId: formData.statusId ? parseInt(formData.statusId) : (editingOrderId ? cards.find(c => c.id === editingOrderId)?.statusId || columns[0].id : columns[0].id),
        assigneeId: formData.assigneeId ? parseInt(formData.assigneeId) : undefined,
        installedById: formData.installedById ? parseInt(formData.installedById) : undefined,
        installedAt: formData.installedAt || undefined,
        orderNumber: currentOrderNumber,
        address: formData.address,
        entrance: formData.entrance || undefined,
        floor: formData.floor || undefined,
        description: formData.description,
        prepayment: prep,
        remainder: rem,
        totalPrice: total,
        installationPrice: parseFloat(formData.installationPrice || '0'),
        installationDate: formData.installationDate || undefined,
        measurementDate: formData.measurementDate || undefined,
        contractParams: effectiveContractParams,
        materials: formData.materials.map(m => ({
          materialId: m.materialId,
          quantity: typeof m.quantity === 'string' ? parseFloat(m.quantity) : m.quantity
        }))
      };

      if (!targetOrderId) {
        const created = await createOrder(payload);
        targetOrderId = created.id;
        setEditingOrderId(created.id);
      } else {
        await updateOrder(targetOrderId, payload);
      }

      const docxBlob = await downloadContractDocx(targetOrderId);
      const blobUrl = window.URL.createObjectURL(docxBlob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `Договор_${currentOrderNumber || targetOrderId}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);

      fetchData();
      setIsContractPromptOpen(false);
    } catch (err: any) {
      console.error('Failed to generate contract', err);
      alert('Ошибка при формировании договора: ' + (err.message || err));
    } finally {
      setContractPromptLoading(false);
    }
  };

  const isActFile = (fileName?: string, isActFlag?: boolean): boolean => {
    if (isActFlag) return true;
    if (!fileName) return false;
    const name = fileName.trim().toLowerCase();

    // Exclude common false positives containing 'act' or 'акт' inside other words
    // e.g. контракт, contract, contact, контакт, фактура, factur, reaction, action, practice, abstract, etc.
    if (/контракт|contract|contact|контакт|фактур|factur|react|action|abstract|fraction|impact|practice|практик/i.test(name)) {
      // Unless explicitly named "акт выполненных работ" or starts with "акт" / "act"
      if (!/^(акт|act)[\s_\-.]/i.test(name) && !/акт\s+выполнен/i.test(name) && !/акт\s+при[её]м/i.test(name)) {
        return false;
      }
    }

    return /(^|[\s_\-–—(])(акт|act)($|[\s_\-–—).])/i.test(name)
      || /акт\s*выполнен/i.test(name)
      || /акт\s*при[её]м/i.test(name)
      || /completion\s*act/i.test(name);
  };

  const handleCompleteInstallation = async (e: React.MouseEvent, orderId: number) => {
    e.stopPropagation();
    const card = cards.find(c => c.id === orderId);
    const currentAttachments = (editingOrderId === orderId && formData.attachments.length > 0)
      ? formData.attachments 
      : (card?.attachments || []);
    const hasAct = currentAttachments.some(a => isActFile(a.fileName, a.isAct));
    if (!hasAct) {
      alert('Для завершения монтажа необходимо прикрепить «Акт выполненных работ» во вкладке «Файлы».');
      return;
    }

    try {
      const updatedOrder = await completeOrder(orderId);
      setCards(prevCards => prevCards.map(c => c.id === orderId ? {
        ...c,
        statusId: updatedOrder.statusId || c.statusId,
        installedById: updatedOrder.installedById || c.installedById,
        installedByName: updatedOrder.installedByName || c.installedByName,
        installedAt: updatedOrder.installedAt || new Date().toISOString()
      } : c));
      setIsModalOpen(false);
      setEditingOrderId(null);
      fetchData();
    } catch (err: any) {
      console.error('Failed to complete installation', err);
      alert(err.response?.data?.message || err.message || 'Не удалось перевести заявку в завершенный статус');
    }
  };

  const handleSavePromptAndGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setContractPromptLoading(true);
      // 1. Update client in DB
      const client = clients.find(c => c.id === contractPromptData.clientId);
      if (client) {
        await updateClient(client.id, {
          ...client,
          name: contractPromptData.name.trim(),
          phone: contractPromptData.phone.trim(),
          birthDate: contractPromptData.birthDate.trim(),
          passportSeriesNumber: contractPromptData.passportSeriesNumber.trim(),
          passportIssuedBy: contractPromptData.passportIssuedBy.trim(),
          passportIssuedDate: contractPromptData.passportIssuedDate.trim(),
          registrationAddress: contractPromptData.registrationAddress.trim()
        });
      }

      // 2. Update address in formData if modified
      if (contractPromptData.installationAddress.trim()) {
        setFormData(prev => ({ ...prev, address: contractPromptData.installationAddress.trim() }));
      }

      // 3. Update client list
      const updatedClients = await getClients();
      setClients(updatedClients);

      // 4. Download contract preserving current contractParams
      await executeContractDownload(contractPromptData.clientId, getContractParams());
    } catch (err: any) {
      console.error('Failed to save contract data', err);
      alert('Ошибка при сохранении данных: ' + (err.message || err));
      setContractPromptLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (editingOrderId) {
      setUploadingFile(true);
      try {
        const isAct = isActFile(file.name);
        const newAttachment = await uploadAttachment(editingOrderId, file, isAct);
        setFormData(prev => ({
          ...prev,
          attachments: [...prev.attachments, newAttachment]
        }));
        setCards(prev => prev.map(c => c.id === editingOrderId ? {
          ...c,
          attachments: [...(c.attachments || []), newAttachment]
        } : c));
        fetchData();
      } catch (err: any) {
        console.error("Failed to upload file", err);
        alert(err.response?.data?.message || "Не удалось загрузить файл");
      } finally {
        setUploadingFile(false);
        e.target.value = '';
      }
    } else {
      setPendingFiles(prev => [...prev, file]);
      e.target.value = '';
    }
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUploadDirectActFile = async (originalFile: File) => {
    let newFileName = originalFile.name;
    if (!isActFile(newFileName)) {
      newFileName = `Акт выполненных работ - ${originalFile.name}`;
    }
    const file = new File([originalFile], newFileName, { type: originalFile.type });

    if (editingOrderId) {
      setUploadingFile(true);
      try {
        const newAttachment = await uploadAttachment(editingOrderId, file, true);
        setFormData(prev => ({
          ...prev,
          attachments: [...prev.attachments, newAttachment]
        }));
        setCards(prev => prev.map(c => c.id === editingOrderId ? {
          ...c,
          attachments: [...(c.attachments || []), newAttachment]
        } : c));
        fetchData();
      } catch (err: any) {
        console.error("Failed to upload act file", err);
        alert(err.response?.data?.message || "Не удалось загрузить Акт");
      } finally {
        setUploadingFile(false);
      }
    } else {
      setPendingFiles(prev => [...prev, file]);
    }
  };

  const handleUploadDirectGeneralFile = async (file: File) => {
    if (editingOrderId) {
      setUploadingFile(true);
      try {
        const isAct = isActFile(file.name);
        const newAttachment = await uploadAttachment(editingOrderId, file, isAct);
        setFormData(prev => ({
          ...prev,
          attachments: [...prev.attachments, newAttachment]
        }));
        setCards(prev => prev.map(c => c.id === editingOrderId ? {
          ...c,
          attachments: [...(c.attachments || []), newAttachment]
        } : c));
        fetchData();
      } catch (err: any) {
        console.error("Failed to upload file", err);
        alert(err.response?.data?.message || "Не удалось загрузить файл");
      } finally {
        setUploadingFile(false);
      }
    } else {
      setPendingFiles(prev => [...prev, file]);
    }
  };

  const handleActUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const originalFile = e.target.files?.[0];
    if (!originalFile) return;
    await handleUploadDirectActFile(originalFile);
    e.target.value = '';
  };

  const handleToggleAttachmentIsAct = async (att: OrderAttachment) => {
    try {
      const currentIsAct = isActFile(att.fileName, att.isAct);
      const updated = await toggleAttachmentIsAct(att.id, !currentIsAct);
      setFormData(prev => ({
        ...prev,
        attachments: prev.attachments.map(a => a.id === att.id ? { ...a, isAct: updated.isAct } : a)
      }));
      setCards(prev => prev.map(c => c.id === editingOrderId ? {
        ...c,
        attachments: (c.attachments || []).map(a => a.id === att.id ? { ...a, isAct: updated.isAct } : a)
      } : c));
    } catch (err: any) {
      console.error("Failed to toggle attachment act flag", err);
      alert(err.response?.data?.message || "Не удалось изменить статус Акта");
    }
  };

  const isViewableInBrowser = (fileName: string, contentType?: string) => {
    const name = fileName.toLowerCase();
    const type = (contentType || '').toLowerCase();
    if (type.startsWith('image/') || type.startsWith('audio/') || type.startsWith('video/') || type.startsWith('text/') || type.includes('pdf')) {
      return true;
    }
    return /\.(pdf|png|jpe?g|gif|webp|svg|bmp|txt|csv|log|mp3|wav|ogg|mp4|webm)$/i.test(name);
  };

  const handleOpenAttachment = async (att: OrderAttachment) => {
    try {
      const blob = await fetchAttachmentBlob(att.id, false);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      console.error("Failed to open attachment", err);
      alert("Не удалось открыть файл");
    }
  };

  const handleDownloadAttachment = async (att: OrderAttachment) => {
    try {
      const blob = await fetchAttachmentBlob(att.id, true);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = att.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download attachment", err);
      alert("Не удалось скачать файл");
    }
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    try {
      await deleteAttachment(attachmentId);
      setFormData(prev => ({
        ...prev,
        attachments: prev.attachments.filter(a => a.id !== attachmentId)
      }));
      setCards(prev => prev.map(c => c.id === editingOrderId ? {
        ...c,
        attachments: (c.attachments || []).filter(a => a.id !== attachmentId)
      } : c));
    } catch (err) {
      console.error("Failed to delete attachment", err);
    }
  };

  const handleStartRenameAttachment = (att: OrderAttachment) => {
    setEditingAttachmentId(att.id);
    setEditingAttachmentName(att.fileName);
  };

  const handleCancelRenameAttachment = () => {
    setEditingAttachmentId(null);
    setEditingAttachmentName('');
  };

  const handleSaveRenameAttachment = async (attachmentId: number) => {
    if (!editingAttachmentName.trim()) {
      alert('Имя файла не может быть пустым');
      return;
    }
    setRenamingAttachment(true);
    try {
      const updated = await renameAttachment(attachmentId, editingAttachmentName.trim());
      setFormData(prev => ({
        ...prev,
        attachments: prev.attachments.map(a => a.id === attachmentId ? { ...a, fileName: updated.fileName } : a)
      }));
      setCards(prev => prev.map(c => c.id === editingOrderId ? {
        ...c,
        attachments: (c.attachments || []).map(a => a.id === attachmentId ? { ...a, fileName: updated.fileName } : a)
      } : c));
      setEditingAttachmentId(null);
      setEditingAttachmentName('');
    } catch (err: any) {
      console.error('Failed to rename attachment', err);
      alert(err.response?.data?.message || 'Не удалось переименовать файл');
    } finally {
      setRenamingAttachment(false);
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingOrderId) return;

    setUploadingAudio(true);
    try {
      await uploadAudio(editingOrderId, file);
      const summary = await getAiSummary(editingOrderId);
      setAiSummary(summary);
      getOrderAiUsage(editingOrderId).then(setOrderAiCost).catch(() => {});
    } catch (err) {
      console.error("Failed to upload audio", err);
    } finally {
      setUploadingAudio(false);
      e.target.value = '';
    }
  };

  const getAnalysisResultsMap = (summary: OrderAiSummary | null): Record<string, string> => {
    if (!summary || !summary.analysisResults) return {};
    try {
      if (typeof summary.analysisResults === 'object') return summary.analysisResults as any;
      return JSON.parse(summary.analysisResults);
    } catch {
      return {};
    }
  };

  const refreshAiSummary = async () => {
    if (editingOrderId) {
      try {
        const summary = await getAiSummary(editingOrderId);
        setAiSummary(summary);
        getOrderAiUsage(editingOrderId).then(setOrderAiCost).catch(() => {});
        if (summary?.chatHistory) {
          try {
            const parsed = typeof summary.chatHistory === 'string' ? JSON.parse(summary.chatHistory) : summary.chatHistory;
            if (Array.isArray(parsed)) {
              setChatMessages(parsed);
              orderChatCacheRef.current[editingOrderId] = parsed;
            }
          } catch (e) {
            console.error("Failed to parse chatHistory on refresh", e);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSelectAiPreset = (preset: 'SUMMARY' | 'SALES_ADVICE' | 'CUSTOM') => {
    setAiPromptPreset(preset);
    if (preset === 'CUSTOM') return;

    const map = getAnalysisResultsMap(aiSummary);
    if (map[preset]) {
      // Мгновенное переключение на уже сохраненный в БД ответ без запроса в сеть
      if (aiSummary) {
        setAiSummary({ ...aiSummary, aiSummary: map[preset] });
      }
    } else {
      // Первый запрос данного пресета для клиента: отправляем в AI и сохраняем
      handleRunAiAnalysis(preset, undefined, false);
    }
  };

  const handleRunAiAnalysis = async (preset: 'SUMMARY' | 'SALES_ADVICE' | 'CUSTOM', promptOverride?: string, force = false) => {
    if (!editingOrderId) return;

    let promptToSend = SYSTEM_PROMPT_SUMMARY;
    if (preset === 'SALES_ADVICE') {
      promptToSend = SYSTEM_PROMPT_SALES_ADVICE;
    } else if (preset === 'CUSTOM') {
      promptToSend = promptOverride !== undefined ? promptOverride : (customSystemPrompt.trim() || SYSTEM_PROMPT_SUMMARY);
    }

    setAiPromptPreset(preset);

    const map = getAnalysisResultsMap(aiSummary);
    if (!force && preset !== 'CUSTOM' && map[preset]) {
      if (aiSummary) {
        setAiSummary({ ...aiSummary, aiSummary: map[preset] });
      }
      return;
    }

    setIsAnalyzingAudio(true);
    try {
      const updated = await analyzeAudioWithPrompt(editingOrderId, promptToSend, preset, force);
      setAiSummary(updated);
      getOrderAiUsage(editingOrderId).then(setOrderAiCost).catch(() => {});
    } catch (err: any) {
      console.error("Failed to run AI analysis", err);
      alert(err.response?.data?.message || "Ошибка при анализе стенограммы");
    } finally {
      setIsAnalyzingAudio(false);
    }
  };

  const handleClearChat = async () => {
    if (!editingOrderId || chatMessages.length === 0) return;
    if (!window.confirm('Очистить историю диалога с AI по этой заявке?')) return;
    setChatMessages([]);
    orderChatCacheRef.current[editingOrderId] = [];
    try {
      await clearOrderAiChat(editingOrderId);
      if (aiSummary) {
        setAiSummary({ ...aiSummary, chatHistory: undefined });
      }
      getOrderAiUsage(editingOrderId).then(setOrderAiCost).catch(() => {});
    } catch (err) {
      console.error("Failed to clear AI chat in DB", err);
    }
  };

  const handleSendChatMessage = async (textToSend?: string) => {
    const text = (textToSend || chatInputText).trim();
    if (!text || !editingOrderId || isChatReplying) return;

    setChatInputText('');
    const userMsg: ChatMessage = {
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newHistory = [...chatMessages, userMsg];
    setChatMessages(newHistory);
    orderChatCacheRef.current[editingOrderId] = newHistory;
    setIsChatReplying(true);

    try {
      const res = await chatWithOrderAi(editingOrderId, SYSTEM_PROMPT_CHAT_ASSISTANT, chatMessages, text);
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        text: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        tokensUsed: res.tokensUsed,
        costRubles: res.costRubles
      };
      const finalHistory = res.messages && res.messages.length > 0 ? res.messages : [...newHistory, assistantMsg];
      setChatMessages(finalHistory);
      orderChatCacheRef.current[editingOrderId] = finalHistory;
      getOrderAiUsage(editingOrderId).then(setOrderAiCost).catch(() => {});
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      console.error("Failed to chat with AI", err);
      const errorMsg: ChatMessage = {
        role: 'assistant',
        text: "⚠️ " + (err.response?.data?.message || "Не удалось получить ответ от AI. Попробуйте еще раз."),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      const finalHistory = [...newHistory, errorMsg];
      setChatMessages(finalHistory);
      orderChatCacheRef.current[editingOrderId] = finalHistory;
    } finally {
      setIsChatReplying(false);
    }
  };

  const handleExportChatTxt = () => {
    if (!editingOrderId) return;
    const orderNum = formData.orderNumber || editingOrderId;
    const nowStr = new Date().toLocaleString();
    const totalTokens = chatMessages.reduce((sum, m) => sum + (m.tokensUsed || 0), 0);
    const totalCost = chatMessages.reduce((sum, m) => sum + (m.costRubles || 0), 0);

    let content = `=== ДИАЛОГ С AI-АССИСТЕНТОМ ПО ЗАКАЗУ №${orderNum} ===\n`;
    content += `Дата выгрузки: ${nowStr}\n`;
    content += `Адрес: ${formData.address || '—'}\n`;
    if (totalTokens > 0) {
      content += `Расход токенов (YandexGPT): ${totalTokens} ток. (~${totalCost.toFixed(2)} ₽)\n`;
    }
    content += `\n`;

    if (aiSummary?.rawTranscript) {
      content += `--- СТЕНОГРАММА ЗВОНКА С КЛИЕНТОМ ---\n${aiSummary.rawTranscript}\n\n`;
    }

    content += `--- ИСТОРИЯ ПЕРЕПИСКИ В ЧАТЕ (СЕССИЯ) ---\n`;
    if (chatMessages.length === 0) {
      content += `(Чат пуст)\n`;
    } else {
      chatMessages.forEach(m => {
        const roleLabel = m.role === 'user' ? 'МЕНЕДЖЕР' : 'AI-АССИСТЕНТ';
        const costStr = (m.tokensUsed && m.tokensUsed > 0) ? ` [${m.tokensUsed} ток. • ~${(m.costRubles || 0).toFixed(2)} ₽]` : '';
        content += `[${m.timestamp || ''}] ${roleLabel}${costStr}:\n${m.text}\n\n`;
      });
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AI_Диалог_Заказ_${orderNum}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyTextWithToast = (text: string, label = "Скопировано в буфер") => {
    navigator.clipboard.writeText(text);
    setCopyFeedbackText(label);
    setTimeout(() => setCopyFeedbackText(null), 2500);
  };

  const handleSaveColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingColumnId) {
        await updateOrderStatus(editingColumnId, {
          name: newColumnName,
          color: newColumnColor,
          includeInFinances: newColumnIncludeInFinances
        });
      } else {
        await createOrderStatus({
          name: newColumnName,
          color: newColumnColor,
          sortOrder: columns.length + 1,
          includeInFinances: newColumnIncludeInFinances
        });
      }
      setIsColumnModalOpen(false);
      setEditingColumnId(null);
      setNewColumnName('');
      setNewColumnColor('#3b82f6');
      setNewColumnIncludeInFinances(true);
      fetchData();
    } catch (err) {
      console.error("Failed to save column", err);
    }
  };

  const openColumnEditModal = (col: OrderStatus) => {
    setEditingColumnId(col.id);
    setNewColumnName(col.name);
    setNewColumnColor(col.color || '#3b82f6');
    setNewColumnIncludeInFinances(col.includeInFinances !== false);
    setIsColumnModalOpen(true);
  };

  const openColumnAddModal = () => {
    setEditingColumnId(null);
    setNewColumnName('');
    setNewColumnColor('#3b82f6');
    setNewColumnIncludeInFinances(true);
    setIsColumnModalOpen(true);
  };

  const handleDeleteColumn = async (id: number) => {
    if (cards.some(c => c.statusId === id)) {
      alert(t('kanban.deleteColumnError'));
      return;
    }
    if (window.confirm(t('kanban.deleteColumnConfirm'))) {
      try {
        await deleteOrderStatus(id);
        fetchData();
      } catch (err) {
        console.error("Failed to delete column", err);
        alert(t('kanban.deleteColumnError'));
      }
    }
  };

  const addMaterialRow = () => {
    if (allMaterials.length === 0) return;
    setFormData({
      ...formData,
      materials: [
        ...formData.materials, 
        { materialId: allMaterials[0].id, quantity: 1 }
      ]
    });
  };

  const updateMaterialRow = (index: number, field: string, value: string | number) => {
    const updated = [...formData.materials];
    if (field === 'materialId') updated[index].materialId = typeof value === 'number' ? value : parseInt(value);
    if (field === 'quantity') updated[index].quantity = typeof value === 'number' ? value : (parseFloat(value) || 0);
    setFormData({ ...formData, materials: updated });
  };

  const removeMaterialRow = (index: number) => {
    const updated = formData.materials.filter((_, i) => i !== index);
    setFormData({ ...formData, materials: updated });
  };

  const getContractParams = (): ContractParams => {
    return formData.contractParams ? {
      ...formData.contractParams,
      actChecklist: mergeActChecklist(formData.contractParams.actChecklist)
    } : {
      area: '70,3',
      perimeter: '110,5',
      canvasesCount: '5',
      insertLength: '20',
      pipeCount: '0',
      lightsCount: '30',
      timberLength: '17',
      canvasArticle: 'Полотно Мат 303',
      discount: '',
      handoverDate: '',
      specItems: [],
      actChecklist: DEFAULT_ACT_CHECKLIST.map(item => ({ ...item, checked: false }))
    };
  };

  const updateContractParam = (key: keyof ContractParams, value: any) => {
    const current = getContractParams();
    setFormData(prev => ({
      ...prev,
      contractParams: {
        ...current,
        [key]: value
      }
    }));
  };

  const addSpecRow = () => {
    const cp = getContractParams();
    const currentItems = cp.specItems || [];
    const newItem = {
      idx: currentItems.length + 1,
      name: '',
      quantity: '1',
      unit: 'шт.',
      price: 0,
      total: 0
    };
    updateContractParam('specItems', [...currentItems, newItem]);
  };

  const updateSpecRow = (idx: number, field: string, value: any) => {
    const cp = getContractParams();
    const currentItems = [...(cp.specItems || [])];
    if (!currentItems[idx]) return;
    
    const row = { ...currentItems[idx], [field]: value };
    if (field === 'quantity' || field === 'price') {
      const q = parseFloat(String(row.quantity).replace(',', '.') || '0');
      const p = parseFloat(String(row.price) || '0');
      row.total = Math.round(q * p * 100) / 100;
    }
    currentItems[idx] = row;
    updateContractParam('specItems', currentItems);
  };

  const removeSpecRow = (idx: number) => {
    const cp = getContractParams();
    const currentItems = (cp.specItems || []).filter((_, i) => i !== idx);
    updateContractParam('specItems', currentItems);
  };

  const populateSpecFromOrderMaterials = () => {
    if (formData.materials.length === 0) {
      alert('Во вкладке «Материалы» нет добавленных позиций.');
      return;
    }
    const newItems = formData.materials.map((m, idx) => {
      const mat = allMaterials.find(item => item.id === m.materialId);
      const name = mat?.name || 'Материал / Услуга';
      const unit = mat?.unit || 'шт.';
      const qty = String(m.quantity || 1);
      const price = mat?.salePrice != null && mat.salePrice > 0 ? mat.salePrice : (mat?.costPrice || 0);
      const qNum = parseFloat(qty.replace(',', '.') || '0');
      return {
        idx: idx + 1,
        name,
        quantity: qty,
        unit,
        price,
        total: Math.round(qNum * price * 100) / 100
      };
    });
    updateContractParam('specItems', newItems);
  };

  const toggleActItem = (itemId: string) => {
    const cp = getContractParams();
    const list = mergeActChecklist(cp.actChecklist);
    const updated = list.map(it => it.id === itemId ? { ...it, checked: !it.checked } : it);
    updateContractParam('actChecklist', updated);
  };

  const currentMaterialsCost = useMemo(() => {
    if (!formData.materials || formData.materials.length === 0) return 0;
    const rawCost = formData.materials.reduce((sum, m) => {
      const mat = allMaterials.find(x => x.id === m.materialId);
      if (!mat || mat.type === 'SERVICE') return sum;
      const qty = typeof m.quantity === 'string' ? (parseFloat(m.quantity) || 0) : (m.quantity || 0);
      return sum + (mat.costPrice * qty);
    }, 0);
    return Math.round(rawCost);
  }, [formData.materials, allMaterials]);

  const currentInstallationPrice = useMemo(() => {
    return Math.round(parseFloat(formData.installationPrice || '0') || 0);
  }, [formData.installationPrice]);

  const currentTotalPrice = useMemo(() => {
    const prep = parseFloat(formData.prepayment || '0') || 0;
    const rem = parseFloat(formData.remainder || '0') || 0;
    return Math.round(prep + rem);
  }, [formData.prepayment, formData.remainder]);

  const currentProfit = useMemo(() => {
    return Math.round(currentTotalPrice - currentMaterialsCost - currentInstallationPrice);
  }, [currentTotalPrice, currentMaterialsCost, currentInstallationPrice]);

  const currentProfitMargin = useMemo(() => {
    if (currentTotalPrice <= 0) return 0;
    return Math.round((currentProfit / currentTotalPrice) * 100);
  }, [currentProfit, currentTotalPrice]);

  const filteredCards = useMemo(() => {
    return cards.filter(card => {
      if (reminderFilter === 'today') {
        const cardReminders = remindersMap[card.id] || [];
        const hasToday = cardReminders.some(r => {
          if (r.status !== 'PENDING') return false;
          const d = parseUtcDate(r.remindAt) || new Date(r.remindAt);
          return d.toDateString() === new Date().toDateString();
        });
        if (!hasToday) return false;
      } else if (reminderFilter === 'overdue') {
        const cardReminders = remindersMap[card.id] || [];
        const hasOverdue = cardReminders.some(r => {
          if (r.status !== 'PENDING') return false;
          const d = parseUtcDate(r.remindAt) || new Date(r.remindAt);
          return r.isOverdue || (d.getTime() < Date.now());
        });
        if (!hasOverdue) return false;
      }

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const client = clients.find(cl => cl.id === card.clientId);
      const employee = employees.find(e => e.id === card.assigneeId);

      const orderNumMatch = card.orderNumber?.toLowerCase().includes(q) || false;
      const clientNameMatch = client?.name?.toLowerCase().includes(q) || false;
      const clientPhoneMatch = client?.phone?.includes(q) || false;
      const addressMatch = card.address?.toLowerCase().includes(q) || false;
      const descMatch = card.description?.toLowerCase().includes(q) || false;
      const employeeMatch = employee?.name?.toLowerCase().includes(q) || false;
      const idMatch = card.id.toString() === q || `№${card.id}` === q;

      return orderNumMatch || clientNameMatch || clientPhoneMatch || addressMatch || descMatch || employeeMatch || idMatch;
    });
  }, [cards, reminderFilter, remindersMap, searchQuery, clients, employees]);

  const displayedColumns = useMemo(() => {
    if (!hideEmptyColumns) return columns;
    return columns.filter(col => {
      return filteredCards.some(c => c.statusId === col.id);
    });
  }, [columns, hideEmptyColumns, filteredCards]);

  const isDirty = useMemo(() => {
    if (!isModalOpen) return false;
    if (!editingOrderId) {
      return !!(
        (formData.clientId && formData.clientId !== '') ||
        (formData.address && formData.address.trim() !== '') ||
        (formData.description && formData.description.trim() !== '') ||
        (formData.totalPrice && formData.totalPrice !== '') ||
        (formData.prepayment && formData.prepayment !== '') ||
        (formData.remainder && formData.remainder !== '') ||
        (formData.installationPrice && formData.installationPrice !== '') ||
        (formData.installationDate && formData.installationDate !== '') ||
        (formData.measurementDate && formData.measurementDate !== '') ||
        formData.materials.length > 0 ||
        pendingFiles.length > 0
      );
    }
    if (!initialFormDataJson) return false;
    const currentJson = JSON.stringify({ formData, pendingFilesCount: pendingFiles.length });
    return currentJson !== initialFormDataJson;
  }, [isModalOpen, editingOrderId, formData, pendingFiles.length, initialFormDataJson]);

  const renderCard = (card: Order) => {
    const client = clients.find(cl => cl.id === card.clientId);
    const cName = card.clientName || client?.name || `Клиент #${card.clientId}`;
    const cPhone = card.clientPhone || client?.phone;
    const cType = card.clientType || client?.clientType;
    const isLegal = cType === 'LEGAL_ENTITY';

    const assignee = employees.find(e => e.id === card.assigneeId);
    const installer = employees.find(e => e.id === card.installedById || e.name === card.installedByName);
    const instName = card.installedByName || installer?.name;

    const cardReminders = remindersMap[card.id] || [];
    const pendingReminders = cardReminders.filter(r => r.status === 'PENDING');
    const isOverdue = pendingReminders.some(r => r.isOverdue);
    const isToday = pendingReminders.some(r => {
      const d = new Date(r.remindAt);
      return d.toDateString() === new Date().toDateString();
    });
    const nearestReminder = pendingReminders[0];
    const reminderTimeStr = nearestReminder ? new Date(nearestReminder.remindAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '';

    const col = columns.find(c => c.id === card.statusId);
    const isCardCompleted = col ? (
      col.name.toLowerCase().includes('заверш') ||
      col.name.toLowerCase().includes('готов') ||
      col.name.toLowerCase().includes('выполнен')
    ) : false;

    const hasAct = (card.attachments || []).some(a => isActFile(a.fileName, a.isAct));
    const canComplete = Boolean(instName) && hasAct;

    return (
      <div 
        key={card.id} 
        className={`kanban-card ${touchDraggingCard?.id === card.id ? 'is-touch-dragging-placeholder' : ''}`}
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          handleDragStart(e, card.id);
        }}
        onTouchStart={(e) => handleTouchStart(e, card)}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        onClick={() => {
          if (isClickAllowed()) {
            openEditModal(card);
          }
        }}
      >
        {/* 1. Header: Client Avatar + #ID + Client Name + (Phone + Assignee Avatar) */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '6px', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', minWidth: 0, flex: 1 }}>
            {/* Client Avatar */}
            <div 
              className="card-client-avatar"
              style={{
                overflow: 'hidden',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                background: (card.clientAvatarUrl || client?.avatarUrl) ? 'transparent' : '#0047ab',
                flexShrink: 0,
                marginTop: '1px'
              }}
            >
              {(card.clientAvatarUrl || client?.avatarUrl) ? (
                <img 
                  src={card.clientAvatarUrl || client?.avatarUrl} 
                  alt={cName} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              ) : (
                isLegal ? <Building2 size={14} /> : getClientInitials(cName)
              )}
            </div>

            {/* Client Info Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px', flexWrap: 'wrap' }}>
                {/* Order #ID */}
                <span className="card-order-id" style={{ flexShrink: 0 }}>
                  #{card.id}
                </span>

                {/* Client Name (wrapping by words) */}
                <span className="card-client-name">
                  {cName}
                </span>
              </div>

              {/* Badges row under name: Contract number & Reminders */}
              {(card.orderNumber || pendingReminders.length > 0) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                  {card.orderNumber && (
                    <span 
                      style={{
                        fontSize: '0.68rem',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        background: 'rgba(34, 197, 94, 0.15)',
                        color: '#16a34a',
                        padding: '1px 5px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid rgba(34, 197, 94, 0.3)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}
                      title="Номер договора"
                    >
                      <FileText size={9} />
                      № {card.orderNumber}
                    </span>
                  )}

                  {pendingReminders.length > 0 && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '1px 5px',
                        borderRadius: 'var(--radius-sm)',
                        background: isOverdue ? 'rgba(239, 68, 68, 0.18)' : (isToday ? 'rgba(245, 158, 11, 0.18)' : 'rgba(59, 130, 246, 0.15)'),
                        color: isOverdue ? '#ef4444' : (isToday ? '#f59e0b' : '#60a5fa'),
                        border: isOverdue ? '1px solid rgba(239, 68, 68, 0.35)' : (isToday ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid rgba(59, 130, 246, 0.3)'),
                        cursor: 'default'
                      }}
                      title={`Напоминание: ${nearestReminder.comment || 'Звонок'} (${reminderTimeStr})`}
                    >
                      <Bell size={10} />
                      {pendingReminders.length > 1 ? pendingReminders.length : ''}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Header: Phone button + Assignee Avatar (anchored to top-right) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, marginTop: '1px' }}>
            {cPhone && (
              <a
                href={`tel:${cPhone.replace(/[^\d+]/g, '')}`}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                title={`Позвонить клиенту: ${cPhone}`}
                className="card-phone-btn"
                style={{
                  borderRadius: '50%',
                  background: 'rgba(34, 197, 94, 0.15)',
                  border: '1px solid rgba(34, 197, 94, 0.35)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#22c55e',
                  textDecoration: 'none',
                  flexShrink: 0,
                  transition: 'background 0.15s ease'
                }}
              >
                <Phone size={14} />
              </a>
            )}

            {client?.whatsapp && (
              <a
                href={getWhatsAppLink(client.whatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                title={`Написать в WhatsApp: ${client.whatsapp}`}
                className="card-messenger-btn whatsapp-btn"
              >
                <MessageCircle size={14} />
              </a>
            )}

            {client?.telegram && (
              <a
                href={getTelegramLink(client.telegram)}
                target="_blank"
                rel="noopener noreferrer"
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                title={`Написать в Telegram: ${client.telegram}`}
                className="card-messenger-btn telegram-btn"
              >
                <Send size={14} />
              </a>
            )}

            {assignee && (
              <div 
                className="card-assignee-avatar"
                style={{
                  borderRadius: '50%',
                  overflow: 'hidden',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  color: '#fff',
                  background: assignee.avatarUrl ? 'transparent' : '#0891b2',
                  flexShrink: 0
                }}
                title={`Ответственный: ${assignee.name}`}
              >
                {assignee.avatarUrl ? (
                  <img src={assignee.avatarUrl} alt={assignee.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  getEmployeeInitials(assignee.name)
                )}
              </div>
            )}
          </div>
        </div>

        {/* 2. Address Row */}
        {card.address && (
          <div style={{ marginBottom: '6px' }}>
            <div className="card-address-row">
              <MapPin size={14} style={{ flexShrink: 0, opacity: 0.8, color: 'var(--accent-primary)' }} />
              <span style={{ fontWeight: 500 }}>
                {card.address}
                {card.entrance ? `, п.${card.entrance}` : ''}
                {card.floor ? `, эт.${card.floor}` : ''}
              </span>
            </div>

            {/* 3. Map Buttons */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
              <a
                href={getYandexMapsUrl(card.address, card.entrance, card.floor)}
                target="_blank"
                rel="noopener noreferrer"
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                title="Маршрут в Яндекс.Картах / Навигаторе"
                className="kanban-map-pill"
                style={{
                  color: '#fc3f1d',
                  borderColor: 'rgba(252, 63, 29, 0.35)',
                  background: 'rgba(252, 63, 29, 0.08)'
                }}
              >
                <span style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: '#fc3f1d',
                  color: '#fff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '9px',
                  fontWeight: 800
                }}>
                  Я
                </span>
                <span style={{ fontWeight: 600 }}>Яндекс</span>
              </a>

              <a
                href={get2GisUrl(card.address, card.entrance, card.floor)}
                target="_blank"
                rel="noopener noreferrer"
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                title="Маршрут в 2ГИС"
                className="kanban-map-pill"
                style={{
                  color: '#22c55e',
                  borderColor: 'rgba(34, 197, 94, 0.35)',
                  background: 'rgba(34, 197, 94, 0.08)'
                }}
              >
                <span style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: '#22c55e',
                  color: '#fff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '9px',
                  fontWeight: 800
                }}>
                  2Г
                </span>
                <span style={{ fontWeight: 600 }}>2ГИС</span>
              </a>
            </div>
          </div>
        )}

        {/* 4. Description */}
        {card.description && (
          <div className="card-desc" title={card.description}>
            {card.description}
          </div>
        )}

        {/* Measurement Date (if scheduled) */}
        {card.measurementDate && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#a78bfa', background: 'rgba(167, 139, 250, 0.1)', padding: '2px 6px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(167, 139, 250, 0.2)', marginBottom: '6px', fontSize: '0.75rem' }}>
            <Ruler size={11} />
            <span>Замер: {formatDateTimeInTimezone(card.measurementDate)}</span>
          </div>
        )}

        {/* 5. Finance / Price Block */}
        <div className="kanban-finance-box">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="card-price-main">
              {(card.totalPrice != null && card.totalPrice > 0) ? `${card.totalPrice.toLocaleString('ru-RU')} ₽` : '0 ₽'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {card.attachments && card.attachments.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <Paperclip size={12} /> {card.attachments.length}
                </div>
              )}
              {card.profitMargin != null && card.profitMargin > 0 && (
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#16a34a' }}>
                  +{card.profitMargin.toFixed(1)}%
                </span>
              )}
            </div>
          </div>

          <div className="card-finance-sub">
            <span>Аванс: <strong style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{(card.prepayment || 0).toLocaleString('ru-RU')} ₽</strong></span>
            <span style={{ margin: '0 8px', opacity: 0.35 }}>|</span>
            <span>Остаток: <strong style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{((card.remainder != null ? card.remainder : card.totalPrice) || 0).toLocaleString('ru-RU')} ₽</strong></span>
          </div>
        </div>

        {/* 6. Installer Row */}
        {instName && (
          <div className="card-installer-row">
            {/* Installer Avatar */}
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              overflow: 'hidden',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.65rem',
              fontWeight: 700,
              color: '#fff',
              background: installer?.avatarUrl ? 'transparent' : '#065f46',
              flexShrink: 0
            }}>
              {installer?.avatarUrl ? (
                <img src={installer.avatarUrl} alt={instName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                getEmployeeInitials(instName)
              )}
            </div>

            {/* Wrench icon + Installer name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Wrench size={14} style={{ color: '#16a34a' }} />
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {instName}
              </span>
            </div>
          </div>
        )}

        {/* 7. Complete Installation Button / Status */}
        {isCardCompleted ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '6px 12px',
            background: 'rgba(34, 197, 94, 0.12)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '8px',
            color: '#16a34a',
            fontSize: '0.82rem',
            fontWeight: 600,
            width: '100%',
            boxSizing: 'border-box'
          }}>
            <CheckCircle2 size={14} /> Монтаж завершен {card.installedAt ? `(${formatDateOnly(card.installedAt)})` : ''}
          </div>
        ) : (
          <button
            type="button"
            disabled={!canComplete}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            onClick={(e) => handleCompleteInstallation(e, card.id)}
            className="card-complete-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: canComplete ? '#16a34a' : 'rgba(255, 255, 255, 0.08)',
              border: canComplete ? 'none' : '1px solid var(--glass-border)',
              color: canComplete ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: 600,
              width: '100%',
              cursor: canComplete ? 'pointer' : 'not-allowed',
              opacity: canComplete ? 1 : 0.55,
              transition: 'all 0.15s ease',
              boxSizing: 'border-box'
            }}
            title={!Boolean(instName) ? 'Назначьте монтажника в карточке' : (!hasAct ? 'Прикрепите Акт выполненных работ' : 'Завершить монтаж')}
          >
            <CheckCircle2 size={15} /> Завершить монтаж
          </button>
        )}
      </div>
    );
  };

  if (loading) {
    return <div style={{padding: 24}}>Loading board...</div>;
  }

  return (
    <div className="kanban-wrapper">
      <div className="kanban-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0 }}>{t('kanban.title')}</h1>
          
          <button
            type="button"
            onClick={() => navigate('/calendar')}
            className="btn btn-ghost"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-md)',
              padding: '6px 12px',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--text-primary)'
            }}
          >
            <CalendarDays size={16} style={{ color: 'var(--accent-primary)' }} />
            Календарь
          </button>

          <button
            type="button"
            onClick={() => {
              const next = !hideEmptyColumns;
              setHideEmptyColumns(next);
              localStorage.setItem('kanban_hide_empty_columns', String(next));
            }}
            className="btn btn-ghost"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              border: hideEmptyColumns ? '1px solid var(--accent-primary)' : '1px solid var(--glass-border)',
              background: hideEmptyColumns ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)',
              color: hideEmptyColumns ? 'var(--accent-primary)' : 'var(--text-secondary)',
              borderRadius: 'var(--radius-md)',
              padding: '6px 12px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
            title={hideEmptyColumns ? 'Показать все колонки статусов' : 'Скрыть колонки, в которых нет заявок'}
          >
            {hideEmptyColumns ? <Eye size={16} /> : <EyeOff size={16} />}
            <span>{hideEmptyColumns ? 'Показать все' : 'Скрыть пустые'}</span>
          </button>

          {/* Mobile View Toggle: Список | Доска (только на мобильных экранах) */}
          {isMobile && (
            <div className="kanban-mobile-view-toggle">
              <button
                type="button"
                className={`kanban-view-mode-btn ${mobileViewMode === 'list' ? 'active' : ''}`}
                onClick={() => {
                  setMobileViewMode('list');
                  localStorage.setItem('kanban_mobile_view_mode', 'list');
                }}
              >
                Список
              </button>
              <button
                type="button"
                className={`kanban-view-mode-btn ${mobileViewMode === 'board' ? 'active' : ''}`}
                onClick={() => {
                  setMobileViewMode('board');
                  localStorage.setItem('kanban_mobile_view_mode', 'board');
                }}
              >
                Доска
              </button>
            </div>
          )}

          <div className="search-input-wrapper" style={{ minWidth: '260px', maxWidth: '360px', position: 'relative' }}>
            <Search className="search-icon" size={18} />
            <input 
              type="text" 
              placeholder="Поиск по клиенту, адресу, № договора..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
              style={{ width: '100%', paddingRight: searchQuery ? '32px' : '12px' }}
            />
            {searchQuery && (
              <button 
                type="button" 
                onClick={() => setSearchQuery('')}
                className="btn-icon"
                style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', padding: '2px', color: 'var(--text-secondary)' }}
                title="Очистить поиск"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {!isWorker && (
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(255, 255, 255, 0.03)', padding: '3px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
              <button
                type="button"
                onClick={() => setReminderFilter('all')}
                style={{
                  padding: '4px 8px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  background: reminderFilter === 'all' ? 'var(--accent-primary)' : 'transparent',
                  color: reminderFilter === 'all' ? '#fff' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer'
                }}
              >
                Все
              </button>
              <button
                type="button"
                onClick={() => setReminderFilter('today')}
                style={{
                  padding: '4px 8px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  background: reminderFilter === 'today' ? 'rgba(245, 158, 11, 0.9)' : 'transparent',
                  color: reminderFilter === 'today' ? '#fff' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer'
                }}
              >
                ⏰ Сегодня
              </button>
              <button
                type="button"
                onClick={() => setReminderFilter('overdue')}
                style={{
                  padding: '4px 8px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  background: reminderFilter === 'overdue' ? 'rgba(239, 68, 68, 0.9)' : 'transparent',
                  color: reminderFilter === 'overdue' ? '#fff' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer'
                }}
              >
                🔥 Просроченные
              </button>
            </div>
          )}
        </div>

        {!isWorker && (
          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={18} /> {t('kanban.addOrder')}
          </button>
        )}
      </div>

      {/* Main Board Content: Mobile Accordion List vs Desktop/Mobile Horizontal Board */}
      {isMobile && mobileViewMode === 'list' ? (
        <div className="kanban-mobile-list-view" ref={boardRef}>
          {/* Quick Collapse/Expand Single Control */}
          {(() => {
            const allExpanded = displayedColumns.length > 0 && displayedColumns.every(col => collapsedColumns[col.id] === false);
            return (
              <div className="kanban-mobile-list-toolbar">
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  Этапы воронки ({displayedColumns.length})
                </span>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => toggleAllColumns(!allExpanded)}
                  style={{
                    fontSize: '0.76rem',
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--glass-border)',
                    background: 'rgba(255, 255, 255, 0.04)',
                    color: 'var(--text-primary)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontWeight: 500
                  }}
                >
                  {allExpanded ? (
                    <>
                      <ChevronsUp size={14} style={{ color: 'var(--accent-primary)' }} />
                      <span>Свернуть все</span>
                    </>
                  ) : (
                    <>
                      <ChevronsDown size={14} style={{ color: 'var(--accent-primary)' }} />
                      <span>Развернуть все</span>
                    </>
                  )}
                </button>
              </div>
            );
          })()}

          {displayedColumns.map(col => {
            const colCards = filteredCards.filter(c => c.statusId === col.id);
            const totalInCol = cards.filter(c => c.statusId === col.id).length;
            const isCollapsed = collapsedColumns[col.id] !== undefined ? collapsedColumns[col.id] : true;
            const isFilterActive = Boolean(searchQuery.trim()) || reminderFilter !== 'all';
            const countBadgeText = isFilterActive && (colCards.length !== totalInCol || colCards.length === 0)
              ? `${colCards.length}/${totalInCol}`
              : totalInCol;

            return (
              <div
                key={col.id}
                data-column-id={col.id}
                className={`kanban-mobile-status-group glass-panel ${touchTargetStatusId === col.id ? 'is-touch-drop-target' : ''} ${draggingColId === col.id ? 'is-column-dragging' : ''} ${touchTargetColId === col.id && draggingColId !== col.id ? 'is-column-reorder-target' : ''}`}
              >
                <div
                  className="kanban-mobile-status-header"
                  onClick={() => toggleColumnCollapse(col.id)}
                >
                  <div className="kanban-mobile-status-info">
                    <span className="dot" style={{ backgroundColor: col.color || '#3b82f6' }} />
                    <h3 className="kanban-mobile-status-title">{col.name}</h3>
                    <span 
                      className="count"
                      style={
                        reminderFilter === 'today' && colCards.length > 0
                          ? { background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', fontWeight: 700 }
                          : reminderFilter === 'overdue' && colCards.length > 0
                          ? { background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', fontWeight: 700 }
                          : undefined
                      }
                    >
                      {countBadgeText}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {!isWorker && (
                      <button
                        type="button"
                        className="btn-icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          openColumnEditModal(col);
                        }}
                        title={t('kanban.editColumn')}
                      >
                        <Edit2 size={15} />
                      </button>
                    )}
                    {!isWorker && (
                      <div
                        className="kanban-status-drag-handle"
                        title="Порядок этапов воронки (зажмите и тяните)"
                        onClick={(e) => e.stopPropagation()}
                        onTouchStart={(e) => handleHandleTouchStart(e, col.id)}
                        onTouchMove={handleHandleTouchMove}
                        onTouchEnd={handleHandleTouchEnd}
                        onTouchCancel={handleHandleTouchCancel}
                      >
                        <span className="kanban-drag-line" />
                        <span className="kanban-drag-line" />
                      </div>
                    )}
                    <ChevronDown
                      size={18}
                      className="kanban-mobile-status-chevron"
                      style={{
                        transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)',
                        transition: 'transform 0.2s ease',
                        color: 'var(--text-secondary)'
                      }}
                    />
                  </div>
                </div>

                {!isCollapsed && (
                  <div className="kanban-mobile-status-cards">
                    {colCards.length > 0 ? (
                      colCards.map(renderCard)
                    ) : (
                      <div className="kanban-mobile-status-empty">
                        {isFilterActive ? 'Нет заявок по фильтру' : 'В этом статусе нет заявок'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {!isWorker && (
            <button 
              className="kanban-column add-column-btn glass-panel" 
              onClick={openColumnAddModal}
              style={{ width: '100%', minHeight: '48px', height: '48px', cursor: 'pointer', opacity: 0.8, border: '1px dashed var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', borderRadius: 'var(--radius-md)', background: 'rgba(255, 255, 255, 0.02)' }}
            >
              <Plus size={18} />
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{t('kanban.addColumn')}</span>
            </button>
          )}
        </div>
      ) : (
        <div 
          className="kanban-board"
          ref={boardRef}
          onWheel={(e) => {
            if (e.deltaY !== 0 && !e.shiftKey) {
              const target = e.target as HTMLElement;
              const columnContent = target.closest('.column-content');
              if (columnContent) {
                const canScrollUp = e.deltaY < 0 && columnContent.scrollTop > 0;
                const canScrollDown = e.deltaY > 0 && columnContent.scrollTop + columnContent.clientHeight < columnContent.scrollHeight - 1;
                if (canScrollUp || canScrollDown) {
                  return;
                }
              }
              if (boardRef.current) {
                boardRef.current.scrollLeft += e.deltaY;
              }
            }
          }}
        >
          {displayedColumns.map(col => {
            const colCards = filteredCards.filter(c => c.statusId === col.id);
            const totalInCol = cards.filter(c => c.statusId === col.id).length;
            const isFilterActive = Boolean(searchQuery.trim()) || reminderFilter !== 'all';
            const countBadgeText = isFilterActive && (colCards.length !== totalInCol || colCards.length === 0)
              ? `${colCards.length}/${totalInCol}`
              : totalInCol;

            return (
            <div 
              key={col.id} 
              data-column-id={col.id}
              className={`kanban-column glass-panel ${touchTargetStatusId === col.id ? 'is-touch-drop-target' : ''}`}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('columnId', col.id.toString());
              }}
              onDrop={async (e) => {
                e.preventDefault();
                const cardId = e.dataTransfer.getData('cardId');
                if (cardId) {
                  handleDrop(e, col.id);
                  return;
                }
                const sourceColumnIdStr = e.dataTransfer.getData('columnId');
                if (sourceColumnIdStr) {
                  const sourceId = parseInt(sourceColumnIdStr);
                  const targetId = col.id;
                  if (sourceId !== targetId) {
                    const sourceIndex = columns.findIndex(c => c.id === sourceId);
                    const targetIndex = columns.findIndex(c => c.id === targetId);
                    if (sourceIndex > -1 && targetIndex > -1) {
                      const newColumns = [...columns];
                      const [removed] = newColumns.splice(sourceIndex, 1);
                      newColumns.splice(targetIndex, 0, removed);
                      
                      newColumns.forEach((c, index) => {
                        c.sortOrder = index + 1;
                      });
                      setColumns(newColumns);
                      
                      const firstStatus = newColumns.find(s => s.sortOrder === 1);
                      if (firstStatus) {
                        setNewOrdersCount(cards.filter(o => o.statusId === firstStatus.id).length);
                      }
                      
                      try {
                        await reorderOrderStatuses(newColumns.map(c => c.id));
                      } catch (err) {
                        console.error("Failed to reorder columns", err);
                      }
                    }
                  }
                }
              }}
              onDragOver={handleDragOver}
            >
              <div className="column-header">
                <div className="column-title">
                  <span className="dot" style={{ backgroundColor: col.color || '#3b82f6' }}></span>
                  <h3>{col.name}</h3>
                  <span 
                    className="count"
                    style={
                      reminderFilter === 'today' && colCards.length > 0
                        ? { background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', fontWeight: 700 }
                        : reminderFilter === 'overdue' && colCards.length > 0
                        ? { background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', fontWeight: 700 }
                        : undefined
                    }
                  >
                    {countBadgeText}
                  </span>
                </div>
                {!isWorker && (
                  <div style={{display: 'flex', gap: '4px'}}>
                    <button className="btn-icon" onClick={() => openColumnEditModal(col)} title={t('kanban.editColumn')}>
                      <Edit2 size={16} />
                    </button>
                    {totalInCol === 0 ? (
                      <button className="btn-icon" onClick={() => handleDeleteColumn(col.id)} title={t('kanban.modal.delete')}>
                        <Trash2 size={16} />
                      </button>
                    ) : (
                      <button className="btn-icon"><MoreVertical size={16} /></button>
                    )}
                  </div>
                )}
              </div>

              <div className="column-content">
                {colCards.map(renderCard)}
                {searchQuery.trim() && colCards.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '24px 12px', fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    Нет совпадений
                  </div>
                )}
              </div>
            </div>
            );
          })}
          
          {!isWorker && (
            <button 
              className="kanban-column add-column-btn glass-panel" 
              onClick={openColumnAddModal}
              style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minWidth: '320px', cursor: 'pointer', opacity: 0.7, border: '2px dashed var(--glass-border)' }}
            >
              <Plus size={24} style={{ marginRight: '8px' }} />
              <span style={{ fontSize: '1.1rem', fontWeight: 500 }}>{t('kanban.addColumn')}</span>
            </button>
          )}
        </div>
      )}

      {/* Mobile / Touch Drag Ghost Portal */}
      {touchDraggingCard && touchDragPosition && touchGhostData && createPortal(
        <div
          className="kanban-touch-drag-ghost"
          style={{
            left: `${touchDragPosition.x - touchGhostData.offsetX}px`,
            top: `${touchDragPosition.y - touchGhostData.offsetY}px`,
            width: `${touchGhostData.width}px`
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            {(() => {
              const client = clients.find(cl => cl.id === touchDraggingCard.clientId);
              const cName = touchDraggingCard.clientName || client?.name || `Клиент #${touchDraggingCard.clientId}`;
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', background: 'rgba(255, 255, 255, 0.06)', padding: '1px 5px', borderRadius: '4px' }}>
                    #{touchDraggingCard.id}
                  </span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                    {cName}
                  </span>
                </div>
              );
            })()}
          </div>
          {touchDraggingCard.address && (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MapPin size={12} style={{ flexShrink: 0, opacity: 0.7 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{touchDraggingCard.address}</span>
            </div>
          )}
          <div className="card-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="card-price" style={{ fontSize: '0.95rem', fontWeight: 700, color: '#4ade80' }}>
              {touchDraggingCard.totalPrice != null && touchDraggingCard.totalPrice > 0 ? `${touchDraggingCard.totalPrice.toLocaleString('ru-RU')} ₽` : '—'}
            </div>
            {(() => {
              const targetCol = columns.find(c => c.id === touchTargetStatusId);
              return targetCol ? (
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: targetCol.color || 'var(--accent-primary)', background: 'rgba(255, 255, 255, 0.08)', padding: '2px 8px', borderRadius: '12px' }}>
                  → {targetCol.name}
                </span>
              ) : null;
            })()}
          </div>
        </div>,
        document.body
      )}

      {/* Mobile Column Drag Ghost Portal */}
      {draggingColId && touchColDragPosition && createPortal(
        <div
          className="kanban-column-drag-ghost"
          style={{
            left: '16px',
            right: '16px',
            top: `${touchColDragPosition.y}px`
          }}
        >
          {(() => {
            const dragCol = columns.find(c => c.id === draggingColId);
            const targetCol = columns.find(c => c.id === touchTargetColId);
            return (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="dot" style={{ backgroundColor: dragCol?.color || '#3b82f6' }} />
                  <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    {dragCol?.name}
                  </span>
                </div>
                {targetCol && targetCol.id !== draggingColId ? (
                  <span style={{ fontSize: '0.78rem', color: 'var(--accent-primary)', fontWeight: 700, background: 'rgba(59, 130, 246, 0.15)', padding: '3px 10px', borderRadius: '12px' }}>
                    → {targetCol.name}
                  </span>
                ) : (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    Тяните вверх или вниз
                  </span>
                )}
              </>
            );
          })()}
        </div>,
        document.body
      )}

      {isModalOpen && createPortal(
        <div className="modal-overlay" onClick={handleRequestCloseModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', width: '92%', minHeight: '620px', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: 1, minWidth: 0, paddingRight: '8px' }}>
                <h2 style={{ margin: 0, whiteSpace: 'nowrap' }}>
                  {editingOrderId ? `Заявка #${editingOrderId}` : 'Новая заявка'}
                </h2>
                
                {/* Status Dropdown in Modal Header */}
                <div className="modal-header-status-badge">
                  <span 
                    className="dot" 
                    style={{ 
                      backgroundColor: columns.find(c => c.id.toString() === formData.statusId)?.color || '#3b82f6',
                      flexShrink: 0
                    }} 
                  />
                  <span className="modal-header-status-text">
                    {columns.find(c => c.id.toString() === formData.statusId)?.name || columns[0]?.name || 'Статус'}
                  </span>
                  <select 
                    value={formData.statusId}
                    onChange={(e) => setFormData({...formData, statusId: e.target.value})}
                    className="modal-header-status-select"
                    title="Статус заявки"
                  >
                    {columns.map(col => (
                      <option key={col.id} value={col.id.toString()}>{col.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="modal-header-status-icon" size={14} />
                </div>
              </div>

              <button 
                type="button" 
                onClick={handleRequestCloseModal} 
                className="btn-icon"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              {/* Tabs Navigation */}
              <div style={{
                display: 'flex',
                borderBottom: '1px solid var(--glass-border)',
                padding: '0 12px',
                gap: '4px',
                background: 'rgba(255, 255, 255, 0.02)',
                overflowX: 'auto',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none',
                flexShrink: 0
              }}>
                <button
                  type="button"
                  onClick={() => setOrderModalTab('MAIN')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderBottom: orderModalTab === 'MAIN' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                    color: orderModalTab === 'MAIN' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    fontWeight: orderModalTab === 'MAIN' ? 600 : 400,
                    padding: '10px 14px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
                >
                  <User size={15} /> Основное
                </button>
                {!isWorker && hasContractTemplates && (
                  <button
                    type="button"
                    onClick={() => setOrderModalTab('CONTRACT')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      borderBottom: orderModalTab === 'CONTRACT' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                      color: orderModalTab === 'CONTRACT' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      fontWeight: orderModalTab === 'CONTRACT' ? 600 : 400,
                      padding: '10px 14px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap',
                      flexShrink: 0
                    }}
                  >
                    <FileText size={15} /> Договор
                    {formData.orderNumber ? (
                      <span style={{ fontSize: '0.72rem', background: 'rgba(34, 197, 94, 0.18)', color: '#4ade80', padding: '1px 6px', borderRadius: '8px', fontWeight: 600 }}>
                        {formData.orderNumber}
                      </span>
                    ) : null}
                  </button>
                )}
                {!isWorker && hasStorage && (
                  <button
                    type="button"
                    onClick={() => setOrderModalTab('MATERIALS')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      borderBottom: orderModalTab === 'MATERIALS' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                      color: orderModalTab === 'MATERIALS' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      fontWeight: orderModalTab === 'MATERIALS' ? 600 : 400,
                      padding: '10px 14px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap',
                      flexShrink: 0
                    }}
                  >
                    <Tag size={15} /> {t('kanban.modal.materials') || 'Каталог'} {formData.materials.length > 0 && `(${formData.materials.length})`}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOrderModalTab('FILES')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderBottom: orderModalTab === 'FILES' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                    color: orderModalTab === 'FILES' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    fontWeight: orderModalTab === 'FILES' ? 600 : 400,
                    padding: '10px 14px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
                >
                  <Paperclip size={15} /> Файлы {(formData.attachments.length + pendingFiles.length) > 0 && `(${formData.attachments.length + pendingFiles.length})`}
                </button>
                {!isWorker && editingOrderId && hasAiSummary && (
                  <button
                    type="button"
                    onClick={() => setOrderModalTab('AI')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      borderBottom: orderModalTab === 'AI' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                      color: orderModalTab === 'AI' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      fontWeight: orderModalTab === 'AI' ? 600 : 400,
                      padding: '10px 14px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap',
                      flexShrink: 0
                    }}
                  >
                    <Mic size={15} /> AI анализ звонков
                  </button>
                )}
              </div>

              <div className="modal-body" style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', padding: '16px 20px' }}>
                {/* 1. ОСНОВНОЕ */}
                {orderModalTab === 'MAIN' && (
                  <>
                    <div className="form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label style={{ margin: 0 }}>{t('kanban.modal.client')}</label>
                        {!editingOrderId && !isWorker && (
                          <button 
                            type="button" 
                            onClick={() => setIsNewClientModalOpen(true)}
                            className="btn-icon"
                            style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 6px' }}
                          >
                            <Plus size={14} /> {t('clients.addClient') || 'Новый клиент'}
                          </button>
                        )}
                      </div>
                      {editingOrderId ? (() => {
                        const currentOrder = cards.find(c => c.id === editingOrderId);
                        const selectedClient = clients.find(c => c.id.toString() === formData.clientId);
                        const cName = currentOrder?.clientName || selectedClient?.name || 'Клиент';
                        const cPhone = currentOrder?.clientPhone || selectedClient?.phone;
                        const cType = currentOrder?.clientType || selectedClient?.clientType;
                        const cAvatar = currentOrder?.clientAvatarUrl || selectedClient?.avatarUrl;
                        const isLegal = cType === 'LEGAL_ENTITY';
                        const leadSource = selectedClient?.leadSource;

                        return (
                          <div style={{
                            padding: '10px 14px',
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: 'var(--radius-sm)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '8px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                                background: cAvatar ? 'transparent' : getAvatarGradient(cName || (isLegal ? 'Компания' : 'Клиент')),
                                border: '1.5px solid rgba(255, 255, 255, 0.15)',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                                flexShrink: 0
                              }}>
                                {cAvatar ? (
                                  <img 
                                    src={cAvatar} 
                                    alt={cName} 
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                  />
                                ) : (
                                  isLegal ? <Building2 size={18} /> : getClientInitials(cName)
                                )}
                              </div>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                  <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{cName}</span>
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
                                    gap: '3px'
                                  }}>
                                    {isLegal ? '🏢 Юр. лицо' : '👤 Физ. лицо'}
                                  </span>
                                  {leadSource && (
                                    <span style={{
                                      padding: '2px 8px',
                                      fontSize: '0.72rem',
                                      color: '#60a5fa',
                                      background: 'rgba(59, 130, 246, 0.1)',
                                      border: '1px solid rgba(59, 130, 246, 0.25)',
                                      borderRadius: '4px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      whiteSpace: 'nowrap',
                                      flexShrink: 0
                                    }}>
                                      <Tag size={11} style={{ opacity: 0.8 }} />
                                      {leadSource}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            {cPhone && (
                              <a
                                href={`tel:${cPhone.replace(/[^\d+]/g, '')}`}
                                style={{
                                  color: '#22c55e',
                                  padding: '5px 12px',
                                  background: 'rgba(34, 197, 94, 0.12)',
                                  border: '1px solid rgba(34, 197, 94, 0.3)',
                                  borderRadius: 'var(--radius-sm)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  textDecoration: 'none',
                                  fontSize: '0.85rem',
                                  fontWeight: 600
                                }}
                                title={`Позвонить клиенту: ${cPhone}`}
                              >
                                <Phone size={14} /> {cPhone}
                              </a>
                            )}
                          </div>
                        );
                      })() : (
                        <>
                          <ClientSearchSelect
                            value={formData.clientId}
                            clients={clients}
                            onChange={(val) => setFormData({ ...formData, clientId: val })}
                            onAddNewClient={() => setIsNewClientModalOpen(true)}
                            isWorker={isWorker}
                          />
                          {(() => {
                            const selectedClient = clients.find(c => c.id.toString() === formData.clientId);
                            if (selectedClient && (selectedClient.phone || selectedClient.leadSource || selectedClient.whatsapp || selectedClient.telegram)) {
                              return (
                                <div style={{
                                  marginTop: '8px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  flexWrap: 'wrap'
                                }}>
                                  {selectedClient.phone && (
                                    <a
                                      href={`tel:${selectedClient.phone.replace(/[^\d+]/g, '')}`}
                                      style={{
                                        fontSize: '0.84rem',
                                        color: '#22c55e',
                                        textDecoration: 'none',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '5px 12px',
                                        background: 'rgba(34, 197, 94, 0.12)',
                                        border: '1px solid rgba(34, 197, 94, 0.3)',
                                        borderRadius: 'var(--radius-sm)',
                                        fontWeight: 600
                                      }}
                                      title={`Позвонить клиенту: ${selectedClient.phone}`}
                                    >
                                      <Phone size={14} /> {selectedClient.phone}
                                    </a>
                                  )}
                                  {selectedClient.whatsapp && (
                                    <a
                                      href={getWhatsAppLink(selectedClient.whatsapp)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{
                                        fontSize: '0.84rem',
                                        color: '#25D366',
                                        textDecoration: 'none',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '5px 12px',
                                        background: 'rgba(37, 211, 102, 0.12)',
                                        border: '1px solid rgba(37, 211, 102, 0.3)',
                                        borderRadius: 'var(--radius-sm)',
                                        fontWeight: 600
                                      }}
                                      title={`Написать в WhatsApp: ${selectedClient.whatsapp}`}
                                    >
                                      <MessageCircle size={14} /> WhatsApp
                                    </a>
                                  )}
                                  {selectedClient.telegram && (
                                    <a
                                      href={getTelegramLink(selectedClient.telegram)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{
                                        fontSize: '0.84rem',
                                        color: '#0088cc',
                                        textDecoration: 'none',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '5px 12px',
                                        background: 'rgba(0, 136, 204, 0.12)',
                                        border: '1px solid rgba(0, 136, 204, 0.3)',
                                        borderRadius: 'var(--radius-sm)',
                                        fontWeight: 600
                                      }}
                                      title={`Написать в Telegram: ${selectedClient.telegram}`}
                                    >
                                      <Send size={14} /> Telegram
                                    </a>
                                  )}
                                  {selectedClient.leadSource && (
                                    <span style={{
                                      padding: '4px 10px',
                                      fontSize: '0.78rem',
                                      color: '#60a5fa',
                                      background: 'rgba(59, 130, 246, 0.1)',
                                      border: '1px solid rgba(59, 130, 246, 0.25)',
                                      borderRadius: 'var(--radius-sm)',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}>
                                      <Tag size={12} style={{ opacity: 0.8 }} />
                                      Источник: {selectedClient.leadSource}
                                    </span>
                                  )}
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </>
                      )}
                    </div>

                    {/* Назначение сотрудников: Ответственный, Замерщик, Монтажник */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '12px',
                      marginBottom: '16px',
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
                          onChange={(val) => setFormData({ ...formData, assigneeId: val })}
                          placeholder={t('kanban.modal.selectAssignee') || 'Без ответственного'}
                          icon={<Users size={15} style={{ color: 'var(--accent-primary)' }} />}
                          accentColor="var(--accent-primary)"
                          isWorker={isWorker}
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
                          onChange={(val) => setFormData({ ...formData, measurerId: val })}
                          placeholder="Не назначен"
                          icon={<Ruler size={15} style={{ color: '#a855f7' }} />}
                          accentColor="#a855f7"
                          isWorker={isWorker}
                        />
                      </div>

                      {/* 3. Монтажник */}
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                          <Wrench size={15} style={{ color: '#22c55e' }} />
                          Монтажник
                        </label>
                        <EmployeeSearchSelect
                          value={formData.installedById}
                          employees={employees}
                          onChange={(val) => setFormData({ ...formData, installedById: val })}
                          placeholder="Не назначен"
                          icon={<Wrench size={15} style={{ color: '#22c55e' }} />}
                          accentColor="#22c55e"
                          isWorker={isWorker}
                        />
                      </div>
                    </div>

                    {/* Дополнительная инфо о завершении монтажа */}
                    {(() => {
                      const currentOrder = cards.find(c => c.id === editingOrderId);
                      const statusObj = columns.find(c => c.id.toString() === formData.statusId);
                      const isCompleted = statusObj ? (
                        statusObj.name.toLowerCase().includes('заверш') ||
                        statusObj.name.toLowerCase().includes('готов') ||
                        statusObj.name.toLowerCase().includes('выполнен')
                      ) : false;
                      const installedAt = formData.installedAt || currentOrder?.installedAt;
                      if (!isCompleted || !installedAt) return null;
                      return (
                        <div style={{
                          marginBottom: '16px',
                          padding: '8px 12px',
                          background: 'rgba(34, 197, 94, 0.06)',
                          border: '1px solid rgba(34, 197, 94, 0.2)',
                          borderRadius: 'var(--radius-sm)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '0.8rem',
                          color: '#4ade80'
                        }}>
                          <CheckCircle2 size={15} />
                          <span>Монтаж завершен: <strong>{formatDateTimeInTimezone(installedAt, tenantSettings?.timezone, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong></span>
                        </div>
                      );
                    })()}

                    {/* Баннер статуса Акта выполненных работ */}
                    {(() => {
                      const hasAct = formData.attachments.some(a => isActFile(a.fileName, a.isAct)) || pendingFiles.some(f => isActFile(f.name));
                      return (
                        <div style={{
                          marginBottom: '16px',
                          padding: '10px 14px',
                          background: hasAct ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                          border: hasAct ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
                          borderRadius: 'var(--radius-sm)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px',
                          flexWrap: 'wrap'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                            <FileCheck size={16} style={{ color: hasAct ? '#4ade80' : '#fbbf24' }} />
                            <span style={{ color: hasAct ? '#4ade80' : '#fbbf24', fontWeight: 600 }}>
                              {hasAct ? 'Акт выполненных работ прикреплен' : 'Акт выполненных работ не прикреплен'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setOrderModalTab('FILES')}
                            className="btn btn-ghost"
                            style={{ padding: '3px 8px', fontSize: '0.78rem', color: 'var(--accent-primary)', textDecoration: 'underline' }}
                          >
                            {hasAct ? 'Посмотреть во вкладке «Файлы»' : 'Перейти в «Файлы» для загрузки →'}
                          </button>
                        </div>
                      );
                    })()}

                    <div className="form-group">
                      <label>{t('kanban.modal.address')}</label>
                      {(import.meta.env.VITE_DADATA_API_KEY || '66396b2e45d9ff46356592aae66a087ead7d082e') ? (
                        <AddressSuggestions
                          token={import.meta.env.VITE_DADATA_API_KEY || '66396b2e45d9ff46356592aae66a087ead7d082e'}
                          defaultQuery={formData.address}
                          onChange={(suggestion) => setFormData({...formData, address: suggestion?.value || formData.address})}
                          inputProps={{
                            placeholder: t('kanban.modal.address'),
                            className: "search-input",
                            style: {width: '100%', paddingLeft: '12px', paddingRight: '12px', boxSizing: 'border-box'},
                            onChange: (e: any) => setFormData({...formData, address: e.target.value})
                          }}
                        />
                      ) : (
                        <input 
                          type="text" 
                          placeholder={t('kanban.modal.address')}
                          className="search-input"
                          style={{width: '100%', paddingLeft: '12px', paddingRight: '12px', boxSizing: 'border-box'}}
                          value={formData.address}
                          onChange={(e) => setFormData({...formData, address: e.target.value})}
                        />
                      )}
                      {formData.address && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                            {t('kanban.modal.route') || 'Навигатор'}:
                          </span>
                          <a
                            href={getYandexMapsUrl(formData.address, formData.entrance, formData.floor)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              padding: '5px 12px',
                              fontSize: '0.82rem',
                              fontWeight: 600,
                              color: '#fc3f1d',
                              background: 'rgba(252, 63, 29, 0.1)',
                              border: '1px solid rgba(252, 63, 29, 0.3)',
                              borderRadius: 'var(--radius-sm)',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                            title="Построить маршрут в Яндекс.Картах / Навигаторе"
                          >
                            <span style={{
                              width: '16px',
                              height: '16px',
                              borderRadius: '50%',
                              background: '#fc3f1d',
                              color: '#fff',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '9px',
                              fontWeight: 800
                            }}>
                              Я
                            </span>
                            Яндекс
                          </a>
                          <a
                            href={get2GisUrl(formData.address, formData.entrance, formData.floor)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              padding: '5px 12px',
                              fontSize: '0.82rem',
                              fontWeight: 600,
                              color: '#22c55e',
                              background: 'rgba(34, 197, 94, 0.1)',
                              border: '1px solid rgba(34, 197, 94, 0.3)',
                              borderRadius: 'var(--radius-sm)',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                            title="Построить маршрут в 2ГИС"
                          >
                            <span style={{
                              width: '16px',
                              height: '16px',
                              borderRadius: '50%',
                              background: '#22c55e',
                              color: '#fff',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '9px',
                              fontWeight: 800
                            }}>
                              2Г
                            </span>
                            2ГИС
                          </a>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                      <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                        <label>{t('kanban.modal.entrance') || 'Подъезд'}</label>
                        <input 
                          type="text" 
                          placeholder="1"
                          value={formData.entrance}
                          onChange={(e) => setFormData({...formData, entrance: e.target.value})}
                          className="search-input"
                          style={{ width: '100%', paddingLeft: '12px' }}
                        />
                      </div>
                      <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                        <label>{t('kanban.modal.floor') || 'Этаж'}</label>
                        <input 
                          type="text" 
                          placeholder="4"
                          value={formData.floor}
                          onChange={(e) => setFormData({...formData, floor: e.target.value})}
                          className="search-input"
                          style={{ width: '100%', paddingLeft: '12px' }}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>{t('kanban.modal.description') || 'Комментарии к заявке'}</label>
                      <textarea 
                        required
                        rows={3}
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        className="search-input"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          minHeight: '80px',
                          maxHeight: '300px',
                          resize: 'vertical',
                          lineHeight: '1.45',
                          fontFamily: 'inherit',
                          fontSize: '0.9rem'
                        }}
                        placeholder="Описание или комментарии к заявке..."
                      />
                    </div>

                    <div style={{display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px'}}>
                      <div className="form-group" style={{flex: 1, minWidth: '200px'}}>
                        <label>Дата и время замера</label>
                        <input 
                          type="datetime-local" 
                          disabled={isWorker}
                          readOnly={isWorker}
                          value={formData.measurementDate}
                          onChange={(e) => setFormData({...formData, measurementDate: e.target.value})}
                          className="custom-date-input"
                          style={{width: '100%', ...(isWorker ? { opacity: 0.8, cursor: 'not-allowed', background: 'rgba(255, 255, 255, 0.03)' } : {})}}
                        />
                      </div>
                      <div className="form-group" style={{flex: 1, minWidth: '200px'}}>
                        <label>{t('kanban.modal.installationDate') || 'Дата монтажа'}</label>
                        <input 
                          type="date" 
                          disabled={isWorker}
                          readOnly={isWorker}
                          value={formData.installationDate}
                          onChange={(e) => setFormData({...formData, installationDate: e.target.value})}
                          className="custom-date-input"
                          style={{width: '100%', ...(isWorker ? { opacity: 0.8, cursor: 'not-allowed', background: 'rgba(255, 255, 255, 0.03)' } : {})}}
                        />
                      </div>
                    </div>

                    {/* Финансы */}
                    {isWorker ? (
                      <div style={{
                        background: 'rgba(59, 130, 246, 0.08)',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        borderRadius: 'var(--radius-md)',
                        padding: '14px 18px',
                        marginBottom: '16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                          Остаток к оплате по договору:
                        </span>
                        <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                          {(parseFloat(formData.remainder || '0') || 0).toLocaleString('ru-RU')} ₽
                        </span>
                      </div>
                    ) : (
                      <>
                        <div style={{
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid var(--glass-border)',
                          borderRadius: 'var(--radius-md)',
                          padding: '16px',
                          marginBottom: '16px'
                        }}>
                          <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                            Финансы и оплата
                          </h4>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label>{t('kanban.modal.installationPrice')}</label>
                              <input 
                                type="number" 
                                min="0"
                                step="0.01"
                                placeholder="0"
                                value={formData.installationPrice || ''}
                                onChange={(e) => setFormData({...formData, installationPrice: e.target.value})}
                                className="custom-number-input"
                              />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label>Аванс (₽)</label>
                              <input 
                                type="number" 
                                min="0"
                                step="0.01"
                                placeholder="0"
                                value={formData.prepayment || ''}
                                onChange={(e) => {
                                  const newPrep = e.target.value;
                                  const prepNum = parseFloat(newPrep || '0');
                                  const remNum = parseFloat(formData.remainder || '0');
                                  const sum = prepNum + remNum;
                                  setFormData({
                                    ...formData, 
                                    prepayment: newPrep,
                                    totalPrice: sum > 0 ? sum.toString() : ''
                                  });
                                }}
                                className="custom-number-input"
                              />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label>Остаток (₽)</label>
                              <input 
                                type="number" 
                                min="0"
                                step="0.01"
                                placeholder="0"
                                value={formData.remainder || ''}
                                onChange={(e) => {
                                  const newRem = e.target.value;
                                  const remNum = parseFloat(newRem || '0');
                                  const prepNum = parseFloat(formData.prepayment || '0');
                                  const sum = prepNum + remNum;
                                  setFormData({
                                    ...formData, 
                                    remainder: newRem,
                                    totalPrice: sum > 0 ? sum.toString() : ''
                                  });
                                }}
                                className="custom-number-input"
                              />
                            </div>
                          </div>

                          {/* Статусы фактической оплаты */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '14px' }}>
                            <label style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '8px 12px',
                              background: formData.prepaymentPaid ? 'rgba(34, 197, 94, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                              border: formData.prepaymentPaid ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid var(--glass-border)',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer'
                            }}>
                              <input 
                                type="checkbox"
                                checked={!!formData.prepaymentPaid}
                                onChange={(e) => setFormData({ ...formData, prepaymentPaid: e.target.checked })}
                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                              />
                              <span style={{ fontSize: '0.82rem', fontWeight: 500, color: formData.prepaymentPaid ? '#4ade80' : 'var(--text-secondary)' }}>
                                {formData.prepaymentPaid ? '✓ Аванс оплачен (в кассе)' : 'Аванс не оплачен'}
                              </span>
                            </label>

                            <label style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '8px 12px',
                              background: formData.remainderPaid ? 'rgba(34, 197, 94, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                              border: formData.remainderPaid ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid var(--glass-border)',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer'
                            }}>
                              <input 
                                type="checkbox"
                                checked={!!formData.remainderPaid}
                                onChange={(e) => setFormData({ ...formData, remainderPaid: e.target.checked })}
                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                              />
                              <span style={{ fontSize: '0.82rem', fontWeight: 500, color: formData.remainderPaid ? '#4ade80' : 'var(--text-secondary)' }}>
                                {formData.remainderPaid ? '✓ Остаток оплачен (в кассе)' : 'Остаток не оплачен'}
                              </span>
                            </label>
                          </div>

                          <div style={{
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            background: 'rgba(59, 130, 246, 0.08)', 
                            border: '1px solid rgba(59, 130, 246, 0.2)', 
                            borderRadius: 'var(--radius-sm)', 
                            padding: '10px 14px'
                          }}>
                            <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>Итого стоимость по договору:</span>
                            <span style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                              {(parseFloat(formData.prepayment || '0') + parseFloat(formData.remainder || '0')).toLocaleString('ru-RU')} ₽
                            </span>
                          </div>
                        </div>

                        {/* Финансовые показатели (Себестоимость, монтаж, прибыль, маржинальность) */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                          gap: '10px',
                          padding: '14px',
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid var(--glass-border)',
                          borderRadius: 'var(--radius-md)',
                          marginBottom: '16px'
                        }}>
                          <div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                              Себестоимость материалов
                            </div>
                            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#f59e0b' }}>
                              {currentMaterialsCost.toLocaleString('ru-RU')} ₽
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                              Монтаж
                            </div>
                            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                              {currentInstallationPrice.toLocaleString('ru-RU')} ₽
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                              {t('kanban.modal.profit') || 'Прибыль'}
                            </div>
                            <div style={{
                              fontWeight: 700,
                              fontSize: '1.05rem',
                              color: currentProfit >= 0 ? 'var(--success)' : 'var(--danger)'
                            }}>
                              {currentProfit >= 0 ? `+${currentProfit.toLocaleString('ru-RU')}` : currentProfit.toLocaleString('ru-RU')} ₽
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                              {t('kanban.modal.margin') || 'Рентабельность'}
                            </div>
                            <div style={{
                              fontWeight: 700,
                              fontSize: '1.05rem',
                              color: currentProfitMargin >= 0 ? 'var(--success)' : 'var(--danger)'
                            }}>
                              {currentProfitMargin}%
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {editingOrderId && !isWorker && (
                      <OrderRemindersSection
                        orderId={editingOrderId}
                        employees={employees}
                        onReminderCountChanged={refreshRemindersOnly}
                      />
                    )}
                  </>
                )}

                {/* 2. ДОГОВОР И СПЕЦИФИКАЦИЯ */}
                {orderModalTab === 'CONTRACT' && (
                  <>
                    {/* Шапка Договора */}
                    <div style={{
                      background: 'rgba(59, 130, 246, 0.06)',
                      border: '1px solid rgba(59, 130, 246, 0.25)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px 16px',
                      marginBottom: '18px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                        <label style={{ margin: 0, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', color: '#60a5fa', fontSize: '0.9rem' }}>
                          <FileText size={16} /> Номер и формирование договора
                        </label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const num = await getNextOrderNumber();
                                setFormData(prev => ({ ...prev, orderNumber: num }));
                              } catch (err) {
                                console.error("Failed to generate order number", err);
                              }
                            }}
                            className="btn btn-ghost"
                            style={{ padding: '4px 8px', fontSize: '0.78rem', color: 'var(--accent-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            title="Сгенерировать следующий номер по шаблону"
                          >
                            <RefreshCw size={12} /> Сгенерировать
                          </button>
                          {formData.orderNumber && (
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, orderNumber: '' }))}
                              className="btn btn-ghost"
                              style={{ padding: '4px 8px', fontSize: '0.78rem', color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              title="Очистить номер"
                            >
                              <X size={12} /> Очистить
                            </button>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', boxSizing: 'border-box' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', width: '100%', boxSizing: 'border-box' }}>
                          <div style={{ minWidth: 0 }}>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Номер договора</label>
                            <input
                              type="text"
                              placeholder="ДОГ-2026/001"
                              value={formData.orderNumber || ''}
                              onChange={e => setFormData({ ...formData, orderNumber: e.target.value })}
                              className="search-input"
                              style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'monospace', fontWeight: 700, color: '#4ade80', paddingLeft: '12px' }}
                            />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Дата создания договора</label>
                            <input
                              type="date"
                              value={getContractParams().contractDate || new Date().toISOString().slice(0, 10)}
                              onChange={e => updateContractParam('contractDate', e.target.value)}
                              className="custom-date-input"
                              style={{ width: '100%', boxSizing: 'border-box' }}
                            />
                          </div>
                        </div>
                        {(() => {
                          const selectedClient = clients.find(c => c.id.toString() === formData.clientId);
                          const isLegal = selectedClient?.clientType === 'LEGAL_ENTITY';
                          const hasTemplate = isLegal ? !!templateStatus?.legal : !!templateStatus?.individual;
                          const missingTemplateMsg = `Шаблон договора для ${isLegal ? 'юридических' : 'физических'} лиц не загружен.\n\nПожалуйста, перейдите в раздел «Шаблоны договоров» и загрузите .docx файл договора.`;

                          return (
                            <>
                              {!hasTemplate && (
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '12px',
                                  padding: '10px 14px',
                                  background: 'rgba(245, 158, 11, 0.12)',
                                  border: '1px solid rgba(245, 158, 11, 0.3)',
                                  borderRadius: 'var(--radius-sm)',
                                  color: '#fbbf24',
                                  fontSize: '0.85rem'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <AlertCircle size={18} style={{ flexShrink: 0 }} />
                                    <span>Шаблон договора для {isLegal ? 'юр. лиц' : 'физ. лиц'} не загружен</span>
                                  </div>
                                  <a 
                                    href="/contract-templates" 
                                    target="_blank" 
                                    rel="noreferrer"
                                    style={{
                                      fontSize: '0.78rem',
                                      fontWeight: 600,
                                      color: '#ffffff',
                                      background: '#f59e0b',
                                      padding: '4px 10px',
                                      borderRadius: '6px',
                                      textDecoration: 'none',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    Загрузить шаблон
                                  </a>
                                </div>
                              )}

                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                                <button
                                  type="button"
                                  onClick={handleStartGenerateContract}
                                  className="btn btn-primary"
                                  disabled={contractPromptLoading || !hasTemplate}
                                  style={{
                                    flex: 1,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    fontWeight: 600,
                                    height: '44px',
                                    fontSize: '0.92rem',
                                    opacity: !hasTemplate ? 0.55 : 1,
                                    cursor: !hasTemplate ? 'not-allowed' : 'pointer'
                                  }}
                                  title={!hasTemplate ? `Шаблон договора для ${isLegal ? 'юр. лиц' : 'физ. лиц'} не загружен. Перейдите в раздел «Шаблоны договоров».` : 'Сформировать и скачать договор в формате Word (.docx)'}
                                >
                                  <FileText size={17} /> {contractPromptLoading ? 'Формирование договора...' : 'Сформировать договор (Word)'}
                                </button>

                                {!hasTemplate && (
                                  <button
                                    type="button"
                                    onClick={() => alert(missingTemplateMsg)}
                                    style={{
                                      width: '44px',
                                      height: '44px',
                                      borderRadius: '8px',
                                      background: 'rgba(245, 158, 11, 0.15)',
                                      border: '1px solid rgba(245, 158, 11, 0.3)',
                                      color: '#fbbf24',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: 'pointer',
                                      flexShrink: 0
                                    }}
                                    title="Шаблон не загружен! Нажмите для справки"
                                  >
                                    <AlertTriangle size={18} />
                                  </button>
                                )}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Блок 1: Сводные параметры потолка */}
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px',
                      marginBottom: '18px'
                    }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Tag size={15} style={{ color: 'var(--accent-primary)' }} />
                        1. Сводные параметры потолка (Стр. 1 и Стр. 5 договора)
                      </h4>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '12px' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontSize: '0.78rem' }}>Площадь (м²)</label>
                          <input
                            type="text"
                            placeholder="70,3"
                            value={getContractParams().area || ''}
                            onChange={(e) => updateContractParam('area', e.target.value)}
                            className="search-input"
                            style={{ width: '100%', paddingLeft: '10px' }}
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontSize: '0.78rem' }}>Периметр (м/п)</label>
                          <input
                            type="text"
                            placeholder="110,5"
                            value={getContractParams().perimeter || ''}
                            onChange={(e) => updateContractParam('perimeter', e.target.value)}
                            className="search-input"
                            style={{ width: '100%', paddingLeft: '10px' }}
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontSize: '0.78rem' }}>Кол-во полотен</label>
                          <input
                            type="text"
                            placeholder="5"
                            value={getContractParams().canvasesCount || ''}
                            onChange={(e) => updateContractParam('canvasesCount', e.target.value)}
                            className="search-input"
                            style={{ width: '100%', paddingLeft: '10px' }}
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontSize: '0.78rem' }}>Вставка (м/п)</label>
                          <input
                            type="text"
                            placeholder="20"
                            value={getContractParams().insertLength || ''}
                            onChange={(e) => updateContractParam('insertLength', e.target.value)}
                            className="search-input"
                            style={{ width: '100%', paddingLeft: '10px' }}
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontSize: '0.78rem' }}>Обвод труб (шт)</label>
                          <input
                            type="text"
                            placeholder="0"
                            value={getContractParams().pipeCount || ''}
                            onChange={(e) => updateContractParam('pipeCount', e.target.value)}
                            className="search-input"
                            style={{ width: '100%', paddingLeft: '10px' }}
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontSize: '0.78rem' }}>Свет. пр. (точек)</label>
                          <input
                            type="text"
                            placeholder="30"
                            value={getContractParams().lightsCount || ''}
                            onChange={(e) => updateContractParam('lightsCount', e.target.value)}
                            className="search-input"
                            style={{ width: '100%', paddingLeft: '10px' }}
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontSize: '0.78rem' }}>Брус (м/п)</label>
                          <input
                            type="text"
                            placeholder="17"
                            value={getContractParams().timberLength || ''}
                            onChange={(e) => updateContractParam('timberLength', e.target.value)}
                            className="search-input"
                            style={{ width: '100%', paddingLeft: '10px' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontSize: '0.78rem' }}>Артикул полотна (фактура)</label>
                          <input
                            type="text"
                            placeholder="Полотно Мат 303"
                            value={getContractParams().canvasArticle || ''}
                            onChange={(e) => updateContractParam('canvasArticle', e.target.value)}
                            className="search-input"
                            style={{ width: '100%', paddingLeft: '10px' }}
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontSize: '0.78rem' }}>Дата сдачи объекта (Приложение №1)</label>
                          <input
                            type="text"
                            placeholder="« 20 » августа 2026г."
                            value={getContractParams().handoverDate || ''}
                            onChange={(e) => updateContractParam('handoverDate', e.target.value)}
                            className="search-input"
                            style={{ width: '100%', paddingLeft: '10px' }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Блок 2: Спецификация товаров и услуг */}
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px',
                      marginBottom: '18px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <FileText size={15} style={{ color: '#4ade80' }} />
                          2. Спецификация товаров и услуг (Приложение №4)
                        </h4>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={populateSpecFromOrderMaterials}
                            className="btn btn-ghost"
                            style={{ padding: '4px 10px', fontSize: '0.78rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title="Заполнить из вкладки Материалы"
                          >
                            <RefreshCw size={12} /> Заполнить из материалов
                          </button>
                          <button
                            type="button"
                            onClick={addSpecRow}
                            className="btn btn-ghost"
                            style={{ padding: '4px 10px', fontSize: '0.78rem', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Plus size={13} /> + Строка
                          </button>
                        </div>
                      </div>

                      {(getContractParams().specItems || []).length > 0 ? (
                        <>
                          {/* Mobile Card Layout */}
                          <div className="spec-mobile-cards">
                            {(getContractParams().specItems || []).map((it, idx) => (
                              <div key={idx} className="spec-card">
                                <div className="spec-card-header">
                                  <span className="spec-card-num">#{idx + 1}</span>
                                  <input
                                    type="text"
                                    value={it.name}
                                    onChange={e => updateSpecRow(idx, 'name', e.target.value)}
                                    placeholder="Наименование (товар или услуга)..."
                                    className="spec-card-name-input"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeSpecRow(idx)}
                                    className="spec-card-delete-btn"
                                    title="Удалить позицию"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                                <div className="spec-card-grid">
                                  <div className="spec-card-field">
                                    <label>Кол-во</label>
                                    <input
                                      type="text"
                                      value={it.quantity}
                                      onChange={e => updateSpecRow(idx, 'quantity', e.target.value)}
                                      placeholder="1"
                                    />
                                  </div>
                                  <div className="spec-card-field">
                                    <label>Ед. изм.</label>
                                    <select
                                      value={it.unit || 'м²'}
                                      onChange={e => updateSpecRow(idx, 'unit', e.target.value)}
                                      style={{
                                        width: '100%',
                                        height: '36px',
                                        borderRadius: 'var(--radius-sm)',
                                        background: 'var(--input-bg)',
                                        border: '1px solid var(--glass-border)',
                                        color: 'var(--text-primary)',
                                        padding: '0 6px',
                                        cursor: 'pointer',
                                        appearance: 'auto'
                                      }}
                                    >
                                      <option value="м²">м²</option>
                                      <option value="м.пог">м.пог</option>
                                      <option value="шт.">шт.</option>
                                    </select>
                                  </div>
                                  <div className="spec-card-field">
                                    <label>Цена (₽)</label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={it.price}
                                      onChange={e => updateSpecRow(idx, 'price', e.target.value)}
                                      placeholder="0"
                                    />
                                  </div>
                                  <div className="spec-card-field spec-card-sum-box">
                                    <label>Сумма</label>
                                    <div className="spec-card-sum-val">
                                      {(it.total || 0).toLocaleString('ru-RU')} ₽
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Desktop Table Layout */}
                          <div className="spec-desktop-table">
                            <table className="spec-table">
                              <thead>
                                <tr>
                                  <th style={{ width: '35px' }}>№</th>
                                  <th>Наименование</th>
                                  <th style={{ width: '80px' }}>Кол-во</th>
                                  <th style={{ width: '70px' }}>Ед.</th>
                                  <th style={{ width: '110px' }}>Цена (₽)</th>
                                  <th style={{ width: '120px' }}>Сумма (₽)</th>
                                  <th style={{ width: '40px' }}></th>
                                </tr>
                              </thead>
                              <tbody>
                                {(getContractParams().specItems || []).map((it, idx) => (
                                  <tr key={idx}>
                                    <td style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{idx + 1}</td>
                                    <td>
                                      <input
                                        type="text"
                                        value={it.name}
                                        onChange={e => updateSpecRow(idx, 'name', e.target.value)}
                                        placeholder="Полотно / Монтаж..."
                                        className="spec-table-input"
                                      />
                                    </td>
                                    <td>
                                      <input
                                        type="text"
                                        value={it.quantity}
                                        onChange={e => updateSpecRow(idx, 'quantity', e.target.value)}
                                        placeholder="1"
                                        className="spec-table-input"
                                      />
                                    </td>
                                    <td>
                                      <select
                                        value={it.unit || 'м²'}
                                        onChange={e => updateSpecRow(idx, 'unit', e.target.value)}
                                        className="spec-table-input"
                                        style={{
                                          width: '100%',
                                          padding: '4px 2px',
                                          textAlign: 'center',
                                          cursor: 'pointer',
                                          appearance: 'auto'
                                        }}
                                      >
                                        <option value="м²">м²</option>
                                        <option value="м.пог">м.пог</option>
                                        <option value="шт.">шт.</option>
                                      </select>
                                    </td>
                                    <td>
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={it.price}
                                        onChange={e => updateSpecRow(idx, 'price', e.target.value)}
                                        className="spec-table-input"
                                      />
                                    </td>
                                    <td style={{ fontWeight: 700, color: '#4ade80' }}>
                                      {(it.total || 0).toLocaleString('ru-RU')} ₽
                                    </td>
                                    <td>
                                      <button
                                        type="button"
                                        onClick={() => removeSpecRow(idx)}
                                        style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                                        title="Удалить"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </>
                      ) : (
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: '12px', padding: '12px', background: 'rgba(255,255,255,0.01)', borderRadius: 'var(--radius-sm)' }}>
                          Спецификация формируется автоматически из расчета заказа или может быть заполнена вручную кнопкой «+ Строка» / «Заполнить из материалов».
                        </div>
                      )}

                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px',
                        flexWrap: 'wrap',
                        marginTop: '12px',
                        paddingTop: '12px',
                        borderTop: '1px solid var(--glass-border)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <label style={{ fontSize: '0.85rem', margin: 0, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Скидка (₽):</label>
                          <input
                            type="text"
                            placeholder="0"
                            value={getContractParams().discount || ''}
                            onChange={(e) => updateContractParam('discount', e.target.value)}
                            className="spec-table-input"
                            style={{ width: '110px', height: '36px' }}
                          />
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                          Итого по спецификации:{' '}
                          <strong style={{ fontSize: '1.05rem', color: '#4ade80', marginLeft: '4px' }}>
                            {((getContractParams().specItems || []).reduce((acc, it) => acc + (it.total || 0), 0) - (parseFloat(getContractParams().discount || '0') || 0)).toLocaleString('ru-RU')} ₽
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Блок 3: Чек-лист выполненных работ для Акта */}
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px'
                    }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileCheck size={15} style={{ color: '#60a5fa' }} />
                        3. Чек-лист выполненных работ для Акта (Приложение №3)
                      </h4>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '8px' }}>
                        {(getContractParams().actChecklist || DEFAULT_ACT_CHECKLIST).map((actItem) => (
                          <div
                            key={actItem.id}
                            onClick={() => toggleActItem(actItem.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 12px',
                              background: actItem.checked ? 'rgba(34, 197, 94, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                              border: actItem.checked ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid var(--glass-border)',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                              userSelect: 'none'
                            }}
                          >
                            <span style={{ fontSize: '0.8rem', color: actItem.checked ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                              {actItem.name}
                            </span>
                            <span style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: actItem.checked ? '#22c55e' : 'rgba(255,255,255,0.08)',
                              color: actItem.checked ? '#ffffff' : 'var(--text-secondary)'
                            }}>
                              {actItem.checked ? 'ДА' : 'НЕТ'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* 3. МАТЕРИАЛЫ И УСЛУГИ */}
                {orderModalTab === 'MATERIALS' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px'}}>
                      <div>
                        <h3 style={{margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)'}}>{t('kanban.modal.materials')}</h3>
                        <p style={{margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)'}}>
                          Материалы со склада и доп. услуги (монтаж, установка светильников и т.д.)
                        </p>
                      </div>
                      <button type="button" onClick={addMaterialRow} className="btn btn-ghost" style={{padding: '6px 12px', fontSize: '0.85rem', color: 'var(--accent-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px'}}>
                        <Plus size={15} /> {t('kanban.modal.addMaterial')}
                      </button>
                    </div>

                    {formData.materials.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {formData.materials.map((mat, index) => (
                          <div key={index} style={{
                            display: 'flex', 
                            gap: '8px', 
                            alignItems: 'center',
                            background: 'var(--input-bg)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '6px 8px'
                          }}>
                            <MaterialSearchSelect
                              value={mat.materialId}
                              materials={allMaterials}
                              onChange={(newId) => updateMaterialRow(index, 'materialId', newId)}
                            />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '85px', flexShrink: 0 }}>
                              <input 
                                type="number" 
                                step="0.01" 
                                min="0"
                                value={mat.quantity} 
                                onChange={(e) => updateMaterialRow(index, 'quantity', e.target.value)}
                                style={{ width: '100%', padding: '5px 8px', fontSize: '0.82rem', height: '32px' }}
                                placeholder="Кол-во"
                                className="custom-number-input"
                              />
                            </div>
                            <button 
                              type="button" 
                              onClick={() => removeMaterialRow(index)} 
                              style={{background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', opacity: 0.8}}
                              title="Удалить строку"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        ))}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px 16px',
                          background: 'rgba(245, 158, 11, 0.08)',
                          border: '1px solid rgba(245, 158, 11, 0.25)',
                          borderRadius: 'var(--radius-sm)',
                          marginTop: '4px'
                        }}>
                          <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                            Итого себестоимость материалов со склада:
                          </span>
                          <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f59e0b' }}>
                            {currentMaterialsCost.toLocaleString('ru-RU')} ₽
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        background: 'var(--input-bg)',
                        border: '1px dashed var(--glass-border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '32px 16px',
                        textAlign: 'center',
                        color: 'var(--text-secondary)',
                        fontSize: '0.88rem'
                      }}>
                        В заказ пока не добавлены материалы со склада. Нажмите «+ Добавить материал» выше.
                      </div>
                    )}
                  </div>
                )}

                {/* 4. ФАЙЛЫ */}
                {orderModalTab === 'FILES' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
                    {/* Выделенный блок для Акта выполненных работ */}
                    {(() => {
                      const actAttachment = formData.attachments.find(a => isActFile(a.fileName, a.isAct));
                      const pendingActFile = pendingFiles.find(f => isActFile(f.name));
                      const hasAct = !!(actAttachment || pendingActFile);

                      return (
                        <div style={{
                          padding: '14px 16px',
                          background: hasAct 
                            ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(16, 185, 129, 0.04) 100%)' 
                            : 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.04) 100%)',
                          border: hasAct ? '1px solid rgba(34, 197, 94, 0.35)' : '1px solid rgba(245, 158, 11, 0.35)',
                          borderRadius: 'var(--radius-md)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <FileCheck size={20} style={{ color: hasAct ? '#4ade80' : '#fbbf24', flexShrink: 0 }} />
                              <div>
                                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: hasAct ? '#4ade80' : '#fbbf24' }}>
                                  Акт выполненных работ (Приложение №3)
                                </div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                  {hasAct ? 'Подписанный Акт прикреплен к заявке' : 'Обязателен для возможности завершения монтажа'}
                                </div>
                              </div>
                            </div>

                            <button 
                              type="button"
                              onClick={() => {
                                if (hasDocumentScanner) {
                                  setActionSheetMode('ACT');
                                  setIsActActionSheetOpen(true);
                                } else {
                                  actFileInputRef.current?.click();
                                }
                              }}
                              className="file-upload-btn" 
                              style={{ 
                                cursor: 'pointer', 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '6px',
                                background: hasAct ? 'rgba(34, 197, 94, 0.2)' : 'linear-gradient(135deg, #f59e0b, #d97706)',
                                border: hasAct ? '1px solid rgba(34, 197, 94, 0.4)' : 'none',
                                color: '#fff',
                                fontWeight: 600,
                                fontSize: '0.82rem',
                                padding: '6px 12px',
                                borderRadius: 'var(--radius-sm)'
                              }}
                            >
                              {hasDocumentScanner ? <Camera size={14} /> : <FileCheck size={14} />}
                              {hasAct 
                                ? 'Заменить Акт' 
                                : (hasDocumentScanner ? 'Загрузить / Отсканировать Акт' : 'Загрузить Акт')}
                            </button>
                            <input 
                              ref={actFileInputRef}
                              type="file" 
                              style={{ display: 'none' }}
                              onChange={handleActUpload} 
                              disabled={uploadingFile} 
                              accept="image/*,application/pdf"
                            />
                          </div>

                          {hasAct && (actAttachment || pendingActFile) && (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 12px',
                              background: 'rgba(0, 0, 0, 0.25)',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid rgba(34, 197, 94, 0.25)'
                            }}>
                              <span style={{ fontSize: '0.88rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
                                📄 {actAttachment ? actAttachment.fileName : `${pendingActFile?.name} (ожидает сохранения)`}
                              </span>
                              {actAttachment && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  {isViewableInBrowser(actAttachment.fileName, actAttachment.contentType) && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenAttachment(actAttachment)}
                                      className="btn btn-ghost"
                                      style={{ padding: '6px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                      title="Посмотреть в браузере"
                                    >
                                      <Eye size={16} />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadAttachment(actAttachment)}
                                    className="btn btn-ghost"
                                    style={{ padding: '6px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    title="Скачать файл"
                                  >
                                    <Download size={16} />
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px'}}>
                      <div>
                        <h3 style={{margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)'}}>{t('kanban.modal.attachments')}</h3>
                        <p style={{margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)'}}>
                          Прикрепленные файлы, чертежи, фото и сканы документов
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (hasDocumentScanner && (isMobile || Boolean((window.navigator as any).standalone))) {
                            setActionSheetMode('GENERAL');
                            setIsActActionSheetOpen(true);
                          } else {
                            generalFileInputRef.current?.click();
                          }
                        }}
                        className="file-upload-btn"
                        style={{
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                        disabled={uploadingFile}
                      >
                        <Paperclip size={14} />
                        {uploadingFile ? t('kanban.modal.uploading') : t('kanban.modal.attachFile')}
                      </button>
                      <input
                        ref={generalFileInputRef}
                        type="file"
                        style={{ display: 'none' }}
                        onChange={handleFileUpload}
                        disabled={uploadingFile}
                      />
                    </div>
                    
                    {formData.attachments.length > 0 || pendingFiles.length > 0 ? (
                      <div className="attachments-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {formData.attachments.map(att => {
                          const canPreview = isViewableInBrowser(att.fileName, att.contentType);
                          const isAttAct = isActFile(att.fileName, att.isAct);
                          return (
                            <div key={att.id} className="attachment-item" style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 14px',
                              background: isAttAct ? 'rgba(34, 197, 94, 0.04)' : 'rgba(255, 255, 255, 0.02)',
                              border: isAttAct ? '1px solid rgba(34, 197, 94, 0.25)' : '1px solid var(--glass-border)',
                              borderRadius: 'var(--radius-sm)',
                              gap: '12px'
                            }}>
                              {editingAttachmentId === att.id ? (
                                <div
                                  style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <input
                                    type="text"
                                    autoFocus
                                    value={editingAttachmentName}
                                    onChange={(e) => setEditingAttachmentName(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleSaveRenameAttachment(att.id);
                                      } else if (e.key === 'Escape') {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleCancelRenameAttachment();
                                      }
                                    }}
                                    disabled={renamingAttachment}
                                    className="search-input"
                                    style={{ flex: 1, padding: '4px 10px', fontSize: '0.88rem', height: '32px' }}
                                  />
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleSaveRenameAttachment(att.id);
                                    }}
                                    disabled={renamingAttachment}
                                    className="btn btn-primary"
                                    style={{ padding: '4px 10px', fontSize: '0.8rem', height: '32px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                    title="Сохранить имя"
                                  >
                                    <Check size={14} /> Сохранить
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleCancelRenameAttachment();
                                    }}
                                    disabled={renamingAttachment}
                                    className="btn btn-ghost"
                                    style={{ padding: '4px 8px', height: '32px', display: 'flex', alignItems: 'center' }}
                                    title="Отмена"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', maxWidth: '55%' }}>
                                    {isAttAct && (
                                      <span style={{
                                        fontSize: '0.72rem',
                                        background: 'rgba(34, 197, 94, 0.18)',
                                        color: '#4ade80',
                                        padding: '2px 7px',
                                        borderRadius: '6px',
                                        fontWeight: 600,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        flexShrink: 0
                                      }}>
                                        <FileCheck size={11} /> Акт
                                      </span>
                                    )}
                                    <span 
                                      style={{fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}
                                      title={att.fileName}
                                    >
                                      {att.fileName}
                                    </span>
                                  </div>
                                  <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                                    {!isWorker && (
                                      <button
                                        type="button"
                                        onClick={() => handleToggleAttachmentIsAct(att)}
                                        className="btn btn-ghost"
                                        style={{
                                          padding: '4px 8px',
                                          fontSize: '0.75rem',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          color: isAttAct ? '#4ade80' : 'var(--text-secondary)'
                                        }}
                                        title={isAttAct ? 'Снять отметку Акта выполненных работ' : 'Отметить как Акт выполненных работ'}
                                      >
                                        <FileCheck size={13} /> {isAttAct ? 'Акт' : 'Сделать Актом'}
                                      </button>
                                    )}
                                    {!isWorker && (
                                      <button 
                                        type="button" 
                                        onClick={() => handleStartRenameAttachment(att)} 
                                        className="btn btn-ghost" 
                                        style={{padding: '5px 8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px'}}
                                        title="Переименовать файл"
                                      >
                                        <Edit2 size={13} />
                                      </button>
                                    )}
                                    {canPreview && (
                                      <button 
                                        type="button" 
                                        onClick={() => handleOpenAttachment(att)} 
                                        className="btn btn-ghost" 
                                        style={{padding: '6px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}
                                        title="Посмотреть в браузере"
                                      >
                                        <Eye size={16} />
                                      </button>
                                    )}
                                    <button 
                                      type="button" 
                                      onClick={() => handleDownloadAttachment(att)} 
                                      className="btn btn-ghost" 
                                      style={{padding: '6px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}
                                      title="Скачать файл"
                                    >
                                      <Download size={16} />
                                    </button>
                                    {!isWorker && (
                                      <button 
                                        type="button" 
                                        onClick={() => handleDeleteAttachment(att.id)} 
                                        title={t('kanban.modal.delete') || 'Удалить'} 
                                        style={{background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '6px'}}
                                      >
                                        <Trash2 size={15} />
                                      </button>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })}
                        {pendingFiles.map((pf, index) => {
                          const isPfAct = isActFile(pf.name);
                          return (
                            <div key={`pending-${index}`} className="attachment-item" style={{
                              borderStyle: 'dashed',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 14px',
                              background: isPfAct ? 'rgba(34, 197, 94, 0.04)' : 'rgba(255, 255, 255, 0.01)',
                              borderColor: isPfAct ? 'rgba(34, 197, 94, 0.35)' : 'var(--glass-border)',
                              borderRadius: 'var(--radius-sm)'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                                {isPfAct && (
                                  <span style={{
                                    fontSize: '0.72rem',
                                    background: 'rgba(34, 197, 94, 0.18)',
                                    color: '#4ade80',
                                    padding: '2px 7px',
                                    borderRadius: '6px',
                                    fontWeight: 600,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    flexShrink: 0
                                  }}>
                                    <FileCheck size={11} /> Акт
                                  </span>
                                )}
                                <span style={{fontSize: '0.9rem'}}>{pf.name} (ожидает сохранения)</span>
                              </div>
                              <button type="button" onClick={() => removePendingFile(index)} style={{background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center'}}>
                                <Trash2 size={15} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px dashed var(--glass-border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '32px 16px',
                        textAlign: 'center',
                        color: 'var(--text-secondary)',
                        fontSize: '0.88rem'
                      }}>
                        {t('kanban.modal.noAttachments')}
                      </div>
                    )}
                  </div>
                )}

                {/* 5. AI АНАЛИЗ И ИНТЕРАКТИВНЫЙ ЧАТ */}
                {orderModalTab === 'AI' && editingOrderId && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                    {/* Header with audio upload */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Mic size={16} /> AI Анализ звонков и ассистент
                        </h3>
                        <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          Расшифровка аудиозаписей, анализ переговоров и умный диалог с AI
                        </p>
                      </div>
                      <div>
                        <button 
                          type="button"
                          onClick={() => audioFileInputRef.current?.click()}
                          disabled={uploadingAudio}
                          className="btn btn-primary" 
                          style={{ 
                            backgroundColor: '#3b82f6', 
                            color: '#ffffff', 
                            cursor: 'pointer', 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '6px',
                            padding: '8px 14px',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            border: 'none',
                            boxShadow: '0 2px 8px rgba(59, 130, 246, 0.4)'
                          }}
                        >
                          <Mic size={14} color="#ffffff" />
                          {uploadingAudio ? 'Загрузка аудио...' : (aiSummary ? 'Загрузить другой звонок' : 'Загрузить звонок')}
                        </button>
                        <input 
                          ref={audioFileInputRef}
                          type="file" 
                          accept="audio/*,.mp3,.ogg,.wav,.m4a,.aac,.flac,.webm" 
                          onChange={handleAudioUpload} 
                          disabled={uploadingAudio} 
                          style={{ display: 'none' }} 
                        />
                      </div>
                    </div>

                    {/* Sub-tabs: Анализ vs Чат */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'rgba(0, 0, 0, 0.25)',
                      padding: '4px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--glass-border)'
                    }}>
                      <button
                        type="button"
                        onClick={() => setAiSubTab('ANALYSIS')}
                        style={{
                          flex: 1,
                          padding: '8px 14px',
                          borderRadius: 'var(--radius-sm)',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          fontSize: '0.88rem',
                          fontWeight: aiSubTab === 'ANALYSIS' ? 600 : 500,
                          background: aiSubTab === 'ANALYSIS' ? 'var(--primary)' : 'transparent',
                          color: aiSubTab === 'ANALYSIS' ? '#fff' : 'var(--text-secondary)',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <Sparkles size={15} /> Анализ звонка
                      </button>
                      <button
                        type="button"
                        onClick={() => setAiSubTab('CHAT')}
                        style={{
                          flex: 1,
                          padding: '8px 14px',
                          borderRadius: 'var(--radius-sm)',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          fontSize: '0.88rem',
                          fontWeight: aiSubTab === 'CHAT' ? 600 : 500,
                          background: aiSubTab === 'CHAT' ? 'var(--primary)' : 'transparent',
                          color: aiSubTab === 'CHAT' ? '#fff' : 'var(--text-secondary)',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <MessageSquare size={15} /> Чат с AI по звонку
                        {chatMessages.length > 0 && (
                          <span style={{
                            background: 'rgba(255,255,255,0.25)',
                            padding: '1px 6px',
                            borderRadius: '10px',
                            fontSize: '0.75rem',
                            fontWeight: 700
                          }}>
                            {chatMessages.length}
                          </span>
                        )}
                      </button>
                    </div>

                    {/* Feedback Toast */}
                    {copyFeedbackText && (
                      <div style={{
                        background: 'rgba(34, 197, 94, 0.2)',
                        border: '1px solid rgba(34, 197, 94, 0.4)',
                        color: '#4ade80',
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.82rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <Check size={14} /> {copyFeedbackText}
                      </div>
                    )}

                    {/* Sub-tab 1: АНАЛИЗ ЗВОНКА */}
                    {aiSubTab === 'ANALYSIS' && (
                      <>
                        {aiSummary ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {/* Status and Refresh */}
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '8px 12px',
                              background: 'rgba(255, 255, 255, 0.02)',
                              border: '1px solid var(--glass-border)',
                              borderRadius: 'var(--radius-sm)'
                            }}>
                              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                Статус обработки:{' '}
                                <strong style={{
                                  color: aiSummary.status === 'COMPLETED' ? 'var(--success)' : (aiSummary.status === 'ERROR' ? 'var(--danger)' : 'var(--warning)')
                                }}>
                                  {aiSummary.status === 'COMPLETED' ? 'Готово к анализу' : (aiSummary.status === 'ERROR' ? 'Ошибка' : 'Расшифровка аудио...')}
                                </strong>
                              </span>
                              <button
                                type="button"
                                onClick={refreshAiSummary}
                                className="btn btn-ghost"
                                style={{ padding: '4px 10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <RefreshCw size={13} /> Обновить статус
                              </button>
                            </div>

                            {/* AI Cost Breakdown for this Order */}
                            {orderAiCost && orderAiCost.totalCostRubles > 0 && (
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: '8px',
                                background: 'rgba(234, 179, 8, 0.08)',
                                border: '1px solid rgba(234, 179, 8, 0.25)',
                                padding: '8px 12px',
                                borderRadius: 'var(--radius-sm)'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#facc15', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                    <Coins size={15} /> Затраты на ИИ по сделке: {Number(orderAiCost.totalCostRubles).toFixed(2)} ₽
                                  </span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                    {orderAiCost.speechkitCostRubles > 0 && (
                                      <span>• Аудио: {Number(orderAiCost.speechkitCostRubles).toFixed(2)} ₽ ({Math.floor(orderAiCost.audioDurationSeconds / 60)}:{String(orderAiCost.audioDurationSeconds % 60).padStart(2, '0')} мин)</span>
                                    )}
                                    {orderAiCost.gptCostRubles > 0 && (
                                      <span>• GPT: {Number(orderAiCost.gptCostRubles).toFixed(2)} ₽ ({orderAiCost.totalTokens} ток.)</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Prompt Presets Selector */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                Вариант системного анализа:
                              </label>
                              {(() => {
                                const map = getAnalysisResultsMap(aiSummary);
                                return (
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
                                    <button
                                      type="button"
                                      disabled={isAnalyzingAudio || !aiSummary.rawTranscript}
                                      onClick={() => handleSelectAiPreset('SUMMARY')}
                                      style={{
                                        padding: '10px 14px',
                                        borderRadius: 'var(--radius-sm)',
                                        border: aiPromptPreset === 'SUMMARY' ? '1px solid var(--primary)' : '1px solid var(--glass-border)',
                                        background: aiPromptPreset === 'SUMMARY' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                                        color: aiPromptPreset === 'SUMMARY' ? '#fff' : 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '2px',
                                        transition: 'all 0.15s ease'
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                        <span style={{ fontWeight: 600, fontSize: '0.88rem', color: aiPromptPreset === 'SUMMARY' ? '#60a5fa' : 'var(--text-primary)' }}>
                                          📋 Саммари звонка
                                        </span>
                                        {map['SUMMARY'] && (
                                          <span style={{ fontSize: '0.7rem', color: '#4ade80', display: 'inline-flex', alignItems: 'center', gap: '2px', fontWeight: 600 }}>
                                            <Check size={11} /> Сохранен
                                          </span>
                                        )}
                                      </div>
                                      <span style={{ fontSize: '0.74rem', opacity: 0.8 }}>
                                        Суть, параметры объекта, даты замера и цены
                                      </span>
                                    </button>

                                    <button
                                      type="button"
                                      disabled={isAnalyzingAudio || !aiSummary.rawTranscript}
                                      onClick={() => handleSelectAiPreset('SALES_ADVICE')}
                                      style={{
                                        padding: '10px 14px',
                                        borderRadius: 'var(--radius-sm)',
                                        border: aiPromptPreset === 'SALES_ADVICE' ? '1px solid #10b981' : '1px solid var(--glass-border)',
                                        background: aiPromptPreset === 'SALES_ADVICE' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                                        color: aiPromptPreset === 'SALES_ADVICE' ? '#fff' : 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '2px',
                                        transition: 'all 0.15s ease'
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                        <span style={{ fontWeight: 600, fontSize: '0.88rem', color: aiPromptPreset === 'SALES_ADVICE' ? '#34d399' : 'var(--text-primary)' }}>
                                          🎯 Скрипт и дожим
                                        </span>
                                        {map['SALES_ADVICE'] && (
                                          <span style={{ fontSize: '0.7rem', color: '#4ade80', display: 'inline-flex', alignItems: 'center', gap: '2px', fontWeight: 600 }}>
                                            <Check size={11} /> Сохранен
                                          </span>
                                        )}
                                      </div>
                                      <span style={{ fontSize: '0.74rem', opacity: 0.8 }}>
                                        Анализ сомнений, готовый скрипт и аргументы
                                      </span>
                                    </button>

                                    <button
                                      type="button"
                                      disabled={isAnalyzingAudio || !aiSummary.rawTranscript}
                                      onClick={() => handleSelectAiPreset('CUSTOM')}
                                      style={{
                                        padding: '10px 14px',
                                        borderRadius: 'var(--radius-sm)',
                                        border: aiPromptPreset === 'CUSTOM' ? '1px solid #f59e0b' : '1px solid var(--glass-border)',
                                        background: aiPromptPreset === 'CUSTOM' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                                        color: aiPromptPreset === 'CUSTOM' ? '#fff' : 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '2px',
                                        transition: 'all 0.15s ease'
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                        <span style={{ fontWeight: 600, fontSize: '0.88rem', color: aiPromptPreset === 'CUSTOM' ? '#fbbf24' : 'var(--text-primary)' }}>
                                          ✏️ Свой промпт
                                        </span>
                                        {map['CUSTOM'] && (
                                          <span style={{ fontSize: '0.7rem', color: '#4ade80', display: 'inline-flex', alignItems: 'center', gap: '2px', fontWeight: 600 }}>
                                            <Check size={11} /> Сохранен
                                          </span>
                                        )}
                                      </div>
                                      <span style={{ fontSize: '0.74rem', opacity: 0.8 }}>
                                        Произвольный запрос к стенограмме
                                      </span>
                                    </button>
                                  </div>
                                );
                              })()}
                            </div>

                            {/* Custom Prompt Box */}
                            {aiPromptPreset === 'CUSTOM' && (
                              <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                background: 'rgba(0, 0, 0, 0.2)',
                                padding: '12px',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid rgba(245, 158, 11, 0.3)'
                              }}>
                                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fbbf24' }}>
                                  Введите ваш промпт / инструкцию для анализа стенограммы:
                                </label>
                                <textarea
                                  rows={3}
                                  value={customSystemPrompt}
                                  onChange={(e) => setCustomSystemPrompt(e.target.value)}
                                  placeholder="Например: Выдели только перечень освещения и карнизов, либо составь текст коммерческого предложения для клиента..."
                                  style={{
                                    width: '100%',
                                    background: 'var(--bg-primary)',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: 'var(--radius-sm)',
                                    color: 'var(--text-primary)',
                                    padding: '8px 12px',
                                    fontSize: '0.88rem',
                                    resize: 'vertical'
                                  }}
                                />
                                <button
                                  type="button"
                                  disabled={isAnalyzingAudio || !customSystemPrompt.trim()}
                                  onClick={() => handleRunAiAnalysis('CUSTOM', customSystemPrompt, true)}
                                  className="btn btn-primary"
                                  style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
                                >
                                  <Sparkles size={14} />
                                  {isAnalyzingAudio ? 'Генерация анализа...' : '⚡ Запустить анализ'}
                                </button>
                              </div>
                            )}

                            {/* Analysis Result Box */}
                            <div style={{
                              background: 'rgba(255, 255, 255, 0.03)',
                              padding: '16px',
                              borderRadius: 'var(--radius-lg)',
                              border: '1px solid var(--glass-border)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '12px'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
                                <span style={{ fontSize: '0.88rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
                                  <Bot size={15} color="var(--accent-primary)" /> Результат анализа:
                                  {aiPromptPreset && (
                                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                                      ({aiPromptPreset === 'SUMMARY' ? 'Саммари звонка' : (aiPromptPreset === 'SALES_ADVICE' ? 'Скрипт и дожим' : 'Свой промпт')})
                                    </span>
                                  )}
                                </span>
                                {aiSummary.aiSummary && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                    <button
                                      type="button"
                                      disabled={isAnalyzingAudio}
                                      onClick={() => handleRunAiAnalysis(aiPromptPreset, customSystemPrompt, true)}
                                      className="btn btn-ghost"
                                      style={{
                                        padding: '4px 10px',
                                        fontSize: '0.78rem',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        color: '#38bdf8',
                                        background: 'rgba(56, 189, 248, 0.1)',
                                        border: '1px solid rgba(56, 189, 248, 0.25)',
                                        borderRadius: 'var(--radius-sm)'
                                      }}
                                      title="Принудительно отправить повторный запрос в AI"
                                    >
                                      <RotateCcw size={13} className={isAnalyzingAudio ? 'spinner' : ''} /> Сгенерировать повторно
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleCopyTextWithToast(aiSummary.aiSummary!, "Результат анализа скопирован")}
                                      className="btn btn-ghost"
                                      style={{ padding: '4px 8px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                      title="Скопировать в буфер"
                                    >
                                      <Copy size={13} /> Копировать
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setAiSubTab('CHAT')}
                                      className="btn btn-primary"
                                      style={{ padding: '4px 10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                    >
                                      <MessageSquare size={13} /> Обсудить в чате
                                    </button>
                                  </div>
                                )}
                              </div>

                              {isAnalyzingAudio ? (
                                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                  <RefreshCw size={20} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                                  <span style={{ fontSize: '0.88rem' }}>AI анализирует стенограмму звонка...</span>
                                </div>
                              ) : aiSummary.aiSummary ? (
                                <div style={{ fontSize: '0.92rem', lineHeight: '1.6', whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>
                                  {aiSummary.aiSummary}
                                </div>
                              ) : (
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '12px 0' }}>
                                  {aiSummary.status === 'ERROR' ? 'Ошибка при обработке записи.' : 'Расшифровка завершена. Выберите вариант анализа выше.'}
                                </div>
                              )}
                            </div>

                            {/* Raw Transcript Collapsible */}
                            {aiSummary.rawTranscript && (
                              <details style={{
                                background: 'rgba(0, 0, 0, 0.15)',
                                padding: '10px 14px',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--glass-border)'
                              }}>
                                <summary style={{ cursor: 'pointer', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                  📝 Стенограмма звонка (полный текст)
                                </summary>
                                <div style={{ marginTop: '10px', fontSize: '0.84rem', color: 'var(--text-primary)', lineHeight: '1.5', maxHeight: '180px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                                  {aiSummary.rawTranscript}
                                </div>
                              </details>
                            )}
                          </div>
                        ) : (
                          <div style={{
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px dashed var(--glass-border)',
                            borderRadius: 'var(--radius-md)',
                            padding: '40px 16px',
                            textAlign: 'center',
                            color: 'var(--text-secondary)',
                            fontSize: '0.88rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '12px'
                          }}>
                            <div style={{
                              width: '56px',
                              height: '56px',
                              borderRadius: '50%',
                              background: 'rgba(59, 130, 246, 0.12)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--accent-primary)'
                            }}>
                              <Mic size={26} color="var(--accent-primary)" />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span style={{ fontSize: '0.98rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                Нет загруженных записей звонков
                              </span>
                              <span style={{ fontSize: '0.8rem', opacity: 0.8, maxWidth: '420px' }}>
                                Загрузите аудиозапись разговора с клиентом (.mp3, .ogg, .wav, .m4a, .aac), чтобы AI расшифровал разговор, выделил ключевые параметры и подсказал скрипт продажи.
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => audioFileInputRef.current?.click()}
                              disabled={uploadingAudio}
                              className="btn btn-primary"
                              style={{
                                marginTop: '4px',
                                padding: '10px 22px',
                                fontSize: '0.92rem',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                backgroundColor: '#3b82f6',
                                color: '#ffffff',
                                border: 'none',
                                boxShadow: '0 2px 8px rgba(59, 130, 246, 0.4)'
                              }}
                            >
                              <Mic size={16} color="#ffffff" />
                              {uploadingAudio ? 'Загрузка аудиозаписи...' : 'Выбрать аудиофайл звонка'}
                            </button>
                          </div>
                        )}
                      </>
                    )}

                    {/* Sub-tab 2: ИНТЕРАКТИВНЫЙ ЧАТ С AI */}
                    {aiSubTab === 'CHAT' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {/* Notice & Session Export Bar */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '8px',
                          background: 'rgba(59, 130, 246, 0.08)',
                          border: '1px solid rgba(59, 130, 246, 0.25)',
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              <Sparkles size={15} style={{ color: '#60a5fa', flexShrink: 0 }} />
                              <span>История диалога сохраняется в заявке.</span>
                            </div>
                            {(() => {
                              const totalTokens = chatMessages.reduce((sum, m) => sum + (m.tokensUsed || 0), 0);
                              const totalCost = chatMessages.reduce((sum, m) => sum + (m.costRubles || 0), 0);
                              if (totalTokens === 0) return null;
                              return (
                                <div style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                  background: 'rgba(234, 179, 8, 0.15)',
                                  border: '1px solid rgba(234, 179, 8, 0.35)',
                                  color: '#facc15',
                                  padding: '2px 8px',
                                  borderRadius: '10px'
                                }}>
                                  <Coins size={12} />
                                  Расход: {totalTokens} ток. (~{totalCost < 0.01 && totalTokens > 0 ? '<0.01' : totalCost.toFixed(2)} ₽)
                                </div>
                              );
                            })()}
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={handleExportChatTxt}
                              className="btn btn-ghost"
                              style={{ padding: '4px 8px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.05)' }}
                              title="Скачать весь диалог в .txt файл"
                            >
                              <FileDown size={13} /> Скачать .txt
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const fullChat = chatMessages.map(m => `[${m.role === 'user' ? 'Менеджер' : 'AI'}]: ${m.text}`).join('\n\n');
                                handleCopyTextWithToast(fullChat || "Чат пуст", "История чата скопирована");
                              }}
                              className="btn btn-ghost"
                              style={{ padding: '4px 8px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.05)' }}
                              title="Скопировать переписку"
                            >
                              <Copy size={13} /> Копировать
                            </button>
                            {chatMessages.length > 0 && (
                              <button
                                type="button"
                                onClick={handleClearChat}
                                className="btn btn-ghost"
                                style={{ padding: '4px 8px', fontSize: '0.78rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '4px' }}
                                title="Очистить историю переписки"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Quick Prompts Suggestions */}
                        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                          {[
                            '💬 Напиши сообщение для WhatsApp с итогом звонка',
                            '🎯 Какие сомнения или возражения остались у клиента?',
                            '🔥 Какой сильный аргумент использовать для закрытия на замер?',
                            '📐 Составь список параметров для замерщика'
                          ].map((suggest, idx) => (
                            <button
                              key={idx}
                              type="button"
                              disabled={isChatReplying}
                              onClick={() => handleSendChatMessage(suggest)}
                              style={{
                                whiteSpace: 'nowrap',
                                fontSize: '0.76rem',
                                padding: '5px 10px',
                                borderRadius: '12px',
                                background: 'rgba(255, 255, 255, 0.04)',
                                border: '1px solid var(--glass-border)',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              {suggest}
                            </button>
                          ))}
                        </div>

                        {/* Chat Messages Stream */}
                        <div style={{
                          background: 'rgba(0, 0, 0, 0.25)',
                          border: '1px solid var(--glass-border)',
                          borderRadius: 'var(--radius-md)',
                          padding: '14px',
                          minHeight: '260px',
                          maxHeight: '380px',
                          overflowY: 'auto',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px'
                        }}>
                          {chatMessages.length === 0 ? (
                            <div style={{
                              margin: 'auto',
                              textAlign: 'center',
                              color: 'var(--text-secondary)',
                              fontSize: '0.86rem',
                              padding: '24px 12px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              <Bot size={32} style={{ opacity: 0.7, color: 'var(--accent-primary)' }} />
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Чат с AI-ассистентом по звонку</span>
                              <span style={{ fontSize: '0.78rem', maxWidth: '360px', opacity: 0.8 }}>
                                Задайте любой вопрос по содержанию разговора, попросите сформулировать сообщение клиенту или выделить договоренности.
                              </span>
                            </div>
                          ) : (
                            chatMessages.map((msg, index) => (
                              <div
                                key={index}
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                  maxWidth: '85%'
                                }}
                              >
                                <div style={{
                                  fontSize: '0.72rem',
                                  color: 'var(--text-secondary)',
                                  marginBottom: '3px',
                                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  {msg.role === 'user' ? (
                                    <><span>Вы (Менеджер)</span> • <span>{msg.timestamp}</span></>
                                  ) : (
                                    <><Bot size={12} color="var(--accent-primary)" /> <span>AI-Ассистент</span> • <span>{msg.timestamp}</span></>
                                  )}
                                </div>
                                <div style={{
                                  background: msg.role === 'user' ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.05)',
                                  color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                                  padding: '10px 14px',
                                  borderRadius: msg.role === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                                  border: msg.role === 'user' ? 'none' : '1px solid var(--glass-border)',
                                  fontSize: '0.9rem',
                                  lineHeight: '1.5',
                                  whiteSpace: 'pre-wrap',
                                  wordBreak: 'break-word',
                                  position: 'relative'
                                }}>
                                  {msg.text}
                                  {msg.role === 'assistant' && (
                                    <button
                                      type="button"
                                      onClick={() => handleCopyTextWithToast(msg.text, "Ответ AI скопирован")}
                                      style={{
                                        position: 'absolute',
                                        top: '6px',
                                        right: '6px',
                                        background: 'rgba(0,0,0,0.3)',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '3px 6px',
                                        cursor: 'pointer',
                                        color: 'var(--text-secondary)',
                                        display: 'flex',
                                        alignItems: 'center'
                                      }}
                                      title="Скопировать сообщение"
                                    >
                                      <Copy size={11} />
                                    </button>
                                  )}
                                </div>
                                {msg.role === 'assistant' && msg.tokensUsed !== undefined && msg.tokensUsed > 0 && (
                                  <div style={{
                                    fontSize: '0.72rem',
                                    color: 'rgba(250, 204, 21, 0.85)',
                                    marginTop: '3px',
                                    alignSelf: 'flex-start',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    paddingLeft: '4px'
                                  }}>
                                    <Coins size={11} /> {msg.tokensUsed} токенов • ~{msg.costRubles !== undefined ? msg.costRubles.toFixed(2) : (msg.tokensUsed * 0.0012).toFixed(2)} ₽
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                          {isChatReplying && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.82rem', padding: '6px 0' }}>
                              <RefreshCw size={14} className="spinner" style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-primary)' }} />
                              <span>AI формулирует ответ...</span>
                            </div>
                          )}
                          <div ref={chatBottomRef} />
                        </div>

                        {/* Chat Input Bar */}
                        <div
                          style={{
                            display: 'flex',
                            gap: '8px',
                            alignItems: 'center'
                          }}
                        >
                          <input
                            type="text"
                            value={chatInputText}
                            onChange={(e) => setChatInputText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                e.stopPropagation();
                                handleSendChatMessage();
                              }
                            }}
                            placeholder="Спросите AI о звонке (напр. «О чем спорили в конце?», «Напиши текст для WhatsApp»)..."
                            disabled={isChatReplying}
                            className="search-input"
                            style={{
                              flex: 1,
                              padding: '10px 14px',
                              fontSize: '0.88rem',
                              height: '42px',
                              background: 'var(--bg-primary)'
                            }}
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleSendChatMessage();
                            }}
                            disabled={isChatReplying || !chatInputText.trim()}
                            className="btn btn-primary"
                            style={{
                              height: '42px',
                              padding: '0 16px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              fontWeight: 600
                            }}
                          >
                            <Send size={15} /> Отправить
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div className="modal-actions">
                  {editingOrderId && !isWorker ? (
                    <button 
                      type="button" 
                      onClick={handleDeleteOrder}
                      className="btn btn-ghost"
                      style={{ color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Trash2 size={16} /> {t('kanban.modal.delete')}
                    </button>
                  ) : <div />}

                  {editingOrderId && (() => {
                    const currentOrder = cards.find(c => c.id === editingOrderId);
                    const currentStatus = columns.find(c => c.id.toString() === formData.statusId);
                    const isCompleted = currentStatus ? (
                      currentStatus.name.toLowerCase().includes('заверш') ||
                      currentStatus.name.toLowerCase().includes('готов') ||
                      currentStatus.name.toLowerCase().includes('выполнен')
                    ) : false;

                    if (!isCompleted) {
                      const hasInstaller = Boolean(formData.installedById || currentOrder?.installedById || currentOrder?.installedByName);
                      const hasAct = formData.attachments.some(a => isActFile(a.fileName, a.isAct)) || pendingFiles.some(f => isActFile(f.name));
                      const canComplete = hasInstaller && hasAct;

                      let disabledTitle = 'Завершить монтаж и перевести заявку в статус «Завершен»';
                      if (!hasInstaller) {
                        disabledTitle = 'Для завершения монтажа необходимо выбрать монтажника';
                      } else if (!hasAct) {
                        disabledTitle = 'Для завершения монтажа необходимо прикрепить Акт во вкладке «Файлы»';
                      }

                      return (
                        <button
                          type="button"
                          disabled={!canComplete}
                          onClick={(e) => handleCompleteInstallation(e, editingOrderId)}
                          className="btn"
                          style={{
                            background: canComplete ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'rgba(255, 255, 255, 0.08)',
                            color: canComplete ? '#fff' : 'var(--text-secondary)',
                            border: canComplete ? 'none' : '1px solid var(--glass-border)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontWeight: 600,
                            padding: '8px 14px',
                            cursor: canComplete ? 'pointer' : 'not-allowed',
                            opacity: canComplete ? 1 : 0.45
                          }}
                          title={disabledTitle}
                        >
                          <CheckCircle2 size={16} /> Завершить монтаж
                        </button>
                      );
                    }
                    return (
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: '#4ade80',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        background: 'rgba(34, 197, 94, 0.12)',
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid rgba(34, 197, 94, 0.25)'
                      }}>
                        <CheckCircle2 size={16} /> Монтаж завершен
                      </div>
                    );
                  })()}

                  {(!editingOrderId || isDirty) && (
                    <div className="modal-action-btns animate-fade-in">
                      <button 
                        type="button" 
                        onClick={handleCancelChanges}
                        className="btn btn-ghost"
                      >
                        {t('kanban.modal.cancel')}
                      </button>
                      <button type="submit" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Check size={16} />
                        {editingOrderId ? (t('kanban.modal.save') || 'Сохранить') : (t('kanban.createOrder') || 'Создать заявку')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Unsaved Changes Confirmation Modal */}
      {isUnsavedConfirmOpen && createPortal(
        <div className="modal-overlay dialog-overlay" style={{ zIndex: 100060 }} onClick={() => setIsUnsavedConfirmOpen(false)}>
          <div className="modal-content dialog-content animate-fade-in" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f59e0b',
                flexShrink: 0
              }}>
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Несохраненные изменения
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  В заявке есть несохраненные данные. Сохранить их перед закрытием?
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmSaveAndClose}
                style={{ width: '100%', justifyContent: 'center', height: '42px', fontWeight: 600 }}
              >
                <Check size={16} /> Сохранить изменения
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleConfirmDiscardAndClose}
                style={{ width: '100%', justifyContent: 'center', height: '40px', color: 'var(--danger)' }}
              >
                Не сохранять
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setIsUnsavedConfirmOpen(false)}
                style={{ width: '100%', justifyContent: 'center', height: '38px', color: 'var(--text-secondary)' }}
              >
                Продолжить редактирование
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {isColumnModalOpen && createPortal(
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth: '420px'}}>
            <div className="modal-header">
              <h2>{editingColumnId ? t('kanban.editColumn') : t('kanban.addColumn')}</h2>
              <button 
                type="button" 
                onClick={() => setIsColumnModalOpen(false)} 
                className="btn-icon"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveColumn} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div className="modal-body">
                <div className="form-group">
                  <label>{t('kanban.columnName')}</label>
                  <input 
                    type="text" 
                    required
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    className="search-input"
                    style={{width: '100%', paddingLeft: '12px'}}
                  />
                </div>
                <div className="form-group">
                  <label>{t('kanban.columnColor')}</label>
                  
                  {/* Preset colors grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '14px' }}>
                    {[
                      '#3b82f6', '#06b6d4', '#10b981', '#22c55e', '#84cc16', '#eab308', '#f97316',
                      '#ef4444', '#f43f5e', '#ec4899', '#a855f7', '#8b5cf6', '#6366f1', '#64748b'
                    ].map(color => (
                      <button 
                        key={color}
                        type="button"
                        onClick={() => setNewColumnColor(color)}
                        style={{
                          width: '100%',
                          aspectRatio: '1',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: color, 
                          cursor: 'pointer',
                          border: newColumnColor.toLowerCase() === color.toLowerCase() ? '2px solid white' : '1px solid rgba(255, 255, 255, 0.1)',
                          boxShadow: newColumnColor.toLowerCase() === color.toLowerCase() ? '0 0 0 2px var(--accent-primary), 0 2px 8px rgba(0, 0, 0, 0.2)' : 'none',
                          transform: newColumnColor.toLowerCase() === color.toLowerCase() ? 'scale(1.08)' : 'scale(1)',
                          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                          outline: 'none',
                          padding: 0
                        }}
                        title={color}
                      />
                    ))}
                  </div>

                  {/* Custom color input with picker + hex input + preview */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255, 255, 255, 0.03)', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                    <div style={{ position: 'relative', width: '36px', height: '36px', flexShrink: 0 }}>
                      <input 
                        type="color" 
                        value={newColumnColor.startsWith('#') && newColumnColor.length === 7 ? newColumnColor : '#3b82f6'} 
                        onChange={(e) => setNewColumnColor(e.target.value)}
                        style={{ 
                          position: 'absolute', 
                          top: 0, 
                          left: 0, 
                          width: '100%', 
                          height: '100%', 
                          opacity: 0, 
                          cursor: 'pointer' 
                        }} 
                        title="Выбрать цвет из палитры"
                      />
                      <div 
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          borderRadius: 'var(--radius-sm)', 
                          backgroundColor: newColumnColor || '#3b82f6', 
                          border: '2px solid rgba(255, 255, 255, 0.3)',
                          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
                          pointerEvents: 'none'
                        }} 
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <input 
                        type="text" 
                        value={newColumnColor} 
                        onChange={(e) => setNewColumnColor(e.target.value)}
                        className="search-input" 
                        placeholder="#3B82F6"
                        style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.9rem', padding: '6px 10px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', paddingLeft: '4px', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: newColumnColor || '#3b82f6', display: 'inline-block', flexShrink: 0 }}></span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{newColumnName || 'Статус'}</span>
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '16px', marginBottom: 0 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.88rem' }}>
                    <input 
                      type="checkbox"
                      checked={newColumnIncludeInFinances}
                      onChange={(e) => setNewColumnIncludeInFinances(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                    />
                    <span>Учитывать заявки этого статуса в блоке финансов</span>
                  </label>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setIsColumnModalOpen(false)} className="btn btn-ghost">
                  {t('kanban.modal.cancel')}
                </button>
                <button type="submit" className="btn btn-primary">
                  {t('kanban.modal.save')}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Quick Create Client Modal */}
      {isNewClientModalOpen && createPortal(
        <div className="modal-overlay" style={{ zIndex: 100000 }}>
          <div className="modal-content animate-fade-in" style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <h2>{newClientType === 'LEGAL_ENTITY' ? 'Новая компания / Юрлицо' : t('clients.modal.addTitle')}</h2>
              <button 
                type="button" 
                onClick={() => {
                  setIsNewClientModalOpen(false);
                  setNewClientType('INDIVIDUAL');
                  setNewClientName('');
                  setNewClientPhone('');
                  setNewClientInn('');
                  setNewClientContactPerson('');
                  setNewClientLeadSource('');
                  setNewClientCustomLeadSource('');
                }} 
                className="btn-icon"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleQuickCreateClient} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div className="modal-body">
                {/* Type toggle */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
                  <button
                    type="button"
                    onClick={() => setNewClientType('INDIVIDUAL')}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '6px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: newClientType === 'INDIVIDUAL' ? 'var(--accent-primary)' : 'transparent',
                      color: newClientType === 'INDIVIDUAL' ? '#fff' : 'var(--text-secondary)',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.8rem'
                    }}
                  >
                    <User size={14} />
                    <span>Физлицо</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewClientType('LEGAL_ENTITY')}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '6px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: newClientType === 'LEGAL_ENTITY' ? 'var(--accent-primary)' : 'transparent',
                      color: newClientType === 'LEGAL_ENTITY' ? '#fff' : 'var(--text-secondary)',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.8rem'
                    }}
                  >
                    <Building2 size={14} />
                    <span>Юрлицо</span>
                  </button>
                </div>

                <div className="form-group">
                  <label>{newClientType === 'LEGAL_ENTITY' ? 'Наименование организации' : t('clients.modal.name')} *</label>
                  <input 
                    type="text" 
                    required
                    placeholder={newClientType === 'LEGAL_ENTITY' ? 'ООО «Альфа» или ИП Иванов' : (t('clients.modal.namePlaceholder') || 'Иван Иванов')}
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    className="search-input"
                    style={{ width: '100%', paddingLeft: '12px' }}
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label>{newClientType === 'LEGAL_ENTITY' ? 'Рабочий телефон' : t('clients.modal.phone')} *</label>
                  <input 
                    type="tel" 
                    required
                    placeholder={t('clients.modal.phonePlaceholder') || '+7 (999) 000-00-00'}
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    className="search-input"
                    style={{ width: '100%', paddingLeft: '12px' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>WhatsApp</label>
                    <div className="input-with-icon">
                      <MessageCircle className="input-icon" size={16} />
                      <input
                        type="text"
                        placeholder="+7 (900) 123-45-67"
                        value={newClientWhatsapp}
                        onChange={(e) => setNewClientWhatsapp(e.target.value)}
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
                        value={newClientTelegram}
                        onChange={(e) => setNewClientTelegram(e.target.value)}
                        className="search-input"
                        style={{ width: '100%', paddingLeft: '36px' }}
                      />
                    </div>
                  </div>
                </div>
                {newClientType === 'LEGAL_ENTITY' && (
                  <>
                    <div className="form-group">
                      <label>ИНН</label>
                      <input 
                        type="text" 
                        placeholder="7701234567"
                        value={newClientInn}
                        onChange={(e) => setNewClientInn(e.target.value)}
                        className="search-input"
                        style={{ width: '100%', paddingLeft: '12px' }}
                      />
                    </div>
                    <div className="form-group">
                      <label>Контактное лицо (ЛПР)</label>
                      <input 
                        type="text" 
                        placeholder="Иванов Иван Иванович"
                        value={newClientContactPerson}
                        onChange={(e) => setNewClientContactPerson(e.target.value)}
                        className="search-input"
                        style={{ width: '100%', paddingLeft: '12px' }}
                      />
                    </div>
                  </>
                )}
                <div className="form-group">
                  <label>{t('clients.modal.leadSource', 'Источник лида')}</label>
                  <div className="custom-select-wrapper" style={{ marginBottom: newClientLeadSource === 'custom' ? '8px' : '0' }}>
                    <select
                      value={newClientLeadSource}
                      onChange={(e) => setNewClientLeadSource(e.target.value)}
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
                  {newClientLeadSource === 'custom' && (
                    <input
                      type="text"
                      required
                      placeholder="Укажите источник (например: Листовка, Баннер...)"
                      value={newClientCustomLeadSource}
                      onChange={(e) => setNewClientCustomLeadSource(e.target.value)}
                      className="search-input"
                      style={{ width: '100%', paddingLeft: '12px', marginTop: '6px' }}
                      autoFocus
                    />
                  )}
                </div>
              </div>
              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn btn-ghost"
                  onClick={() => {
                    setIsNewClientModalOpen(false);
                    setNewClientType('INDIVIDUAL');
                    setNewClientName('');
                    setNewClientPhone('');
                    setNewClientInn('');
                    setNewClientContactPerson('');
                    setNewClientLeadSource('');
                    setNewClientCustomLeadSource('');
                  }}
                >
                  {t('clients.modal.cancel')}
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={creatingClient}
                >
                  {creatingClient ? t('clients.modal.saving') : (newClientType === 'LEGAL_ENTITY' ? 'Создать компанию' : t('clients.modal.create', 'Создать клиента'))}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Contract Data Prompt Modal (Only for missing client passport data) */}
      {isContractPromptOpen && createPortal(
        <div className="modal-overlay" onClick={() => !contractPromptLoading && setIsContractPromptOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '580px', width: '92%' }}>
            <div className="modal-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.05rem', margin: 0 }}>
                <FileCheck size={20} style={{ color: 'var(--accent-primary)' }} />
                Данные Заказчика для договора
              </h2>
              <button 
                type="button" 
                onClick={() => setIsContractPromptOpen(false)} 
                className="btn-icon"
                aria-label="Close"
                disabled={contractPromptLoading}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSavePromptAndGenerate}>
              <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto', padding: '16px 20px' }}>
                <div style={{
                  background: 'rgba(59, 130, 246, 0.08)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 14px',
                  marginBottom: '16px',
                  fontSize: '0.85rem',
                  color: '#93c5fd',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>Для формирования договора физлица заполните недостающие паспортные данные:</span>
                </div>

                <div className="form-group">
                  <label>ФИО Заказчика *</label>
                  <input
                    type="text"
                    required
                    placeholder="Иванов Иван Иванович"
                    value={contractPromptData.name}
                    onChange={(e) => setContractPromptData({ ...contractPromptData, name: e.target.value })}
                    className="search-input"
                    style={{ width: '100%', paddingLeft: '12px' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  <div className="form-group">
                    <label>Телефон 1 *</label>
                    <input
                      type="text"
                      required
                      placeholder="+7 (917) 000-00-00"
                      value={contractPromptData.phone}
                      onChange={(e) => setContractPromptData({ ...contractPromptData, phone: e.target.value })}
                      className="search-input"
                      style={{ width: '100%', paddingLeft: '12px' }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Телефон 2 (дополнительный)</label>
                    <input
                      type="text"
                      placeholder="+7 (987) 000-00-00"
                      value={contractPromptData.secondPhone}
                      onChange={(e) => setContractPromptData({ ...contractPromptData, secondPhone: e.target.value })}
                      className="search-input"
                      style={{ width: '100%', paddingLeft: '12px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  <div className="form-group">
                    <label>Дата рождения *</label>
                    <input
                      type="text"
                      required
                      placeholder="21.05.1985"
                      value={contractPromptData.birthDate}
                      onChange={(e) => setContractPromptData({ ...contractPromptData, birthDate: e.target.value })}
                      className="search-input"
                      style={{ width: '100%', paddingLeft: '12px' }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Серия и номер паспорта *</label>
                    <input
                      type="text"
                      required
                      placeholder="6315 123456"
                      value={contractPromptData.passportSeriesNumber}
                      onChange={(e) => setContractPromptData({ ...contractPromptData, passportSeriesNumber: e.target.value })}
                      className="search-input"
                      style={{ width: '100%', paddingLeft: '12px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  <div className="form-group">
                    <label>Кем выдан паспорт *</label>
                    <input
                      type="text"
                      required
                      placeholder="Отделом УФМС России по Саратовской обл..."
                      value={contractPromptData.passportIssuedBy}
                      onChange={(e) => setContractPromptData({ ...contractPromptData, passportIssuedBy: e.target.value })}
                      className="search-input"
                      style={{ width: '100%', paddingLeft: '12px' }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Дата выдачи паспорта *</label>
                    <input
                      type="text"
                      required
                      placeholder="11.06.2015"
                      value={contractPromptData.passportIssuedDate}
                      onChange={(e) => setContractPromptData({ ...contractPromptData, passportIssuedDate: e.target.value })}
                      className="search-input"
                      style={{ width: '100%', paddingLeft: '12px' }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Адрес по прописке (регистрации) *</label>
                  <input
                    type="text"
                    required
                    placeholder="г. Саратов, ул. Чернышевского, д. 10, кв. 5"
                    value={contractPromptData.registrationAddress}
                    onChange={(e) => setContractPromptData({ ...contractPromptData, registrationAddress: e.target.value })}
                    className="search-input"
                    style={{ width: '100%', paddingLeft: '12px' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Адрес установки (монтажа) *</label>
                  <input
                    type="text"
                    required
                    placeholder="г. Саратов, 1-й проезд Степана Разина, 3/7 кв. 222"
                    value={contractPromptData.installationAddress}
                    onChange={(e) => setContractPromptData({ ...contractPromptData, installationAddress: e.target.value })}
                    className="search-input"
                    style={{ width: '100%', paddingLeft: '12px' }}
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setIsContractPromptOpen(false)}
                  disabled={contractPromptLoading}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={contractPromptLoading}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <FileText size={16} />
                  {contractPromptLoading ? 'Формирование договора...' : 'Сохранить и сформировать договор (Word)'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Act & General Upload Mobile Action Sheet */}
      {hasDocumentScanner && (
        <>
          <ActUploadActionSheet
            isOpen={isActActionSheetOpen}
            onClose={() => setIsActActionSheetOpen(false)}
            mode={actionSheetMode}
            hasAct={Boolean(formData.attachments.find(a => isActFile(a.fileName, a.isAct)) || pendingFiles.find(f => isActFile(f.name)))}
            onSelectScan={() => {
              setDocScannerIsAct(actionSheetMode === 'ACT');
              setIsDocScannerOpen(true);
            }}
            onSelectFile={() => {
              if (actionSheetMode === 'ACT') {
                if (actFileInputRef.current) {
                  actFileInputRef.current.click();
                }
              } else {
                if (generalFileInputRef.current) {
                  generalFileInputRef.current.click();
                }
              }
            }}
          />

          {/* Document Scanner Modal with Real-Time Edge Detection */}
          <DocumentScannerModal
            isOpen={isDocScannerOpen}
            onClose={() => setIsDocScannerOpen(false)}
            orderId={editingOrderId || undefined}
            isAct={docScannerIsAct}
            onScanComplete={(scannedFile) => {
              if (docScannerIsAct) {
                handleUploadDirectActFile(scannedFile);
              } else {
                handleUploadDirectGeneralFile(scannedFile);
              }
            }}
          />
        </>
      )}
    </div>
  );
};

export default Kanban;

