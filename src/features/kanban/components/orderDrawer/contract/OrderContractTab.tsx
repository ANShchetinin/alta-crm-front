import React from 'react';
import type { ContractFieldDefinition, ContractTemplateStatus } from '../../../../../api/settings';
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
  hasMeasurement: boolean;
  hasAiEstimate: boolean;
  onOpenMeasurement: () => void;
  onOpenAiEstimate: () => void;
}

/**
 * Вкладка «Договор»: номер и формирование договора, параметры спецификации и позиции сметы (просмотр).
 */
export const OrderContractTab: React.FC<OrderContractTabProps> = ({
  contract,
  orderId,
  orderNumber,
  setFormData,
  templateStatus,
  fieldDefinitions,
  hasMeasurement,
  hasAiEstimate,
  onOpenMeasurement,
  onOpenAiEstimate
}) => (
  <>
    <ContractNumberSection orderNumber={orderNumber} setFormData={setFormData} contract={contract} templateStatus={templateStatus} />
    <ContractParamsSection
      contract={contract}
      fieldDefinitions={fieldDefinitions}
      fromMeasurement={hasMeasurement}
      onOpenMeasurement={onOpenMeasurement}
    />
    <SpecItemsSection
      contract={contract}
      orderId={orderId}
      hasAiEstimate={hasAiEstimate}
      onOpenMeasurement={onOpenMeasurement}
      onOpenAiEstimate={onOpenAiEstimate}
    />
  </>
);
