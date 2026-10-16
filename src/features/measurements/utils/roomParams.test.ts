import { describe, it, expect } from 'vitest';
import type { RoomParamDefinition } from '../../../api/roomParams';
import {
  activeRoomParams,
  aggregationsFor,
  emptyRoomParamForm,
  measuredContractFields,
  roomParamFormError,
  roomParamLabel,
  roomParamRequestOf
} from './roomParams';

const param = (fields: Partial<RoomParamDefinition>): RoomParamDefinition => ({
  id: 1,
  key: 'lights',
  label: 'Светильники',
  unit: 'шт',
  valueType: 'NUMBER',
  aggregation: 'SUM',
  contractTag: 'lights_count',
  sortOrder: 1,
  archived: false,
  ...fields
});

describe('roomParams', () => {
  it('shows active params in order with their unit', () => {
    const params = [
      param({ id: 3, key: 'pipes', label: 'Трубы', sortOrder: 2 }),
      param({ id: 2, key: 'old', archived: true }),
      param({ id: 1, key: 'lights', sortOrder: 1 })
    ];

    expect(activeRoomParams(params).map(p => p.key)).toEqual(['lights', 'pipes']);
    expect(roomParamLabel(param({}))).toBe('Светильники, шт');
    expect(roomParamLabel(param({ unit: null }))).toBe('Светильники');
  });

  it('offers the sum only for number params and validates the form', () => {
    expect(aggregationsFor('TEXT')).not.toContain('SUM');
    expect(roomParamFormError(emptyRoomParamForm())).toBe('Укажите название параметра');
    expect(roomParamFormError({ ...emptyRoomParamForm(), label: 'Цвет', valueType: 'TEXT', aggregation: 'SUM' }))
      .toMatch(/только для числового/);
    expect(roomParamFormError({ ...emptyRoomParamForm(), label: 'Свет', contractTag: 'Свет-1' })).toMatch(/латинские/);
    expect(roomParamFormError({ ...emptyRoomParamForm(), label: 'Свет', contractTag: 'lights_2' })).toBeNull();
  });

  it('builds the API request without empty unit and tag', () => {
    expect(roomParamRequestOf({ ...emptyRoomParamForm(), label: '  Ниши ', unit: ' ', contractTag: '' })).toEqual({
      label: 'Ниши',
      unit: null,
      valueType: 'NUMBER',
      aggregation: 'SUM',
      contractTag: null
    });
  });

  it('labels contract values from the measurement with their source', () => {
    const fields = measuredContractFields(
      { source: 'MEASUREMENT', area: '22.5', perimeter: '27', canvasesCount: '2', measuredParams: { lights_count: '10', unknown_tag: '3' } },
      [param({})]
    );

    expect(fields.map(f => [f.label, f.value, f.source])).toEqual([
      ['Площадь (м²)', '22.5', 'сумма площадей помещений'],
      ['Периметр (м/п)', '27', 'сумма периметров помещений'],
      ['Кол-во полотен', '2', 'число помещений'],
      ['Светильники, шт', '10', 'сумма по помещениям'],
      ['{unknown_tag}', '3', 'из замера']
    ]);
  });

  it('labels values entered manually before the measurement', () => {
    const fields = measuredContractFields(
      { source: 'MANUAL', area: '18', perimeter: null, canvasesCount: null, measuredParams: { lights_count: '3' } },
      [param({})]
    );

    expect(fields.map(f => [f.label, f.value, f.source])).toEqual([
      ['Площадь (м²)', '18', 'введено вручную до замера'],
      ['Периметр (м/п)', '', 'введено вручную до замера'],
      ['Кол-во полотен', '', 'введено вручную до замера'],
      ['Светильники, шт', '3', 'введено вручную до замера']
    ]);
  });
});
