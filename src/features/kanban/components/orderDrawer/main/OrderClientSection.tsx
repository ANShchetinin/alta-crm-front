import React from 'react';
import { Building2, MessageCircle, Phone, Plus, Send, Tag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Order } from '../../../../../api/kanban';
import type { Client } from '../../../../../api/clients';
import { getAvatarGradient, getClientInitials } from '../../../../../utils/avatarUtils';
import { getTelegramLink, getWhatsAppLink } from '../../../../../utils/messengerUtils';
import { ClientSearchSelect } from '../../ClientSearchSelect';
import { formatPhone, phoneHref } from '../../../../../utils/phone';

interface OrderClientSectionProps {
  orderId: number | null;
  clientId: string;
  onClientChange: (clientId: string) => void;
  clients: Client[];
  currentOrder: Order | null;
  isWorker: boolean;
  onAddNewClient: () => void;
}

/**
 * Клиент заказа: карточка с быстрым звонком для сохраненного заказа, выбор клиента и контакты — для нового.
 */
export const OrderClientSection: React.FC<OrderClientSectionProps> = ({
  orderId,
  clientId,
  onClientChange,
  clients,
  currentOrder,
  isWorker,
  onAddNewClient
}) => {
  const { t } = useTranslation();
  const selectedClient = clients.find(c => c.id.toString() === clientId);

  return (
    <div className="form-group">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <label style={{ margin: 0 }}>{t('kanban.modal.client') || 'Клиент'}</label>
        {!orderId && !isWorker && (
          <button 
            type="button" 
            onClick={onAddNewClient}
            className="btn-icon"
            style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 6px' }}
          >
            <Plus size={14} /> {t('clients.addClient') || 'Новый клиент'}
          </button>
        )}
      </div>
      {orderId ? (() => {
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
                href={phoneHref(cPhone)}
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
                title={`Позвонить клиенту: ${formatPhone(cPhone)}`}
              >
                <Phone size={14} /> {formatPhone(cPhone)}
              </a>
            )}
          </div>
        );
      })() : (
        <>
          <ClientSearchSelect
            value={clientId}
            clients={clients}
            onChange={onClientChange}
            onAddNewClient={onAddNewClient}
            isWorker={isWorker}
          />
          {(() => {
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
                      href={phoneHref(selectedClient.phone)}
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
                      title={`Позвонить клиенту: ${formatPhone(selectedClient.phone)}`}
                    >
                      <Phone size={14} /> {formatPhone(selectedClient.phone)}
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
  );
};
