import type { Dispatch, SetStateAction } from 'react';
import type {
  ContractParams,
  ContractSpecItem,
  Order,
  OrderAttachment,
  OrderInstaller,
  OrderMaterial
} from '../../../api/kanban';
import type { MeasurementCalculationItemDto } from '../../../api/measurements';
import { mergeActChecklist, isActFile } from '../constants';
import { toLocalDateString } from '../../../utils/dateUtils';

/**
 * Состояние формы заказа в шторке. Числа и id хранятся строками — как значения input'ов.
 */
export interface OrderFormData {
  clientId: string;
  statusId: string;
  assigneeId: string;
  assigneeName: string;
  assigneeAvatarUrl: string;
  measurerId: string;
  measurerName: string;
  measurerAvatarUrl: string;
  installedById: string;
  installedByName: string;
  installedByAvatarUrl: string;
  installedAt: string;
  orderNumber: string;
  address: string;
  entrance: string;
  floor: string;
  description: string;
  totalPrice: string;
  prepayment: string;
  prepaymentPaid: boolean;
  prepaymentPaidAt: string;
  remainder: string;
  remainderPaid: boolean;
  remainderPaidAt: string;
  installationPrice: string;
  installationDate: string;
  measurementDate: string;
  contractParams: ContractParams | undefined;
  materials: OrderMaterial[];
  attachments: OrderAttachment[];
  installers: OrderInstaller[];
}

export type SetOrderFormData = Dispatch<SetStateAction<OrderFormData>>;

/** Payload создания/обновления заказа (поля OrderDto бэкенда). */
export type OrderPayload = Record<string, unknown>;

const toNumber = (value: string | undefined): number => parseFloat(value || '0') || 0;

/**
 * Параметры договора по умолчанию (типовой натяжной потолок) с чек-листом акта из шаблона компании.
 */
export const createDefaultContractParams = (actChecklistTemplate?: string[]): ContractParams => ({
  area: '70,3',
  perimeter: '110,5',
  canvasesCount: '5',
  insertLength: '20',
  pipeCount: '0',
  lightsCount: '30',
  timberLength: '17',
  canvasArticle: 'Полотно Мат 303',
  discount: '',
  handoverDate: '',
  specItems: [],
  actChecklist: mergeActChecklist([], actChecklistTemplate),
  customParams: {}
});

/**
 * Актуальные параметры договора формы: сохраненные с чек-листом, приведенным к шаблону компании, либо значения по умолчанию.
 */
export const resolveContractParams = (contractParams: ContractParams | undefined, actChecklistTemplate?: string[]): ContractParams => {
  if (!contractParams) {
    return createDefaultContractParams(actChecklistTemplate);
  }
  return {
    ...contractParams,
    actChecklist: mergeActChecklist(contractParams.actChecklist, actChecklistTemplate)
  };
};

/**
 * Пустая форма нового заказа.
 */
export const createEmptyOrderForm = (firstStatusId: number | undefined, actChecklistTemplate?: string[]): OrderFormData => ({
  clientId: '',
  statusId: firstStatusId ? firstStatusId.toString() : '',
  assigneeId: '',
  assigneeName: '',
  assigneeAvatarUrl: '',
  measurerId: '',
  measurerName: '',
  measurerAvatarUrl: '',
  installedById: '',
  installedByName: '',
  installedByAvatarUrl: '',
  installedAt: '',
  orderNumber: '',
  address: '',
  entrance: '',
  floor: '',
  description: '',
  totalPrice: '',
  prepayment: '',
  prepaymentPaid: false,
  prepaymentPaidAt: '',
  remainder: '',
  remainderPaid: false,
  remainderPaidAt: '',
  installationPrice: '',
  installationDate: '',
  measurementDate: '',
  contractParams: createDefaultContractParams(actChecklistTemplate),
  materials: [],
  attachments: [],
  installers: []
});

const legacyLeadInstaller = (order: Order): OrderInstaller[] => (order.installedById ? [{
  employeeId: order.installedById,
  employeeName: order.installedByName,
  employeeAvatarUrl: order.installedByAvatarUrl,
  splitType: 'EQUAL',
  sharePercent: 100,
  amount: order.installationPrice || 0,
  isLead: true
}] : []);

/**
 * Форма из загруженного заказа. Остаток и итог восстанавливаются, если бэкенд прислал не все суммы;
 * заказ со старым единственным монтажником (installedBy*) получает его как старшего в списке монтажников.
 */
