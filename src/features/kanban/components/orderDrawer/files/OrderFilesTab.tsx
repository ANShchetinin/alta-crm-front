import React from 'react';
import { FileCheck, Paperclip, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { OrderAttachment } from '../../../../../api/kanban';
import { isActFile } from '../../../constants';
import type { OrderAttachmentsState } from '../../../hooks/useOrderAttachments';
import { ActUploadActionSheet } from '../../../../../components/ActUploadActionSheet';
import { DocumentScannerModal } from '../../../../../components/DocumentScannerModal';
import { AttachmentPreviewModal } from '../../../../../components/AttachmentPreviewModal';
import { ActUploadCard } from './ActUploadCard';
import { AttachmentItem } from './AttachmentItem';

interface OrderFilesTabProps {
  attachments: OrderAttachment[];
  files: OrderAttachmentsState;
  isWorker: boolean;
  isMobile: boolean;
  hasDocumentScanner: boolean;
}

/**
 * Вкладка «Файлы и акты»: акт выполненных работ, список файлов заказа и файлов, ожидающих сохранения заказа.
 */
export const OrderFilesTab: React.FC<OrderFilesTabProps> = ({ attachments, files, isWorker, isMobile, hasDocumentScanner }) => {
  const { t } = useTranslation();
  const {
    pendingFiles,
    uploadingFile,
    generalFileInputRef,
    openUploadChooser,
    handleFileUpload,
    removePendingFile
  } = files;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
      {/* Выделенный блок для Акта выполненных работ */}
        <ActUploadCard attachments={attachments} files={files} hasDocumentScanner={hasDocumentScanner} />

      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px'}}>
        <div>
          <h3 style={{margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)'}}>{t('kanban.modal.attachments') || 'Прикрепленные файлы'}</h3>
          <p style={{margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)'}}>
            Прикрепленные файлы, чертежи, фото и сканы документов
          </p>
        </div>
        <button
          type="button"
          onClick={() => openUploadChooser('GENERAL', hasDocumentScanner && isMobile)}
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
      
      {attachments.length > 0 || pendingFiles.length > 0 ? (
        <div className="attachments-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {attachments.map(att => (
              <AttachmentItem key={att.id} att={att} files={files} isWorker={isWorker} />
            ))}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1, minWidth: 0 }}>
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
                  <span style={{ fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1 }} title={pf.name}>
                    {pf.name} (ожидает сохранения)
                  </span>
                </div>
                <button type="button" onClick={() => removePendingFile(index)} style={{background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0}}>
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
          {t('kanban.modal.noAttachments') || 'Нет прикрепленных файлов'}
        </div>
      )}

        {files.isDocScannerOpen && (
          <DocumentScannerModal
            isOpen={files.isDocScannerOpen}
            onClose={files.closeDocScanner}
            onScanComplete={files.handleScanComplete}
            isAct={files.docScannerIsAct}
          />
        )}

        <ActUploadActionSheet
          isOpen={files.isSheetOpen}
          onClose={files.closeSheet}
          onSelectScan={files.handleSheetSelectScan}
          onSelectFile={files.handleSheetSelectFile}
          mode={files.sheetMode}
          hasAct={attachments.some(a => a.isAct || isActFile(a.fileName))}
        />

        <AttachmentPreviewModal
          preview={files.previewAttachment}
          onClose={files.handleClosePreview}
          onDownload={files.handleDownloadAttachment}
        />
      </div>
  );
};
