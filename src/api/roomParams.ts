import { api } from './axiosConfig';

export type RoomParamType = 'NUMBER' | 'TEXT';
export type RoomParamAggregation = 'SUM' | 'COUNT' | 'LIST';

/** Параметр помещения компании: вводится в замере, договор сводит значения по помещениям. */
export interface RoomParamDefinition {
  id: number;
  /** Ключ значения в помещении (`paramValues`). */
  key: string;
  label: string;
  unit?: string | null;
  valueType: RoomParamType;
  aggregation: RoomParamAggregation;
  /** Тег договора без скобок; без тега параметр в договор не попадает. */
  contractTag?: string | null;
  sortOrder: number;
  archived: boolean;
}

export interface RoomParamDefinitionRequest {
  label: string;
  unit?: string | null;
  valueType?: RoomParamType;
  aggregation?: RoomParamAggregation;
  contractTag?: string | null;
  sortOrder?: number;
}

export const getRoomParamDefinitions = async (): Promise<RoomParamDefinition[]> => {
  const res = await api.get<RoomParamDefinition[]>('/room-param-definitions');
  return res.data;
};

export const createRoomParamDefinition = async (req: RoomParamDefinitionRequest): Promise<RoomParamDefinition> => {
  const res = await api.post<RoomParamDefinition>('/room-param-definitions', req);
  return res.data;
};

export const updateRoomParamDefinition = async (id: number, req: RoomParamDefinitionRequest): Promise<RoomParamDefinition> => {
  const res = await api.put<RoomParamDefinition>(`/room-param-definitions/${id}`, req);
  return res.data;
};

export const archiveRoomParamDefinition = async (id: number): Promise<void> => {
  await api.delete(`/room-param-definitions/${id}`);
};
