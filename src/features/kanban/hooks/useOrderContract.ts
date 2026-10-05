import { useState } from 'react';
import {
  downloadContractDocx,
  getNextOrderNumber,
  updateOrder,
  type ContractParams,
  type ContractSpecItem,
  type Order
} from '../../../api/kanban';
import { updateClient, type Client } from '../../../api/clients';
import { getMeasurementByOrderId } from '../../../api/measurements';
import type { PassportApplyResult } from '../../../components/PassportScannerModal';
import type { ContractPromptData } from '../components/ContractPromptModal';
import { downloadBlob } from '../../../utils/download';
import { dateForSave } from '../../../utils/dateInput';
import { formatPhone, isValidPhone, phoneForSave } from '../../../utils/phone';
import { toast } from '../../../utils/toast';
import { mergeActChecklist } from '../constants';
import {
  buildContractOrderPayload,
  resolveContractParams,
  specItemsFromMeasurement,
  type OrderFormData,
  type SetOrderFormData
} from '../utils/orderForm';

const EMPTY_PROMPT: ContractPromptData = {
  clientId: 0,
  name: '',
  phone: '',
  secondPhone: '',
  birthDate: '',
  passportSeriesNumber: '',
  passportIssuedBy: '',
  passportIssuedDate: '',
  passportDepartmentCode: '',
  registrationAddress: '',
  installationAddress: '',
  area: '70,3',
  perimeter: '110,5',
  canvasesCount: '5',
  insertLength: '20',
  pipeCount: '0',
  lightsCount: '30',
  timberLength: '17',
  canvasArticle: 'Полотно Мат 303',
  discount: '',
  handoverDate: ''
};

const parseQuantity = (quantity: string): number => parseFloat(String(quantity).replace(',', '.')) || 0;

const reindex = (items: ContractSpecItem[]): ContractSpecItem[] => items.map((item, i) => ({ ...item, idx: i + 1 }));

interface UseOrderContractOptions {
  orderId: number | null;
  formData: OrderFormData;
  setFormData: SetOrderFormData;
  currentOrder: Order | null;
  clients: Client[];
  actChecklistTemplate?: string[];
}

/**
 * Договор заказа: параметры спецификации, чек-лист акта, позиции сметы (вручную или из замера)
 * и формирование договора Word с уточнением данных клиента в модальном окне.
 */
