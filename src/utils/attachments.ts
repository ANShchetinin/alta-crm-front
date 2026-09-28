/**
 * Можно ли показать файл во встроенном просмотрщике (изображения, PDF, аудио/видео, текст).
 */
export const isViewableInBrowser = (name: string, contentType?: string): boolean => {
  const type = (contentType || '').toLowerCase();
  if (type.startsWith('image/') || type.startsWith('audio/') || type.startsWith('video/') || type.startsWith('text/') || type.includes('pdf')) {
    return true;
  }
  return /\.(pdf|png|jpe?g|gif|webp|svg|bmp|txt|csv|log|mp3|wav|ogg|mp4|webm)$/i.test((name || '').toLowerCase());
};
