import React from 'react';
import { Camera, Download, Eye, FileCheck, RefreshCw } from 'lucide-react';
import type { OrderAttachment } from '../../../../../api/kanban';
import { isActFile } from '../../../constants';
import type { OrderAttachmentsState } from '../../../hooks/useOrderAttachments';
import { isViewableInBrowser } from '../../../../../utils/attachments';

interface ActUploadCardProps {
  attachments: OrderAttachment[];
  files: OrderAttachmentsState;
  hasDocumentScanner: boolean;
}

/**
 * Карточка «Акт выполненных работ»: статус наличия акта, загрузка/сканирование, просмотр и скачивание.
 */
export const ActUploadCard: React.FC<ActUploadCardProps> = ({ attachments, files, hasDocumentScanner }) => {
  const {
    pendingFiles,
    uploadingFile,
    actFileInputRef,
    openingAttachmentId,
    openUploadChooser,
    handleActUpload,
    handleOpenAttachment,
    handleDownloadAttachment
  } = files;
  const actAttachment = attachments.find(a => isActFile(a.fileName, a.isAct));
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
              Акт выполненных работ
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              {hasAct ? 'Подписанный Акт прикреплен к заказу' : 'Обязателен для завершения заявки с договором'}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => openUploadChooser('ACT', hasDocumentScanner)}
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
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleOpenAttachment(actAttachment);
                  }}
                  className="btn btn-ghost"
                  style={{ padding: '6px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Посмотреть вложение"
                  disabled={openingAttachmentId === actAttachment.id}
                >
                  {openingAttachmentId === actAttachment.id ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <Eye size={16} />
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDownloadAttachment(actAttachment);
                }}
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
};
