import React from 'react';
import type { Order } from '../../../../../api/kanban';
import type { Client } from '../../../../../api/clients';
import type { Employee } from '../../../../../api/employees';
import { OrderRemindersSection } from '../../../../../components/OrderRemindersSection';
import { OrderCommentsSection } from '../../OrderCommentsSection';
import type { OrderFormData, SetOrderFormData } from '../../../utils/orderForm';
import { OrderClientSection } from './OrderClientSection';
import { OrderStaffSection } from './OrderStaffSection';
import { OrderInstallersSection } from './OrderInstallersSection';
import { OrderStatusBanners } from './OrderStatusBanners';
import { OrderAddressSection } from './OrderAddressSection';
import { OrderDetailsSection } from './OrderDetailsSection';
import { OrderFinanceSection } from './OrderFinanceSection';

interface OrderMainTabProps {
  orderId: number | null;
  formData: OrderFormData;
  setFormData: SetOrderFormData;
  currentOrder: Order | null;
  clients: Client[];
  employees: Employee[];
  isWorker: boolean;
  isCompleted: boolean;
  hasAct: boolean;
  timezone?: string;
  expandComments: boolean;
  onAddNewClient: () => void;
  onOpenFiles: () => void;
  onCommentsCountChange: (count: number) => void;
}

/**
 * Вкладка «Основное»: клиент, сотрудники, монтажники, адрес, даты, финансы, напоминания и комментарии.
 */
export const OrderMainTab: React.FC<OrderMainTabProps> = ({
  orderId,
  formData,
  setFormData,
  currentOrder,
  clients,
  employees,
  isWorker,
  isCompleted,
  hasAct,
  timezone,
  expandComments,
  onAddNewClient,
  onOpenFiles,
  onCommentsCountChange
}) => (
  <>
    <OrderClientSection
      orderId={orderId}
      clientId={formData.clientId}
      onClientChange={(clientId) => setFormData(prev => ({ ...prev, clientId }))}
      clients={clients}
      currentOrder={currentOrder}
      isWorker={isWorker}
      onAddNewClient={onAddNewClient}
    />

    <OrderStaffSection formData={formData} setFormData={setFormData} employees={employees} currentOrder={currentOrder} isWorker={isWorker} />

    <OrderInstallersSection
      installers={formData.installers}
      installationPrice={formData.installationPrice}
      setFormData={setFormData}
      employees={employees}
      isWorker={isWorker}
    />

    <OrderStatusBanners
      isCompleted={isCompleted}
      installedAt={formData.installedAt || currentOrder?.installedAt}
      timezone={timezone}
      hasAct={hasAct}
      onOpenFiles={onOpenFiles}
    />

    <OrderAddressSection
      addressKey={`address-dadata-${orderId || currentOrder?.id || 'new'}`}
      address={formData.address}
      entrance={formData.entrance}
      floor={formData.floor}
      setFormData={setFormData}
    />

    <OrderDetailsSection
      description={formData.description}
      measurementDate={formData.measurementDate}
      installationDate={formData.installationDate}
      setFormData={setFormData}
      isWorker={isWorker}
    />

    <OrderFinanceSection formData={formData} setFormData={setFormData} isWorker={isWorker} />

    {orderId && !isWorker && <OrderRemindersSection orderId={orderId} employees={employees} />}

    {orderId && (
      <OrderCommentsSection orderId={orderId} defaultExpanded={expandComments} onCommentsCountChange={onCommentsCountChange} />
    )}
  </>
);
