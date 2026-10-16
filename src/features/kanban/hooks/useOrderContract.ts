import { useState } from 'react';
import {
  downloadContractDocx,
  getNextOrderNumber,
  updateOrder,
  type ContractParams,
  type Order
} from '../../../api/kanban';
import { updateClient, type Client, type ClientCreateRequest } from '../../../api/clients';
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
  type OrderFormData,
  type SetOrderFormData
} from '../utils/orderForm';

const EMPTY_PROMPT: ContractPromptData = {
  clientId: 0,
  isLegal: false,
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
  discount: '',
  handoverDate: ''
};

/**
 * Запрос на сохранение клиента из окна договора. PUT заменяет клиента целиком, поэтому за основу берется
 * текущая карточка — иначе стерлись бы тип, контакты и реквизиты. Паспортные данные есть только у физлица.
 */
const clientUpdateFromPrompt = (client: Client, prompt: ContractPromptData): ClientCreateRequest => {
  const base: ClientCreateRequest = { ...client, name: prompt.name, phone: phoneForSave(prompt.phone) };
  if (prompt.isLegal) {
    return base;
  }
  return {
    ...base,
    birthDate: dateForSave(prompt.birthDate) || undefined,
    passportSeriesNumber: prompt.passportSeriesNumber || undefined,
    passportIssuedBy: prompt.passportIssuedBy || undefined,
    passportIssuedDate: dateForSave(prompt.passportIssuedDate) || undefined,
    passportDepartmentCode: prompt.passportDepartmentCode || undefined,
    registrationAddress: prompt.registrationAddress || undefined
  };
};

const isFilled = (value: string) => value.trim().length > 0;

/**
 * Заполнены ли обязательные поля окна договора: у физлица — ФИО, телефон, дата рождения, паспорт и прописка,
 * у юрлица — наименование и телефон (реквизиты берутся из карточки); у обоих — адрес монтажа.
 */
export const isPromptComplete = (data: ContractPromptData): boolean => {
  const required = [data.name, data.installationAddress];
  if (!data.isLegal) {
    required.push(data.birthDate, data.passportSeriesNumber, data.passportIssuedBy, data.passportIssuedDate, data.registrationAddress);
  }
  return required.every(isFilled) && isValidPhone(data.phone);
};

interface UseOrderContractOptions {
  orderId: number | null;
  formData: OrderFormData;
  setFormData: SetOrderFormData;
  currentOrder: Order | null;
  clients: Client[];
  actChecklistTemplate?: string[];
}

/**
 * Договор заказа: договорные параметры, чек-лист акта и формирование договора Word с уточнением данных клиента
 * в модальном окне. Параметры потолка и спецификацию бэкенд считает по замеру и смете.
 */
export const useOrderContract = ({ orderId, formData, setFormData, currentOrder, clients, actChecklistTemplate }: UseOrderContractOptions) => {
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [promptLoading, setPromptLoading] = useState(false);
  const [promptData, setPromptData] = useState<ContractPromptData>(EMPTY_PROMPT);

  const contractParams = resolveContractParams(formData.contractParams, actChecklistTemplate);
  const actChecklist = contractParams.actChecklist && contractParams.actChecklist.length > 0
    ? contractParams.actChecklist
    : mergeActChecklist([], actChecklistTemplate);
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

  const generateOrderNumber = async () => {
    try {
      const orderNumber = await getNextOrderNumber();
      setFormData(prev => ({ ...prev, orderNumber }));
    } catch (err) {
      console.error('Failed to generate order number', err);
    }
  };

  /** Данные для договора из карточки клиента, заказа и сохраненных параметров договора. */
  const buildPromptData = (): ContractPromptData => ({
    clientId: selectedClient?.id || 0,
    isLegal: selectedClient?.clientType === 'LEGAL_ENTITY',
    name: currentOrder?.clientName || selectedClient?.name || '',
    phone: currentOrder?.clientPhone || selectedClient?.phone || '',
    secondPhone: contractParams.secondPhone || (isValidPhone(selectedClient?.whatsapp) ? formatPhone(selectedClient?.whatsapp) : ''),
    birthDate: selectedClient?.birthDate || '',
    passportSeriesNumber: selectedClient?.passportSeriesNumber || '',
    passportIssuedBy: selectedClient?.passportIssuedBy || '',
    passportIssuedDate: selectedClient?.passportIssuedDate || '',
    passportDepartmentCode: selectedClient?.passportDepartmentCode || '',
    registrationAddress: selectedClient?.registrationAddress || '',
    installationAddress: formData.address || '',
    discount: contractParams.discount || '',
    handoverDate: contractParams.handoverDate || ''
  });

  /**
   * Сохраняет параметры договора в заказ и скачивает договор; при {@code saveClient} сначала обновляет клиента
   * данными из окна (паспорт — только у физлица).
   */
  const generate = async (data: ContractPromptData, saveClient: boolean) => {
    if (!orderId) {
      return;
    }
    setPromptLoading(true);
    try {
      const client = saveClient ? clients.find(c => c.id === data.clientId) : undefined;
      if (client) {
        await updateClient(client.id, clientUpdateFromPrompt(client, data));
      }

      const updatedParams: ContractParams = {
        ...contractParams,
        secondPhone: data.secondPhone,
        discount: data.discount,
        handoverDate: dateForSave(data.handoverDate)
      };

      await updateOrder(orderId, buildContractOrderPayload(formData, currentOrder, updatedParams, data.installationAddress));
      setFormData(prev => ({
        ...prev,
        address: data.installationAddress || prev.address,
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

  const isOrderSaved = () => {
    if (!orderId) {
      toast.warning('Сначала сохраните заказ, чтобы сформировать договор');
    }
    return Boolean(orderId);
  };

  const openPrompt = (data: ContractPromptData) => {
    setPromptData(data);
    setIsPromptOpen(true);
  };

  /**
   * Формирует договор сразу, если в карточке клиента и заказе есть все обязательные данные;
   * иначе открывает окно, чтобы дозаполнить их.
   */
  const startGenerate = () => {
    if (!isOrderSaved()) {
      return;
    }
    const data = buildPromptData();
    if (isPromptComplete(data)) {
      void generate(data, false);
      return;
    }
    openPrompt(data);
  };

  /** Открывает окно с данными заказчика для правки перед формированием договора, даже если они заполнены. */
  const editAndGenerate = () => {
    if (isOrderSaved()) {
      openPrompt(buildPromptData());
    }
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

  /** Отправка окна: сохраняет введенные данные клиента и формирует договор. */
  const submitGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    await generate(promptData, true);
  };

  return {
    contractParams,
    actChecklist,
    selectedClient,
    updateContractParam,
    updateCustomContractParam,
    toggleActItem,
    generateOrderNumber,
    isPromptOpen,
    closePrompt: () => setIsPromptOpen(false),
    promptLoading,
    promptData,
    setPromptData,
    startGenerate,
    editAndGenerate,
    applyPassport,
    submitGenerate
  };
};

export type OrderContractState = ReturnType<typeof useOrderContract>;
