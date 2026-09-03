import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ColumnModal } from './ColumnModal';

describe('ColumnModal', () => {
  it('does not render when isOpen is false', () => {
    render(
      <ColumnModal
        isOpen={false}
        editingColumnId={null}
        columnName=""
        setColumnName={() => {}}
        columnColor="#3b82f6"
        setColumnColor={() => {}}
        includeInFinances={true}
        setIncludeInFinances={() => {}}
        isCompleted={false}
        setIsCompleted={() => {}}
        onClose={() => {}}
        onSubmit={() => {}}
      />
    );
    expect(screen.queryByLabelText('Close')).not.toBeInTheDocument();
  });

  it('renders correctly and handles input changes and form submit', () => {
    const handleSetColumnName = vi.fn();
    const handleSetColor = vi.fn();
    const handleClose = vi.fn();
    const handleSubmit = vi.fn((e) => e.preventDefault());

    const { container } = render(
      <ColumnModal
        isOpen={true}
        editingColumnId={null}
        columnName="Замер"
        setColumnName={handleSetColumnName}
        columnColor="#3b82f6"
        setColumnColor={handleSetColor}
        includeInFinances={true}
        setIncludeInFinances={() => {}}
        isCompleted={false}
        setIsCompleted={() => {}}
        onClose={handleClose}
        onSubmit={handleSubmit}
      />
    );

    const input = screen.getByDisplayValue('Замер');
    fireEvent.change(input, { target: { value: 'Монтаж' } });
    expect(handleSetColumnName).toHaveBeenCalledWith('Монтаж');

    const form = container.querySelector('form');
    if (form) {
      fireEvent.submit(form);
      expect(handleSubmit).toHaveBeenCalled();
    }

    const closeBtn = screen.getByLabelText('Close');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
