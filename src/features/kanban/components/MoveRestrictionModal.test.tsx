import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MoveRestrictionModal } from './MoveRestrictionModal';

describe('MoveRestrictionModal', () => {
  it('does not render when data is null or isOpen is false', () => {
    const { rerender } = render(
      <MoveRestrictionModal data={null} onClose={() => {}} onOpenOrderFiles={() => {}} />
    );
    expect(screen.queryByText('Перемещение карточки невозможно')).not.toBeInTheDocument();

    rerender(
      <MoveRestrictionModal
        data={{ isOpen: false, targetStatusName: 'Готово', reason: 'Нет акта' }}
        onClose={() => {}}
        onOpenOrderFiles={() => {}}
      />
    );
    expect(screen.queryByText('Перемещение карточки невозможно')).not.toBeInTheDocument();
  });

  it('renders reason and handles actions', () => {
    const handleClose = vi.fn();
    const handleOpenOrderFiles = vi.fn();

    render(
      <MoveRestrictionModal
        data={{
          isOpen: true,
          orderId: 42,
          orderNumber: '#42-2026',
          targetStatusName: 'Выполнено',
          reason: 'Для завершения заявки требуется прикрепить Акт'
        }}
        onClose={handleClose}
        onOpenOrderFiles={handleOpenOrderFiles}
      />
    );

    expect(screen.getByText('Перемещение карточки невозможно')).toBeInTheDocument();
    expect(screen.getByText('#42-2026')).toBeInTheDocument();
    expect(screen.getByText('Для завершения заявки требуется прикрепить Акт')).toBeInTheDocument();

    const attachActBtn = screen.getByText('Прикрепить Акт');
    fireEvent.click(attachActBtn);
    expect(handleOpenOrderFiles).toHaveBeenCalledWith(42);

    const closeBtn = screen.getByText('Понятно');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
