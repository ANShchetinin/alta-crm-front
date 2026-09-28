import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { useOrderAttachments } from './useOrderAttachments';
import { isViewableInBrowser } from '../../../utils/attachments';
import { uploadAttachment, renameAttachment } from '../../../api/kanban';
import { createEmptyOrderForm } from '../utils/orderForm';
import { toast } from '../../../utils/toast';

vi.mock('../../../api/kanban', () => ({
  uploadAttachment: vi.fn(),
  deleteAttachment: vi.fn(),
  fetchAttachmentBlob: vi.fn(),
  renameAttachment: vi.fn()
}));
vi.mock('../../../utils/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }
}));

const setup = (orderId: number | null) => renderHook(() => {
  const [form, setForm] = useState(createEmptyOrderForm(undefined));
  return { form, files: useOrderAttachments(orderId, setForm) };
});

const changeEvent = (files: File[]) => ({ target: { files, value: 'x' } }) as unknown as React.ChangeEvent<HTMLInputElement>;

describe('useOrderAttachments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queues files until a new order is created', async () => {
    const { result } = setup(null);
    const file = new File(['a'], 'plan.pdf');

    await act(() => result.current.files.handleFileUpload(changeEvent([file])));

    expect(result.current.files.pendingFiles).toEqual([file]);
    expect(uploadAttachment).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('uploads files of a saved order and appends them to the form', async () => {
    vi.mocked(uploadAttachment)
      .mockResolvedValueOnce({ id: 1, fileName: 'a.pdf', contentType: '' })
      .mockResolvedValueOnce({ id: 2, fileName: 'b.pdf', contentType: '' });
    const { result } = setup(7);

    await act(() => result.current.files.handleFileUpload(changeEvent([new File([''], 'a.pdf'), new File([''], 'b.pdf')])));

    expect(uploadAttachment).toHaveBeenNthCalledWith(1, 7, expect.any(File), undefined);
    expect(result.current.form.attachments.map(a => a.id)).toEqual([1, 2]);
    expect(toast.success).toHaveBeenCalledWith('Загружено файлов: 2');
  });

  it('uploads only the first file as an act', async () => {
    vi.mocked(uploadAttachment).mockResolvedValue({ id: 3, fileName: 'act.pdf', contentType: '', isAct: true });
    const { result } = setup(7);

    await act(() => result.current.files.handleActUpload(changeEvent([new File([''], 'act.pdf'), new File([''], 'extra.pdf')])));

    expect(uploadAttachment).toHaveBeenCalledTimes(1);
    expect(uploadAttachment).toHaveBeenCalledWith(7, expect.any(File), true);
  });

  it('reports a failed upload', async () => {
    vi.mocked(uploadAttachment).mockRejectedValue(new Error('network'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = setup(7);

    await act(() => result.current.files.handleFileUpload(changeEvent([new File([''], 'a.pdf')])));

    expect(toast.error).toHaveBeenCalledWith('Не удалось загрузить файл');
    expect(result.current.files.uploadingFile).toBe(false);
  });

  it('renames an attachment in the form', async () => {
    vi.mocked(uploadAttachment).mockResolvedValue({ id: 5, fileName: 'old.pdf', contentType: '' });
    vi.mocked(renameAttachment).mockResolvedValue({ id: 5, fileName: 'new.pdf', contentType: '' });
    const { result } = setup(7);
    await act(() => result.current.files.handleFileUpload(changeEvent([new File([''], 'old.pdf')])));

    act(() => {
      result.current.files.handleStartRename({ id: 5, fileName: 'old.pdf', contentType: '' });
    });
    act(() => {
      result.current.files.setEditingAttachmentName('new.pdf');
    });
    await act(() => result.current.files.handleSaveRename(5));

    expect(renameAttachment).toHaveBeenCalledWith(5, 'new.pdf');
    expect(result.current.form.attachments[0].fileName).toBe('new.pdf');
    expect(result.current.files.editingAttachmentId).toBeNull();
  });

  it('opens the scan/file chooser only when the scanner is available', () => {
    const { result } = setup(7);

    act(() => {
      result.current.files.openUploadChooser('GENERAL', true);
    });

    expect(result.current.files.isSheetOpen).toBe(true);
    expect(result.current.files.sheetMode).toBe('GENERAL');
  });

  it('detects files viewable in the browser', () => {
    expect(isViewableInBrowser('scan.PDF')).toBe(true);
    expect(isViewableInBrowser('file.bin', 'image/png')).toBe(true);
    expect(isViewableInBrowser('contract.docx')).toBe(false);
  });
});
