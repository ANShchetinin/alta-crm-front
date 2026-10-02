import { createRef } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { OrderStatus } from '../../../../api/kanban';
import { KanbanMobileList } from './KanbanMobileList';

const columns = [{ id: 1, name: 'Новая', color: '#3b82f6', sortOrder: 1 }] as OrderStatus[];

const renderList = (isWorker: boolean, onAddColumn = vi.fn()) => render(
  <KanbanMobileList
    boardRef={createRef<HTMLDivElement>()}
    columns={columns}
    cards={[]}
    isWorker={isWorker}
    renderCard={() => null}
    touchDraggingCard={null}
    touchTargetStatusId={null}
    touchTargetCardId={null}
    columnReorder={{
      draggingColId: null,
      targetColId: null,
      onTouchStart: vi.fn(),
      onTouchMove: vi.fn(),
      onTouchEnd: vi.fn(),
      onTouchCancel: vi.fn()
    }}
    onAddColumn={onAddColumn}
    collapsedColumns={{}}
    onToggleColumn={vi.fn()}
    onToggleAll={vi.fn()}
  />
);

describe('KanbanMobileList', () => {
  it('lets a manager add a column from the list view', () => {
    const onAddColumn = vi.fn();
    renderList(false, onAddColumn);

    fireEvent.click(screen.getByRole('button', { name: /Добавить колонку/ }));

    expect(onAddColumn).toHaveBeenCalledTimes(1);
  });

  it('hides the add column button from a worker', () => {
    renderList(true);

    expect(screen.queryByRole('button', { name: /Добавить колонку/ })).not.toBeInTheDocument();
  });
});
