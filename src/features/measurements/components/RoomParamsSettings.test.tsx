import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithQuery } from '../../../test-utils/queryWrapper';
import { RoomParamsSettings } from './RoomParamsSettings';
import { archiveRoomParamDefinition, getRoomParamDefinitions, type RoomParamDefinition } from '../../../api/roomParams';
import { confirm } from '../../../utils/confirm';

vi.mock('../../../api/roomParams', () => ({
  getRoomParamDefinitions: vi.fn(),
  archiveRoomParamDefinition: vi.fn().mockResolvedValue(undefined),
  createRoomParamDefinition: vi.fn(),
  updateRoomParamDefinition: vi.fn()
}));
vi.mock('../../../utils/confirm', () => ({ confirm: vi.fn() }));
vi.mock('../../../utils/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const base: RoomParamDefinition = {
  id: 1,
  key: 'cornice',
  label: 'Карниз / ниша (брус)',
  unit: 'м.п.',
  valueType: 'NUMBER',
  aggregation: 'SUM',
  contractTag: 'timber_length',
  sortOrder: 1,
  archived: false
};

describe('RoomParamsSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRoomParamDefinitions).mockResolvedValue([
      base,
      { ...base, id: 2, key: 'note', label: 'Примечание', unit: null, valueType: 'TEXT', aggregation: 'LIST', contractTag: null, sortOrder: 2 },
      { ...base, id: 3, key: 'old', label: 'Старый', archived: true }
    ]);
  });

  it('lists active params with their contract tag and counts archived ones', async () => {
    renderWithQuery(<RoomParamsSettings />);

    expect(await screen.findByText('Карниз / ниша (брус), м.п.')).toBeInTheDocument();
    expect(screen.getByText(/\{timber_length\}/)).toBeInTheDocument();
    expect(screen.getByText(/не в договоре/)).toBeInTheDocument();
    expect(screen.queryByText('Старый, м.п.')).not.toBeInTheDocument();
    expect(screen.getByText('В архиве: 1')).toBeInTheDocument();
  });

  it('archives a param only after confirmation', async () => {
    vi.mocked(confirm).mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    renderWithQuery(<RoomParamsSettings />);

    const archiveButton = await screen.findByRole('button', { name: 'В архив «Карниз / ниша (брус)»' });
    fireEvent.click(archiveButton);
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    expect(archiveRoomParamDefinition).not.toHaveBeenCalled();

    fireEvent.click(archiveButton);
    await waitFor(() => expect(archiveRoomParamDefinition).toHaveBeenCalledWith(1));
  });
});
