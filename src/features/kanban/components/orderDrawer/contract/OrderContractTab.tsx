import React from 'react';
import type { ContractFieldDefinition, ContractTemplateStatus } from '../../../../../api/settings';
import { useContractSummaryQuery } from '../../../../../hooks/queries/useContractSummaryQuery';
import type { OrderContractState } from '../../../hooks/useOrderContract';
import type { SetOrderFormData } from '../../../utils/orderForm';
import { ContractNumberSection } from './ContractNumberSection';
import { ContractParamsSection } from './ContractParamsSection';
import { SpecItemsSection } from './SpecItemsSection';

interface OrderContractTabProps {
  contract: OrderContractState;
  orderId: number | null;
  orderNumber: string;
  setFormData: SetOrderFormData;
  templateStatus: ContractTemplateStatus | null;
  fieldDefinitions?: ContractFieldDefinition[];
  hasAiEstimate: boolean;
  onOpenMeasurement: () => void;
  onOpenAiEstimate: () => void;
}

/**
 * Вкладка «Договор»: номер и формирование договора, параметры спецификации и позиции сметы (просмотр).
 * Параметры потолка и спецификацию бэкенд считает по замеру и смете заказа.
 */
export const OrderContractTab: React.FC<OrderContractTabProps> = ({
  contract,
  orderId,
  orderNumber,
  setFormData,
  templateStatus,
  fieldDefinitions,
  hasAiEstimate,
  onOpenMeasurement,
  onOpenAiEstimate
}) => {
  const { data: summary } = useContractSummaryQuery(orderId);

  return (
    <>
      <ContractNumberSection orderNumber={orderNumber} setFormData={setFormData} contract={contract} templateStatus={templateStatus} />
      <ContractParamsSection
        contract={contract}
        fieldDefinitions={fieldDefinitions}
        summary={summary}
        onOpenMeasurement={onOpenMeasurement}
      />
      <SpecItemsSection
        specItems={summary?.specItems ?? []}
        orderId={orderId}
        hasAiEstimate={hasAiEstimate}
        onOpenMeasurement={onOpenMeasurement}
        onOpenAiEstimate={onOpenAiEstimate}
      />
    </>
  );
};
