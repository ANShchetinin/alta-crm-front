import React from 'react';
import { createPortal } from 'react-dom';
import { Camera, FolderOpen, X, FileCheck, Paperclip } from 'lucide-react';
import '../styles/documentScanner.css';

interface ActUploadActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectScan: () => void;
  onSelectFile: () => void;
  mode?: 'ACT' | 'GENERAL';
  hasAct?: boolean;
}

export const ActUploadActionSheet: React.FC<ActUploadActionSheetProps> = ({
  isOpen,
  onClose,
  onSelectScan,
  onSelectFile,
  mode = 'ACT',
  hasAct
}) => {
  if (!isOpen) return null;

  const isAct = mode === 'ACT';
  const headerTitle = isAct
    ? (hasAct ? 'Заменить Акт выполненных работ' : 'Прикрепить Акт выполненных работ')
    : 'Прикрепить файл к заявке';

  return createPortal(
    <div className="act-sheet-backdrop" onClick={onClose}>
      <div className="act-sheet-container" onClick={(e) => e.stopPropagation()}>
        <div className="act-sheet-handle" />

        <div className="act-sheet-header">
          <div className="act-sheet-title-row">
            {isAct ? (
              <FileCheck size={20} style={{ color: hasAct ? '#4ade80' : '#f59e0b' }} />
            ) : (
              <Paperclip size={20} style={{ color: 'var(--accent-primary)' }} />
            )}
            <h3>{headerTitle}</h3>
          </div>
          <button type="button" onClick={onClose} className="act-sheet-close-btn">
            <X size={20} />
          </button>
        </div>

        <div className="act-sheet-body">
          {/* Option 1: Document Scanner with Camera */}
          <button
            type="button"
            className="act-sheet-option-btn primary-scan"
            onClick={() => {
              onClose();
              onSelectScan();
            }}
          >
            <div className="act-sheet-option-icon scan-icon">
              <Camera size={24} />
            </div>
            <div className="act-sheet-option-info">
              <div className="act-sheet-option-title">Отсканировать документ</div>
              <div className="act-sheet-option-desc">Автоматическое определение границ и выпрямление листа</div>
            </div>
          </button>

          {/* Option 2: File Picker */}
          <button
            type="button"
            className="act-sheet-option-btn"
            onClick={() => {
              onClose();
              onSelectFile();
            }}
          >
            <div className="act-sheet-option-icon file-icon">
              <FolderOpen size={24} />
            </div>
            <div className="act-sheet-option-info">
              <div className="act-sheet-option-title">Выбрать файл</div>
              <div className="act-sheet-option-desc">Загрузить скан или фото из галереи / памяти устройства</div>
            </div>
          </button>
        </div>

        <div className="act-sheet-footer">
          <button type="button" onClick={onClose} className="act-sheet-cancel-btn">
            Отмена
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
