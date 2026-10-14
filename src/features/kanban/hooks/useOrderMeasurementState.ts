import { useQuery } from '@tanstack/react-query';
import { getMeasurementByOrderId, type MeasurementDto } from '../../../api/measurements';
import { useTenantQueryKey } from '../../../hooks/queries/useTenantQueryKey';
import { useInvalidateOnOrdersChanged } from '../../../hooks/queries/useInvalidateOnOrdersChanged';

const ORDER_MEASUREMENT_STATE_KEY = ['orderMeasurementState'] as const;

export interface OrderMeasurementState {
  /** В замере есть помещения или позиции: договор строится по нему, а не по параметрам во вкладке «Договор». */
  hasMeasurement: boolean;
  /** В смете есть позиции: сумма заказа считается по смете и вручную не меняется. */
  hasEstimate: boolean;
}

const NO_MEASUREMENT: OrderMeasurementState = { hasMeasurement: false, hasEstimate: false };

/** Есть ли в сохраненном замере помещения и позиции сметы (как решает бэкенд при формировании договора). */
export const measurementState = (dto: MeasurementDto | null | undefined): OrderMeasurementState => {
  const hasEstimate = (dto?.items?.length ?? 0) > 0;
  return { hasMeasurement: hasEstimate || (dto?.rooms?.length ?? 0) > 0, hasEstimate };
};

/**
 * Состояние замера и сметы открытого заказа. Перечитывается после сохранения сметы и ИИ-сметы
 * (событие изменения заказов); пока не загружено или при ошибке — замера нет, ничего не блокируется.
 */
export const useOrderMeasurementState = (orderId: number | null, enabled: boolean): OrderMeasurementState => {
  const baseKey = useTenantQueryKey(ORDER_MEASUREMENT_STATE_KEY);
  useInvalidateOnOrdersChanged(ORDER_MEASUREMENT_STATE_KEY);

  const { data } = useQuery({
    queryKey: [...baseKey, orderId],
    queryFn: async () => measurementState(await getMeasurementByOrderId(orderId as number)),
    enabled: enabled && orderId != null,
    staleTime: 0
  });

  return data ?? NO_MEASUREMENT;
};
