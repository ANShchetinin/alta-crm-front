import React from 'react';
import { Check, Download, Edit2, Eye, FileCheck, RefreshCw, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { OrderAttachment } from '../../../../../api/kanban';
import { isActFile } from '../../../constants';
import type { OrderAttachmentsState } from '../../../hooks/useOrderAttachments';
import { isViewableInBrowser } from '../../../../../utils/attachments';

interface AttachmentItemProps {
  att: OrderAttachment;
  files: OrderAttachmentsState;
  isWorker: boolean;
}

/**
 * Строка прикрепленного файла: просмотр, скачивание, а для сотрудников офиса — переименование и удаление.
 */
export const AttachmentItem: React.FC<AttachmentItemProps> = ({ att, files, isWorker }) => {
  const { t } = useTranslation();
  const {
    openingAttachmentId,
    editingAttachmentId,
    editingAttachmentName,
    setEditingAttachmentName,
    renamingAttachment,
    handleOpenAttachment,
    handleDownloadAttachment,
    handleDeleteAttachment,
    handleStartRename,
    handleCancelRename,
    handleSaveRename
  } = files;
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
                handleSaveRename(att.id);
              } else if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                handleCancelRename();
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
              handleSaveRename(att.id);
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
              handleCancelRename();
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1, minWidth: 0 }}>
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
              style={{fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1}}
              title={att.fileName}
            >
              {att.fileName}
            </span>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0}}>
            {!isWorker && (
              <button 
                type="button" 
                onClick={() => handleStartRename(att)} 
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
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleOpenAttachment(att);
                }} 
                className="btn btn-ghost" 
                style={{padding: '6px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}
                title="Посмотреть вложение"
                disabled={openingAttachmentId === att.id}
              >
                {openingAttachmentId === att.id ? (
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
                handleDownloadAttachment(att);
              }} 
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
};
