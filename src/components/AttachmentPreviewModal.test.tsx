import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AttachmentPreviewModal, type PreviewAttachmentData } from './AttachmentPreviewModal';

describe('AttachmentPreviewModal', () => {
  const sampleImagePreview: PreviewAttachmentData = {
    url: 'blob:http://localhost/image-blob',
    fileName: 'ceiling_plan.png',
    contentType: 'image/png',
    isImage: true,
    isPdf: false,
    attachment: {
      id: 101,
      fileName: 'ceiling_plan.png',
      contentType: 'image/png',
      isAct: false
    }
  };

  const samplePdfPreview: PreviewAttachmentData = {
    url: 'blob:http://localhost/pdf-blob',
    fileName: 'act_completed.pdf',
    contentType: 'application/pdf',
    isImage: false,
    isPdf: true,
    attachment: {
      id: 102,
      fileName: 'act_completed.pdf',
      contentType: 'application/pdf',
      isAct: true
    }
  };

  it('renders nothing when preview is null', () => {
    const { container } = render(
      <AttachmentPreviewModal preview={null} onClose={vi.fn()} onDownload={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders image preview and handles zoom and download', () => {
    const handleClose = vi.fn();
    const handleDownload = vi.fn();

    render(
      <AttachmentPreviewModal
        preview={sampleImagePreview}
        onClose={handleClose}
        onDownload={handleDownload}
      />
    );

    expect(screen.getByText('ceiling_plan.png')).toBeDefined();
    const img = screen.getByAltText('ceiling_plan.png');
    expect(img).toBeDefined();

    // Zoom in
    const zoomInBtn = screen.getByTitle('Увеличить масштаб');
    fireEvent.click(zoomInBtn);
    expect(screen.getByText('150%')).toBeDefined();

    // Download button
    const downloadBtn = screen.getByTitle('Скачать файл');
    fireEvent.click(downloadBtn);
    expect(handleDownload).toHaveBeenCalledWith(sampleImagePreview.attachment);

    // Close button
    const closeBtn = screen.getByTitle('Закрыть просмотр');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('renders pdf preview with download action', () => {
    const handleClose = vi.fn();
    const handleDownload = vi.fn();

    render(
      <AttachmentPreviewModal
        preview={samplePdfPreview}
        onClose={handleClose}
        onDownload={handleDownload}
      />
    );

    expect(screen.getAllByText('act_completed.pdf').length).toBeGreaterThanOrEqual(1);
    const backBtn = screen.getByTitle('Вернуться назад в заявку');
    fireEvent.click(backBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
