import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronDown,
  Paperclip,
  Download,
  Eye,
  Mic,
  MapPin,
  X,
  Tag,
  User,
  Ruler,
  FileText,
  AlertCircle,
  FileCheck,
  Check,
  Camera,
  Sparkles,
  Send,
  Plus,
  Trash2,
  Edit2,
  RefreshCw
} from 'lucide-react';
import { AddressSuggestions } from 'react-dadata';
import 'react-dadata/dist/react-dadata.css';
import { useTranslation } from 'react-i18next';
import {
  getOrderStatuses,
  getOrders,
  createOrder,
  updateOrder,
  uploadAttachment,
  toggleAttachmentIsAct,
  fetchAttachmentBlob,
  deleteAttachment,
  renameAttachment,
  deleteOrder,
  getAiSummary,
  uploadAudio,
  deleteOrderAudio,
  downloadContractDocx,
  analyzeAudioWithPrompt,
  chatWithOrderAi,
  type OrderStatus,
  type Order,
  type OrderMaterial,
  type OrderAttachment,
  type OrderAiSummary,
  type ContractParams,
  type ChatMessage
} from '../../../api/kanban';
import { getOrderAiUsage } from '../../../api/aiUsage';
import { SYSTEM_PROMPT_SUMMARY, SYSTEM_PROMPT_SALES_ADVICE, SYSTEM_PROMPT_CHAT_ASSISTANT } from '../../../constants/aiPrompts';
import { getClients, createClient, updateClient, type Client } from '../../../api/clients';
import { getMaterials, type Material } from '../../../api/storage';
import { getEmployees, type Employee } from '../../../api/employees';
import { useAppStore } from '../../../store/useAppStore';
import { useAuthStore } from '../../../store/useAuthStore';
import { useFeature } from '../../../hooks/useFeatureToggle';
import { localInputToUtcIso, utcToLocalInput } from '../../../utils/dateUtils';
import { getYandexMapsUrl, get2GisUrl } from '../../../utils/navigation';
import { OrderRemindersSection } from '../../../components/OrderRemindersSection';
import { DocumentScannerModal } from '../../../components/DocumentScannerModal';
import { PassportScannerModal, type PassportApplyResult } from '../../../components/PassportScannerModal';
import { ActUploadActionSheet } from '../../../components/ActUploadActionSheet';
import { MeasurementWizard } from '../../../components/MeasurementWizard';
import { ClientSearchSelect } from './ClientSearchSelect';
import { EmployeeSearchSelect } from './EmployeeSearchSelect';
import { QuickClientModal } from './QuickClientModal';
import { ContractPromptModal } from './ContractPromptModal';
import { DEFAULT_ACT_CHECKLIST, mergeActChecklist, isActFile } from '../constants';
import { useOrderDrawerStore } from '../../../store/useOrderDrawerStore';

