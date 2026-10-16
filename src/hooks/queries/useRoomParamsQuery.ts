import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getRoomParamDefinitions, type RoomParamDefinition } from '../../api/roomParams';
import { useTenantQueryKey } from './useTenantQueryKey';

export const ROOM_PARAMS_QUERY_KEY = ['roomParamDefinitions'] as const;

/** Параметры помещения компании (включая архивные) — для мастера замера, настроек и вкладки «Договор». */
export const useRoomParamsQuery = (enabled = true) => {
  const queryKey = useTenantQueryKey(ROOM_PARAMS_QUERY_KEY);
  return useQuery<RoomParamDefinition[]>({
    queryKey,
    queryFn: () => getRoomParamDefinitions(),
    enabled
  });
};

/** Перечитать параметры помещения после изменения в настройках или добавления из мастера. */
export const useInvalidateRoomParams = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ROOM_PARAMS_QUERY_KEY });
};
