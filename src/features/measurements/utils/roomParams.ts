import type {
  RoomParamAggregation,
  RoomParamDefinition,
  RoomParamDefinitionRequest,
  RoomParamType
} from '../../../api/roomParams';

export const ROOM_PARAM_TYPE_LABELS: Record<RoomParamType, string> = {
  NUMBER: 'Число',
  TEXT: 'Текст'
};

export const ROOM_PARAM_AGGREGATION_LABELS: Record<RoomParamAggregation, string> = {
  SUM: 'Сумма по помещениям',
  COUNT: 'Число помещений с параметром',
  LIST: 'Значения через запятую'
};

/** Сумма — только для чисел (как проверяет бэкенд). */
export const aggregationsFor = (type: RoomParamType): RoomParamAggregation[] =>
  type === 'NUMBER' ? ['SUM', 'COUNT', 'LIST'] : ['LIST', 'COUNT'];

/** Действующие параметры в порядке показа (архивные в мастере не показываются). */
export const activeRoomParams = (params: RoomParamDefinition[]): RoomParamDefinition[] =>
  params.filter(p => !p.archived).sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);

/** Подпись параметра с единицей: «Светильники, шт». */
export const roomParamLabel = (param: Pick<RoomParamDefinition, 'label' | 'unit'>): string =>
  param.unit ? `${param.label}, ${param.unit}` : param.label;

export interface RoomParamForm {
  label: string;
  unit: string;
  valueType: RoomParamType;
  aggregation: RoomParamAggregation;
  contractTag: string;
}

export const emptyRoomParamForm = (): RoomParamForm => ({
  label: '',
  unit: '',
  valueType: 'NUMBER',
  aggregation: 'SUM',
  contractTag: ''
});

export const roomParamFormOf = (param: RoomParamDefinition): RoomParamForm => ({
  label: param.label,
  unit: param.unit ?? '',
  valueType: param.valueType,
  aggregation: param.aggregation,
  contractTag: param.contractTag ?? ''
});

const TAG_PATTERN = /^[a-z][a-z0-9_]*$/;

/** Ошибка формы параметра для пользователя или null, если форма заполнена верно. */
export const roomParamFormError = (form: RoomParamForm): string | null => {
  if (!form.label.trim()) {
    return 'Укажите название параметра';
  }
  if (!aggregationsFor(form.valueType).includes(form.aggregation)) {
    return 'Сумму можно считать только для числового параметра';
  }
  const tag = form.contractTag.trim();
  if (tag && !TAG_PATTERN.test(tag)) {
    return 'Тег договора: латинские строчные буквы, цифры и «_», начинается с буквы';
  }
  return null;
};

/** Поле договора, посчитанное из замера: подпись, значение и откуда оно взято. */
export interface MeasuredContractField {
  key: string;
  label: string;
  value: string;
  source: string;
}

const AGGREGATION_SOURCES: Record<RoomParamAggregation, string> = {
  SUM: 'сумма по помещениям',
  COUNT: 'помещений с параметром',
  LIST: 'значения помещений'
};

/**
 * Параметры договора из замера для вкладки «Договор»: площадь, периметр и число полотен — из помещений,
 * остальное — сведённые параметры помещения с названиями из настроек (без параметра — по тегу).
 */
export const measuredContractFields = (
  contractParams: { area?: string; perimeter?: string; canvasesCount?: string; measuredParams?: Record<string, string> },
  definitions: RoomParamDefinition[]
): MeasuredContractField[] => {
  const builtIn: MeasuredContractField[] = [
    { key: 'area', label: 'Площадь (м²)', value: contractParams.area ?? '', source: 'сумма площадей помещений' },
    { key: 'perimeter', label: 'Периметр (м/п)', value: contractParams.perimeter ?? '', source: 'сумма периметров помещений' },
    { key: 'canvases_count', label: 'Кол-во полотен', value: contractParams.canvasesCount ?? '', source: 'число помещений' }
  ];
  const measured = Object.entries(contractParams.measuredParams ?? {}).map(([tag, value]) => {
    const definition = definitions.find(d => d.contractTag === tag);
    return {
      key: tag,
      label: definition ? roomParamLabel(definition) : `{${tag}}`,
      value,
      source: definition ? AGGREGATION_SOURCES[definition.aggregation] : 'из замера'
    };
  });
  return [...builtIn, ...measured];
};

/** Запрос API из формы: пустые единица и тег — без значения. */
export const roomParamRequestOf = (form: RoomParamForm): RoomParamDefinitionRequest => ({
  label: form.label.trim(),
  unit: form.unit.trim() || null,
  valueType: form.valueType,
  aggregation: form.aggregation,
  contractTag: form.contractTag.trim() || null
});
