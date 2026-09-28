import { Download, Eye, FileCheck } from 'lucide-react';
import type { OrderAttachment } from '../../../api/kanban';
import { isViewableInBrowser } from '../../../utils/attachments';

interface OrderAttachmentsListProps {
  attachments: OrderAttachment[];
  openingAttachmentId: number | null;
  onOpen: (att: OrderAttachment) => void;
  onDownload: (att: OrderAttachment) => void;
}

const ICON_BUTTON = { width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' } as const;

/** Файлы заказа с отметкой акта: просмотр (если браузер умеет показать) и скачивание. */
export const OrderAttachmentsList = ({ attachments, openingAttachmentId, onOpen, onDownload }: OrderAttachmentsListProps) => (
  <div style={{ padding: '14px 16px', background: 'var(--chip-bg, rgba(255, 255, 255, 0.04))', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
      Прикрепленные документы ({attachments.length})
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {attachments.map(att => (
        <div
          key={att.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            background: att.isAct ? 'rgba(34, 197, 94, 0.04)' : 'var(--input-bg, rgba(255, 255, 255, 0.02))',
            border: att.isAct ? '1px solid rgba(34, 197, 94, 0.25)' : '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.84rem',
            gap: '10px'
          }}
        >
          <span
            style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}
            title={att.fileName}
          >
            <FileCheck size={16} style={{ color: att.isAct ? '#22c55e' : 'var(--accent-primary)', flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.fileName}</span>
            {att.isAct && (
              <span style={{ fontSize: '0.7rem', background: 'rgba(34, 197, 94, 0.18)', color: '#4ade80', padding: '1px 6px', borderRadius: '4px', fontWeight: 600, flexShrink: 0 }}>
                Акт
              </span>
            )}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            {isViewableInBrowser(att.fileName, att.contentType) && (
              <button
                type="button"
                onClick={() => onOpen(att)}
                className="btn-icon"
                disabled={openingAttachmentId === att.id}
                style={ICON_BUTTON}
                title="Просмотреть"
                aria-label="Просмотреть файл"
              >
                <Eye size={16} />
              </button>
            )}
            <button type="button" onClick={() => onDownload(att)} className="btn-icon" style={ICON_BUTTON} title="Скачать" aria-label="Скачать файл">
              <Download size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  </div>
);
