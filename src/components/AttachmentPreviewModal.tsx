import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, FileCheck, Download, X, ZoomIn, ZoomOut, RotateCw, RotateCcw, FileText } from 'lucide-react';
import type { OrderAttachment } from '../api/kanban';
import '../styles/attachmentPreview.css';

export interface PreviewAttachmentData {
  url: string;
  fileName: string;
  contentType?: string;
  isImage: boolean;
  isPdf: boolean;
  attachment: OrderAttachment;
}

interface AttachmentPreviewModalProps {
  preview: PreviewAttachmentData | null;
  onClose: () => void;
  onDownload: (attachment: OrderAttachment) => void;
}

export const AttachmentPreviewModal: React.FC<AttachmentPreviewModalProps> = ({
  preview,
  onClose,
  onDownload
}) => {
  const [imgZoom, setImgZoom] = useState<number>(1);
  const [imgPosition, setImgPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [imgRotation, setImgRotation] = useState<number>(0);
  const [isImgDragging, setIsImgDragging] = useState<boolean>(false);
  const imgDragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const imgTouchDistRef = useRef<number | null>(null);
  const imgInitialZoomRef = useRef<number>(1);
  const lastTapRef = useRef<number>(0);

  const resetImageTransform = useCallback(() => {
    setImgZoom(1);
    setImgPosition({ x: 0, y: 0 });
    setImgRotation(0);
  }, []);

  const handleClose = useCallback(() => {
    resetImageTransform();
    onClose();
  }, [onClose, resetImageTransform]);

  const handleZoomIn = () => {
    setImgZoom(prev => Math.min(+(prev + 0.5).toFixed(2), 5));
  };

  const handleZoomOut = () => {
    setImgZoom(prev => {
      const next = Math.max(+(prev - 0.5).toFixed(2), 1);
      if (next === 1) {
        setImgPosition({ x: 0, y: 0 });
      }
      return next;
    });
  };

  const handleRotate = () => {
    setImgRotation(prev => (prev + 90) % 360);
  };

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (imgZoom <= 1 && imgRotation === 0) return;
    setIsImgDragging(true);
    imgDragStartRef.current = {
      x: e.clientX - imgPosition.x,
      y: e.clientY - imgPosition.y
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isImgDragging) return;
    setImgPosition({
      x: e.clientX - imgDragStartRef.current.x,
      y: e.clientY - imgDragStartRef.current.y
    });
  };

  const handleMouseUp = () => {
    setIsImgDragging(false);
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (!preview?.isImage) return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.25 : -0.25;
    setImgZoom(prev => {
      const next = Math.min(Math.max(1, +(prev + delta).toFixed(2)), 5);
      if (next === 1) {
        setImgPosition({ x: 0, y: 0 });
      }
      return next;
    });
  };

  // Double click / tap toggle zoom
  const handleToggleZoom = () => {
    if (imgZoom > 1 || imgRotation !== 0) {
      resetImageTransform();
    } else {
      setImgZoom(2.5);
    }
  };

  // Touch handlers for mobile (pinch-to-zoom + 1-finger pan + double tap)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      imgTouchDistRef.current = dist;
      imgInitialZoomRef.current = imgZoom;
    } else if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        handleToggleZoom();
        lastTapRef.current = 0;
        return;
      }
      lastTapRef.current = now;

      if (imgZoom > 1) {
        setIsImgDragging(true);
        imgDragStartRef.current = {
          x: e.touches[0].clientX - imgPosition.x,
          y: e.touches[0].clientY - imgPosition.y
        };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && imgTouchDistRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / imgTouchDistRef.current;
      const newZoom = Math.min(Math.max(1, +(imgInitialZoomRef.current * ratio).toFixed(2)), 5);
      setImgZoom(newZoom);
      if (newZoom === 1) {
        setImgPosition({ x: 0, y: 0 });
      }
    } else if (e.touches.length === 1 && isImgDragging && imgZoom > 1) {
      setImgPosition({
        x: e.touches[0].clientX - imgDragStartRef.current.x,
        y: e.touches[0].clientY - imgDragStartRef.current.y
      });
    }
  };

  const handleTouchEnd = () => {
    imgTouchDistRef.current = null;
    setIsImgDragging(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && preview) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [preview, handleClose]);

  if (!preview) return null;

  return createPortal(
    <div 
      className="archive-preview-overlay animate-fade-in" 
      onClick={handleClose}
    >
      <div 
        className="archive-preview-content animate-scale-up" 
        onClick={e => e.stopPropagation()}
      >
        {/* Preview Modal Header */}
        <div className="archive-preview-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1, paddingRight: '12px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClose}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 12px', fontSize: '0.84rem', flexShrink: 0 }}
              title="Вернуться назад в заявку"
              aria-label="Вернуться назад в заявку"
            >
              <ArrowLeft size={16} />
              <span>Назад</span>
            </button>
            <FileCheck size={18} style={{ color: preview.attachment.isAct ? '#22c55e' : 'var(--accent-primary)', flexShrink: 0, marginLeft: '4px' }} />
            <span 
              style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              title={preview.fileName}
            >
              {preview.fileName}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onDownload(preview.attachment)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 12px', fontSize: '0.84rem' }}
              title="Скачать файл"
              aria-label="Скачать файл"
            >
              <Download size={15} /> <span>Скачать</span>
            </button>
            <button 
              type="button" 
              className="btn-icon" 
              onClick={handleClose}
              title="Закрыть просмотр"
              aria-label="Закрыть просмотр"
              style={{ width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Preview Modal Body */}
        <div 
          className="archive-preview-body"
          onWheel={handleWheel}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ overflow: 'hidden', touchAction: imgZoom > 1 ? 'none' : 'pan-y' }}
        >
          {preview.isImage ? (
            <div 
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                cursor: imgZoom > 1 ? (isImgDragging ? 'grabbing' : 'grab') : 'zoom-in'
              }}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onDoubleClick={handleToggleZoom}
            >
              <img 
                src={preview.url} 
                alt={preview.fileName} 
                draggable={false}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  borderRadius: '8px',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
                  transform: `translate(${imgPosition.x}px, ${imgPosition.y}px) scale(${imgZoom}) rotate(${imgRotation}deg)`,
                  transition: isImgDragging || imgTouchDistRef.current ? 'none' : 'transform 0.15s ease-out',
                  userSelect: 'none',
                  WebkitUserSelect: 'none'
                }} 
              />

              {/* Floating Zoom & Rotation Controls Toolbar */}
              <div 
                className="archive-preview-zoom-toolbar animate-fade-in"
                onClick={e => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  bottom: '16px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'rgba(15, 23, 42, 0.88)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '9999px',
                  padding: '4px 10px',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
                  zIndex: 10
                }}
              >
                <button
                  type="button"
                  className="btn-icon"
                  onClick={handleZoomOut}
                  disabled={imgZoom <= 1}
                  title="Уменьшить масштаб"
                  style={{ width: '32px', height: '32px', color: imgZoom <= 1 ? 'rgba(255,255,255,0.3)' : '#fff' }}
                >
                  <ZoomOut size={16} />
                </button>
                
                <button
                  type="button"
                  onClick={resetImageTransform}
                  title="Сбросить масштаб к 100%"
                  style={{
                    padding: '2px 8px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: '#fff',
                    borderRadius: '4px',
                    minWidth: '46px',
                    textAlign: 'center',
                    cursor: 'pointer'
                  }}
                >
                  {Math.round(imgZoom * 100)}%
                </button>

                <button
                  type="button"
                  className="btn-icon"
                  onClick={handleZoomIn}
                  disabled={imgZoom >= 5}
                  title="Увеличить масштаб"
                  style={{ width: '32px', height: '32px', color: imgZoom >= 5 ? 'rgba(255,255,255,0.3)' : '#fff' }}
                >
                  <ZoomIn size={16} />
                </button>

                <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />

                <button
                  type="button"
                  className="btn-icon"
                  onClick={handleRotate}
                  title="Повернуть на 90°"
                  style={{ width: '32px', height: '32px', color: '#fff' }}
                >
                  <RotateCw size={15} />
                </button>

                {(imgZoom !== 1 || imgRotation !== 0) && (
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={resetImageTransform}
                    title="Сбросить все трансформации"
                    style={{ width: '32px', height: '32px', color: '#fff' }}
                  >
                    <RotateCcw size={15} />
                  </button>
                )}
              </div>
            </div>
          ) : preview.isPdf ? (
            <object 
              data={preview.url} 
              type="application/pdf"
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                borderRadius: '8px',
                background: '#ffffff'
              }}
            >
              <iframe 
                src={preview.url} 
                title={preview.fileName}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  borderRadius: '8px',
                  background: '#ffffff'
                }}
              >
                <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <FileText size={48} style={{ color: 'var(--accent-primary)', marginBottom: '12px' }} />
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    {preview.fileName}
                  </div>
                  <p style={{ fontSize: '0.85rem', marginBottom: '16px' }}>
                    Встроенный просмотр PDF ограничен в вашем браузере. Нажмите кнопку ниже, чтобы скачать и открыть файл.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => onDownload(preview.attachment)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Download size={16} /> Скачать и открыть PDF
                  </button>
                </div>
              </iframe>
            </object>
          ) : (
            <iframe 
              src={preview.url} 
              title={preview.fileName}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                borderRadius: '8px',
                background: 'var(--input-bg, #ffffff)'
              }}
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
