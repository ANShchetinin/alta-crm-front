import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { AxiosError, type AxiosResponse } from 'axios';
import { renderWithQuery } from '../../../test-utils/queryWrapper';
import { RoomParamsSection } from './RoomParamsSection';
import { RoomParamModal } from './RoomParamModal';
import { createRoomParamDefinition, updateRoomParamDefinition, type RoomParamDefinition } from '../../../api/roomParams';
import { toast } from '../../../utils/toast';

vi.mock('../../../api/roomParams', () => ({
  createRoomParamDefinition: vi.fn(),
  updateRoomParamDefinition: vi.fn(),
  getRoomParamDefinitions: vi.fn().mockResolvedValue([])
}));
vi.mock('../../../utils/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const lights: RoomParamDefinition = {
  id: 1,
  key: 'lights',
  label: 'Светильники',
  unit: 'шт',
  valueType: 'NUMBER',
  aggregation: 'SUM',
  contractTag: 'lights_count',
  sortOrder: 1,
  archived: false
};
const color: RoomParamDefinition = { ...lights, id: 2, key: 'color', label: 'Цвет', unit: null, valueType: 'TEXT', aggregation: 'LIST' };

describe('RoomParamsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the company params of the room and reports changed values', () => {
    const onChange = vi.fn();
    renderWithQuery(
      <RoomParamsSection
        room={{ roomName: 'Кухня', area: 10, perimeter: 13, paramValues: { lights: '6', pipes: '2' } }}
        params={[lights, color]}
        onChange={onChange}
        canAddParam={false}
      />
    );

    const lightsInput = screen.getByLabelText('Светильники, шт');
    expect(lightsInput).toHaveValue('6');
    expect(lightsInput).toHaveAttribute('inputmode', 'decimal');
    expect(screen.getByLabelText('Цвет')).toHaveAttribute('inputmode', 'text');
    expect(screen.queryByRole('button', { name: /Параметр/ })).not.toBeInTheDocument();

    fireEvent.change(lightsInput, { target: { value: '8' } });
    expect(onChange).toHaveBeenCalledWith({ paramValues: { lights: '8', pipes: '2' } });

    fireEvent.change(lightsInput, { target: { value: '' } });
    expect(onChange).toHaveBeenLastCalledWith({ paramValues: { pipes: '2' } });
  });

  it('lets an owner or manager add a company param from the room', async () => {
    vi.mocked(createRoomParamDefinition).mockResolvedValue({ ...lights, id: 5, key: 'c_1', label: 'Ниши' });
    renderWithQuery(
      <RoomParamsSection room={{ roomName: 'Кухня', area: 0, perimeter: 0 }} params={[]} onChange={vi.fn()} canAddParam />
    );

    fireEvent.click(screen.getByRole('button', { name: /Параметр/ }));
    fireEvent.change(screen.getByLabelText('Название'), { target: { value: ' Ниши ' } });
    fireEvent.change(screen.getByLabelText('Единица'), { target: { value: 'м.п.' } });
    fireEvent.change(screen.getByLabelText('Тег в шаблоне договора'), { target: { value: 'niche_length' } });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    await waitFor(() => expect(createRoomParamDefinition).toHaveBeenCalledWith({
      label: 'Ниши',
      unit: 'м.п.',
      valueType: 'NUMBER',
      aggregation: 'SUM',
      contractTag: 'niche_length'
    }));
    await waitFor(() => expect(screen.queryByLabelText('Название')).not.toBeInTheDocument());
    expect(toast.success).toHaveBeenCalledWith('Параметр добавлен');
  });
});

describe('RoomParamModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not offer the sum for a text param and checks the contract tag', () => {
    renderWithQuery(<RoomParamModal onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Тип значения'), { target: { value: 'TEXT' } });
    const aggregations = Array.from((screen.getByLabelText('В договор') as HTMLSelectElement).options).map(o => o.value);
    expect(aggregations).toEqual(['LIST', 'COUNT']);

    fireEvent.change(screen.getByLabelText('Название'), { target: { value: 'Цвет' } });
    fireEvent.change(screen.getByLabelText('Тег в шаблоне договора'), { target: { value: 'Цвет' } });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/латинские/));
    expect(createRoomParamDefinition).not.toHaveBeenCalled();
  });

  it('edits a param without changing its type and shows the backend reason on error', async () => {
    const taken = new AxiosError('Request failed with status code 400');
    taken.response = { status: 400, data: { message: 'Тег {lights_count} уже у другого параметра помещения' } } as AxiosResponse;
    vi.mocked(updateRoomParamDefinition).mockRejectedValueOnce(taken);
    const onClose = vi.fn();
    renderWithQuery(<RoomParamModal initial={lights} onClose={onClose} />);

    expect(screen.getByLabelText('Тип значения')).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Название'), { target: { value: 'Точечные светильники' } });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    await waitFor(() => expect(updateRoomParamDefinition).toHaveBeenCalledWith(1, expect.objectContaining({ label: 'Точечные светильники' })));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Тег {lights_count} уже у другого параметра помещения'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
