import { Edit2, FileText, Phone, Tag, Trash2 } from 'lucide-react';
import { formatDateInTimezone } from '../../../utils/dateUtils';
import { ClientAvatar } from './ClientAvatar';
import { ClientTenantTags } from './ClientTenantTags';
import { MessengerLinks } from './MessengerLinks';
import type { ClientListProps } from './clientListProps';

const ACTION_BUTTON_STYLE = { fontSize: '0.78rem', padding: '4px 8px', height: '28px', display: 'inline-flex', alignItems: 'center', gap: '4px' } as const;

/** Карточки клиентов для телефона; нажатие на карточку открывает редактирование. */
export const ClientCards = ({ clients, tenants, currentTenantId, timezone, onEdit, onHistory, onDelete }: ClientListProps) => (
  <div className="mobile-card-view">
    {clients.length === 0 ? (
      <div className="glass-panel" style={{ textAlign: 'center', opacity: 0.6, padding: '32px 16px', borderRadius: 'var(--radius-md)' }}>
        Клиенты не найдены.
      </div>
    ) : (
      <div className="mobile-cards-list">
        {clients.map(client => {
          const isLegal = client.clientType === 'LEGAL_ENTITY';
          return (
            <div key={client.id} onClick={() => onEdit(client)} className="mobile-data-card">
              <div className="mobile-data-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                  <ClientAvatar client={client} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {client.name}
                    </div>
                    {isLegal && client.legalName && client.legalName !== client.name && (
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {client.legalName}
                      </div>
                    )}
                  </div>
                </div>
                <span style={{
                  fontSize: '0.7rem',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: isLegal ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                  color: isLegal ? '#60a5fa' : 'var(--text-secondary)',
                  fontWeight: 600,
                  flexShrink: 0
                }}>
                  {isLegal ? 'ЮРЛИЦО' : 'ФИЗЛИЦО'}
                </span>
              </div>

              <div className="mobile-data-card-body">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                  {client.phone ? (
                    <a
                      href={`tel:${client.phone.replace(/[^\d+]/g, '')}`}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: 'var(--success, #22c55e)',
                        textDecoration: 'none',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: 'rgba(34, 197, 94, 0.1)',
                        border: '1px solid rgba(34, 197, 94, 0.25)',
                        fontWeight: 600,
                        fontSize: '0.82rem'
                      }}
                    >
                      <Phone size={13} />
                      <span>{client.phone}</span>
                    </a>
                  ) : (
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Без телефона</span>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MessengerLinks whatsapp={client.whatsapp} telegram={client.telegram} iconSize={14} />
                  </div>
                </div>

                {isLegal && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '2px', background: 'rgba(255,255,255,0.03)', padding: '6px 8px', borderRadius: '6px' }}>
                    {client.contactPerson && (
                      <div>ЛПР: <strong>{client.contactPerson}</strong>{client.contactPosition ? ` (${client.contactPosition})` : ''}</div>
                    )}
                    {client.inn && (
                      <div>ИНН: <span style={{ fontFamily: 'monospace' }}>{client.inn}</span>{client.kpp ? ` • КПП: ${client.kpp}` : ''}</div>
                    )}
                  </div>
                )}

                <ClientTenantTags tenantIds={client.allowedTenantIds} tenants={tenants} currentTenantId={currentTenantId} />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {client.leadSource ? (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: 'rgba(59, 130, 246, 0.1)',
                      color: '#60a5fa',
                      fontWeight: 500
                    }}>
                      <Tag size={11} /> {client.leadSource}
                    </span>
                  ) : (
                    <span />
                  )}
                  <span>{formatDateInTimezone(client.createdAt, timezone)}</span>
                </div>
              </div>

              <div className="mobile-data-card-actions" onClick={(e) => e.stopPropagation()}>
                <button type="button" onClick={() => onHistory(client)} className="btn btn-ghost" style={ACTION_BUTTON_STYLE}>
                  <FileText size={13} /> История
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button type="button" onClick={() => onEdit(client)} className="btn btn-ghost" style={ACTION_BUTTON_STYLE}>
                    <Edit2 size={13} /> Изменить
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(client.id)}
                    className="btn btn-ghost text-danger"
                    style={{ fontSize: '0.78rem', padding: '4px 8px', height: '28px', color: '#ef4444' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
);
