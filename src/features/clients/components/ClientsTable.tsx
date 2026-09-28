import { useTranslation } from 'react-i18next';
import { Edit2, FileText, Phone, Tag, Trash2 } from 'lucide-react';
import type { Client } from '../../../api/clients';
import { formatDateInTimezone } from '../../../utils/dateUtils';
import { ClientAvatar } from './ClientAvatar';
import { ClientTenantTags } from './ClientTenantTags';
import { MessengerLinks } from './MessengerLinks';
import type { ClientListProps } from './clientListProps';

const DASH = <span style={{ color: 'var(--text-secondary)', opacity: 0.4 }}>—</span>;

/** ЛПР юрлица: указанный в карточке, иначе первый из представителей (+ сколько еще). */
const LegalContactCell = ({ client }: { client: Client }) => {
  const first = client.contacts?.[0];
  return (
    <div>
      {client.contactPerson ? (
        <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>
          {client.contactPerson}
          {client.contactPosition && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '6px' }}>({client.contactPosition})</span>
          )}
        </div>
      ) : first ? (
        <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>
          {first.name}
          {first.position && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '6px' }}>({first.position})</span>
          )}
          {client.contacts && client.contacts.length > 1 && (
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', marginLeft: '6px' }}>+{client.contacts.length - 1}</span>
          )}
        </div>
      ) : DASH}
      {client.email && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{client.email}</div>
      )}
    </div>
  );
};

/** Таблица клиентов для десктопа; клик по строке открывает карточку. */
export const ClientsTable = ({ clients, tenants, currentTenantId, timezone, onEdit, onHistory, onDelete }: ClientListProps) => {
  const { t } = useTranslation();

  return (
    <div className="clients-table-container glass-panel desktop-table-view">
      <table className="clients-table">
        <thead>
          <tr>
            <th>{t('clients.columns.name')}</th>
            <th>Контакты / ЛПР</th>
            <th>{t('clients.columns.phone')}</th>
            <th>{t('clients.columns.leadSource', 'Источник лида')}</th>
            <th>{t('clients.columns.createdAt')}</th>
            <th style={{ textAlign: 'right' }}>{t('clients.columns.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {clients.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', opacity: 0.5, padding: '32px' }}>
                Клиенты не найдены.
              </td>
            </tr>
          ) : (
            clients.map(client => {
              const isLegal = client.clientType === 'LEGAL_ENTITY';
              return (
                <tr key={client.id} onClick={() => onEdit(client)} style={{ cursor: 'pointer' }} className="client-row-hover">
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <ClientAvatar client={client} />
                      <div>
                        <div className="client-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{client.name}</span>
                          {isLegal && (
                            <span style={{
                              fontSize: '0.7rem',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              background: 'rgba(59, 130, 246, 0.15)',
                              color: 'var(--accent-primary)',
                              fontWeight: 600
                            }}>
                              ЮРЛИЦО
                            </span>
                          )}
                        </div>
                        {isLegal && client.inn && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            ИНН: <span style={{ fontFamily: 'monospace' }}>{client.inn}</span>
                            {client.kpp ? ` • КПП: ${client.kpp}` : ''}
                          </div>
                        )}
                        <ClientTenantTags tenantIds={client.allowedTenantIds} tenants={tenants} currentTenantId={currentTenantId} />
                      </div>
                    </div>
                  </td>
                  <td>{isLegal ? <LegalContactCell client={client} /> : DASH}</td>
                  <td>
                    <div className="client-phone">
                      {client.phone ? (
                        <a
                          href={`tel:${client.phone.replace(/[^\d+]/g, '')}`}
                          title="Позвонить"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: 'var(--text-primary)',
                            textDecoration: 'none',
                            padding: '4px 8px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(34, 197, 94, 0.1)',
                            border: '1px solid rgba(34, 197, 94, 0.2)',
                            fontWeight: 500,
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <Phone size={13} style={{ color: 'var(--success)', flexShrink: 0 }} />
                          <span style={{ whiteSpace: 'nowrap' }}>{client.phone}</span>
                        </a>
                      ) : '-'}
                      <MessengerLinks whatsapp={client.whatsapp} telegram={client.telegram} iconSize={13} detailedTitles />
                    </div>
                  </td>
                  <td>
                    {client.leadSource ? (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid rgba(59, 130, 246, 0.25)',
                        color: '#60a5fa',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                        whiteSpace: 'nowrap'
                      }}>
                        <Tag size={12} style={{ opacity: 0.8 }} />
                        {client.leadSource}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)', opacity: 0.4, fontSize: '0.85rem' }}>—</span>
                    )}
                  </td>
                  <td>
                    <div className="client-date">{formatDateInTimezone(client.createdAt, timezone)}</div>
                  </td>
                  <td>
                    <div className="client-actions" onClick={(e) => e.stopPropagation()}>
                      {client.phone && (
                        <a
                          href={`tel:${client.phone}`}
                          className="action-btn"
                          style={{ color: 'var(--success)' }}
                          title="Позвонить клиенту"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Phone size={16} />
                        </a>
                      )}
                      <button type="button" onClick={() => onHistory(client)} className="action-btn" title="История заявок">
                        <FileText size={16} />
                      </button>
                      <button type="button" onClick={() => onEdit(client)} className="action-btn" title={t('clients.modal.editTitle')}>
                        <Edit2 size={16} />
                      </button>
                      <button type="button" onClick={() => onDelete(client.id)} className="action-btn delete" title="Удалить">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};
