import { useState } from 'react';
import { fetchAttachmentBlob, type OrderAttachment } from '../api/kanban';
import type { PreviewAttachmentData } from '../components/AttachmentPreviewModal';
import { downloadBlob, readApiErrorMessage } from '../utils/download';
import { toast } from '../utils/toast';

/** Просмотр вложения заказа во встроенном окне (работает и в PWA без блокировки всплывающих окон) и скачивание. */
export const useAttachmentPreview = () => {
  const [previewAttachment, setPreviewAttachment] = useState<PreviewAttachmentData | null>(null);
  const [openingAttachmentId, setOpeningAttachmentId] = useState<number | null>(null);

  const openAttachment = async (att: OrderAttachment) => {
    try {
      setOpeningAttachmentId(att.id);
      const blob = await fetchAttachmentBlob(att.id, false);
      const name = (att.fileName || '').toLowerCase();
      const type = (att.contentType || blob.type || '').toLowerCase();
      setPreviewAttachment({
        url: URL.createObjectURL(blob),
        fileName: att.fileName,
        contentType: att.contentType || blob.type,
        isImage: type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(name),
        isPdf: type.includes('pdf') || /\.pdf$/i.test(name),
        attachment: att
      });
    } catch (err) {
      console.error('Failed to open attachment', err);
      toast.error(await readApiErrorMessage(err, 'Не удалось открыть файл'));
    } finally {
      setOpeningAttachmentId(null);
    }
  };

  const closePreview = () => {
    if (previewAttachment?.url) {
      URL.revokeObjectURL(previewAttachment.url);
    }
    setPreviewAttachment(null);
  };

  const downloadAttachment = async (att: OrderAttachment) => {
    try {
      downloadBlob(await fetchAttachmentBlob(att.id, true), att.fileName);
      toast.success('Файл скачивается');
    } catch (err) {
      console.error('Failed to download attachment', err);
      toast.error(await readApiErrorMessage(err, 'Не удалось скачать файл'));
    }
  };

  return { previewAttachment, openingAttachmentId, openAttachment, closePreview, downloadAttachment };
};
