import React from 'react';
import { Camera, Crop, X } from 'lucide-react';
import { useAvatarUpload } from '../hooks/useAvatarUpload';
import { ImageCropModal } from './ImageCropModal';
import { getInitials } from '../utils/avatarUtils';

export interface AvatarUploadProps {
  label: string;
  name?: string;
  previewSize?: string;
  previewFontSize?: string;
  children?: React.ReactNode;
  onAvatarUrlChange: (url: string) => void;
  initialAvatarUrl?: string;
  renderAvatarContent?: (avatarUrl: string, name: string, fallbackIcon: React.ReactNode) => React.ReactNode;
  fallbackIcon: React.ReactNode;
}

/**
 * Переиспользуемый компонент загрузки аватарки.
 * Включает превью, кнопку выбора файла, кадрирование и удаление.
 */
export const AvatarUpload: React.FC<AvatarUploadProps> = ({
  label,
  name = '',
  previewSize = '72px',
  previewFontSize = '1.3rem',
  children,
  onAvatarUrlChange,
  initialAvatarUrl = '',
  renderAvatarContent,
  fallbackIcon,
}) => {
  const {
    avatarUrl,
    rawImageToCrop,
    setRawImageToCrop,
    fileInputRef,
    handleFileChange,
    handleCropComplete,
    handleRemoveAvatar,
  } = useAvatarUpload(initialAvatarUrl, onAvatarUrlChange);

  const handleRecrop = () => {
    if (avatarUrl) {
      setRawImageToCrop(avatarUrl);
    }
  };

  const defaultRenderAvatar = (url: string, currentName: string, icon: React.ReactNode) => {
    if (url) {
      return (
        <img 
          src={url} 
          alt="Avatar preview" 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
        />
      );
    }
    return currentName ? getInitials(currentName) : icon;
  };

  return (
    <>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '18px',
        padding: '14px 16px',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-md)',
        marginBottom: '16px'
      }}>
        <div style={{
          width: previewSize,
          height: previewSize,
          borderRadius: '50%',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: previewFontSize,
          fontWeight: 700,
          color: '#fff',
          background: avatarUrl ? 'transparent' : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
          border: '2.5px solid rgba(255, 255, 255, 0.18)',
          boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
          flexShrink: 0
        }}>
          {renderAvatarContent 
            ? renderAvatarContent(avatarUrl, name, fallbackIcon)
            : defaultRenderAvatar(avatarUrl, name, fallbackIcon)
          }
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{label}</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input 
              type="file" 
              ref={fileInputRef} 
              accept="image/*" 
              style={{ display: 'none' }} 
              onChange={handleFileChange} 
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-sm btn-ghost"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '6px 12px' }}
            >
              <Camera size={14} /> {avatarUrl ? 'Заменить' : 'Выбрать фото'}
            </button>
            {avatarUrl && (
              <>
                <button
                  type="button"
                  onClick={handleRecrop}
                  className="btn btn-sm btn-ghost"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', padding: '6px 10px' }}
                  title="Кадрировать"
                >
                  <Crop size={14} /> Кадрировать
                </button>
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="btn btn-sm"
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: 'var(--danger)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.8rem',
                    padding: '6px 10px'
                  }}
                >
                  <X size={14} /> Удалить
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {rawImageToCrop && (
        <ImageCropModal 
          imageSrc={rawImageToCrop} 
          onCrop={handleCropComplete} 
          onClose={() => setRawImageToCrop(null)} 
        />
      )}

      {children}
    </>
  );
};