export const useOrderContract = ({ orderId, formData, setFormData, currentOrder, clients, actChecklistTemplate }: UseOrderContractOptions) => {
  const [isSyncingMeasurement, setIsSyncingMeasurement] = useState(false);
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [promptLoading, setPromptLoading] = useState(false);
  const [promptData, setPromptData] = useState<ContractPromptData>(EMPTY_PROMPT);

  const contractParams = resolveContractParams(formData.contractParams, actChecklistTemplate);
  const actChecklist = contractParams.actChecklist && contractParams.actChecklist.length > 0
    ? contractParams.actChecklist
    : mergeActChecklist([], actChecklistTemplate);
  const specItems = contractParams.specItems || [];
  const selectedClient = clients.find(c => c.id.toString() === formData.clientId);

  const setContractParams = (patch: Partial<ContractParams>) => {
    setFormData(prev => ({ ...prev, contractParams: { ...contractParams, ...patch } }));
  };

  const updateContractParam = <K extends keyof ContractParams>(field: K, value: ContractParams[K]) => {
    setContractParams({ [field]: value } as Partial<ContractParams>);
  };

  const updateCustomContractParam = (key: string, value: string) => {
    setContractParams({ customParams: { ...(contractParams.customParams || {}), [key]: value } });
  };

  const toggleActItem = (itemId: string) => {
    updateContractParam('actChecklist', actChecklist.map(item => (
      String(item.id) === String(itemId) ? { ...item, checked: !item.checked } : item
    )));
  };

  const addSpecItem = () => {
    updateContractParam('specItems', [
      ...specItems,
      { idx: specItems.length + 1, name: '', quantity: '1', unit: 'шт.', price: 0, total: 0 }
    ]);
  };

  /** Обновляет поле позиции; при изменении количества или цены пересчитывает сумму строки. */
  const updateSpecItem = (index: number, patch: Partial<ContractSpecItem>) => {
    updateContractParam('specItems', specItems.map((item, i) => {
      if (i !== index) {
        return item;
      }
      const next = { ...item, ...patch };
      if (patch.quantity !== undefined || patch.price !== undefined) {
        next.total = parseQuantity(next.quantity) * (next.price || 0);
      }
      return next;
    }));
  };

  const removeSpecItem = (index: number) => {
    updateContractParam('specItems', reindex(specItems.filter((_, i) => i !== index)));
  };

  const generateOrderNumber = async () => {
    try {
      const orderNumber = await getNextOrderNumber();
      setFormData(prev => ({ ...prev, orderNumber }));
    } catch (err) {
      console.error('Failed to generate order number', err);
    }
  };

  /** Подтягивает позиции сохраненного замера в спецификацию и пересчитывает итог и остаток. */
  const syncFromMeasurement = async () => {
    if (!orderId) {
      toast.warning('Сначала сохраните заказ, чтобы привязать позиции замера');
      return;
    }
    try {
      setIsSyncingMeasurement(true);
      const dto = await getMeasurementByOrderId(orderId);
      if (!dto || !dto.items || dto.items.length === 0) {
        toast.info('В замере для этого заказа пока нет сохраненных позиций сметы');
        return;
      }
      const items = specItemsFromMeasurement(dto.items);
      const totalSum = items.reduce((acc, item) => acc + (item.total || 0), 0);
      const remainder = Math.max(0, totalSum - (parseFloat(formData.prepayment) || 0));
      setFormData(prev => ({
        ...prev,
        totalPrice: totalSum > 0 ? totalSum.toString() : prev.totalPrice,
        remainder: totalSum > 0 ? remainder.toString() : prev.remainder,
        contractParams: { ...contractParams, specItems: items }
      }));
      toast.success('Позиции сметы успешно подтянуты в договор!');
    } catch (err) {
      console.error('Failed to sync from measurement', err);
      toast.error('Не удалось загрузить позиции из замера');
    } finally {
      setIsSyncingMeasurement(false);
    }
  };

  /** Открывает окно уточнения данных клиента и параметров перед формированием договора. */
  const startGenerate = () => {
    if (!orderId) {
      toast.warning('Сначала сохраните заказ, чтобы сформировать договор');
      return;
    }
    setPromptData({
      clientId: selectedClient?.id || 0,
      name: currentOrder?.clientName || selectedClient?.name || '',
      phone: currentOrder?.clientPhone || selectedClient?.phone || '',
      secondPhone: isValidPhone(selectedClient?.whatsapp) ? formatPhone(selectedClient?.whatsapp) : '',
      birthDate: selectedClient?.birthDate || '',
      passportSeriesNumber: selectedClient?.passportSeriesNumber || '',
      passportIssuedBy: selectedClient?.passportIssuedBy || '',
      passportIssuedDate: selectedClient?.passportIssuedDate || '',
      passportDepartmentCode: selectedClient?.passportDepartmentCode || '',
      registrationAddress: selectedClient?.registrationAddress || '',
      installationAddress: formData.address || '',
      area: contractParams.area || EMPTY_PROMPT.area,
      perimeter: contractParams.perimeter || EMPTY_PROMPT.perimeter,
      canvasesCount: contractParams.canvasesCount || EMPTY_PROMPT.canvasesCount,
      insertLength: contractParams.insertLength || EMPTY_PROMPT.insertLength,
      pipeCount: contractParams.pipeCount || EMPTY_PROMPT.pipeCount,
      lightsCount: contractParams.lightsCount || EMPTY_PROMPT.lightsCount,
      timberLength: contractParams.timberLength || EMPTY_PROMPT.timberLength,
      canvasArticle: contractParams.canvasArticle || EMPTY_PROMPT.canvasArticle,
      discount: contractParams.discount || '',
      handoverDate: contractParams.handoverDate || ''
    });
    setIsPromptOpen(true);
  };

  const applyPassport = (res: PassportApplyResult) => {
    setPromptData(prev => ({
      ...prev,
      name: res.name || prev.name,
      passportSeriesNumber: res.passportSeriesNumber || prev.passportSeriesNumber,
      passportIssuedBy: res.passportIssuedBy || prev.passportIssuedBy,
      passportIssuedDate: res.passportIssuedDate || prev.passportIssuedDate,
      passportDepartmentCode: res.passportDepartmentCode || prev.passportDepartmentCode,
      registrationAddress: res.registrationAddress || prev.registrationAddress,
      birthDate: res.birthDate || prev.birthDate
    }));
  };

  /**
   * Сохраняет паспортные данные клиента и параметры договора в заказ, затем скачивает сформированный договор.
   */
  const submitGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId) {
      return;
    }
    setPromptLoading(true);
    try {
      if (promptData.clientId) {
        await updateClient(promptData.clientId, {
          name: promptData.name,
          phone: phoneForSave(promptData.phone),
          birthDate: dateForSave(promptData.birthDate) || undefined,
          passportSeriesNumber: promptData.passportSeriesNumber || undefined,
          passportIssuedBy: promptData.passportIssuedBy || undefined,
          passportIssuedDate: dateForSave(promptData.passportIssuedDate) || undefined,
          passportDepartmentCode: promptData.passportDepartmentCode || undefined,
          registrationAddress: promptData.registrationAddress || undefined
        });
      }

      const updatedParams: ContractParams = {
        ...contractParams,
        area: promptData.area,
        perimeter: promptData.perimeter,
        canvasesCount: promptData.canvasesCount,
        insertLength: promptData.insertLength,
        pipeCount: promptData.pipeCount,
        lightsCount: promptData.lightsCount,
        timberLength: promptData.timberLength,
        canvasArticle: promptData.canvasArticle,
        discount: promptData.discount,
        handoverDate: dateForSave(promptData.handoverDate)
      };

      await updateOrder(orderId, buildContractOrderPayload(formData, currentOrder, updatedParams, promptData.installationAddress));
      setFormData(prev => ({
        ...prev,
        address: promptData.installationAddress || prev.address,
        contractParams: updatedParams
      }));

      downloadBlob(await downloadContractDocx(orderId), `Договор_Заказ_${orderId}.docx`);
      toast.success('Договор (Word) успешно сформирован и скачан');
      setIsPromptOpen(false);
    } catch (err) {
      console.error('Failed to generate docx', err);
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Ошибка генерации договора');
    } finally {
      setPromptLoading(false);
    }
  };

  return {
    contractParams,
    actChecklist,
    specItems,
    selectedClient,
    updateContractParam,
    updateCustomContractParam,
    toggleActItem,
    addSpecItem,
    updateSpecItem,
    removeSpecItem,
    generateOrderNumber,
    isSyncingMeasurement,
    syncFromMeasurement,
    isPromptOpen,
    closePrompt: () => setIsPromptOpen(false),
    promptLoading,
    promptData,
    setPromptData,
    startGenerate,
    applyPassport,
    submitGenerate
  };
};

export type OrderContractState = ReturnType<typeof useOrderContract>;
