import { useRef, useState } from 'react';
import {
  deleteAttachment,
  fetchAttachmentBlob,
  renameAttachment,
  uploadAttachment,
  type OrderAttachment
} from '../../../api/kanban';
import type { PreviewAttachmentData } from '../../../components/AttachmentPreviewModal';
import { downloadBlob, readApiErrorMessage } from '../../../utils/download';
import { toast } from '../../../utils/toast';
import { confirm } from '../../../utils/confirm';
import type { SetOrderFormData } from '../utils/orderForm';

const notifyAttachmentsChanged = (orderId: number | null) => {
  window.dispatchEvent(new CustomEvent('alta:orders-changed', { detail: { action: 'attachment', orderId } }));
};

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

export type AttachmentSheetMode = 'ACT' | 'GENERAL';

/**
 * Файлы заказа: загрузка (сразу на сервер для сохраненного заказа, иначе — в очередь до создания),
 * акт выполненных работ, сканер документов, просмотр, скачивание, переименование и удаление.
 */
export const useOrderAttachments = (orderId: number | null, setFormData: SetOrderFormData) => {
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [editingAttachmentId, setEditingAttachmentId] = useState<number | null>(null);
  const [editingAttachmentName, setEditingAttachmentName] = useState('');
  const [renamingAttachment, setRenamingAttachment] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<PreviewAttachmentData | null>(null);
  const [openingAttachmentId, setOpeningAttachmentId] = useState<number | null>(null);
  const [sheetMode, setSheetMode] = useState<AttachmentSheetMode>('ACT');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isDocScannerOpen, setIsDocScannerOpen] = useState(false);
  const [docScannerIsAct, setDocScannerIsAct] = useState(true);
  const actFileInputRef = useRef<HTMLInputElement | null>(null);
  const generalFileInputRef = useRef<HTMLInputElement | null>(null);

  const appendAttachment = (attachment: OrderAttachment) => {
    setFormData(prev => ({ ...prev, attachments: [...prev.attachments, attachment] }));
  };

  /**
   * Загружает файлы в сохраненный заказ либо ставит их в очередь до создания заказа. Возвращает true при успехе.
   * isAct не передается для обычных файлов — тогда бэкенд сам распознает акт по имени.
   */
  const addFiles = async (files: File[], isAct: boolean | undefined): Promise<boolean> => {
    if (!orderId) {
      setPendingFiles(prev => [...prev, ...files]);
      return true;
    }
    setUploadingFile(true);
    try {
      for (const file of files) {
        appendAttachment(await uploadAttachment(orderId, file, isAct));
      }
      notifyAttachmentsChanged(orderId);
      return true;
    } catch (err) {
      console.error('Failed to upload file', err);
      return false;
    } finally {
      setUploadingFile(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) {
      return;
    }
    const uploadsNow = Boolean(orderId);
    const ok = await addFiles(files, undefined);
    e.target.value = '';
    if (!uploadsNow) {
      return;
    }
    if (ok) {
      toast.success(files.length > 1 ? `Загружено файлов: ${files.length}` : 'Файл успешно прикреплен');
    } else {
      toast.error('Не удалось загрузить файл');
    }
  };

  const handleActUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) {
      return;
    }
    const uploadsNow = Boolean(orderId);
    const ok = await addFiles(uploadsNow ? files.slice(0, 1) : files, true);
    e.target.value = '';
    if (!uploadsNow) {
      return;
    }
    if (ok) {
      toast.success('Акт выполненных работ успешно прикреплен');
    } else {
      toast.error('Не удалось загрузить Акт');
    }
  };

  const handleScanComplete = async (file: File) => {
    await addFiles([file], docScannerIsAct);
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  /** Выбор способа загрузки: со сканером — шторка «скан / файл», без него — сразу выбор файла. */
  const openUploadChooser = (mode: AttachmentSheetMode, useScanner: boolean) => {
    if (useScanner) {
      setSheetMode(mode);
      setIsSheetOpen(true);
      return;
    }
    (mode === 'ACT' ? actFileInputRef : generalFileInputRef).current?.click();
  };

  const handleSheetSelectScan = () => {
    setDocScannerIsAct(sheetMode === 'ACT');
    setIsDocScannerOpen(true);
  };

  const handleSheetSelectFile = () => {
    (sheetMode === 'ACT' ? actFileInputRef : generalFileInputRef).current?.click();
  };

  const handleOpenAttachment = async (att: OrderAttachment) => {
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

  const handleClosePreview = () => {
    if (previewAttachment?.url) {
      URL.revokeObjectURL(previewAttachment.url);
    }
    setPreviewAttachment(null);
  };

  const handleDownloadAttachment = async (att: OrderAttachment) => {
    try {
      downloadBlob(await fetchAttachmentBlob(att.id, true), att.fileName);
      toast.success('Файл скачивается');
    } catch (err) {
      console.error('Failed to download attachment', err);
      toast.error(await readApiErrorMessage(err, 'Не удалось скачать файл'));
    }
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    const ok = await confirm({
      title: 'Удалить файл?',
      message: 'Вы уверены, что хотите удалить этот прикрепленный файл?',
      confirmText: 'Удалить',
      danger: true
    });
    if (!ok) {
      return;
    }
    try {
      await deleteAttachment(attachmentId);
      setFormData(prev => ({ ...prev, attachments: prev.attachments.filter(a => a.id !== attachmentId) }));
      notifyAttachmentsChanged(orderId);
      toast.success('Файл успешно удален');
    } catch (err) {
      console.error('Failed to delete attachment', err);
      toast.error('Не удалось удалить файл');
    }
  };

  const handleStartRename = (att: OrderAttachment) => {
    setEditingAttachmentId(att.id);
    setEditingAttachmentName(att.fileName);
  };

  const handleCancelRename = () => {
    setEditingAttachmentId(null);
    setEditingAttachmentName('');
  };

  const handleSaveRename = async (attachmentId: number) => {
    if (!editingAttachmentName.trim()) {
      toast.warning('Имя файла не может быть пустым');
      return;
    }
    setRenamingAttachment(true);
    try {
      const updated = await renameAttachment(attachmentId, editingAttachmentName.trim());
      setFormData(prev => ({
        ...prev,
        attachments: prev.attachments.map(a => (a.id === attachmentId ? { ...a, fileName: updated.fileName } : a))
      }));
      handleCancelRename();
      notifyAttachmentsChanged(orderId);
      toast.success('Файл успешно переименован');
    } catch (err) {
      console.error('Failed to rename attachment', err);
      toast.error(await readApiErrorMessage(err, 'Не удалось переименовать файл'));
    } finally {
      setRenamingAttachment(false);
    }
  };

  return {
    pendingFiles,
    setPendingFiles,
    uploadingFile,
    actFileInputRef,
    generalFileInputRef,
    handleFileUpload,
    handleActUpload,
    handleScanComplete,
    removePendingFile,
    openUploadChooser,
    sheetMode,
    isSheetOpen,
    closeSheet: () => setIsSheetOpen(false),
    handleSheetSelectScan,
    handleSheetSelectFile,
    isDocScannerOpen,
    docScannerIsAct,
    closeDocScanner: () => setIsDocScannerOpen(false),
    previewAttachment,
    openingAttachmentId,
    handleOpenAttachment,
    handleClosePreview,
    handleDownloadAttachment,
    handleDeleteAttachment,
    editingAttachmentId,
    editingAttachmentName,
    setEditingAttachmentName,
    renamingAttachment,
    handleStartRename,
    handleCancelRename,
    handleSaveRename
  };
};

export type OrderAttachmentsState = ReturnType<typeof useOrderAttachments>;
