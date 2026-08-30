import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Хук для загрузки и кадрирования аватарок.
 * Используется в Clients.tsx и Employees.tsx.
 */
export function useAvatarUpload(
  initialAvatarUrl: string = '',
  onAvatarChange?: (url: string) => void
) {
  const [rawImageToCrop, setRawImageToCrop] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAvatarUrl(initialAvatarUrl || '');
  }, [initialAvatarUrl]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setRawImageToCrop(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  }, []);

  const handleCropComplete = useCallback((croppedDataUrl: string) => {
    setAvatarUrl(croppedDataUrl);
    setRawImageToCrop(null);
    onAvatarChange?.(croppedDataUrl);
  }, [onAvatarChange]);

  const handleRemoveAvatar = useCallback(() => {
    setRawImageToCrop(null);
    setAvatarUrl('');
    onAvatarChange?.('');
  }, [onAvatarChange]);

  const resetAvatar = useCallback(() => {
    setRawImageToCrop(null);
    setAvatarUrl(initialAvatarUrl);
    onAvatarChange?.(initialAvatarUrl);
  }, [initialAvatarUrl, onAvatarChange]);

  return {
    avatarUrl,
    setAvatarUrl,
    rawImageToCrop,
    setRawImageToCrop,
    fileInputRef,
    handleFileChange,
    handleCropComplete,
    handleRemoveAvatar,
    resetAvatar,
  };
}
