import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ZoomIn, ZoomOut, Check, X, RotateCcw } from 'lucide-react';

interface ImageCropModalProps {
  imageSrc: string;
  onCrop: (croppedDataUrl: string) => void;
  onClose: () => void;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  imageSrc,
  onCrop,
  onClose
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const CROP_SIZE = 240; // Crop window size in px

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
    // Center initially
    setPosition({ x: 0, y: 0 });
    setZoom(1);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Touch support for mobile / tablets
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPosition({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => Math.min(Math.max(0.5, prev + delta), 3.5));
  };

  const handleApplyCrop = () => {
    if (!imageRef.current) return;

    const canvas = document.createElement('canvas');
    const targetSize = 400;
    canvas.width = targetSize;
    canvas.height = targetSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageRef.current;
    const displayedWidth = img.width * zoom;
    const displayedHeight = img.height * zoom;

    // Center of the crop circle in container coords is (containerWidth / 2, containerHeight / 2)
    // Container center offset relative to the image center:
    const scale = targetSize / CROP_SIZE;

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Position the image in the canvas
    const drawX = (targetSize / 2) + (position.x * scale) - (displayedWidth * scale / 2);
    const drawY = (targetSize / 2) + (position.y * scale) - (displayedHeight * scale / 2);
    const drawW = displayedWidth * scale;
    const drawH = displayedHeight * scale;

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.restore();

    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
    onCrop(croppedDataUrl);
  };

  return createPortal(
    <div 
      className="modal-overlay" 
      style={{ zIndex: 10000, background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div 
        className="glass-panel" 
        style={{
          width: '90%',
          maxWidth: '440px',
          padding: '24px',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '18px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
        }}
      >
        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Кадрирование фото</h3>
          <button 
            type="button" 
            onClick={onClose} 
            className="btn-icon"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Viewport & Mask */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
          style={{
            position: 'relative',
            width: '300px',
            height: '300px',
            background: '#090d16',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)'
          }}
        >
          <img
            ref={imageRef}
            src={imageSrc}
            alt="To crop"
            onLoad={handleImageLoad}
            draggable={false}
            style={{
              position: 'absolute',
              maxWidth: 'none',
              maxHeight: 'none',
              width: imageSize.width ? `${imageSize.width > imageSize.height ? (CROP_SIZE * imageSize.width / imageSize.height) : CROP_SIZE}px` : 'auto',
              height: imageSize.height ? `${imageSize.height >= imageSize.width ? (CROP_SIZE * imageSize.height / imageSize.width) : CROP_SIZE}px` : 'auto',
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.05s ease-out',
              pointerEvents: 'none'
            }}
          />

          {/* Circular mask overlay */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              pointerEvents: 'none',
              boxShadow: `0 0 0 9999px rgba(10, 15, 29, 0.75)`,
              borderRadius: '50%',
              width: `${CROP_SIZE}px`,
              height: `${CROP_SIZE}px`,
              margin: 'auto',
              border: '2px solid rgba(255, 255, 255, 0.8)'
            }}
          />

          <div
            style={{
              position: 'absolute',
              bottom: '8px',
              fontSize: '0.75rem',
              color: 'rgba(255, 255, 255, 0.6)',
              pointerEvents: 'none',
              background: 'rgba(0, 0, 0, 0.5)',
              padding: '2px 8px',
              borderRadius: '10px'
            }}
          >
            Перетащите и масштабируйте
          </div>
        </div>

        {/* Zoom Controls */}
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            type="button" 
            onClick={() => setZoom(z => Math.max(0.5, z - 0.2))} 
            className="btn-icon" 
            title="Уменьшить"
          >
            <ZoomOut size={16} />
          </button>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.05"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            style={{
              flex: 1,
              accentColor: 'var(--accent-primary)',
              cursor: 'pointer'
            }}
          />
          <button 
            type="button" 
            onClick={() => setZoom(z => Math.min(3.5, z + 0.2))} 
            className="btn-icon" 
            title="Увеличить"
          >
            <ZoomIn size={16} />
          </button>
          <button
            type="button"
            onClick={() => { setZoom(1); setPosition({ x: 0, y: 0 }); }}
            className="btn-icon"
            title="Сбросить положение"
            style={{ marginLeft: '4px' }}
          >
            <RotateCcw size={16} />
          </button>
        </div>

        {/* Actions */}
        <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost"
            style={{ padding: '8px 16px' }}
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleApplyCrop}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 20px' }}
          >
            <Check size={16} />
            Применить
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