export const orderToFormData = (order: Order, actChecklistTemplate?: string[]): OrderFormData => {
  const prepayment = order.prepayment != null ? order.prepayment : 0;
  const remainder = order.remainder != null
    ? order.remainder
    : (order.totalPrice != null ? Math.max(0, order.totalPrice - prepayment) : 0);
  const total = order.totalPrice != null ? order.totalPrice : prepayment + remainder;

  const contractParams: ContractParams = order.contractParams ? {
    ...order.contractParams,
    contractDate: order.contractParams.contractDate || toLocalDateString(new Date()),
    actChecklist: mergeActChecklist(order.contractParams.actChecklist, actChecklistTemplate),
    specItems: order.contractParams.specItems || [],
    customParams: order.contractParams.customParams || {}
  } : createDefaultContractParams(actChecklistTemplate);

  return {
    clientId: order.clientId ? order.clientId.toString() : '',
    statusId: order.statusId ? order.statusId.toString() : '',
    assigneeId: order.assigneeId ? order.assigneeId.toString() : '',
    assigneeName: order.assigneeName || '',
    assigneeAvatarUrl: order.assigneeAvatarUrl || '',
    measurerId: order.measurerId ? order.measurerId.toString() : '',
    measurerName: order.measurerName || '',
    measurerAvatarUrl: order.measurerAvatarUrl || '',
    installedById: order.installedById ? order.installedById.toString() : '',
    installedByName: order.installedByName || '',
    installedByAvatarUrl: order.installedByAvatarUrl || '',
    installedAt: order.installedAt || '',
    orderNumber: order.orderNumber || '',
    address: order.address || '',
    entrance: order.entrance || '',
    floor: order.floor || '',
    description: order.description || '',
    totalPrice: total > 0 ? total.toString() : '',
    prepayment: prepayment > 0 ? prepayment.toString() : '',
    prepaymentPaid: !!order.prepaymentPaid,
    prepaymentPaidAt: order.prepaymentPaidAt || '',
    remainder: remainder > 0 ? remainder.toString() : '',
    remainderPaid: !!order.remainderPaid,
    remainderPaidAt: order.remainderPaidAt || '',
    installationPrice: order.installationPrice ? order.installationPrice.toString() : '',
    installationDate: order.installationDate ? order.installationDate.slice(0, 10) : '',
    measurementDate: order.measurementDate ? order.measurementDate.slice(0, 16) : '',
    contractParams,
    materials: order.materials || [],
    attachments: order.attachments || [],
    installers: order.installers && order.installers.length > 0 ? order.installers : legacyLeadInstaller(order)
  };
};

/**
 * Payload сохранения заказа из формы. При переводе в завершающий статус без даты монтажа ставит installedAt.
 */
export const buildOrderPayload = (form: OrderFormData, contractParams: ContractParams, isCompleted: boolean): OrderPayload => {
  const payload: OrderPayload = {
    clientId: form.clientId ? parseInt(form.clientId) : undefined,
    statusId: form.statusId ? parseInt(form.statusId) : undefined,
    assigneeId: form.assigneeId ? parseInt(form.assigneeId) : undefined,
    measurerId: form.measurerId ? parseInt(form.measurerId) : undefined,
    installedById: form.installedById ? parseInt(form.installedById) : undefined,
    installers: form.installers.length > 0 ? form.installers : undefined,
    orderNumber: form.orderNumber || undefined,
    address: form.address || undefined,
    entrance: form.entrance || undefined,
    floor: form.floor || undefined,
    description: form.description,
    totalPrice: form.totalPrice ? parseFloat(form.totalPrice) : undefined,
    prepayment: form.prepayment ? parseFloat(form.prepayment) : undefined,
    prepaymentPaid: !!form.prepaymentPaid,
    remainder: form.remainder ? parseFloat(form.remainder) : undefined,
    remainderPaid: !!form.remainderPaid,
    installationPrice: form.installationPrice ? parseFloat(form.installationPrice) : undefined,
    installationDate: form.installationDate ? `${form.installationDate}T00:00:00` : undefined,
    measurementDate: form.measurementDate ? `${form.measurementDate}:00` : undefined,
    contractParams
  };
  if (isCompleted && !form.installedAt) {
    payload.installedAt = new Date().toISOString();
  }
  return payload;
};

/**
 * Payload сохранения заказа перед формированием договора: поля формы с откатом к загруженному заказу
 * и материалами с зафиксированной себестоимостью.
 */