export const OrderDrawer: React.FC = () => {
  const { t } = useTranslation();
  const role = useAuthStore(state => state.role);
  const isWorker = role === 'WORKER';
  const hasAiSummary = useFeature('AI_SUMMARY');
  const hasContractTemplates = useFeature('CONTRACT_TEMPLATES');
  const hasDocumentScanner = useFeature('DOCUMENT_SCANNER');
  const { fetchLowStockMaterials } = useAppStore();

  const { isOpen, orderId: editingOrderId, activeTab: orderModalTab, setActiveTab: setOrderModalTab, closeOrder } = useOrderDrawerStore();

  const [columns, setColumns] = useState<OrderStatus[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [allMaterials, setAllMaterials] = useState<Material[]>([]);

  const [initialFormDataJson, setInitialFormDataJson] = useState<string>('');
  const [isUnsavedConfirmOpen, setIsUnsavedConfirmOpen] = useState(false);

  // Quick Client Creation
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [newClientType, setNewClientType] = useState<'INDIVIDUAL' | 'LEGAL_ENTITY'>('INDIVIDUAL');
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientWhatsapp, setNewClientWhatsapp] = useState('');
  const [newClientTelegram, setNewClientTelegram] = useState('');
  const [newClientInn, setNewClientInn] = useState('');
  const [newClientContactPerson, setNewClientContactPerson] = useState('');
  const [newClientLeadSource, setNewClientLeadSource] = useState('');
  const [newClientCustomLeadSource, setNewClientCustomLeadSource] = useState('');
  const [creatingClient, setCreatingClient] = useState(false);

  const [formData, setFormData] = useState({
    clientId: '',
    statusId: '',
    assigneeId: '',
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
    contractParams: undefined as ContractParams | undefined,
    materials: [] as OrderMaterial[],
    attachments: [] as OrderAttachment[]
  });

  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [editingAttachmentId, setEditingAttachmentId] = useState<number | null>(null);
  const [editingAttachmentName, setEditingAttachmentName] = useState('');
  const [renamingAttachment, setRenamingAttachment] = useState(false);

  const [isActActionSheetOpen, setIsActActionSheetOpen] = useState(false);
  const [actionSheetMode, setActionSheetMode] = useState<'ACT' | 'GENERAL'>('ACT');
  const [isDocScannerOpen, setIsDocScannerOpen] = useState(false);
  const [docScannerIsAct, setDocScannerIsAct] = useState(true);
  const actFileInputRef = useRef<HTMLInputElement | null>(null);
  const generalFileInputRef = useRef<HTMLInputElement | null>(null);

  const [aiSummary, setAiSummary] = useState<OrderAiSummary | null>(null);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const audioFileInputRef = useRef<HTMLInputElement | null>(null);
  const [aiSubTab, setAiSubTab] = useState<'ANALYSIS' | 'CHAT'>('ANALYSIS');
  const [aiPromptPreset, setAiPromptPreset] = useState<'SUMMARY' | 'SALES_ADVICE' | 'CUSTOM'>('SUMMARY');
  const [customSystemPrompt] = useState('');
  const [isAnalyzingAudio, setIsAnalyzingAudio] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInputText, setChatInputText] = useState('');
  const [isChatReplying, setIsChatReplying] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const orderChatCacheRef = useRef<Record<number, ChatMessage[]>>({});

  // Contract Generation & Prompt Modal State
  const [isContractPromptOpen, setIsContractPromptOpen] = useState(false);
  const [contractPromptLoading, setContractPromptLoading] = useState(false);
  const [isPassportScannerOpen, setIsPassportScannerOpen] = useState(false);
  const [passportScannerTarget, setPassportScannerTarget] = useState<'CONTRACT' | 'NEW_CLIENT' | 'ORDER'>('CONTRACT');
  const [contractPromptData, setContractPromptData] = useState({
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
  });

  // Load auxiliary data when opening drawer
  useEffect(() => {
    if (!isOpen) return;

    const loadAuxData = async () => {
      try {
        const [statuses, clientsData, materialsData, employeesData] = await Promise.all([
          getOrderStatuses().catch(() => []),
          !isWorker ? getClients().catch(() => []) : Promise.resolve([]),
          !isWorker ? getMaterials().catch(() => []) : Promise.resolve([]),
          !isWorker ? getEmployees().catch(() => []) : Promise.resolve([])
        ]);
        const sortedColumns = statuses.sort((a, b) => a.sortOrder - b.sortOrder);
        setColumns(sortedColumns);
        setClients(clientsData);
        setAllMaterials(materialsData);
        setEmployees(employeesData);
      } catch (err) {
        console.error("Failed to load auxiliary data in OrderDrawer", err);
      }
    };

    loadAuxData();
  }, [isOpen, isWorker]);

  // Load order data when orderId changes
  useEffect(() => {
    if (!isOpen) return;

    if (editingOrderId) {
      getOrders().then(orders => {
        const order = orders.find(o => o.id === editingOrderId);
        if (order) {
          populateOrderData(order);
        }
      }).catch(err => {
        console.error("Failed to load order details", err);
      });
    } else {
      initNewOrderForm();
    }
  }, [isOpen, editingOrderId]);

  const initNewOrderForm = () => {
    const initialData = {
      clientId: '',
      statusId: columns[0]?.id ? columns[0].id.toString() : '',
      assigneeId: '',
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
      contractParams: {
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
        actChecklist: DEFAULT_ACT_CHECKLIST.map(item => ({ ...item, checked: false }))
      },
      materials: [],
      attachments: []
    };
    setFormData(initialData);
    setInitialFormDataJson(JSON.stringify({ formData: initialData, pendingFilesCount: 0 }));
    setPendingFiles([]);
    setAiSummary(null);
  };

  const populateOrderData = (order: Order) => {
    const prep = order.prepayment != null ? order.prepayment : 0;
    const rem = order.remainder != null ? order.remainder : (order.totalPrice != null ? Math.max(0, order.totalPrice - prep) : 0);
    const tot = order.totalPrice != null ? order.totalPrice : (prep + rem);

    const initialContractParams: ContractParams = order.contractParams ? {
      ...order.contractParams,
      contractDate: order.contractParams.contractDate || new Date().toISOString().slice(0, 10),
      actChecklist: mergeActChecklist(order.contractParams.actChecklist),
      specItems: order.contractParams.specItems || []
    } : {
      area: '70,3',
      perimeter: '110,5',
      canvasesCount: '5',
      insertLength: '20',
      pipeCount: '0',
      lightsCount: '30',
      timberLength: '17',
      canvasArticle: 'Полотно Мат 303',
      contractDate: new Date().toISOString().slice(0, 10),
      discount: '',
      handoverDate: '',
      specItems: [],
      actChecklist: DEFAULT_ACT_CHECKLIST.map(item => ({ ...item, checked: false }))
    };

    const initialData = {
      clientId: order.clientId ? order.clientId.toString() : '',
      statusId: order.statusId ? order.statusId.toString() : (columns[0]?.id ? columns[0].id.toString() : ''),
      assigneeId: order.assigneeId ? order.assigneeId.toString() : '',
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
      totalPrice: (tot != null && tot > 0) ? tot.toString() : '',
      prepayment: (prep != null && prep > 0) ? prep.toString() : '',
      prepaymentPaid: !!order.prepaymentPaid,
      prepaymentPaidAt: order.prepaymentPaidAt || '',
      remainder: (rem != null && rem > 0) ? rem.toString() : '',
      remainderPaid: !!order.remainderPaid,
      remainderPaidAt: order.remainderPaidAt || '',
      installationPrice: (order.installationPrice != null && order.installationPrice > 0) ? order.installationPrice.toString() : '',
      installationDate: order.installationDate ? order.installationDate.slice(0, 10) : '',
      measurementDate: utcToLocalInput(order.measurementDate),
      materials: order.materials ? [...order.materials] : [],
      attachments: order.attachments ? [...order.attachments] : [],
      contractParams: initialContractParams
    };

    setFormData(initialData);
    setInitialFormDataJson(JSON.stringify({ formData: initialData, pendingFilesCount: 0 }));
    setPendingFiles([]);
    setAiSummary(null);
    setAiSubTab('ANALYSIS');
    setAiPromptPreset('SUMMARY');

    const cachedChat = orderChatCacheRef.current[order.id] || [];
    setChatMessages(cachedChat);
    setChatInputText('');

    getAiSummary(order.id).then((summary) => {
      setAiSummary(summary);
      if (summary?.chatHistory) {
        try {
          const parsed = typeof summary.chatHistory === 'string' ? JSON.parse(summary.chatHistory) : summary.chatHistory;
          if (Array.isArray(parsed)) {
            setChatMessages(parsed);
            orderChatCacheRef.current[order.id] = parsed;
          }
        } catch (e) {
          console.error("Failed to parse chatHistory from DB", e);
        }
      }
    }).catch(() => setAiSummary(null));
    getOrderAiUsage(order.id).catch(() => {});
  };

  const isCompletedColumn = (col?: OrderStatus | null) => {
    if (!col) return false;
    if (col.isCompleted !== undefined) return Boolean(col.isCompleted);
    if (!col.name) return false;
    const name = col.name.trim().toLowerCase();
    return name.includes('заверш') || name.includes('готов') || name.includes('выполнен') || name.includes('complete');
  };

  const isDirty = useMemo(() => {
    if (!isOpen) return false;
    if (!editingOrderId) {
      return !!(
        (formData.clientId && formData.clientId !== '') ||
        (formData.address && formData.address.trim() !== '') ||
        (formData.description && formData.description.trim() !== '') ||
        (formData.totalPrice && formData.totalPrice !== '') ||
        (formData.prepayment && formData.prepayment !== '') ||
        (formData.remainder && formData.remainder !== '') ||
        (formData.installationPrice && formData.installationPrice !== '') ||
        (formData.installationDate && formData.installationDate !== '') ||
        (formData.measurementDate && formData.measurementDate !== '') ||
        formData.materials.length > 0 ||
        pendingFiles.length > 0
      );
    }
    if (!initialFormDataJson) return false;
    const currentJson = JSON.stringify({ formData, pendingFilesCount: pendingFiles.length });
    return currentJson !== initialFormDataJson;
  }, [isOpen, editingOrderId, formData, pendingFiles.length, initialFormDataJson]);

  const handleRequestCloseModal = () => {
    if (isDirty) {
      setIsUnsavedConfirmOpen(true);
    } else {
      closeOrder();
    }
  };

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleRequestCloseModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDirty]);

  const submitOrderForm = async () => {
    const prep = parseFloat(formData.prepayment || '0');
    const rem = parseFloat(formData.remainder || '0');
    const total = prep + rem;

    const payload = {
      clientId: parseInt(formData.clientId),
      assigneeId: formData.assigneeId ? parseInt(formData.assigneeId) : undefined,
      measurerId: formData.measurerId ? parseInt(formData.measurerId) : undefined,
      installedById: formData.installedById ? parseInt(formData.installedById) : undefined,
      installedAt: formData.installedAt || undefined,
      statusId: formData.statusId ? parseInt(formData.statusId) : (columns[0]?.id || 1),
      orderNumber: (formData.orderNumber && formData.orderNumber.trim()) ? formData.orderNumber.trim() : null,
      address: formData.address,
      entrance: formData.entrance || undefined,
      floor: formData.floor || undefined,
      description: formData.description,
      prepayment: prep,
      prepaymentPaid: formData.prepaymentPaid,
      prepaymentPaidAt: formData.prepaymentPaidAt || undefined,
      remainder: rem,
      remainderPaid: formData.remainderPaid,
      remainderPaidAt: formData.remainderPaidAt || undefined,
      totalPrice: total,
      installationPrice: parseFloat(formData.installationPrice || '0'),
      installationDate: formData.installationDate || undefined,
      measurementDate: localInputToUtcIso(formData.measurementDate),
      contractParams: formData.contractParams,
      materials: formData.materials.map(m => ({
        materialId: m.materialId,
        quantity: typeof m.quantity === 'string' ? parseFloat(m.quantity) : m.quantity
      }))
    };

    const targetStatusId = payload.statusId;
    const targetCol = columns.find(c => c.id === targetStatusId);
    if (isCompletedColumn(targetCol)) {
      const hasActInForm = (formData.attachments || []).some(a => isActFile(a.fileName, a.isAct))
        || pendingFiles.some(f => isActFile(f.name));
      if (!hasActInForm) {
        alert(`Для перевода заявки в статус «${targetCol?.name || 'Завершен'}» необходимо обязательно прикрепить подписанный Акт выполненных работ.`);
        return;
      }
    }

    try {
      if (editingOrderId) {
        await updateOrder(editingOrderId, payload);
      } else {
        const created = await createOrder(payload);
        if (pendingFiles.length > 0) {
          for (const f of pendingFiles) {
            await uploadAttachment(created.id, f);
          }
        }
      }
      closeOrder();
      fetchLowStockMaterials();
      window.dispatchEvent(new CustomEvent('alta:orders-changed', { detail: { action: 'save', orderId: editingOrderId } }));
    } catch (err: any) {
      console.error("Failed to save order", err);
      alert(err.response?.data?.message || 'Ошибка при сохранении заявки');
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (orderModalTab === 'AI') {
      return;
    }
    await submitOrderForm();
  };

  const handleConfirmSaveAndClose = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsUnsavedConfirmOpen(false);
    await submitOrderForm();
  };

  const handleConfirmDiscardAndClose = () => {
    setIsUnsavedConfirmOpen(false);
    closeOrder();
  };

  const handleDeleteOrder = async () => {
    if (!editingOrderId) return;
    if (window.confirm("Вы уверены, что хотите удалить эту заявку?")) {
      try {
        await deleteOrder(editingOrderId);
        closeOrder();
        fetchLowStockMaterials();
        window.dispatchEvent(new CustomEvent('alta:orders-changed', { detail: { action: 'delete', orderId: editingOrderId } }));
      } catch (err) {
        console.error("Failed to delete order", err);
      }
    }
  };

  const handleQuickCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim() || !newClientPhone.trim()) return;

    setCreatingClient(true);
    try {
      const finalSource = newClientLeadSource === 'custom' ? newClientCustomLeadSource.trim() : newClientLeadSource;
      const created = await createClient({
        clientType: newClientType,
        name: newClientName.trim(),
        phone: newClientPhone.trim(),
        inn: newClientType === 'LEGAL_ENTITY' && newClientInn.trim() ? newClientInn.trim() : undefined,
        contactPerson: newClientType === 'LEGAL_ENTITY' && newClientContactPerson.trim() ? newClientContactPerson.trim() : undefined,
        leadSource: finalSource || undefined,
        whatsapp: newClientWhatsapp.trim() || undefined,
        telegram: newClientTelegram.trim() || undefined
      });
      setClients(prev => [created, ...prev]);
      setFormData(prev => ({ ...prev, clientId: created.id.toString() }));
      setIsNewClientModalOpen(false);
      setNewClientType('INDIVIDUAL');
      setNewClientName('');
      setNewClientPhone('');
      setNewClientWhatsapp('');
      setNewClientTelegram('');
      setNewClientInn('');
      setNewClientContactPerson('');
      setNewClientLeadSource('');
      setNewClientCustomLeadSource('');
    } catch (err: any) {
      console.error("Failed to create client", err);
      alert(err.response?.data?.message || 'Не удалось создать клиента');
    } finally {
      setCreatingClient(false);
    }
  };

  const getContractParams = (): ContractParams => {
    return formData.contractParams ? {
      ...formData.contractParams,
      actChecklist: mergeActChecklist(formData.contractParams.actChecklist)
    } : {
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
      actChecklist: DEFAULT_ACT_CHECKLIST.map(item => ({ ...item, checked: false }))
    };
  };

  const updateContractParam = (key: keyof ContractParams, value: any) => {
    const current = getContractParams();
    setFormData(prev => ({
      ...prev,
      contractParams: {
        ...current,
        [key]: value
      }
    }));
  };

  const toggleActItem = (itemId: string) => {
    const cp = getContractParams();
    const list = mergeActChecklist(cp.actChecklist);
    const updated = list.map(it => it.id === itemId ? { ...it, checked: !it.checked } : it);
    updateContractParam('actChecklist', updated);
  };

  const executeContractDownload = async (clientId: number) => {
    if (!editingOrderId) {
      alert('Пожалуйста, сохраните заявку перед скачиванием договора');
      return;
    }

    const client = clients.find(c => c.id === clientId);
    const clientName = client?.name || 'Клиент';
    const contractNum = formData.orderNumber || `${editingOrderId}`;

    try {
      const blob = await downloadContractDocx(editingOrderId);
      const fileName = `Договор_№${contractNum}_${clientName}.docx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Failed to download contract', err);
      alert('Ошибка при формировании договора: ' + (err.message || err));
    }
  };

  const handleStartGenerateContract = async () => {
    if (!formData.clientId) {
      alert('Пожалуйста, выберите клиента для формирования договора');
      return;
    }

    const client = clients.find(c => c.id === parseInt(formData.clientId));
    if (!client) return;

    const isLegal = client.clientType === 'LEGAL_ENTITY';
    const isMissingPassport = !isLegal && (
      !client.name?.trim() ||
      !client.phone?.trim() ||
      !client.birthDate?.trim() ||
      !client.passportSeriesNumber?.trim() ||
      !client.passportIssuedBy?.trim() ||
      !client.passportIssuedDate?.trim() ||
      !client.registrationAddress?.trim()
    );

    const cp = getContractParams();
    setContractPromptData({
      clientId: client.id,
      name: client.name || '',
      phone: client.phone || '',
      secondPhone: cp.secondPhone || '',
      birthDate: client.birthDate ? client.birthDate.slice(0, 10) : '',
      passportSeriesNumber: client.passportSeriesNumber || '',
      passportIssuedBy: client.passportIssuedBy || '',
      passportIssuedDate: client.passportIssuedDate ? client.passportIssuedDate.slice(0, 10) : '',
      passportDepartmentCode: client.passportDepartmentCode || '',
      registrationAddress: client.registrationAddress || '',
      installationAddress: formData.address || '',
      area: cp.area || '70,3',
      perimeter: cp.perimeter || '110,5',
      canvasesCount: cp.canvasesCount || '5',
      insertLength: cp.insertLength || '20',
      pipeCount: cp.pipeCount || '0',
      lightsCount: cp.lightsCount || '30',
      timberLength: cp.timberLength || '17',
      canvasArticle: cp.canvasArticle || 'Полотно Мат 303',
      discount: cp.discount || '',
      handoverDate: cp.handoverDate || ''
    });

    if (isMissingPassport) {
      setIsContractPromptOpen(true);
    } else {
      await executeContractDownload(client.id);
    }
  };

  const handleSavePromptAndGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setContractPromptLoading(true);
      const client = clients.find(c => c.id === contractPromptData.clientId);
      if (client) {
        await updateClient(client.id, {
          ...client,
          name: contractPromptData.name.trim(),
          phone: contractPromptData.phone.trim(),
          birthDate: contractPromptData.birthDate.trim(),
          passportSeriesNumber: contractPromptData.passportSeriesNumber.trim(),
          passportIssuedBy: contractPromptData.passportIssuedBy.trim(),
          passportIssuedDate: contractPromptData.passportIssuedDate.trim(),
          passportDepartmentCode: contractPromptData.passportDepartmentCode.trim() || undefined,
          registrationAddress: contractPromptData.registrationAddress.trim()
        });
      }

      if (contractPromptData.installationAddress.trim()) {
        setFormData(prev => ({ ...prev, address: contractPromptData.installationAddress.trim() }));
      }

      const updatedClients = await getClients();
      setClients(updatedClients);
      setIsContractPromptOpen(false);

      await executeContractDownload(contractPromptData.clientId);
    } catch (err: any) {
      console.error('Failed to save contract data', err);
      alert('Ошибка при сохранении данных: ' + (err.message || err));
    } finally {
      setContractPromptLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (editingOrderId) {
      try {
        const isAct = isActFile(file.name);
        const newAttachment = await uploadAttachment(editingOrderId, file, isAct);
        setFormData(prev => ({
          ...prev,
          attachments: [...prev.attachments, newAttachment]
        }));
        window.dispatchEvent(new CustomEvent('alta:orders-changed', { detail: { action: 'attachment', orderId: editingOrderId } }));
      } catch (err: any) {
        console.error("Failed to upload file", err);
        alert(err.response?.data?.message || "Не удалось загрузить файл");
      } finally {
        e.target.value = '';
      }
    } else {
      setPendingFiles(prev => [...prev, file]);
      e.target.value = '';
    }
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUploadDirectActFile = async (originalFile: File) => {
    let newFileName = originalFile.name;
    if (!isActFile(newFileName)) {
      newFileName = `Акт выполненных работ - ${originalFile.name}`;
    }
    const file = new File([originalFile], newFileName, { type: originalFile.type });

    if (editingOrderId) {
      try {
        const newAttachment = await uploadAttachment(editingOrderId, file, true);
        setFormData(prev => ({
          ...prev,
          attachments: [...prev.attachments, newAttachment]
        }));
        window.dispatchEvent(new CustomEvent('alta:orders-changed', { detail: { action: 'attachment', orderId: editingOrderId } }));
      } catch (err: any) {
        console.error("Failed to upload act file", err);
        alert(err.response?.data?.message || "Не удалось загрузить Акт");
      }
    } else {
      setPendingFiles(prev => [...prev, file]);
    }
  };

  const handleUploadDirectGeneralFile = async (file: File) => {
    if (editingOrderId) {
      try {
        const isAct = isActFile(file.name);
        const newAttachment = await uploadAttachment(editingOrderId, file, isAct);
        setFormData(prev => ({
          ...prev,
          attachments: [...prev.attachments, newAttachment]
        }));
        window.dispatchEvent(new CustomEvent('alta:orders-changed', { detail: { action: 'attachment', orderId: editingOrderId } }));
      } catch (err: any) {
        console.error("Failed to upload file", err);
        alert(err.response?.data?.message || "Не удалось загрузить файл");
      }
    } else {
      setPendingFiles(prev => [...prev, file]);
    }
  };

  const handleToggleAttachmentIsAct = async (att: OrderAttachment) => {
    try {
      const currentIsAct = isActFile(att.fileName, att.isAct);
      const updated = await toggleAttachmentIsAct(att.id, !currentIsAct);
      setFormData(prev => ({
        ...prev,
        attachments: prev.attachments.map(a => a.id === att.id ? { ...a, isAct: updated.isAct } : a)
      }));
      window.dispatchEvent(new CustomEvent('alta:orders-changed', { detail: { action: 'attachment', orderId: editingOrderId } }));
    } catch (err: any) {
      console.error("Failed to toggle attachment act flag", err);
      alert(err.response?.data?.message || "Не удалось изменить статус Акта");
    }
  };

  const isViewableInBrowser = (fileName: string, contentType?: string) => {
    const name = fileName.toLowerCase();
    const type = (contentType || '').toLowerCase();
    if (type.startsWith('image/') || type.startsWith('audio/') || type.startsWith('video/') || type.startsWith('text/') || type.includes('pdf')) {
      return true;
    }
    return /.(pdf|png|jpe?g|gif|webp|svg|bmp|txt|csv|log|mp3|wav|ogg|mp4|webm)$/i.test(name);
  };

  const handleOpenAttachment = async (att: OrderAttachment) => {
    try {
      const blob = await fetchAttachmentBlob(att.id, false);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      console.error("Failed to open attachment", err);
      alert("Не удалось открыть файл");
    }
  };

  const handleDownloadAttachment = async (att: OrderAttachment) => {
    try {
      const blob = await fetchAttachmentBlob(att.id, true);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = att.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download attachment", err);
      alert("Не удалось скачать файл");
    }
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    try {
      await deleteAttachment(attachmentId);
      setFormData(prev => ({
        ...prev,
        attachments: prev.attachments.filter(a => a.id !== attachmentId)
      }));
      window.dispatchEvent(new CustomEvent('alta:orders-changed', { detail: { action: 'attachment', orderId: editingOrderId } }));
    } catch (err) {
      console.error("Failed to delete attachment", err);
    }
  };

  const handleStartRenameAttachment = (att: OrderAttachment) => {
    setEditingAttachmentId(att.id);
    setEditingAttachmentName(att.fileName);
  };

  const handleSaveRenameAttachment = async (attachmentId: number) => {
    if (!editingAttachmentName.trim()) {
      alert('Имя файла не может быть пустым');
      return;
    }
    setRenamingAttachment(true);
    try {
      const updated = await renameAttachment(attachmentId, editingAttachmentName.trim());
      setFormData(prev => ({
        ...prev,
        attachments: prev.attachments.map(a => a.id === attachmentId ? { ...a, fileName: updated.fileName } : a)
      }));
      setEditingAttachmentId(null);
      setEditingAttachmentName('');
      window.dispatchEvent(new CustomEvent('alta:orders-changed', { detail: { action: 'attachment', orderId: editingOrderId } }));
    } catch (err: any) {
      console.error('Failed to rename attachment', err);
      alert(err.response?.data?.message || 'Не удалось переименовать файл');
    } finally {
      setRenamingAttachment(false);
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingOrderId) return;

    setUploadingAudio(true);
    try {
      await uploadAudio(editingOrderId, file);
      const summary = await getAiSummary(editingOrderId);
      setAiSummary(summary);
      getOrderAiUsage(editingOrderId).catch(() => {});
    } catch (err) {
      console.error("Failed to upload audio", err);
    } finally {
      setUploadingAudio(false);
      e.target.value = '';
    }
  };

  const handleDeleteAudio = async () => {
    if (!editingOrderId) return;
    if (!window.confirm('Удалить аудиозапись звонка и результаты анализа? Аудиофайл будет безвозвратно удален из хранилища S3.')) {
      return;
    }
    try {
      await deleteOrderAudio(editingOrderId);
      setAiSummary(null);
      setChatMessages([]);
      if (orderChatCacheRef.current) {
        delete orderChatCacheRef.current[editingOrderId];
      }
    } catch (err: any) {
      console.error('Failed to delete audio', err);
      alert(err.response?.data?.message || 'Не удалось удалить аудиозапись звонка');
    }
  };

  const getAnalysisResultsMap = (summary: OrderAiSummary | null): Record<string, string> => {
    if (!summary || !summary.analysisResults) return {};
    try {
      if (typeof summary.analysisResults === 'object') return summary.analysisResults as any;
      return JSON.parse(summary.analysisResults);
    } catch {
      return {};
    }
  };

  const handleSelectAiPreset = (preset: 'SUMMARY' | 'SALES_ADVICE' | 'CUSTOM') => {
    setAiPromptPreset(preset);
    if (preset === 'CUSTOM') return;

    const map = getAnalysisResultsMap(aiSummary);
    if (map[preset]) {
      if (aiSummary) {
        setAiSummary({ ...aiSummary, aiSummary: map[preset] });
      }
    } else {
      handleRunAiAnalysis(preset, undefined, false);
    }
  };

  const handleRunAiAnalysis = async (preset: 'SUMMARY' | 'SALES_ADVICE' | 'CUSTOM', promptOverride?: string, force = false) => {
    if (!editingOrderId) return;

    let promptToSend = SYSTEM_PROMPT_SUMMARY;
    if (preset === 'SALES_ADVICE') {
      promptToSend = SYSTEM_PROMPT_SALES_ADVICE;
    } else if (preset === 'CUSTOM') {
      promptToSend = promptOverride !== undefined ? promptOverride : (customSystemPrompt.trim() || SYSTEM_PROMPT_SUMMARY);
    }

    setAiPromptPreset(preset);

    const map = getAnalysisResultsMap(aiSummary);
    if (!force && preset !== 'CUSTOM' && map[preset]) {
      if (aiSummary) {
        setAiSummary({ ...aiSummary, aiSummary: map[preset] });
      }
      return;
    }

    setIsAnalyzingAudio(true);
    try {
      const updated = await analyzeAudioWithPrompt(editingOrderId, promptToSend, preset, force);
      setAiSummary(updated);
      getOrderAiUsage(editingOrderId).catch(() => {});
    } catch (err: any) {
      console.error("Failed to run AI analysis", err);
      alert(err.response?.data?.message || "Ошибка при анализе стенограммы");
    } finally {
      setIsAnalyzingAudio(false);
    }
  };

  const handleSendChatMessage = async (textToSend?: string) => {
    const text = (textToSend || chatInputText).trim();
    if (!text || !editingOrderId || isChatReplying) return;

    setChatInputText('');
    const userMsg: ChatMessage = {
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newHistory = [...chatMessages, userMsg];
    setChatMessages(newHistory);
    orderChatCacheRef.current[editingOrderId] = newHistory;
    setIsChatReplying(true);

    try {
      const res = await chatWithOrderAi(editingOrderId, SYSTEM_PROMPT_CHAT_ASSISTANT, chatMessages, text);
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        text: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        tokensUsed: res.tokensUsed,
        costRubles: res.costRubles
      };
      const finalHistory = res.messages && res.messages.length > 0 ? res.messages : [...newHistory, assistantMsg];
      setChatMessages(finalHistory);
      orderChatCacheRef.current[editingOrderId] = finalHistory;
      getOrderAiUsage(editingOrderId).catch(() => {});
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      console.error("Failed to chat with AI", err);
      const errorMsg: ChatMessage = {
        role: 'assistant',
        text: "⚠️ " + (err.response?.data?.message || "Не удалось получить ответ от AI. Попробуйте еще раз."),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      const finalHistory = [...newHistory, errorMsg];
      setChatMessages(finalHistory);
      orderChatCacheRef.current[editingOrderId] = finalHistory;
    } finally {
      setIsChatReplying(false);
    }
  };

  const currentMaterialsCost = useMemo(() => {
    if (!formData.materials || formData.materials.length === 0) return 0;
    const rawCost = formData.materials.reduce((sum, m) => {
      const mat = allMaterials.find(x => x.id === m.materialId);
      if (!mat || mat.type === 'SERVICE') return sum;
      const qty = typeof m.quantity === 'string' ? (parseFloat(m.quantity) || 0) : (m.quantity || 0);
      return sum + (mat.costPrice * qty);
    }, 0);
    return Math.round(rawCost);
  }, [formData.materials, allMaterials]);

  const currentTotalPrice = useMemo(() => {
    const prep = parseFloat(formData.prepayment || '0') || 0;
    const rem = parseFloat(formData.remainder || '0') || 0;
    return Math.round(prep + rem);
  }, [formData.prepayment, formData.remainder]);

  if (!isOpen) return null;

  return createPortal(
    <div className="order-drawer-overlay" onClick={handleRequestCloseModal}>
      <div className="order-drawer-content" onClick={e => e.stopPropagation()} style={{ maxWidth: orderModalTab === 'MEASUREMENT' || orderModalTab === 'CONTRACT' ? '920px' : '720px' }}>
        {/* Mobile Bottom Sheet Drag Handle */}
        <div className="order-drawer-drag-handle-wrapper" onClick={handleRequestCloseModal}>
          <div className="order-drawer-drag-handle" />
        </div>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: 1, minWidth: 0, paddingRight: '8px' }}>
            <h2 style={{ margin: 0, whiteSpace: 'nowrap' }}>
              {editingOrderId ? `Заявка #${editingOrderId}` : 'Новая заявка'}
            </h2>
            
            {/* Status Dropdown in Modal Header */}
            <div className="modal-header-status-badge">
              <span 
                className="dot" 
                style={{ 
                  backgroundColor: columns.find(c => c.id.toString() === formData.statusId)?.color || '#3b82f6',
                  flexShrink: 0
                }} 
              />
              <span className="modal-header-status-text">
                {columns.find(c => c.id.toString() === formData.statusId)?.name || columns[0]?.name || 'Статус'}
              </span>
              <select 
                value={formData.statusId}
                onChange={(e) => setFormData({...formData, statusId: e.target.value})}
                className="modal-header-status-select"
                title="Статус заявки"
              >
                {columns.map(col => (
                  <option key={col.id} value={col.id.toString()}>{col.name}</option>
                ))}
              </select>
              <ChevronDown className="modal-header-status-icon" size={14} />
            </div>
          </div>

          <button 
            type="button" 
            onClick={handleRequestCloseModal} 
            className="btn-icon"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          {/* Tabs Navigation */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid var(--glass-border)',
            padding: '0 12px',
            gap: '4px',
            background: 'rgba(255, 255, 255, 0.02)',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            flexShrink: 0
          }}>
            <button
              type="button"
              onClick={() => setOrderModalTab('MAIN')}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: orderModalTab === 'MAIN' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                color: orderModalTab === 'MAIN' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontWeight: orderModalTab === 'MAIN' ? 600 : 400,
                padding: '10px 14px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              <User size={15} /> Основное
            </button>
            <button
              type="button"
              onClick={() => setOrderModalTab('MEASUREMENT')}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: orderModalTab === 'MEASUREMENT' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                color: orderModalTab === 'MEASUREMENT' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontWeight: orderModalTab === 'MEASUREMENT' ? 600 : 400,
                padding: '10px 14px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              <Ruler size={15} /> Замер
            </button>
            {hasContractTemplates && (
              <button
                type="button"
                onClick={() => setOrderModalTab('CONTRACT')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: orderModalTab === 'CONTRACT' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  color: orderModalTab === 'CONTRACT' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontWeight: orderModalTab === 'CONTRACT' ? 600 : 400,
                  padding: '10px 14px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                <FileText size={15} /> Договор
              </button>
            )}
            <button
              type="button"
              onClick={() => setOrderModalTab('MATERIALS')}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: orderModalTab === 'MATERIALS' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                color: orderModalTab === 'MATERIALS' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontWeight: orderModalTab === 'MATERIALS' ? 600 : 400,
                padding: '10px 14px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              <Tag size={15} /> Материалы {formData.materials.length > 0 && <span style={{ background: 'var(--accent-glow)', color: 'var(--accent-primary)', borderRadius: '10px', padding: '1px 6px', fontSize: '0.72rem', fontWeight: 600 }}>{formData.materials.length}</span>}
            </button>
            <button
              type="button"
              onClick={() => setOrderModalTab('FILES')}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: orderModalTab === 'FILES' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                color: orderModalTab === 'FILES' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontWeight: orderModalTab === 'FILES' ? 600 : 400,
                padding: '10px 14px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              <Paperclip size={15} /> Файлы {(formData.attachments.length > 0 || pendingFiles.length > 0) && <span style={{ background: 'var(--accent-glow)', color: 'var(--accent-primary)', borderRadius: '10px', padding: '1px 6px', fontSize: '0.72rem', fontWeight: 600 }}>{formData.attachments.length + pendingFiles.length}</span>}
            </button>
            {hasAiSummary && editingOrderId && (
              <button
                type="button"
                onClick={() => setOrderModalTab('AI')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: orderModalTab === 'AI' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  color: orderModalTab === 'AI' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontWeight: orderModalTab === 'AI' ? 600 : 400,
                  padding: '10px 14px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                <Sparkles size={15} /> AI-Ассистент
              </button>
            )}
          </div>

          <div className="modal-body" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {/* MAIN TAB */}
            {orderModalTab === 'MAIN' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Client Select & Quick Create */}
                <div className="form-group" style={{ margin: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ margin: 0 }}>{t('kanban.modal.client') || 'Клиент'} *</label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setPassportScannerTarget('ORDER');
                          setIsPassportScannerOpen(true);
                        }}
                        className="btn btn-secondary"
                        style={{ padding: '3px 8px', fontSize: '0.75rem', height: '26px' }}
                        title="Сканировать паспорт (OCR)"
                      >
                        <Camera size={13} /> Скан паспорта
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsNewClientModalOpen(true)}
                        className="btn btn-secondary"
                        style={{ padding: '3px 8px', fontSize: '0.75rem', height: '26px' }}
                      >
                        <Plus size={13} /> {t('kanban.modal.quickClient') || 'Новый клиент'}
                      </button>
                    </div>
                  </div>
                  <ClientSearchSelect
                    value={formData.clientId}
                    clients={clients}
                    onChange={(clientId) => {
                      setFormData(prev => ({ ...prev, clientId }));
                    }}
                    onAddNewClient={() => setIsNewClientModalOpen(true)}
                    isWorker={isWorker}
                  />
                </div>

                {/* Address & DaData autosuggest */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label>{t('kanban.modal.address') || 'Адрес монтажа'}</label>
                  <AddressSuggestions
                    token={import.meta.env.VITE_DADATA_API_KEY || ''}
                    value={formData.address ? { value: formData.address, unrestricted_value: formData.address, data: {} as any } : undefined}
                    onChange={(suggestion) => {
                      if (suggestion) {
                        setFormData(prev => ({
                          ...prev,
                          address: suggestion.value,
                          entrance: (suggestion.data as any).entrance || prev.entrance,
                          floor: (suggestion.data as any).floor || prev.floor
                        }));
                      }
                    }}
                    inputProps={{
                      placeholder: t('kanban.modal.addressPlaceholder') || 'Город, улица, дом...',
                      className: 'input',
                      onChange: (e: any) => setFormData({ ...formData, address: e.target.value })
                    }}
                  />
                  {formData.address && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                      <a
                        href={getYandexMapsUrl(formData.address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                        style={{ padding: '3px 8px', fontSize: '0.72rem', height: '24px', textDecoration: 'none' }}
                      >
                        <MapPin size={12} /> Яндекс Карты
                      </a>
                      <a
                        href={get2GisUrl(formData.address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                        style={{ padding: '3px 8px', fontSize: '0.72rem', height: '24px', textDecoration: 'none' }}
                      >
                        <MapPin size={12} /> 2ГИС
                      </a>
                    </div>
                  )}
                </div>

                {/* Entrance & Floor */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>{t('kanban.modal.entrance') || 'Подъезд'}</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.entrance}
                      onChange={(e) => setFormData({ ...formData, entrance: e.target.value })}
                      placeholder="Напр. 2"
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>{t('kanban.modal.floor') || 'Этаж'}</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.floor}
                      onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                      placeholder="Напр. 5"
                    />
                  </div>
                </div>

                {/* Order Number & Description */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>{t('kanban.modal.orderNumber') || 'Номер договора/заявки'}</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.orderNumber}
                      onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                      placeholder="Напр. 104-М"
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>{t('kanban.modal.description') || 'Описание / Примечание'}</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Комментарий к заказу..."
                    />
                  </div>
                </div>

                {/* Assignees / Roles */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>{t('kanban.modal.assignee') || 'Ответственный менеджер'}</label>
                    <EmployeeSearchSelect
                      value={formData.assigneeId}
                      employees={employees}
                      onChange={(id) => setFormData({ ...formData, assigneeId: id })}
                      placeholder="Выберите менеджера..."
                      isWorker={isWorker}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>{t('kanban.modal.measurer') || 'Замерщик'}</label>
                    <EmployeeSearchSelect
                      value={formData.measurerId}
                      employees={employees}
                      onChange={(id) => setFormData({ ...formData, measurerId: id })}
                      placeholder="Выберите замерщика..."
                      isWorker={isWorker}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>{t('kanban.modal.installer') || 'Монтажник'}</label>
                    <EmployeeSearchSelect
                      value={formData.installedById}
                      employees={employees}
                      onChange={(id) => setFormData({ ...formData, installedById: id })}
                      placeholder="Выберите монтажника..."
                      isWorker={isWorker}
                    />
                  </div>
                </div>

                {/* Dates: Measurement & Installation */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>{t('kanban.modal.measurementDate') || 'Дата и время замера'}</label>
                    <input
                      type="datetime-local"
                      className="input"
                      value={formData.measurementDate}
                      onChange={(e) => setFormData({ ...formData, measurementDate: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>{t('kanban.modal.installationDate') || 'Дата монтажа'}</label>
                    <input
                      type="date"
                      className="input"
                      value={formData.installationDate}
                      onChange={(e) => setFormData({ ...formData, installationDate: e.target.value })}
                    />
                  </div>
                </div>

                {/* Finances: Total, Prepayment, Remainder */}
                <div style={{ 
                  background: 'var(--glass-bg)', 
                  border: '1px solid var(--glass-border)', 
                  borderRadius: '12px', 
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Финансовые расчеты</span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                      Итого: {currentTotalPrice.toLocaleString('ru-RU')} ₽
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <label style={{ margin: 0, fontSize: '0.8rem' }}>Предоплата (₽)</label>
                        <label style={{ margin: 0, fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={formData.prepaymentPaid}
                            onChange={(e) => setFormData({ ...formData, prepaymentPaid: e.target.checked })}
                          />
                          Оплачено
                        </label>
                      </div>
                      <input
                        type="number"
                        className="input"
                        value={formData.prepayment}
                        onChange={(e) => setFormData({ ...formData, prepayment: e.target.value })}
                        placeholder="0"
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <label style={{ margin: 0, fontSize: '0.8rem' }}>Остаток (₽)</label>
                        <label style={{ margin: 0, fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={formData.remainderPaid}
                            onChange={(e) => setFormData({ ...formData, remainderPaid: e.target.checked })}
                          />
                          Оплачено
                        </label>
                      </div>
                      <input
                        type="number"
                        className="input"
                        value={formData.remainder}
                        onChange={(e) => setFormData({ ...formData, remainder: e.target.value })}
                        placeholder="0"
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.8rem', marginBottom: '4px' }}>Оплата монтажнику (₽)</label>
                      <input
                        type="number"
                        className="input"
                        value={formData.installationPrice}
                        onChange={(e) => setFormData({ ...formData, installationPrice: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Reminders section for existing order */}
                {editingOrderId && !isWorker && (
                  <div style={{ marginTop: '4px' }}>
                    <OrderRemindersSection orderId={editingOrderId} employees={employees} />
                  </div>
                )}
              </div>
            )}

            {/* MEASUREMENT TAB */}
            {orderModalTab === 'MEASUREMENT' && (
              <div style={{ padding: '4px 0' }}>
                <MeasurementWizard
                  orderId={editingOrderId || undefined}
                  materials={allMaterials}
                  canViewFinances={!isWorker}
                />
              </div>
            )}

            {/* CONTRACT TAB */}
            {orderModalTab === 'CONTRACT' && hasContractTemplates && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Генерация договора и акта</h3>
                    <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Заполните параметры полотна и работ для автоматического создания DOCX/PDF документов.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleStartGenerateContract}
                    className="btn btn-primary"
                    style={{ height: '38px', gap: '6px' }}
                  >
                    <Download size={15} /> Сформировать договор
                  </button>
                </div>

                {/* Contract Parameters */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.78rem' }}>Площадь (м²)</label>
                    <input
                      type="text"
                      className="input"
                      value={getContractParams().area || ''}
                      onChange={(e) => updateContractParam('area', e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.78rem' }}>Периметр (м)</label>
                    <input
                      type="text"
                      className="input"
                      value={getContractParams().perimeter || ''}
                      onChange={(e) => updateContractParam('perimeter', e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.78rem' }}>Полотен (шт)</label>
                    <input
                      type="text"
                      className="input"
                      value={getContractParams().canvasesCount || ''}
                      onChange={(e) => updateContractParam('canvasesCount', e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.78rem' }}>Вставка (м)</label>
                    <input
                      type="text"
                      className="input"
                      value={getContractParams().insertLength || ''}
                      onChange={(e) => updateContractParam('insertLength', e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.78rem' }}>Светильники (шт)</label>
                    <input
                      type="text"
                      className="input"
                      value={getContractParams().lightsCount || ''}
                      onChange={(e) => updateContractParam('lightsCount', e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.78rem' }}>Артикул полотна</label>
                    <input
                      type="text"
                      className="input"
                      value={getContractParams().canvasArticle || ''}
                      onChange={(e) => updateContractParam('canvasArticle', e.target.value)}
                    />
                  </div>
                </div>

                {/* Act Checklist */}
                <div style={{
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '12px',
                  padding: '14px'
                }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: '0.88rem', fontWeight: 600 }}>Чек-лист выполненных работ (для Акта)</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '8px' }}>
                    {getContractParams().actChecklist?.map(item => (
                      <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={() => toggleActItem(item.id)}
                        />
                        <span>{item.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* MATERIALS TAB */}
            {orderModalTab === 'MATERIALS' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Расходные материалы со склада</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Себестоимость: <strong style={{ color: 'var(--text-primary)' }}>{currentMaterialsCost.toLocaleString('ru-RU')} ₽</strong>
                  </span>
                </div>

                {/* Materials List */}
                {formData.materials.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    Материалы пока не добавлены
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {formData.materials.map((m, idx) => {
                      const mat = allMaterials.find(x => x.id === m.materialId);
                      const unitPrice = mat?.costPrice || 0;
                      const qty = typeof m.quantity === 'string' ? (parseFloat(m.quantity) || 0) : (m.quantity || 0);
                      const rowTotal = Math.round(unitPrice * qty);

                      return (
                        <div key={idx} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          background: 'var(--glass-bg)',
                          border: '1px solid var(--glass-border)',
                          borderRadius: '8px',
                          padding: '8px 12px'
                        }}>
                          <span style={{ flex: 1, minWidth: 0, fontSize: '0.85rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {mat?.name || `Материал #${m.materialId}`}
                          </span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            {unitPrice.toLocaleString('ru-RU')} ₽/{mat?.unit || 'шт'}
                          </span>
                          <input
                            type="number"
                            className="input"
                            style={{ width: '80px', height: '32px', padding: '4px 8px', textAlign: 'center' }}
                            value={m.quantity}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFormData(prev => ({
                                ...prev,
                                materials: prev.materials.map((item, i) => i === idx ? { ...item, quantity: val as any } : item)
                              }));
                            }}
                          />
                          <span style={{ width: '80px', textAlign: 'right', fontSize: '0.85rem', fontWeight: 600 }}>
                            {rowTotal.toLocaleString('ru-RU')} ₽
                          </span>
                          <button
                            type="button"
                            className="btn-icon"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                materials: prev.materials.filter((_, i) => i !== idx)
                              }));
                            }}
                            style={{ color: 'var(--danger)' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add Material Select */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <select
                    className="select"
                    style={{ flex: 1 }}
                    onChange={(e) => {
                      const matId = parseInt(e.target.value);
                      if (!matId) return;
                      const exists = formData.materials.some(m => m.materialId === matId);
                      if (!exists) {
                        setFormData(prev => ({
                          ...prev,
                          materials: [...prev.materials, { materialId: matId, quantity: 1 }]
                        }));
                      }
                      e.target.value = '';
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>+ Добавить материал со склада...</option>
                    {allMaterials.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.quantityInStock} {m.unit} на складе, {m.costPrice} ₽)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* FILES TAB */}
            {orderModalTab === 'FILES' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Прикрепленные файлы и документы</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setActionSheetMode('ACT');
                        if (hasDocumentScanner) {
                          setIsActActionSheetOpen(true);
                        } else if (actFileInputRef.current) {
                          actFileInputRef.current.click();
                        }
                      }}
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '0.78rem', height: '30px' }}
                    >
                      <FileCheck size={14} /> + Загрузить Акт
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActionSheetMode('GENERAL');
                        if (hasDocumentScanner) {
                          setIsActActionSheetOpen(true);
                        } else if (generalFileInputRef.current) {
                          generalFileInputRef.current.click();
                        }
                      }}
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '0.78rem', height: '30px' }}
                    >
                      <Paperclip size={14} /> + Добавить файл
                    </button>
                    <input
                      ref={actFileInputRef}
                      type="file"
                      style={{ display: 'none' }}
                      onChange={handleFileUpload}
                    />
                    <input
                      ref={generalFileInputRef}
                      type="file"
                      style={{ display: 'none' }}
                      onChange={handleFileUpload}
                    />
                  </div>
                </div>

                {/* Uploaded attachments list */}
                {formData.attachments.length === 0 && pendingFiles.length === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    К этой заявке пока не прикреплены файлы
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {formData.attachments.map(att => {
                      const isAct = isActFile(att.fileName, att.isAct);
                      const isEditingThis = editingAttachmentId === att.id;

                      return (
                        <div key={att.id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          background: isAct ? 'rgba(34, 197, 94, 0.08)' : 'var(--glass-bg)',
                          border: isAct ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid var(--glass-border)',
                          borderRadius: '8px',
                          padding: '8px 12px'
                        }}>
                          <FileText size={18} style={{ color: isAct ? '#22c55e' : 'var(--accent-primary)', flexShrink: 0 }} />
                          {isEditingThis ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                              <input
                                type="text"
                                className="input"
                                style={{ height: '30px', padding: '2px 8px', fontSize: '0.85rem' }}
                                value={editingAttachmentName}
                                onChange={(e) => setEditingAttachmentName(e.target.value)}
                                autoFocus
                              />
                              <button
                                type="button"
                                className="btn btn-primary"
                                style={{ height: '30px', padding: '0 8px', fontSize: '0.75rem' }}
                                onClick={() => handleSaveRenameAttachment(att.id)}
                                disabled={renamingAttachment}
                              >
                                <Check size={14} />
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ height: '30px', padding: '0 8px', fontSize: '0.75rem' }}
                                onClick={() => setEditingAttachmentId(null)}
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {att.fileName}
                                </span>
                                {isAct && (
                                  <span style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                    АКТ
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {!isEditingThis && (
                            <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                              {isViewableInBrowser(att.fileName, att.contentType) && (
                                <button
                                  type="button"
                                  className="btn-icon"
                                  onClick={() => handleOpenAttachment(att)}
                                  title="Просмотреть"
                                >
                                  <Eye size={15} />
                                </button>
                              )}
                              <button
                                type="button"
                                className="btn-icon"
                                onClick={() => handleDownloadAttachment(att)}
                                title="Скачать"
                              >
                                <Download size={15} />
                              </button>
                              <button
                                type="button"
                                className="btn-icon"
                                onClick={() => handleStartRenameAttachment(att)}
                                title="Переименовать"
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                type="button"
                                className="btn-icon"
                                onClick={() => handleToggleAttachmentIsAct(att)}
                                title={isAct ? "Снять метку Акта" : "Пометить как Акт"}
                                style={{ color: isAct ? '#22c55e' : undefined }}
                              >
                                <FileCheck size={15} />
                              </button>
                              <button
                                type="button"
                                className="btn-icon"
                                onClick={() => handleDeleteAttachment(att.id)}
                                title="Удалить"
                                style={{ color: 'var(--danger)' }}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Pending files */}
                    {pendingFiles.map((pf, idx) => (
                      <div key={`pf-${idx}`} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        background: 'var(--glass-bg)',
                        border: '1px dashed var(--accent-primary)',
                        borderRadius: '8px',
                        padding: '8px 12px'
                      }}>
                        <FileText size={18} style={{ color: 'var(--accent-primary)' }} />
                        <span style={{ flex: 1, fontSize: '0.85rem' }}>{pf.name} (будет загружен при сохранении)</span>
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => removePendingFile(idx)}
                          style={{ color: 'var(--danger)' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* AI TAB */}
            {orderModalTab === 'AI' && hasAiSummary && editingOrderId && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', height: '100%' }}>
                {/* Audio Recording Section */}
                <div style={{
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '12px',
                  padding: '14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'var(--accent-glow)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent-primary)'
                    }}>
                      <Mic size={18} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>Запись телефонного звонка</h4>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Загрузите MP3/WAV звонка с клиентом
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => audioFileInputRef.current?.click()}
                      disabled={uploadingAudio}
                      style={{ height: '32px', fontSize: '0.78rem', gap: '4px' }}
                    >
                      <Plus size={14} /> Загрузить аудио
                    </button>
                    <button
                      type="button"
                      className="btn-icon"
                      onClick={handleDeleteAudio}
                      style={{ color: 'var(--danger)' }}
                      title="Удалить запись"
                    >
                      <Trash2 size={16} />
                    </button>
                    <input
                      ref={audioFileInputRef}
                      type="file"
                      accept="audio/*"
                      style={{ display: 'none' }}
                      onChange={handleAudioUpload}
                    />
                  </div>
                </div>

                {/* Sub-tabs: Analysis vs Chat */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setAiSubTab('ANALYSIS')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      borderBottom: aiSubTab === 'ANALYSIS' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                      color: aiSubTab === 'ANALYSIS' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      padding: '8px 12px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Анализ стенограммы
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiSubTab('CHAT')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      borderBottom: aiSubTab === 'CHAT' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                      color: aiSubTab === 'CHAT' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      padding: '8px 12px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Чат с AI-ассистентом
                  </button>
                </div>

                {/* ANALYSIS SUB-TAB */}
                {aiSubTab === 'ANALYSIS' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className={`btn ${aiPromptPreset === 'SUMMARY' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => handleSelectAiPreset('SUMMARY')}
                        style={{ fontSize: '0.78rem', height: '30px' }}
                      >
                        Сводка и договоренности
                      </button>
                      <button
                        type="button"
                        className={`btn ${aiPromptPreset === 'SALES_ADVICE' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => handleSelectAiPreset('SALES_ADVICE')}
                        style={{ fontSize: '0.78rem', height: '30px' }}
                      >
                        Советы по дожиму сделки
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => handleRunAiAnalysis(aiPromptPreset, undefined, true)}
                        disabled={isAnalyzingAudio}
                        style={{ fontSize: '0.78rem', height: '30px', gap: '4px' }}
                      >
                        <RefreshCw size={13} className={isAnalyzingAudio ? 'animate-spin' : ''} /> Пересчитать
                      </button>
                    </div>

                    <div style={{
                      background: 'var(--glass-bg)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '10px',
                      padding: '14px',
                      minHeight: '160px',
                      fontSize: '0.85rem',
                      lineHeight: '1.5',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {isAnalyzingAudio ? (
                        <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px', display: 'block' }} />
                          YandexGPT анализирует диалог...
                        </div>
                      ) : (aiSummary?.aiSummary || 'Нет результатов анализа. Выберите пресет для запуска.')}
                    </div>
                  </div>
                )}

                {/* CHAT SUB-TAB */}
                {aiSubTab === 'CHAT' && (
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '300px' }}>
                    <div style={{
                      flex: 1,
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      padding: '10px',
                      background: 'var(--glass-bg)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '10px',
                      maxHeight: '340px'
                    }}>
                      {chatMessages.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                          Задайте вопрос AI по содержанию этого звонка или заказу
                        </div>
                      ) : (
                        chatMessages.map((msg, idx) => (
                          <div
                            key={idx}
                            style={{
                              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                              maxWidth: '85%',
                              background: msg.role === 'user' ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.06)',
                              color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                              padding: '8px 12px',
                              borderRadius: '10px',
                              fontSize: '0.85rem',
                              lineHeight: '1.4'
                            }}
                          >
                            <div>{msg.text}</div>
                            <div style={{ fontSize: '0.68rem', opacity: 0.7, textAlign: 'right', marginTop: '2px' }}>
                              {msg.timestamp}
                            </div>
                          </div>
                        ))
                      )}
                      <div ref={chatBottomRef} />
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <input
                        type="text"
                        className="input"
                        placeholder="Напишите вопрос по диалогу с клиентом..."
                        value={chatInputText}
                        onChange={(e) => setChatInputText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendChatMessage();
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => handleSendChatMessage()}
                        disabled={isChatReplying || !chatInputText.trim()}
                        style={{ height: '40px', padding: '0 14px' }}
                      >
                        <Send size={15} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="modal-actions" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 20px',
            borderTop: '1px solid var(--glass-border)',
            background: 'var(--glass-bg)',
            flexShrink: 0
          }}>
            <div>
              {editingOrderId && (
                <button
                  type="button"
                  onClick={handleDeleteOrder}
                  className="btn btn-ghost"
                  style={{ color: 'var(--danger)', gap: '6px' }}
                >
                  <Trash2 size={15} /> Удалить
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleRequestCloseModal}
              >
                Отмена
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ gap: '6px' }}
              >
                <Check size={16} />
                {editingOrderId ? (t('kanban.modal.save') || 'Сохранить') : (t('kanban.createOrder') || 'Создать заявку')}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Unsaved Changes Confirmation Modal */}
      {isUnsavedConfirmOpen && createPortal(
        <div className="modal-overlay dialog-overlay" style={{ zIndex: 100060 }} onClick={() => setIsUnsavedConfirmOpen(false)}>
          <div className="modal-content dialog-content animate-fade-in" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f59e0b',
                flexShrink: 0
              }}>
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Несохраненные изменения
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  В заявке есть несохраненные данные. Сохранить их перед закрытием?
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmSaveAndClose}
                style={{ width: '100%', justifyContent: 'center', height: '42px', fontWeight: 600 }}
              >
                <Check size={16} /> Сохранить изменения
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleConfirmDiscardAndClose}
                style={{ width: '100%', justifyContent: 'center', height: '40px', color: 'var(--danger)' }}
              >
                Не сохранять
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setIsUnsavedConfirmOpen(false)}
                style={{ width: '100%', justifyContent: 'center', height: '38px', color: 'var(--text-secondary)' }}
              >
                Продолжить редактирование
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Quick Create Client Modal */}
      <QuickClientModal
        isOpen={isNewClientModalOpen}
        clientType={newClientType}
        setClientType={setNewClientType}
        name={newClientName}
        setName={setNewClientName}
        phone={newClientPhone}
        setPhone={setNewClientPhone}
        whatsapp={newClientWhatsapp}
        setWhatsapp={setNewClientWhatsapp}
        telegram={newClientTelegram}
        setTelegram={setNewClientTelegram}
        inn={newClientInn}
        setInn={setNewClientInn}
        contactPerson={newClientContactPerson}
        setContactPerson={setNewClientContactPerson}
        leadSource={newClientLeadSource}
        setLeadSource={setNewClientLeadSource}
        customLeadSource={newClientCustomLeadSource}
        setCustomLeadSource={setNewClientCustomLeadSource}
        creatingClient={creatingClient}
        onClose={() => {
          setIsNewClientModalOpen(false);
          setNewClientType('INDIVIDUAL');
          setNewClientName('');
          setNewClientPhone('');
          setNewClientInn('');
          setNewClientContactPerson('');
          setNewClientLeadSource('');
          setNewClientCustomLeadSource('');
        }}
        onOpenPassportScanner={() => {
          setPassportScannerTarget('NEW_CLIENT');
          setIsPassportScannerOpen(true);
        }}
        onSubmit={handleQuickCreateClient}
      />

      {/* Contract Data Prompt Modal */}
      <ContractPromptModal
        isOpen={isContractPromptOpen}
        contractPromptData={contractPromptData}
        setContractPromptData={setContractPromptData}
        contractPromptLoading={contractPromptLoading}
        onClose={() => setIsContractPromptOpen(false)}
        onOpenPassportScanner={() => {
          setPassportScannerTarget('CONTRACT');
          setIsPassportScannerOpen(true);
        }}
        onSubmit={handleSavePromptAndGenerate}
      />

      {/* Act & General Upload Mobile Action Sheet */}
      {hasDocumentScanner && (
        <>
          <ActUploadActionSheet
            isOpen={isActActionSheetOpen}
            onClose={() => setIsActActionSheetOpen(false)}
            mode={actionSheetMode}
            hasAct={Boolean(formData.attachments.find(a => isActFile(a.fileName, a.isAct)) || pendingFiles.find(f => isActFile(f.name)))}
            onSelectScan={() => {
              setDocScannerIsAct(actionSheetMode === 'ACT');
              setIsDocScannerOpen(true);
            }}
            onSelectFile={() => {
              if (actionSheetMode === 'ACT') {
                if (actFileInputRef.current) {
                  actFileInputRef.current.click();
                }
              } else {
                if (generalFileInputRef.current) {
                  generalFileInputRef.current.click();
                }
              }
            }}
          />

          <DocumentScannerModal
            isOpen={isDocScannerOpen}
            onClose={() => setIsDocScannerOpen(false)}
            orderId={editingOrderId || undefined}
            isAct={docScannerIsAct}
            onScanComplete={(scannedFile) => {
              if (docScannerIsAct) {
                handleUploadDirectActFile(scannedFile);
              } else {
                handleUploadDirectGeneralFile(scannedFile);
              }
            }}
          />
        </>
      )}

      {/* Passport OCR Scanner Modal */}
      <PassportScannerModal
        isOpen={isPassportScannerOpen}
        onClose={() => setIsPassportScannerOpen(false)}
        showInstallationAddressOption={true}
        currentInstallationAddress={formData.address || contractPromptData.installationAddress}
        onApply={async (result: PassportApplyResult) => {
          if (passportScannerTarget === 'CONTRACT') {
            setContractPromptData(prev => ({
              ...prev,
              name: result.name || prev.name,
              birthDate: result.birthDate || prev.birthDate,
              passportSeriesNumber: result.passportSeriesNumber || prev.passportSeriesNumber,
              passportIssuedBy: result.passportIssuedBy || prev.passportIssuedBy,
              passportIssuedDate: result.passportIssuedDate || prev.passportIssuedDate,
              passportDepartmentCode: result.passportDepartmentCode || prev.passportDepartmentCode,
              registrationAddress: result.registrationAddress || prev.registrationAddress,
              installationAddress: result.installationAddress || prev.installationAddress
            }));

            if (result.installationAddress) {
              setFormData(prev => ({ ...prev, address: result.installationAddress! }));
            }

            if (result.saveScans && result.scanFiles.length > 0 && editingOrderId) {
              for (const file of result.scanFiles) {
                try {
                  const att = await uploadAttachment(editingOrderId, file);
                  setFormData(prev => ({ ...prev, attachments: [...prev.attachments, att] }));
                } catch (attErr) {
                  console.warn('Failed to attach passport scan file to order', attErr);
                }
              }
            }
          } else if (passportScannerTarget === 'NEW_CLIENT') {
            if (result.name) setNewClientName(result.name);
            if (result.installationAddress || result.registrationAddress) {
              setFormData(prev => ({ ...prev, address: result.installationAddress || result.registrationAddress }));
            }
          }
        }}
      />
    </div>,
    document.body
  );
};