export const buildContractOrderPayload = (
  form: OrderFormData,
  order: Order | null,
  contractParams: ContractParams,
  installationAddress: string
): OrderPayload => ({
  clientId: form.clientId ? parseInt(form.clientId) : (order?.clientId || undefined),
  statusId: form.statusId ? parseInt(form.statusId) : (order?.statusId || undefined),
  assigneeId: form.assigneeId ? parseInt(form.assigneeId) : (order?.assigneeId || undefined),
  measurerId: form.measurerId ? parseInt(form.measurerId) : (order?.measurerId || undefined),
  installedById: form.installedById ? parseInt(form.installedById) : (order?.installedById || undefined),
  installers: form.installers.length > 0 ? form.installers : (order?.installers || undefined),
  orderNumber: form.orderNumber || order?.orderNumber || undefined,
  address: installationAddress || form.address || order?.address || undefined,
  entrance: form.entrance || order?.entrance || undefined,
  floor: form.floor || order?.floor || undefined,
  description: form.description,
  totalPrice: form.totalPrice ? parseFloat(form.totalPrice) : (order?.totalPrice || undefined),
  prepayment: form.prepayment ? parseFloat(form.prepayment) : (order?.prepayment || undefined),
  prepaymentPaid: !!form.prepaymentPaid,
  remainder: form.remainder ? parseFloat(form.remainder) : (order?.remainder || undefined),
  remainderPaid: !!form.remainderPaid,
  installationPrice: form.installationPrice ? parseFloat(form.installationPrice) : (order?.installationPrice || undefined),
  installationDate: form.installationDate ? `${form.installationDate}T00:00:00` : (order?.installationDate || undefined),
  measurementDate: form.measurementDate ? `${form.measurementDate}:00` : (order?.measurementDate || undefined),
  contractParams,
  materials: form.materials.map(m => ({
    materialId: m.materialId,
    quantity: m.quantity,
    fixedCostPrice: m.fixedCostPrice
  }))
});

export interface OrderProfitability {
  materialsCost: number;
  installationPrice: number;
  profit: number;
  marginPercent: number;
}

/**
 * Себестоимость материалов, монтаж, прибыль и рентабельность по текущим значениям формы.
 * Итог — totalPrice, а если он пуст — аванс + остаток.
 */
export const calcOrderProfitability = (form: OrderFormData): OrderProfitability => {
  const materialsCost = form.materials.reduce((sum, item) => sum + (item.fixedCostPrice || 0) * item.quantity, 0);
  const installationPrice = toNumber(form.installationPrice);
  const total = toNumber(form.totalPrice) || toNumber(form.prepayment) + toNumber(form.remainder);
  const profit = total - materialsCost - installationPrice;
  return {
    materialsCost,
    installationPrice,
    profit,
    marginPercent: total > 0 ? Math.round((profit / total) * 100) : 0
  };
};

/**
 * Позиции спецификации договора из позиций расчета замера.
 */
export const specItemsFromMeasurement = (items: MeasurementCalculationItemDto[]): ContractSpecItem[] => items.map((item, i) => ({
  idx: i + 1,
  name: item.name + (item.roomName ? ` (${item.roomName})` : ''),
  quantity: String(item.quantity),
  unit: item.unit || 'шт.',
  price: item.unitSalePrice,
  total: item.totalSalePrice
}));

/** Параметры договора, которые бэкенд заполняет из замера при сохранении сметы. */
const MEASUREMENT_CONTRACT_PARAMS = [
  'area', 'perimeter', 'canvasesCount', 'lightsCount', 'pipeCount', 'timberLength', 'canvasArticle', 'specItems'
] as const;

/**
 * Переносит в форму результат сохранения сметы из заказа, перечитанного с сервера: суммы, стоимость монтажа
 * с долями монтажников, материалы и параметры договора из замера. Остальные поля формы (в том числе
 * несохраненные правки пользователя) не трогаются.
 */
export const withMeasurementResult = (form: OrderFormData, saved: OrderFormData): OrderFormData => {
  const contractParams: ContractParams = { ...form.contractParams };
  MEASUREMENT_CONTRACT_PARAMS.forEach(key => {
    Object.assign(contractParams, { [key]: saved.contractParams?.[key] });
  });
  return {
    ...form,
    totalPrice: saved.totalPrice,
    remainder: saved.remainder,
    installationPrice: saved.installationPrice,
    installers: saved.installers,
    materials: saved.materials,
    contractParams
  };
};

/**
 * Есть ли среди загруженных или ожидающих загрузки файлов Акт выполненных работ.
 */
export const hasActAttachment = (attachments: OrderAttachment[], pendingFiles: File[]): boolean =>
  attachments.some(a => isActFile(a.fileName, a.isAct)) || pendingFiles.some(f => isActFile(f.name));
