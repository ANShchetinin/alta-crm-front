import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronDown,
  Paperclip,
  Download,
  Eye,
  Mic,
  X,
  Tag,
  User,
  Ruler,
  FileText,
  AlertCircle,
  AlertTriangle,
  FileCheck,
  Check,
  CheckCircle2,
  Camera,
  Sparkles,
  Send,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Building2,
  Phone,
  MessageCircle,
  MessageSquare,
  Users,
  Wrench,
  Bot,
  RotateCcw,
  Copy,
  Coins,
  FileDown
} from 'lucide-react';
import { AddressSuggestions } from 'react-dadata';
import 'react-dadata/dist/react-dadata.css';
import { useTranslation } from 'react-i18next';
import {
  getOrderStatuses,
  getOrders,
  createOrder,
  updateOrder,
  completeOrder,
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
  clearOrderAiChat,
  getNextOrderNumber,
  type OrderStatus,
  type Order,
  type OrderMaterial,
  type OrderAttachment,
  type OrderAiSummary,
  type ContractParams,
  type ChatMessage
} from '../../../api/kanban';
import { getOrderAiUsage, type OrderAiCostDto } from '../../../api/aiUsage';
import { SYSTEM_PROMPT_SUMMARY, SYSTEM_PROMPT_SALES_ADVICE, SYSTEM_PROMPT_CHAT_ASSISTANT } from '../../../constants/aiPrompts';
import { getClients, createClient, updateClient, type Client } from '../../../api/clients';
import { getContractTemplateStatus, type ContractTemplateStatus } from '../../../api/settings';
import { getMaterials, type Material } from '../../../api/storage';
import { getEmployees, type Employee } from '../../../api/employees';
import { useAppStore } from '../../../store/useAppStore';
import { useAuthStore } from '../../../store/useAuthStore';
import { useFeature } from '../../../hooks/useFeatureToggle';
import { formatDateTimeInTimezone } from '../../../utils/dateUtils';
import { getYandexMapsUrl, get2GisUrl } from '../../../utils/navigation';
import { OrderRemindersSection } from '../../../components/OrderRemindersSection';
import { DocumentScannerModal } from '../../../components/DocumentScannerModal';
import { PassportScannerModal, type PassportApplyResult } from '../../../components/PassportScannerModal';
import { ActUploadActionSheet } from '../../../components/ActUploadActionSheet';
import { MeasurementWizard } from '../../../components/MeasurementWizard';
import { AttachmentPreviewModal, type PreviewAttachmentData } from '../../../components/AttachmentPreviewModal';
import { ClientSearchSelect } from './ClientSearchSelect';
import { EmployeeSearchSelect } from './EmployeeSearchSelect';
import { QuickClientModal } from './QuickClientModal';
import { ContractPromptModal } from './ContractPromptModal';
import { DEFAULT_ACT_CHECKLIST, mergeActChecklist, isActFile } from '../constants';
import { useOrderDrawerStore } from '../../../store/useOrderDrawerStore';

const getAvatarGradient = (name: string) => {
  const gradients = [
    'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    'linear-gradient(135deg, #10b981 0%, #047857 100%)',
    'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
    'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
    'linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
};

const getClientInitials = (name: string) => {
  if (!name) return 'КЛ';
  const parts = name.trim().split(/\\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const getWhatsAppLink = (phone: string) => {
  const digits = phone.replace(/[^\\d]/g, '');
  return `https://wa.me/${digits}`;
};

const getTelegramLink = (usernameOrPhone: string) => {
  const clean = usernameOrPhone.trim().replace(/^@/, '');
  if (/^\\+?\\d+$/.test(clean)) {
    return `https://t.me/+${clean.replace(/[^\\d]/g, '')}`;
  }
  return `https://t.me/${clean}`;
};

export const OrderDrawer: React.FC = () => {
  const { t } = useTranslation();
  const role = useAuthStore(state => state.role);
  const isWorker = role === 'WORKER';
  const canAccessMeasurements = useAuthStore(state => state.canAccessMeasurements);
  const hasAiSummary = useFeature('AI_SUMMARY');
  const hasContractTemplates = useFeature('CONTRACT_TEMPLATES');
  const hasDocumentScanner = useFeature('DOCUMENT_SCANNER');
  const { fetchLowStockMaterials, tenantSettings } = useAppStore();

  const { isOpen, orderId: editingOrderId, activeTab: orderModalTab, setActiveTab: setOrderModalTab, closeOrder } = useOrderDrawerStore();

  const [columns, setColumns] = useState<OrderStatus[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [allMaterials, setAllMaterials] = useState<Material[]>([]);
  const [templateStatus, setTemplateStatus] = useState<ContractTemplateStatus | null>(null);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);

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
  const [uploadingFile, setUploadingFile] = useState(false);
  const [editingAttachmentId, setEditingAttachmentId] = useState<number | null>(null);
  const [editingAttachmentName, setEditingAttachmentName] = useState('');
  const [renamingAttachment, setRenamingAttachment] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<PreviewAttachmentData | null>(null);
  const [openingAttachmentId, setOpeningAttachmentId] = useState<number | null>(null);

  const [isActActionSheetOpen, setIsActActionSheetOpen] = useState(false);
  const [actionSheetMode, setActionSheetMode] = useState<'ACT' | 'GENERAL'>('ACT');
  const [isDocScannerOpen, setIsDocScannerOpen] = useState(false);
  const [docScannerIsAct, setDocScannerIsAct] = useState(true);
  const actFileInputRef = useRef<HTMLInputElement | null>(null);
  const generalFileInputRef = useRef<HTMLInputElement | null>(null);

  // AI Assistant & Audio Analysis State
  const [aiSummary, setAiSummary] = useState<OrderAiSummary | null>(null);
  const [orderAiCost, setOrderAiCost] = useState<OrderAiCostDto | null>(null);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const audioFileInputRef = useRef<HTMLInputElement | null>(null);
  const [aiSubTab, setAiSubTab] = useState<'ANALYSIS' | 'CHAT'>('ANALYSIS');
  const [aiPromptPreset, setAiPromptPreset] = useState<'SUMMARY' | 'SALES_ADVICE' | 'CUSTOM'>('SUMMARY');
  const [customSystemPrompt, setCustomSystemPrompt] = useState('');
  const [isAnalyzingAudio, setIsAnalyzingAudio] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInputText, setChatInputText] = useState('');
  const [isChatReplying, setIsChatReplying] = useState(false);
  const [copyFeedbackText, setCopyFeedbackText] = useState<string | null>(null);
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

  // Mobile Swipe-Down to Dismiss with Smooth Animation
  const [sheetTranslateY, setSheetTranslateY] = useState(0);
  const [isDraggingSheet, setIsDraggingSheet] = useState(false);
  const [isSheetClosing, setIsSheetClosing] = useState(false);
  const touchSheetStartYRef = useRef<number | null>(null);
  const currentTranslateYRef = useRef<number>(0);

  const isMobile = useMemo(() => {
    return window.innerWidth <= 768 || window.matchMedia('(max-width: 768px)').matches;
  }, []);

  // Load auxiliary data when opening drawer
  useEffect(() => {
    if (!isOpen) return;

    const loadAuxData = async () => {
      try {
        const [statuses, clientsData, materialsData, employeesData, templateStatusData] = await Promise.all([
          getOrderStatuses().catch(() => []),
          !isWorker ? getClients().catch(() => []) : Promise.resolve([]),
          !isWorker ? getMaterials().catch(() => []) : Promise.resolve([]),
          !isWorker ? getEmployees().catch(() => []) : Promise.resolve([]),
          !isWorker && hasContractTemplates ? getContractTemplateStatus().catch(() => null) : Promise.resolve(null)
        ]);
        const sortedColumns = statuses.sort((a, b) => a.sortOrder - b.sortOrder);
        setColumns(sortedColumns);
        setClients(clientsData);
        setAllMaterials(materialsData);
        setEmployees(employeesData);
        setTemplateStatus(templateStatusData);
      } catch (err) {
        console.error("Failed to load auxiliary data in OrderDrawer", err);
      }
    };

    loadAuxData();
  }, [isOpen, isWorker, hasContractTemplates]);

  // Load order data when orderId changes
  useEffect(() => {
    if (!isOpen) return;

    if (editingOrderId) {
      getOrders().then(orders => {
        const order = orders.find(o => o.id === editingOrderId);
        if (order) {
          setCurrentOrder(order);
          populateOrderData(order);
        }
      }).catch(err => {
        console.error("Failed to load order details", err);
      });
    } else {
      setCurrentOrder(null);
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
    setOrderAiCost(null);
    setChatMessages([]);
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
      discount: '',
      handoverDate: '',
      specItems: [],
      actChecklist: DEFAULT_ACT_CHECKLIST.map(item => ({ ...item, checked: false }))
    };

    const initialData = {
      clientId: order.clientId ? order.clientId.toString() : '',
      statusId: order.statusId ? order.statusId.toString() : '',
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
      totalPrice: tot > 0 ? tot.toString() : '',
      prepayment: prep > 0 ? prep.toString() : '',
      prepaymentPaid: !!order.prepaymentPaid,
      prepaymentPaidAt: order.prepaymentPaidAt || '',
      remainder: rem > 0 ? rem.toString() : '',
      remainderPaid: !!order.remainderPaid,
      remainderPaidAt: order.remainderPaidAt || '',
      installationPrice: order.installationPrice ? order.installationPrice.toString() : '',
      installationDate: order.installationDate ? order.installationDate.slice(0, 10) : '',
      measurementDate: order.measurementDate ? order.measurementDate.slice(0, 16) : '',
      contractParams: initialContractParams,
      materials: order.materials || [],
      attachments: order.attachments || []
    };

    setFormData(initialData);
    setInitialFormDataJson(JSON.stringify({ formData: initialData, pendingFilesCount: 0 }));
    setPendingFiles([]);

    if (hasAiSummary && order.id) {
      getAiSummary(order.id).then(summary => {
        setAiSummary(summary);
      }).catch(() => {
        setAiSummary(null);
      });

      getOrderAiUsage(order.id).then(cost => {
        setOrderAiCost(cost);
      }).catch(() => {
        setOrderAiCost(null);
      });

      if (orderChatCacheRef.current[order.id]) {
        setChatMessages(orderChatCacheRef.current[order.id]);
      } else {
        setChatMessages([]);
      }
    }
  };

  const isDirty = useMemo(() => {
    if (!initialFormDataJson) return false;
    const currentJson = JSON.stringify({ formData, pendingFilesCount: pendingFiles.length });
    return currentJson !== initialFormDataJson;
  }, [formData, pendingFiles.length, initialFormDataJson]);

  const smoothClose = () => {
    setIsSheetClosing(true);
    setSheetTranslateY(window.innerHeight || 800);
    setTimeout(() => {
      closeOrder();
      setIsSheetClosing(false);
      setSheetTranslateY(0);
    }, 240);
  };

  const handleRequestCloseModal = () => {
    if (isDirty) {
      setIsUnsavedConfirmOpen(true);
    } else {
      smoothClose();
    }
  };

  const handleConfirmDiscardAndClose = () => {
    setIsUnsavedConfirmOpen(false);
    smoothClose();
  };

  const handleCancelChanges = () => {
    if (initialFormDataJson) {
      try {
        const parsed = JSON.parse(initialFormDataJson);
        if (parsed && parsed.formData) {
          setFormData(parsed.formData);
        }
      } catch (err) {
        console.error("Failed to reset form data", err);
      }
    }
    setPendingFiles([]);
    smoothClose();
  };

  const handleConfirmSaveAndClose = async () => {
    setIsUnsavedConfirmOpen(false);
    await doSaveOrder(true);
  };

  const getContractParams = (): ContractParams => {
    return formData.contractParams || {
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

  const updateContractParam = (field: keyof ContractParams, value: any) => {
    setFormData(prev => ({
      ...prev,
      contractParams: {
        ...getContractParams(),
        [field]: value
      }
    }));
  };

  const toggleActItem = (itemId: string) => {
    const curParams = getContractParams();
    const updatedChecklist = (curParams.actChecklist || DEFAULT_ACT_CHECKLIST).map(item => {
      if (String(item.id) === String(itemId)) {
        return { ...item, checked: !item.checked };
      }
      return item;
    });
    updateContractParam('actChecklist', updatedChecklist);
  };

  const currentMaterialsCost = useMemo(() => {
    return formData.materials.reduce((sum, item) => sum + (item.fixedCostPrice || 0) * item.quantity, 0);
  }, [formData.materials]);

  const currentInstallationPrice = useMemo(() => {
    return parseFloat(formData.installationPrice || '0') || 0;
  }, [formData.installationPrice]);

  const currentProfit = useMemo(() => {
    const total = parseFloat(formData.totalPrice || '0') || (parseFloat(formData.prepayment || '0') || 0) + (parseFloat(formData.remainder || '0') || 0);
    return total - currentMaterialsCost - currentInstallationPrice;
  }, [formData.totalPrice, formData.prepayment, formData.remainder, currentMaterialsCost, currentInstallationPrice]);

  const currentProfitMargin = useMemo(() => {
    const total = parseFloat(formData.totalPrice || '0') || (parseFloat(formData.prepayment || '0') || 0) + (parseFloat(formData.remainder || '0') || 0);
    if (total <= 0) return 0;
    return Math.round((currentProfit / total) * 100);
  }, [formData.totalPrice, formData.prepayment, formData.remainder, currentProfit]);

  // Submission / Save logic
  const doSaveOrder = async (shouldClose = false) => {
    try {
      const selectedStatus = columns.find(c => c.id.toString() === formData.statusId);
      const isCompleted = selectedStatus ? (
        selectedStatus.name.toLowerCase().includes('заверш') ||
        selectedStatus.name.toLowerCase().includes('готов') ||
        selectedStatus.name.toLowerCase().includes('выполнен')
      ) : false;

      const payload: any = {
        clientId: formData.clientId ? parseInt(formData.clientId) : undefined,
        statusId: formData.statusId ? parseInt(formData.statusId) : undefined,
        assigneeId: formData.assigneeId ? parseInt(formData.assigneeId) : undefined,
        measurerId: formData.measurerId ? parseInt(formData.measurerId) : undefined,
        installedById: formData.installedById ? parseInt(formData.installedById) : undefined,
        orderNumber: formData.orderNumber || undefined,
        address: formData.address || undefined,
        entrance: formData.entrance || undefined,
        floor: formData.floor || undefined,
        description: formData.description,
        totalPrice: formData.totalPrice ? parseFloat(formData.totalPrice) : undefined,
        prepayment: formData.prepayment ? parseFloat(formData.prepayment) : undefined,
        prepaymentPaid: !!formData.prepaymentPaid,
        remainder: formData.remainder ? parseFloat(formData.remainder) : undefined,
        remainderPaid: !!formData.remainderPaid,
        installationPrice: formData.installationPrice ? parseFloat(formData.installationPrice) : undefined,
        installationDate: formData.installationDate ? `${formData.installationDate}T00:00:00` : undefined,
        measurementDate: formData.measurementDate ? `${formData.measurementDate}:00` : undefined,
        contractParams: getContractParams()
      };

      if (isCompleted && !formData.installedAt) {
        payload.installedAt = new Date().toISOString();
      }

      let savedOrder: Order;
      if (editingOrderId) {
        savedOrder = await updateOrder(editingOrderId, payload);
      } else {
        savedOrder = await createOrder(payload);
      }

      if (pendingFiles.length > 0 && savedOrder.id) {
        for (const file of pendingFiles) {
          try {
            await uploadAttachment(savedOrder.id, file);
          } catch (err) {
            console.error("Failed to upload pending file", file.name, err);
          }
        }
        setPendingFiles([]);
      }

      setInitialFormDataJson(JSON.stringify({ formData, pendingFilesCount: 0 }));
      fetchLowStockMaterials();

      window.dispatchEvent(new CustomEvent('alta:orders-changed', {
        detail: { action: editingOrderId ? 'update' : 'create', orderId: savedOrder.id }
      }));

      if (shouldClose) {
        smoothClose();
      }
    } catch (err: any) {
      console.error("Failed to save order", err);
      alert(err.response?.data?.message || "Ошибка при сохранении заявки");
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doSaveOrder(true);
  };

  const handleDeleteOrder = async () => {
    if (!editingOrderId) return;
    if (window.confirm(t('kanban.modal.confirmDelete') || 'Удалить эту заявку?')) {
      try {
        await deleteOrder(editingOrderId);
        window.dispatchEvent(new CustomEvent('alta:orders-changed', {
          detail: { action: 'delete', orderId: editingOrderId }
        }));
        smoothClose();
      } catch (err) {
        console.error("Failed to delete order", err);
        alert("Не удалось удалить заявку");
      }
    }
  };

  const handleCompleteInstallation = async (e: React.MouseEvent, oId: number) => {
    e.preventDefault();
    e.stopPropagation();
    const hasAct = formData.attachments.some(a => isActFile(a.fileName, a.isAct)) || pendingFiles.some(f => isActFile(f.name));
    if (!hasAct) {
      alert('Для завершения монтажа необходимо прикрепить «Акт выполненных работ» во вкладке «Файлы».');
      setOrderModalTab('FILES');
      return;
    }
    try {
      const updated = await completeOrder(oId);
      if (updated) {
        populateOrderData(updated);
        window.dispatchEvent(new CustomEvent('alta:orders-changed', { detail: { action: 'complete', orderId: oId } }));
        alert('Монтаж успешно завершен!');
      }
    } catch (err: any) {
      console.error('Failed to complete installation', err);
      alert(err.response?.data?.message || err.message || 'Не удалось перевести заявку в завершенный статус');
    }
  };

  const handleStartGenerateContract = () => {
    if (!editingOrderId) {
      alert("Сначала сохраните заявку, чтобы сформировать договор");
      return;
    }
    const selectedClient = clients.find(c => c.id.toString() === formData.clientId);
    const curParams = getContractParams();
    const cName = currentOrder?.clientName || selectedClient?.name || '';
    const cPhone = currentOrder?.clientPhone || selectedClient?.phone || '';

    setContractPromptData({
      clientId: selectedClient?.id || 0,
      name: cName,
      phone: cPhone,
      secondPhone: selectedClient?.whatsapp || '',
      birthDate: selectedClient?.birthDate || '',
      passportSeriesNumber: selectedClient?.passportSeriesNumber || '',
      passportIssuedBy: selectedClient?.passportIssuedBy || '',
      passportIssuedDate: selectedClient?.passportIssuedDate || '',
      passportDepartmentCode: selectedClient?.passportDepartmentCode || '',
      registrationAddress: selectedClient?.registrationAddress || '',
      installationAddress: formData.address || '',
      area: curParams.area || '70,3',
      perimeter: curParams.perimeter || '110,5',
      canvasesCount: curParams.canvasesCount || '5',
      insertLength: curParams.insertLength || '20',
      pipeCount: curParams.pipeCount || '0',
      lightsCount: curParams.lightsCount || '30',
      timberLength: curParams.timberLength || '17',
      canvasArticle: curParams.canvasArticle || 'Полотно Мат 303',
      discount: curParams.discount || '',
      handoverDate: curParams.handoverDate || ''
    });
    setIsContractPromptOpen(true);
  };

  const handleApplyPassportToContract = (res: PassportApplyResult) => {
    setContractPromptData(prev => ({
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

  const handleApplyPassportToNewClient = (res: PassportApplyResult) => {
    setNewClientName(res.name || newClientName);
    setNewClientType('INDIVIDUAL');
  };

  const handleApplyPassportToOrder = async (res: PassportApplyResult) => {
    if (formData.clientId) {
      const existingClient = clients.find(c => c.id.toString() === formData.clientId);
      if (existingClient) {
        try {
          await updateClient(existingClient.id, {
            name: res.name || existingClient.name,
            phone: existingClient.phone,
            passportSeriesNumber: res.passportSeriesNumber || existingClient.passportSeriesNumber,
            passportIssuedBy: res.passportIssuedBy || existingClient.passportIssuedBy,
            passportIssuedDate: res.passportIssuedDate || existingClient.passportIssuedDate,
            passportDepartmentCode: res.passportDepartmentCode || existingClient.passportDepartmentCode,
            registrationAddress: res.registrationAddress || existingClient.registrationAddress,
            birthDate: res.birthDate || existingClient.birthDate
          });
          const updatedClients = await getClients();
          setClients(updatedClients);
          alert('Данные паспорта успешно обновлены в карточке клиента!');
        } catch (err) {
          console.error("Failed to update client with passport data", err);
        }
      }
    }
  };

  const handleCreateQuickClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;

    setCreatingClient(true);
    try {
      const finalLeadSource = newClientLeadSource === 'CUSTOM'
        ? (newClientCustomLeadSource.trim() || undefined)
        : (newClientLeadSource || undefined);

      const created = await createClient({
        name: newClientName.trim(),
        clientType: newClientType,
        phone: newClientPhone.trim() || '',
        whatsapp: newClientWhatsapp.trim() || undefined,
        telegram: newClientTelegram.trim() || undefined,
        inn: newClientType === 'LEGAL_ENTITY' ? (newClientInn.trim() || undefined) : undefined,
        contactPerson: newClientType === 'LEGAL_ENTITY' ? (newClientContactPerson.trim() || undefined) : undefined,
        leadSource: finalLeadSource
      });

      const updatedClients = await getClients();
      setClients(updatedClients);
      setFormData(prev => ({ ...prev, clientId: created.id.toString() }));
      setIsNewClientModalOpen(false);

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
      alert(err.response?.data?.message || "Не удалось создать клиента");
    } finally {
      setCreatingClient(false);
    }
  };

  // Files & Attachments Handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (editingOrderId) {
      setUploadingFile(true);
      try {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const newAtt = await uploadAttachment(editingOrderId, file);
          setFormData(prev => ({
            ...prev,
            attachments: [...prev.attachments, newAtt]
          }));
        }
        window.dispatchEvent(new CustomEvent('alta:orders-changed', { detail: { action: 'attachment', orderId: editingOrderId } }));
      } catch (err) {
        console.error("Failed to upload file", err);
        alert("Не удалось загрузить файл");
      } finally {
        setUploadingFile(false);
        e.target.value = '';
      }
    } else {
      const newFiles = Array.from(files);
      setPendingFiles(prev => [...prev, ...newFiles]);
      e.target.value = '';
    }
  };

  const handleActUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (editingOrderId) {
      setUploadingFile(true);
      try {
        const file = files[0];
        const newAtt = await uploadAttachment(editingOrderId, file, true);
        setFormData(prev => ({
          ...prev,
          attachments: [...prev.attachments, newAtt]
        }));
        window.dispatchEvent(new CustomEvent('alta:orders-changed', { detail: { action: 'attachment', orderId: editingOrderId } }));
      } catch (err) {
        console.error("Failed to upload act", err);
        alert("Не удалось загрузить Акт");
      } finally {
        setUploadingFile(false);
        e.target.value = '';
      }
    } else {
      const newFiles = Array.from(files);
      setPendingFiles(prev => [...prev, ...newFiles]);
      e.target.value = '';
    }
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const isViewableInBrowser = (name: string, contentType?: string): boolean => {
    const n = (name || '').toLowerCase();
    const type = (contentType || '').toLowerCase();
    if (type.startsWith('image/') || type.startsWith('audio/') || type.startsWith('video/') || type.startsWith('text/') || type.includes('pdf')) {
      return true;
    }
    return /\.(pdf|png|jpe?g|gif|webp|svg|bmp|txt|csv|log|mp3|wav|ogg|mp4|webm)$/i.test(n);
  };

  const handleOpenAttachment = async (att: OrderAttachment) => {
    try {
      setOpeningAttachmentId(att.id);
      const blob = await fetchAttachmentBlob(att.id, false);
      const url = URL.createObjectURL(blob);
      const name = (att.fileName || '').toLowerCase();
      const type = (att.contentType || blob.type || '').toLowerCase();
      const isImage = type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(name);
      const isPdf = type.includes('pdf') || /\.pdf$/i.test(name);

      setPreviewAttachment({
        url,
        fileName: att.fileName,
        contentType: att.contentType || blob.type,
        isImage,
        isPdf,
        attachment: att
      });
    } catch (err: any) {
      console.error("Failed to open attachment", err);
      let message = "Не удалось открыть файл";
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          if (json.message) message = json.message;
        } catch {
          // ignore
        }
      } else if (err.response?.data?.message) {
        message = err.response.data.message;
      }
      alert(message);
    } finally {
      setOpeningAttachmentId(null);
    }
  };

  const handleClosePreviewAttachment = () => {
    if (previewAttachment?.url) {
      URL.revokeObjectURL(previewAttachment.url);
    }
    setPreviewAttachment(null);
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
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err: any) {
      console.error("Failed to download attachment", err);
      let message = "Не удалось скачать файл";
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          if (json.message) message = json.message;
        } catch {
          // ignore
        }
      } else if (err.response?.data?.message) {
        message = err.response.data.message;
      }
      alert(message);
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

  const handleToggleAttachmentIsAct = async (att: OrderAttachment) => {
    try {
      const updated = await toggleAttachmentIsAct(att.id, !att.isAct);
      setFormData(prev => ({
        ...prev,
        attachments: prev.attachments.map(a => a.id === att.id ? { ...a, isAct: updated.isAct } : a)
      }));
      window.dispatchEvent(new CustomEvent('alta:orders-changed', { detail: { action: 'attachment', orderId: editingOrderId } }));
    } catch (err) {
      console.error("Failed to toggle act status", err);
    }
  };

  const handleStartRenameAttachment = (att: OrderAttachment) => {
    setEditingAttachmentId(att.id);
    setEditingAttachmentName(att.fileName);
  };

  const handleCancelRenameAttachment = () => {
    setEditingAttachmentId(null);
    setEditingAttachmentName('');
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

  // AI & Audio Handlers
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
        text: `⚠️ Ошибка: ${err.response?.data?.message || err.message || 'Не удалось получить ответ'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages([...newHistory, errorMsg]);
    } finally {
      setIsChatReplying(false);
    }
  };

  const handleCopyTextWithToast = (text: string, label = "Скопировано") => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopyFeedbackText(label);
      setTimeout(() => setCopyFeedbackText(null), 2200);
    }).catch(err => {
      console.error("Failed to copy", err);
    });
  };

  const handleExportChatTxt = () => {
    if (chatMessages.length === 0) return;
    const lines = [
      `=== История диалога с AI по заявке #${editingOrderId} ===`,
      `Дата экспорта: ${new Date().toLocaleString('ru-RU')}`,
      `--------------------------------------------------\\n`
    ];
    chatMessages.forEach(m => {
      lines.push(`[${m.timestamp}] ${m.role === 'user' ? 'Менеджер' : 'AI-Ассистент'}:`);
      lines.push(m.text);
      if (m.tokensUsed) {
        lines.push(`(Токенов: ${m.tokensUsed})`);
      }
      lines.push('');
    });
    const blob = new Blob([lines.join('\\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `order-${editingOrderId}-ai-chat.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearChat = async () => {
    if (!editingOrderId) return;
    if (!window.confirm('Очистить историю диалога с AI для этой заявки?')) return;
    try {
      await clearOrderAiChat(editingOrderId);
      setChatMessages([]);
      if (orderChatCacheRef.current) {
        delete orderChatCacheRef.current[editingOrderId];
      }
    } catch (err) {
      console.error("Failed to clear chat", err);
      setChatMessages([]);
    }
  };

  const refreshAiSummary = () => {
    if (!editingOrderId) return;
    getAiSummary(editingOrderId).then(summary => {
      setAiSummary(summary);
    }).catch(() => {});
  };

  // Mobile Bottom Sheet Swipe Down Handler
  const handleSheetTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchSheetStartYRef.current = touch.clientY;
    currentTranslateYRef.current = 0;
    setIsDraggingSheet(true);
  };

  const handleSheetTouchMove = (e: React.TouchEvent) => {
    if (touchSheetStartYRef.current === null) return;
    const touch = e.touches[0];
    const deltaY = touch.clientY - touchSheetStartYRef.current;
    if (deltaY > 0) {
      currentTranslateYRef.current = deltaY;
      setSheetTranslateY(deltaY);
    }
  };

  const handleSheetTouchEnd = () => {
    if (touchSheetStartYRef.current === null) return;
    const deltaY = currentTranslateYRef.current;
    touchSheetStartYRef.current = null;
    setIsDraggingSheet(false);

    if (deltaY > 80) {
      handleRequestCloseModal();
    } else {
      setSheetTranslateY(0);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {createPortal(
        <div
          className="order-drawer-overlay"
          style={{
            opacity: isSheetClosing ? 0 : 1,
            transition: 'opacity 0.24s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          onClick={handleRequestCloseModal}
        >
      <div 
        className={`order-drawer-content ${orderModalTab === 'MEASUREMENT' || orderModalTab === 'CONTRACT' ? 'is-wide' : ''}`} 
        style={sheetTranslateY > 0 || isSheetClosing ? {
          transform: `translateY(${sheetTranslateY}px)`,
          transition: isDraggingSheet ? 'none' : 'transform 0.24s cubic-bezier(0.16, 1, 0.3, 1)'
        } : undefined}
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile Bottom Sheet Drag Handle */}
        <div 
          className="order-drawer-drag-handle-wrapper" 
          onTouchStart={handleSheetTouchStart}
          onTouchMove={handleSheetTouchMove}
          onTouchEnd={handleSheetTouchEnd}
          onTouchCancel={handleSheetTouchEnd}
          onClick={handleRequestCloseModal}
        >
          <div className="order-drawer-drag-handle" />
        </div>

        <div 
          className="order-drawer-header modal-header"
          onTouchStart={handleSheetTouchStart}
          onTouchMove={handleSheetTouchMove}
          onTouchEnd={handleSheetTouchEnd}
          onTouchCancel={handleSheetTouchEnd}
        >
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
          {/* Tabs Navigation (Exact 1.7.14 Tabs) */}
          <div className="order-drawer-tabs">
            <button
              type="button"
              onClick={() => setOrderModalTab('MAIN')}
              className={`order-drawer-tab-btn ${orderModalTab === 'MAIN' ? 'active' : ''}`}
            >
              <User size={15} /> Основное
            </button>
            {(!isWorker || canAccessMeasurements) && (
              <button
                type="button"
                onClick={() => setOrderModalTab('MEASUREMENT')}
                className={`order-drawer-tab-btn ${orderModalTab === 'MEASUREMENT' ? 'active' : ''}`}
              >
                <Ruler size={15} /> Замер и смета
              </button>
            )}
            {!isWorker && hasContractTemplates && (
              <button
                type="button"
                onClick={() => setOrderModalTab('CONTRACT')}
                className={`order-drawer-tab-btn ${orderModalTab === 'CONTRACT' ? 'active' : ''}`}
              >
                <FileText size={15} /> Договор
              </button>
            )}
            <button
              type="button"
              onClick={() => setOrderModalTab('FILES')}
              className={`order-drawer-tab-btn ${orderModalTab === 'FILES' ? 'active' : ''}`}
            >
              <Paperclip size={15} /> Файлы и акты {(formData.attachments.length > 0 || pendingFiles.length > 0) && <span className="order-drawer-tab-badge">{formData.attachments.length + pendingFiles.length}</span>}
            </button>
            {!isWorker && hasAiSummary && editingOrderId && (
              <button
                type="button"
                onClick={() => setOrderModalTab('AI')}
                className={`order-drawer-tab-btn ${orderModalTab === 'AI' ? 'active' : ''}`}
              >
                <Mic size={15} /> AI анализ звонков
              </button>
            )}
          </div>

          <div className="order-drawer-body modal-body">
            {/* 1. ОСНОВНОЕ */}
            {orderModalTab === 'MAIN' && (
              <>
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ margin: 0 }}>{t('kanban.modal.client') || 'Клиент'}</label>
                    {!editingOrderId && !isWorker && (
                      <button 
                        type="button" 
                        onClick={() => setIsNewClientModalOpen(true)}
                        className="btn-icon"
                        style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 6px' }}
                      >
                        <Plus size={14} /> {t('clients.addClient') || 'Новый клиент'}
                      </button>
                    )}
                  </div>
                  {editingOrderId ? (() => {
                    const selectedClient = clients.find(c => c.id.toString() === formData.clientId);
                    const cName = currentOrder?.clientName || selectedClient?.name || 'Клиент';
                    const cPhone = currentOrder?.clientPhone || selectedClient?.phone;
                    const cType = currentOrder?.clientType || selectedClient?.clientType;
                    const cAvatar = currentOrder?.clientAvatarUrl || selectedClient?.avatarUrl;
                    const isLegal = cType === 'LEGAL_ENTITY';
                    const leadSource = selectedClient?.leadSource;

                    return (
                      <div style={{
                        padding: '10px 14px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '8px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            color: '#fff',
                            background: cAvatar ? 'transparent' : getAvatarGradient(cName || (isLegal ? 'Компания' : 'Клиент')),
                            border: '1.5px solid rgba(255, 255, 255, 0.15)',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                            flexShrink: 0
                          }}>
                            {cAvatar ? (
                              <img 
                                src={cAvatar} 
                                alt={cName} 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                              />
                            ) : (
                              isLegal ? <Building2 size={18} /> : getClientInitials(cName)
                            )}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{cName}</span>
                              <span style={{
                                fontSize: '0.72rem',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                background: isLegal ? 'rgba(59, 130, 246, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                                color: isLegal ? '#60a5fa' : '#4ade80',
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}>
                                {isLegal ? '🏢 Юр. лицо' : '👤 Физ. лицо'}
                              </span>
                              {leadSource && (
                                <span style={{
                                  padding: '2px 8px',
                                  fontSize: '0.72rem',
                                  color: '#60a5fa',
                                  background: 'rgba(59, 130, 246, 0.1)',
                                  border: '1px solid rgba(59, 130, 246, 0.25)',
                                  borderRadius: '4px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  whiteSpace: 'nowrap',
                                  flexShrink: 0
                                }}>
                                  <Tag size={11} style={{ opacity: 0.8 }} />
                                  {leadSource}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {cPhone && (
                          <a
                            href={`tel:${cPhone.replace(/[^\\d+]/g, '')}`}
                            style={{
                              color: '#22c55e',
                              padding: '5px 12px',
                              background: 'rgba(34, 197, 94, 0.12)',
                              border: '1px solid rgba(34, 197, 94, 0.3)',
                              borderRadius: 'var(--radius-sm)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              textDecoration: 'none',
                              fontSize: '0.85rem',
                              fontWeight: 600
                            }}
                            title={`Позвонить клиенту: ${cPhone}`}
                          >
                            <Phone size={14} /> {cPhone}
                          </a>
                        )}
                      </div>
                    );
                  })() : (
                    <>
                      <ClientSearchSelect
                        value={formData.clientId}
                        clients={clients}
                        onChange={(val) => setFormData({ ...formData, clientId: val })}
                        onAddNewClient={() => setIsNewClientModalOpen(true)}
                        isWorker={isWorker}
                      />
                      {(() => {
                        const selectedClient = clients.find(c => c.id.toString() === formData.clientId);
                        if (selectedClient && (selectedClient.phone || selectedClient.leadSource || selectedClient.whatsapp || selectedClient.telegram)) {
                          return (
                            <div style={{
                              marginTop: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              flexWrap: 'wrap'
                            }}>
                              {selectedClient.phone && (
                                <a
                                  href={`tel:${selectedClient.phone.replace(/[^\\d+]/g, '')}`}
                                  style={{
                                    fontSize: '0.84rem',
                                    color: '#22c55e',
                                    textDecoration: 'none',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '5px 12px',
                                    background: 'rgba(34, 197, 94, 0.12)',
                                    border: '1px solid rgba(34, 197, 94, 0.3)',
                                    borderRadius: 'var(--radius-sm)',
                                    fontWeight: 600
                                  }}
                                  title={`Позвонить клиенту: ${selectedClient.phone}`}
                                >
                                  <Phone size={14} /> {selectedClient.phone}
                                </a>
                              )}
                              {selectedClient.whatsapp && (
                                <a
                                  href={getWhatsAppLink(selectedClient.whatsapp)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    fontSize: '0.84rem',
                                    color: '#25D366',
                                    textDecoration: 'none',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '5px 12px',
                                    background: 'rgba(37, 211, 102, 0.12)',
                                    border: '1px solid rgba(37, 211, 102, 0.3)',
                                    borderRadius: 'var(--radius-sm)',
                                    fontWeight: 600
                                  }}
                                  title={`Написать в WhatsApp: ${selectedClient.whatsapp}`}
                                >
                                  <MessageCircle size={14} /> WhatsApp
                                </a>
                              )}
                              {selectedClient.telegram && (
                                <a
                                  href={getTelegramLink(selectedClient.telegram)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    fontSize: '0.84rem',
                                    color: '#0088cc',
                                    textDecoration: 'none',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '5px 12px',
                                    background: 'rgba(0, 136, 204, 0.12)',
                                    border: '1px solid rgba(0, 136, 204, 0.3)',
                                    borderRadius: 'var(--radius-sm)',
                                    fontWeight: 600
                                  }}
                                  title={`Написать в Telegram: ${selectedClient.telegram}`}
                                >
                                  <Send size={14} /> Telegram
                                </a>
                              )}
                              {selectedClient.leadSource && (
                                <span style={{
                                  padding: '4px 10px',
                                  fontSize: '0.78rem',
                                  color: '#60a5fa',
                                  background: 'rgba(59, 130, 246, 0.1)',
                                  border: '1px solid rgba(59, 130, 246, 0.25)',
                                  borderRadius: 'var(--radius-sm)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  <Tag size={12} style={{ opacity: 0.8 }} />
                                  Источник: {selectedClient.leadSource}
                                </span>
                              )}
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </>
                  )}
                </div>

                {/* Назначение сотрудников: Ответственный, Замерщик, Монтажник */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '12px',
                  marginBottom: '16px',
                  padding: '14px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-md)'
                }}>
                  {/* 1. Ответственный */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                      <Users size={15} style={{ color: 'var(--accent-primary)' }} />
                      {t('kanban.modal.assignee') || 'Ответственный'}
                    </label>
                    <EmployeeSearchSelect
                      value={formData.assigneeId}
                      employees={employees}
                      onChange={(val) => setFormData({ ...formData, assigneeId: val })}
                      placeholder={t('kanban.modal.selectAssignee') || 'Без ответственного'}
                      icon={<Users size={15} style={{ color: 'var(--accent-primary)' }} />}
                      accentColor="var(--accent-primary)"
                      isWorker={isWorker}
                    />
                  </div>

                  {/* 2. Замерщик */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                      <Ruler size={15} style={{ color: '#a855f7' }} />
                      Замерщик
                    </label>
                    <EmployeeSearchSelect
                      value={formData.measurerId}
                      employees={employees}
                      onChange={(val) => setFormData({ ...formData, measurerId: val })}
                      placeholder="Не назначен"
                      icon={<Ruler size={15} style={{ color: '#a855f7' }} />}
                      accentColor="#a855f7"
                      isWorker={isWorker}
                    />
                  </div>

                  {/* 3. Монтажник */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                      <Wrench size={15} style={{ color: '#22c55e' }} />
                      Монтажник
                    </label>
                    <EmployeeSearchSelect
                      value={formData.installedById}
                      employees={employees}
                      onChange={(val) => setFormData({ ...formData, installedById: val })}
                      placeholder="Не назначен"
                      icon={<Wrench size={15} style={{ color: '#22c55e' }} />}
                      accentColor="#22c55e"
                      isWorker={isWorker}
                    />
                  </div>
                </div>

                {/* Дополнительная инфо о завершении монтажа */}
                {(() => {
                  const statusObj = columns.find(c => c.id.toString() === formData.statusId);
                  const isCompleted = statusObj ? (
                    statusObj.name.toLowerCase().includes('заверш') ||
                    statusObj.name.toLowerCase().includes('готов') ||
                    statusObj.name.toLowerCase().includes('выполнен')
                  ) : false;
                  const installedAt = formData.installedAt || currentOrder?.installedAt;
                  if (!isCompleted || !installedAt) return null;
                  return (
                    <div style={{
                      marginBottom: '16px',
                      padding: '8px 12px',
                      background: 'rgba(34, 197, 94, 0.06)',
                      border: '1px solid rgba(34, 197, 94, 0.2)',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.8rem',
                      color: '#4ade80'
                    }}>
                      <CheckCircle2 size={15} />
                      <span>Монтаж завершен: <strong>{formatDateTimeInTimezone(installedAt, tenantSettings?.timezone, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong></span>
                    </div>
                  );
                })()}

                {/* Баннер статуса Акта выполненных работ */}
                {(() => {
                  const hasAct = formData.attachments.some(a => isActFile(a.fileName, a.isAct)) || pendingFiles.some(f => isActFile(f.name));
                  return (
                    <div style={{
                      marginBottom: '16px',
                      padding: '10px 14px',
                      background: hasAct ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                      border: hasAct ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      flexWrap: 'wrap'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                        <FileCheck size={16} style={{ color: hasAct ? '#4ade80' : '#fbbf24' }} />
                        <span style={{ color: hasAct ? '#4ade80' : '#fbbf24', fontWeight: 600 }}>
                          {hasAct ? 'Акт выполненных работ прикреплен' : 'Акт выполненных работ не прикреплен'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setOrderModalTab('FILES')}
                        className="btn btn-ghost"
                        style={{ padding: '3px 8px', fontSize: '0.78rem', color: 'var(--accent-primary)', textDecoration: 'underline' }}
                      >
                        {hasAct ? 'Посмотреть во вкладке «Файлы»' : 'Перейти в «Файлы» для загрузки →'}
                      </button>
                    </div>
                  );
                })()}

                {/* Адрес с DaData и навигаторами */}
                <div className="form-group">
                  <label>{t('kanban.modal.address') || 'Адрес монтажа'}</label>
                  {import.meta.env.VITE_DADATA_API_KEY ? (
                    <AddressSuggestions
                      token={import.meta.env.VITE_DADATA_API_KEY}
                      defaultQuery={formData.address}
                      onChange={(suggestion) => setFormData({...formData, address: suggestion?.value || formData.address})}
                      inputProps={{
                        placeholder: t('kanban.modal.address') || 'Адрес монтажа',
                        className: "search-input",
                        style: {width: '100%', paddingLeft: '12px', paddingRight: '12px', boxSizing: 'border-box'},
                        onChange: (e: any) => setFormData({...formData, address: e.target.value})
                      }}
                    />
                  ) : (
                    <input 
                      type="text" 
                      placeholder={t('kanban.modal.address') || 'Адрес монтажа'}
                      className="search-input"
                      style={{width: '100%', paddingLeft: '12px', paddingRight: '12px', boxSizing: 'border-box'}}
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                    />
                  )}
                  {formData.address && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                        {t('kanban.modal.route') || 'Навигатор'}:
                      </span>
                      <a
                        href={getYandexMapsUrl(formData.address, formData.entrance, formData.floor)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: '5px 12px',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          color: '#fc3f1d',
                          background: 'rgba(252, 63, 29, 0.1)',
                          border: '1px solid rgba(252, 63, 29, 0.3)',
                          borderRadius: 'var(--radius-sm)',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                        title="Построить маршрут в Яндекс.Картах / Навигаторе"
                      >
                        <span style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          background: '#fc3f1d',
                          color: '#fff',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '9px',
                          fontWeight: 800
                        }}>
                          Я
                        </span>
                        Яндекс
                      </a>
                      <a
                        href={get2GisUrl(formData.address, formData.entrance, formData.floor)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: '5px 12px',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          color: '#22c55e',
                          background: 'rgba(34, 197, 94, 0.1)',
                          border: '1px solid rgba(34, 197, 94, 0.3)',
                          borderRadius: 'var(--radius-sm)',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                        title="Построить маршрут в 2ГИС"
                      >
                        <span style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          background: '#22c55e',
                          color: '#fff',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '9px',
                          fontWeight: 800
                        }}>
                          2Г
                        </span>
                        2ГИС
                      </a>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label>{t('kanban.modal.entrance') || 'Подъезд'}</label>
                    <input 
                      type="text" 
                      placeholder="1"
                      value={formData.entrance}
                      onChange={(e) => setFormData({...formData, entrance: e.target.value})}
                      className="search-input"
                      style={{ width: '100%', paddingLeft: '12px' }}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label>{t('kanban.modal.floor') || 'Этаж'}</label>
                    <input 
                      type="text" 
                      placeholder="4"
                      value={formData.floor}
                      onChange={(e) => setFormData({...formData, floor: e.target.value})}
                      className="search-input"
                      style={{ width: '100%', paddingLeft: '12px' }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>{t('kanban.modal.description') || 'Комментарии к заявке'}</label>
                  <textarea 
                    required
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="search-input"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      minHeight: '80px',
                      maxHeight: '300px',
                      resize: 'vertical',
                      lineHeight: '1.45',
                      fontFamily: 'inherit',
                      fontSize: '0.9rem'
                    }}
                    placeholder="Описание или комментарии к заявке..."
                  />
                </div>

                <div style={{display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px'}}>
                  <div className="form-group" style={{flex: 1, minWidth: '200px'}}>
                    <label>Дата и время замера</label>
                    <input 
                      type="datetime-local" 
                      disabled={isWorker}
                      readOnly={isWorker}
                      value={formData.measurementDate}
                      onChange={(e) => setFormData({...formData, measurementDate: e.target.value})}
                      className="custom-date-input"
                      style={{width: '100%', ...(isWorker ? { opacity: 0.8, cursor: 'not-allowed', background: 'rgba(255, 255, 255, 0.03)' } : {})}}
                    />
                  </div>
                  <div className="form-group" style={{flex: 1, minWidth: '200px'}}>
                    <label>{t('kanban.modal.installationDate') || 'Дата монтажа'}</label>
                    <input 
                      type="date" 
                      disabled={isWorker}
                      readOnly={isWorker}
                      value={formData.installationDate}
                      onChange={(e) => setFormData({...formData, installationDate: e.target.value})}
                      className="custom-date-input"
                      style={{width: '100%', ...(isWorker ? { opacity: 0.8, cursor: 'not-allowed', background: 'rgba(255, 255, 255, 0.03)' } : {})}}
                    />
                  </div>
                </div>

                {/* Финансы */}
                {isWorker ? (
                  <div style={{
                    background: 'rgba(59, 130, 246, 0.08)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px 18px',
                    marginBottom: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                      Остаток к оплате по договору:
                    </span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                      {(parseFloat(formData.remainder || '0') || 0).toLocaleString('ru-RU')} ₽
                    </span>
                  </div>
                ) : (
                  <>
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px',
                      marginBottom: '16px'
                    }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                        Финансы и оплата
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label>{t('kanban.modal.installationPrice') || 'Стоимость монтажа'}</label>
                          <input 
                            type="number" 
                            min="0" 
                            step="0.01"
                            placeholder="0"
                            value={formData.installationPrice || ''}
                            onChange={(e) => setFormData({...formData, installationPrice: e.target.value})}
                            className="custom-number-input"
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label>Аванс (₽)</label>
                          <input 
                            type="number" 
                            min="0" 
                            step="0.01"
                            placeholder="0"
                            value={formData.prepayment || ''}
                            onChange={(e) => {
                              const newPrep = e.target.value;
                              const prepNum = parseFloat(newPrep || '0');
                              const remNum = parseFloat(formData.remainder || '0');
                              const sum = prepNum + remNum;
                              setFormData({
                                ...formData, 
                                prepayment: newPrep,
                                totalPrice: sum > 0 ? sum.toString() : ''
                              });
                            }}
                            className="custom-number-input"
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label>Остаток (₽)</label>
                          <input 
                            type="number" 
                            min="0" 
                            step="0.01"
                            placeholder="0"
                            value={formData.remainder || ''}
                            onChange={(e) => {
                              const newRem = e.target.value;
                              const remNum = parseFloat(newRem || '0');
                              const prepNum = parseFloat(formData.prepayment || '0');
                              const sum = prepNum + remNum;
                              setFormData({
                                ...formData, 
                                remainder: newRem,
                                totalPrice: sum > 0 ? sum.toString() : ''
                              });
                            }}
                            className="custom-number-input"
                          />
                        </div>
                      </div>

                      {/* Статусы фактической оплаты */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '14px' }}>
                        <label style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 12px',
                          background: formData.prepaymentPaid ? 'rgba(34, 197, 94, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                          border: formData.prepaymentPaid ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid var(--glass-border)',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer'
                        }}>
                          <input 
                            type="checkbox"
                            checked={!!formData.prepaymentPaid}
                            onChange={(e) => setFormData({ ...formData, prepaymentPaid: e.target.checked })}
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: '0.82rem', fontWeight: 500, color: formData.prepaymentPaid ? '#4ade80' : 'var(--text-secondary)' }}>
                            {formData.prepaymentPaid ? '✓ Аванс оплачен (в кассе)' : 'Аванс не оплачен'}
                          </span>
                        </label>

                        <label style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 12px',
                          background: formData.remainderPaid ? 'rgba(34, 197, 94, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                          border: formData.remainderPaid ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid var(--glass-border)',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer'
                        }}>
                          <input 
                            type="checkbox"
                            checked={!!formData.remainderPaid}
                            onChange={(e) => setFormData({ ...formData, remainderPaid: e.target.checked })}
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: '0.82rem', fontWeight: 500, color: formData.remainderPaid ? '#4ade80' : 'var(--text-secondary)' }}>
                            {formData.remainderPaid ? '✓ Остаток оплачен (в кассе)' : 'Остаток не оплачен'}
                          </span>
                        </label>
                      </div>

                      <div style={{
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        background: 'rgba(59, 130, 246, 0.08)', 
                        border: '1px solid rgba(59, 130, 246, 0.2)', 
                        borderRadius: 'var(--radius-sm)', 
                        padding: '10px 14px'
                      }}>
                        <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>Итого стоимость по договору:</span>
                        <span style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                          {(parseFloat(formData.prepayment || '0') + parseFloat(formData.remainder || '0')).toLocaleString('ru-RU')} ₽
                        </span>
                      </div>
                    </div>

                    {/* Финансовые показатели (Себестоимость, монтаж, прибыль, маржинальность) */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                      gap: '10px',
                      padding: '14px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: 'var(--radius-md)',
                      marginBottom: '16px'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                          Себестоимость материалов
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#f59e0b' }}>
                          {currentMaterialsCost.toLocaleString('ru-RU')} ₽
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                          Монтаж
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                          {currentInstallationPrice.toLocaleString('ru-RU')} ₽
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                          {t('kanban.modal.profit') || 'Прибыль'}
                        </div>
                        <div style={{
                          fontWeight: 700,
                          fontSize: '1.05rem',
                          color: currentProfit >= 0 ? 'var(--success)' : 'var(--danger)'
                        }}>
                          {currentProfit >= 0 ? `+${currentProfit.toLocaleString('ru-RU')}` : currentProfit.toLocaleString('ru-RU')} ₽
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                          {t('kanban.modal.margin') || 'Рентабельность'}
                        </div>
                        <div style={{
                          fontWeight: 700,
                          fontSize: '1.05rem',
                          color: currentProfitMargin >= 0 ? 'var(--success)' : 'var(--danger)'
                        }}>
                          {currentProfitMargin}%
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {editingOrderId && !isWorker && (
                  <OrderRemindersSection
                    orderId={editingOrderId}
                    employees={employees}
                  />
                )}
              </>
            )}

            {/* 2. ЗАМЕР И СМЕТА */}
            {orderModalTab === 'MEASUREMENT' && (
              <MeasurementWizard
                orderId={editingOrderId || undefined}
                materials={allMaterials}
                canViewFinances={role === 'OWNER' || role === 'SUPERADMIN' || role === 'MANAGER'}
                onDownloadDocx={handleStartGenerateContract}
                onSaved={(_, calc) => {
                  setFormData(prev => {
                    const newTotalPrice = calc.totalSalePrice.toString();
                    const prepay = parseFloat(prev.prepayment) || 0;
                    const newRem = Math.max(0, calc.totalSalePrice - prepay).toString();

                    const installSum = calc.items
                      .filter(it => it.type === 'SERVICE')
                      .reduce((sum, it) => sum + (it.totalSalePrice || 0), 0);

                    const updatedParams = { ...getContractParams() };
                    updatedParams.area = calc.totalArea.toString();
                    updatedParams.perimeter = calc.totalPerimeter.toString();
                    updatedParams.lightsCount = calc.totalLightsCount.toString();
                    updatedParams.pipeCount = calc.totalPipesCount.toString();
                    if (calc.totalCorniceLength > 0) {
                      updatedParams.timberLength = calc.totalCorniceLength.toString();
                    }

                    updatedParams.specItems = calc.items.map((it, i) => ({
                      idx: i + 1,
                      name: it.name + (it.roomName ? ` (${it.roomName})` : ''),
                      quantity: it.quantity.toString(),
                      unit: it.unit || 'шт.',
                      price: it.unitSalePrice,
                      total: it.totalSalePrice
                    }));

                    return {
                      ...prev,
                      totalPrice: newTotalPrice,
                      remainder: newRem,
                      installationPrice: installSum.toString(),
                      contractParams: updatedParams
                    };
                  });

                  if (editingOrderId) {
                    window.dispatchEvent(new CustomEvent('alta:orders-changed', {
                      detail: { action: 'measurement_saved', orderId: editingOrderId }
                    }));
                  }
                  alert('Замер и смета успешно сохранены в заказ!');
                }}
              />
            )}

            {/* 3. ДОГОВОР И СПЕЦИФИКАЦИЯ */}
            {orderModalTab === 'CONTRACT' && !isWorker && hasContractTemplates && (
              <>
                {/* Шапка Договора */}
                <div style={{
                  background: 'rgba(59, 130, 246, 0.06)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 16px',
                  marginBottom: '18px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                    <label style={{ margin: 0, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', color: '#60a5fa', fontSize: '0.9rem' }}>
                      <FileText size={16} /> Номер и формирование договора
                    </label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const num = await getNextOrderNumber();
                            setFormData(prev => ({ ...prev, orderNumber: num }));
                          } catch (err) {
                            console.error("Failed to generate order number", err);
                          }
                        }}
                        className="btn btn-ghost"
                        style={{ padding: '4px 8px', fontSize: '0.78rem', color: 'var(--accent-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        title="Сгенерировать следующий номер по шаблону"
                      >
                        <RefreshCw size={12} /> Сгенерировать
                      </button>
                      {formData.orderNumber && (
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, orderNumber: '' }))}
                          className="btn btn-ghost"
                          style={{ padding: '4px 8px', fontSize: '0.78rem', color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          title="Очистить номер"
                        >
                          <X size={12} /> Очистить
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', boxSizing: 'border-box' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', width: '100%', boxSizing: 'border-box' }}>
                      <div style={{ minWidth: 0 }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Номер договора</label>
                        <input
                          type="text"
                          placeholder="ДОГ-2026/001"
                          value={formData.orderNumber || ''}
                          onChange={e => setFormData({ ...formData, orderNumber: e.target.value })}
                          className="search-input"
                          style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'monospace', fontWeight: 700, color: '#4ade80', paddingLeft: '12px' }}
                        />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Дата создания договора</label>
                        <input
                          type="date"
                          value={getContractParams().contractDate || new Date().toISOString().slice(0, 10)}
                          onChange={e => updateContractParam('contractDate', e.target.value)}
                          className="custom-date-input"
                          style={{ width: '100%', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>
                    {(() => {
                      const selectedClient = clients.find(c => c.id.toString() === formData.clientId);
                      const isLegal = selectedClient?.clientType === 'LEGAL_ENTITY';
                      const hasTemplate = isLegal ? !!templateStatus?.legal : !!templateStatus?.individual;
                      const missingTemplateMsg = `Шаблон договора для ${isLegal ? 'юридических' : 'физических'} лиц не загружен.\\n\\nПожалуйста, перейдите в раздел «Шаблоны договоров» и загрузите .docx файл договора.`;

                      return (
                        <>
                          {!hasTemplate && (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '12px',
                              padding: '10px 14px',
                              background: 'rgba(245, 158, 11, 0.12)',
                              border: '1px solid rgba(245, 158, 11, 0.3)',
                              borderRadius: 'var(--radius-sm)',
                              color: '#fbbf24',
                              fontSize: '0.85rem'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                                <span>Шаблон договора для {isLegal ? 'юр. лиц' : 'физ. лиц'} не загружен</span>
                              </div>
                              <a 
                                href="/contract-templates" 
                                target="_blank" 
                                rel="noreferrer"
                                style={{
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                  color: '#ffffff',
                                  background: '#f59e0b',
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  textDecoration: 'none',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                Загрузить шаблон
                              </a>
                            </div>
                          )}

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                            <button
                              type="button"
                              onClick={handleStartGenerateContract}
                              className="btn btn-primary"
                              disabled={contractPromptLoading || !hasTemplate}
                              style={{
                                flex: 1,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                fontWeight: 600,
                                height: '44px',
                                fontSize: '0.92rem',
                                opacity: !hasTemplate ? 0.55 : 1,
                                cursor: !hasTemplate ? 'not-allowed' : 'pointer'
                              }}
                              title={!hasTemplate ? `Шаблон договора для ${isLegal ? 'юр. лиц' : 'физ. лиц'} не загружен. Перейдите в раздел «Шаблоны договоров».` : 'Сформировать и скачать договор в формате Word (.docx)'}
                            >
                              <FileText size={17} /> {contractPromptLoading ? 'Формирование договора...' : 'Сформировать договор (Word)'}
                            </button>

                            {!hasTemplate && (
                              <button
                                type="button"
                                onClick={() => alert(missingTemplateMsg)}
                                style={{
                                  width: '44px',
                                  height: '44px',
                                  borderRadius: '8px',
                                  background: 'rgba(245, 158, 11, 0.15)',
                                  border: '1px solid rgba(245, 158, 11, 0.3)',
                                  color: '#fbbf24',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  flexShrink: 0
                                }}
                                title="Шаблон не загружен! Нажмите для справки"
                              >
                                <AlertTriangle size={18} />
                              </button>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Блок 1: Сводные параметры потолка */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  marginBottom: '18px'
                }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Tag size={15} style={{ color: 'var(--accent-primary)' }} />
                    1. Сводные параметры потолка (Стр. 1 и Стр. 5 договора)
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '12px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.78rem' }}>Площадь (м²)</label>
                      <input
                        type="text"
                        placeholder="70,3"
                        value={getContractParams().area || ''}
                        onChange={(e) => updateContractParam('area', e.target.value)}
                        className="search-input"
                        style={{ width: '100%', paddingLeft: '10px' }}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.78rem' }}>Периметр (м/п)</label>
                      <input
                        type="text"
                        placeholder="110,5"
                        value={getContractParams().perimeter || ''}
                        onChange={(e) => updateContractParam('perimeter', e.target.value)}
                        className="search-input"
                        style={{ width: '100%', paddingLeft: '10px' }}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.78rem' }}>Кол-во полотен</label>
                      <input
                        type="text"
                        placeholder="5"
                        value={getContractParams().canvasesCount || ''}
                        onChange={(e) => updateContractParam('canvasesCount', e.target.value)}
                        className="search-input"
                        style={{ width: '100%', paddingLeft: '10px' }}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.78rem' }}>Вставка (м/п)</label>
                      <input
                        type="text"
                        placeholder="20"
                        value={getContractParams().insertLength || ''}
                        onChange={(e) => updateContractParam('insertLength', e.target.value)}
                        className="search-input"
                        style={{ width: '100%', paddingLeft: '10px' }}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.78rem' }}>Обвод труб (шт)</label>
                      <input
                        type="text"
                        placeholder="0"
                        value={getContractParams().pipeCount || ''}
                        onChange={(e) => updateContractParam('pipeCount', e.target.value)}
                        className="search-input"
                        style={{ width: '100%', paddingLeft: '10px' }}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.78rem' }}>Свет. пр. (точек)</label>
                      <input
                        type="text"
                        placeholder="30"
                        value={getContractParams().lightsCount || ''}
                        onChange={(e) => updateContractParam('lightsCount', e.target.value)}
                        className="search-input"
                        style={{ width: '100%', paddingLeft: '10px' }}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.78rem' }}>Брус (м/п)</label>
                      <input
                        type="text"
                        placeholder="17"
                        value={getContractParams().timberLength || ''}
                        onChange={(e) => updateContractParam('timberLength', e.target.value)}
                        className="search-input"
                        style={{ width: '100%', paddingLeft: '10px' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.78rem' }}>Артикул полотна (фактура)</label>
                      <input
                        type="text"
                        placeholder="Полотно Мат 303"
                        value={getContractParams().canvasArticle || ''}
                        onChange={(e) => updateContractParam('canvasArticle', e.target.value)}
                        className="search-input"
                        style={{ width: '100%', paddingLeft: '10px' }}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.78rem' }}>Дата сдачи объекта (Приложение №1)</label>
                      <input
                        type="text"
                        placeholder="« 20 » августа 2026г."
                        value={getContractParams().handoverDate || ''}
                        onChange={(e) => updateContractParam('handoverDate', e.target.value)}
                        className="search-input"
                        style={{ width: '100%', paddingLeft: '10px' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Блок 2: Чек-лист выполненных работ для Акта */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px'
                }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileCheck size={15} style={{ color: '#60a5fa' }} />
                    2. Чек-лист выполненных работ для Акта (Приложение №3)
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '8px' }}>
                    {(getContractParams().actChecklist || DEFAULT_ACT_CHECKLIST).map((actItem) => (
                      <div
                        key={actItem.id}
                        onClick={() => toggleActItem(actItem.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          background: actItem.checked ? 'rgba(34, 197, 94, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                          border: actItem.checked ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid var(--glass-border)',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          userSelect: 'none'
                        }}
                      >
                        <span style={{ fontSize: '0.8rem', color: actItem.checked ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                          {actItem.name}
                        </span>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: actItem.checked ? '#22c55e' : 'rgba(255,255,255,0.08)',
                          color: actItem.checked ? '#ffffff' : 'var(--text-secondary)'
                        }}>
                          {actItem.checked ? 'ДА' : 'НЕТ'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* 4. ФАЙЛЫ И АКТЫ */}
            {orderModalTab === 'FILES' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
                {/* Выделенный блок для Акта выполненных работ */}
                {(() => {
                  const actAttachment = formData.attachments.find(a => isActFile(a.fileName, a.isAct));
                  const pendingActFile = pendingFiles.find(f => isActFile(f.name));
                  const hasAct = !!(actAttachment || pendingActFile);

                  return (
                    <div style={{
                      padding: '14px 16px',
                      background: hasAct 
                        ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(16, 185, 129, 0.04) 100%)' 
                        : 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.04) 100%)',
                      border: hasAct ? '1px solid rgba(34, 197, 94, 0.35)' : '1px solid rgba(245, 158, 11, 0.35)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <FileCheck size={20} style={{ color: hasAct ? '#4ade80' : '#fbbf24', flexShrink: 0 }} />
                          <div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: hasAct ? '#4ade80' : '#fbbf24' }}>
                              Акт выполненных работ (Приложение №3)
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                              {hasAct ? 'Подписанный Акт прикреплен к заявке' : 'Обязателен для возможности завершения монтажа'}
                            </div>
                          </div>
                        </div>

                        <button 
                          type="button"
                          onClick={() => {
                            if (hasDocumentScanner) {
                              setActionSheetMode('ACT');
                              setIsActActionSheetOpen(true);
                            } else {
                              actFileInputRef.current?.click();
                            }
                          }}
                          className="file-upload-btn" 
                          style={{ 
                            cursor: 'pointer', 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '6px',
                            background: hasAct ? 'rgba(34, 197, 94, 0.2)' : 'linear-gradient(135deg, #f59e0b, #d97706)',
                            border: hasAct ? '1px solid rgba(34, 197, 94, 0.4)' : 'none',
                            color: '#fff',
                            fontWeight: 600,
                            fontSize: '0.82rem',
                            padding: '6px 12px',
                            borderRadius: 'var(--radius-sm)'
                          }}
                        >
                          {hasDocumentScanner ? <Camera size={14} /> : <FileCheck size={14} />}
                          {hasAct 
                            ? 'Заменить Акт' 
                            : (hasDocumentScanner ? 'Загрузить / Отсканировать Акт' : 'Загрузить Акт')}
                        </button>
                        <input 
                          ref={actFileInputRef}
                          type="file" 
                          style={{ display: 'none' }}
                          onChange={handleActUpload} 
                          disabled={uploadingFile} 
                          accept="image/*,application/pdf"
                        />
                      </div>

                      {hasAct && (actAttachment || pendingActFile) && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          background: 'rgba(0, 0, 0, 0.25)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid rgba(34, 197, 94, 0.25)'
                        }}>
                          <span style={{ fontSize: '0.88rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
                            📄 {actAttachment ? actAttachment.fileName : `${pendingActFile?.name} (ожидает сохранения)`}
                          </span>
                          {actAttachment && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {isViewableInBrowser(actAttachment.fileName, actAttachment.contentType) && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleOpenAttachment(actAttachment);
                                  }}
                                  className="btn btn-ghost"
                                  style={{ padding: '6px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                  title="Посмотреть вложение"
                                  disabled={openingAttachmentId === actAttachment.id}
                                >
                                  {openingAttachmentId === actAttachment.id ? (
                                    <RefreshCw size={16} className="animate-spin" />
                                  ) : (
                                    <Eye size={16} />
                                  )}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDownloadAttachment(actAttachment);
                                }}
                                className="btn btn-ghost"
                                style={{ padding: '6px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                title="Скачать файл"
                              >
                                <Download size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px'}}>
                  <div>
                    <h3 style={{margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)'}}>{t('kanban.modal.attachments') || 'Прикрепленные файлы'}</h3>
                    <p style={{margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)'}}>
                      Прикрепленные файлы, чертежи, фото и сканы документов
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (hasDocumentScanner && isMobile) {
                        setActionSheetMode('GENERAL');
                        setIsActActionSheetOpen(true);
                      } else {
                        generalFileInputRef.current?.click();
                      }
                    }}
                    className="file-upload-btn"
                    style={{
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                    disabled={uploadingFile}
                  >
                    <Paperclip size={14} />
                    {uploadingFile ? t('kanban.modal.uploading') : t('kanban.modal.attachFile')}
                  </button>
                  <input
                    ref={generalFileInputRef}
                    type="file"
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                    disabled={uploadingFile}
                  />
                </div>
                
                {formData.attachments.length > 0 || pendingFiles.length > 0 ? (
                  <div className="attachments-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {formData.attachments.map(att => {
                      const canPreview = isViewableInBrowser(att.fileName, att.contentType);
                      const isAttAct = isActFile(att.fileName, att.isAct);
                      return (
                        <div key={att.id} className="attachment-item" style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          background: isAttAct ? 'rgba(34, 197, 94, 0.04)' : 'rgba(255, 255, 255, 0.02)',
                          border: isAttAct ? '1px solid rgba(34, 197, 94, 0.25)' : '1px solid var(--glass-border)',
                          borderRadius: 'var(--radius-sm)',
                          gap: '12px'
                        }}>
                          {editingAttachmentId === att.id ? (
                            <div
                              style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="text"
                                autoFocus
                                value={editingAttachmentName}
                                onChange={(e) => setEditingAttachmentName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleSaveRenameAttachment(att.id);
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleCancelRenameAttachment();
                                  }
                                }}
                                disabled={renamingAttachment}
                                className="search-input"
                                style={{ flex: 1, padding: '4px 10px', fontSize: '0.88rem', height: '32px' }}
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleSaveRenameAttachment(att.id);
                                }}
                                disabled={renamingAttachment}
                                className="btn btn-primary"
                                style={{ padding: '4px 10px', fontSize: '0.8rem', height: '32px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                title="Сохранить имя"
                              >
                                <Check size={14} /> Сохранить
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleCancelRenameAttachment();
                                }}
                                disabled={renamingAttachment}
                                className="btn btn-ghost"
                                style={{ padding: '4px 8px', height: '32px', display: 'flex', alignItems: 'center' }}
                                title="Отмена"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', maxWidth: '55%' }}>
                                {isAttAct && (
                                  <span style={{
                                    fontSize: '0.72rem',
                                    background: 'rgba(34, 197, 94, 0.18)',
                                    color: '#4ade80',
                                    padding: '2px 7px',
                                    borderRadius: '6px',
                                    fontWeight: 600,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    flexShrink: 0
                                  }}>
                                    <FileCheck size={11} /> Акт
                                  </span>
                                )}
                                <span 
                                  style={{fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}
                                  title={att.fileName}
                                >
                                  {att.fileName}
                                </span>
                              </div>
                              <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                                {!isWorker && (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleAttachmentIsAct(att)}
                                    className="btn btn-ghost"
                                    style={{
                                      padding: '4px 8px',
                                      fontSize: '0.75rem',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      color: isAttAct ? '#4ade80' : 'var(--text-secondary)'
                                    }}
                                    title={isAttAct ? 'Снять отметку Акта выполненных работ' : 'Отметить как Акт выполненных работ'}
                                  >
                                    <FileCheck size={13} /> {isAttAct ? 'Акт' : 'Сделать Актом'}
                                  </button>
                                )}
                                {!isWorker && (
                                  <button 
                                    type="button" 
                                    onClick={() => handleStartRenameAttachment(att)} 
                                    className="btn btn-ghost" 
                                    style={{padding: '5px 8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px'}}
                                    title="Переименовать файл"
                                  >
                                    <Edit2 size={13} />
                                  </button>
                                )}
                                {canPreview && (
                                  <button 
                                    type="button" 
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleOpenAttachment(att);
                                    }} 
                                    className="btn btn-ghost" 
                                    style={{padding: '6px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}
                                    title="Посмотреть вложение"
                                    disabled={openingAttachmentId === att.id}
                                  >
                                    {openingAttachmentId === att.id ? (
                                      <RefreshCw size={16} className="animate-spin" />
                                    ) : (
                                      <Eye size={16} />
                                    )}
                                  </button>
                                )}
                                <button 
                                  type="button" 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleDownloadAttachment(att);
                                  }} 
                                  className="btn btn-ghost" 
                                  style={{padding: '6px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}
                                  title="Скачать файл"
                                >
                                  <Download size={16} />
                                </button>
                                {!isWorker && (
                                  <button 
                                    type="button" 
                                    onClick={() => handleDeleteAttachment(att.id)} 
                                    title={t('kanban.modal.delete') || 'Удалить'} 
                                    style={{background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '6px'}}
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                    {pendingFiles.map((pf, index) => {
                      const isPfAct = isActFile(pf.name);
                      return (
                        <div key={`pending-${index}`} className="attachment-item" style={{
                          borderStyle: 'dashed',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          background: isPfAct ? 'rgba(34, 197, 94, 0.04)' : 'rgba(255, 255, 255, 0.01)',
                          borderColor: isPfAct ? 'rgba(34, 197, 94, 0.35)' : 'var(--glass-border)',
                          borderRadius: 'var(--radius-sm)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                            {isPfAct && (
                              <span style={{
                                fontSize: '0.72rem',
                                background: 'rgba(34, 197, 94, 0.18)',
                                color: '#4ade80',
                                padding: '2px 7px',
                                borderRadius: '6px',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                flexShrink: 0
                              }}>
                                <FileCheck size={11} /> Акт
                              </span>
                            )}
                            <span style={{fontSize: '0.9rem'}}>{pf.name} (ожидает сохранения)</span>
                          </div>
                          <button type="button" onClick={() => removePendingFile(index)} style={{background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center'}}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px dashed var(--glass-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '32px 16px',
                    textAlign: 'center',
                    color: 'var(--text-secondary)',
                    fontSize: '0.88rem'
                  }}>
                    {t('kanban.modal.noAttachments') || 'Нет прикрепленных файлов'}
                  </div>
                )}
              </div>
            )}

            {/* 5. AI АНАЛИЗ И ИНТЕРАКТИВНЫЙ ЧАТ */}
            {orderModalTab === 'AI' && editingOrderId && !isWorker && hasAiSummary && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                {/* Header with audio upload */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Mic size={16} /> AI Анализ звонков и ассистент
                    </h3>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Расшифровка аудиозаписей, анализ переговоров и умный диалог с AI
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {aiSummary && (
                      <button
                        type="button"
                        onClick={handleDeleteAudio}
                        className="btn btn-ghost"
                        style={{
                          color: '#ef4444',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.85rem',
                          fontWeight: 500,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                        title="Удалить аудиозапись из S3 и очистить анализ"
                      >
                        <Trash2 size={14} />
                        Удалить звонок
                      </button>
                    )}
                    <button 
                      type="button"
                      onClick={() => audioFileInputRef.current?.click()}
                      disabled={uploadingAudio}
                      className="btn btn-primary" 
                      style={{ 
                        backgroundColor: '#3b82f6', 
                        color: '#ffffff', 
                        cursor: 'pointer', 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '6px',
                        padding: '8px 14px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        border: 'none',
                        boxShadow: '0 2px 8px rgba(59, 130, 246, 0.4)'
                      }}
                    >
                      <Mic size={14} color="#ffffff" />
                      {uploadingAudio ? 'Загрузка аудио...' : (aiSummary ? 'Загрузить другой звонок' : 'Загрузить звонок')}
                    </button>
                    <input 
                      ref={audioFileInputRef}
                      type="file" 
                      accept="audio/*,.mp3,.ogg,.wav,.m4a,.aac,.flac,.webm" 
                      onChange={handleAudioUpload} 
                      disabled={uploadingAudio} 
                      style={{ display: 'none' }} 
                    />
                  </div>
                </div>

                {/* Sub-tabs: Анализ vs Чат */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(0, 0, 0, 0.25)',
                  padding: '4px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--glass-border)'
                }}>
                  <button
                    type="button"
                    onClick={() => setAiSubTab('ANALYSIS')}
                    style={{
                      flex: 1,
                      padding: '8px 14px',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      fontSize: '0.88rem',
                      fontWeight: aiSubTab === 'ANALYSIS' ? 600 : 500,
                      background: aiSubTab === 'ANALYSIS' ? 'var(--primary)' : 'transparent',
                      color: aiSubTab === 'ANALYSIS' ? '#fff' : 'var(--text-secondary)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Sparkles size={15} /> Анализ звонка
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiSubTab('CHAT')}
                    style={{
                      flex: 1,
                      padding: '8px 14px',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      fontSize: '0.88rem',
                      fontWeight: aiSubTab === 'CHAT' ? 600 : 500,
                      background: aiSubTab === 'CHAT' ? 'var(--primary)' : 'transparent',
                      color: aiSubTab === 'CHAT' ? '#fff' : 'var(--text-secondary)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <MessageSquare size={15} /> Чат с AI по звонку
                    {chatMessages.length > 0 && (
                      <span style={{
                        background: 'rgba(255,255,255,0.25)',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        fontSize: '0.75rem',
                        fontWeight: 700
                      }}>
                        {chatMessages.length}
                      </span>
                    )}
                  </button>
                </div>

                {/* Feedback Toast */}
                {copyFeedbackText && (
                  <div style={{
                    background: 'rgba(34, 197, 94, 0.2)',
                    border: '1px solid rgba(34, 197, 94, 0.4)',
                    color: '#4ade80',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.82rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <Check size={14} /> {copyFeedbackText}
                  </div>
                )}

                {/* Sub-tab 1: АНАЛИЗ ЗВОНКА */}
                {aiSubTab === 'ANALYSIS' && (
                  <>
                    {aiSummary ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {/* Status and Refresh */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 12px',
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid var(--glass-border)',
                          borderRadius: 'var(--radius-sm)'
                        }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            Статус обработки:{' '}
                            <strong style={{
                              color: aiSummary.status === 'COMPLETED' ? 'var(--success)' : (aiSummary.status === 'ERROR' ? 'var(--danger)' : 'var(--warning)')
                            }}>
                              {aiSummary.status === 'COMPLETED' ? 'Готово к анализу' : (aiSummary.status === 'ERROR' ? 'Ошибка' : 'Расшифровка аудио...')}
                            </strong>
                          </span>
                          <button
                            type="button"
                            onClick={refreshAiSummary}
                            className="btn btn-ghost"
                            style={{ padding: '4px 10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <RefreshCw size={13} /> Обновить статус
                          </button>
                        </div>

                        {/* AI Cost Breakdown for this Order */}
                        {orderAiCost && orderAiCost.totalCostRubles > 0 && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '8px',
                            background: 'rgba(234, 179, 8, 0.08)',
                            border: '1px solid rgba(234, 179, 8, 0.25)',
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-sm)'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#facc15', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <Coins size={15} /> Затраты на ИИ по сделке: {Number(orderAiCost.totalCostRubles).toFixed(2)} ₽
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                {orderAiCost.speechkitCostRubles > 0 && (
                                  <span>• Аудио: {Number(orderAiCost.speechkitCostRubles).toFixed(2)} ₽ ({Math.floor(orderAiCost.audioDurationSeconds / 60)}:{String(orderAiCost.audioDurationSeconds % 60).padStart(2, '0')} мин)</span>
                                )}
                                {orderAiCost.gptCostRubles > 0 && (
                                  <span>• GPT: {Number(orderAiCost.gptCostRubles).toFixed(2)} ₽ ({orderAiCost.totalTokens} ток.)</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Prompt Presets Selector */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            Вариант системного анализа:
                          </label>
                          {(() => {
                            const map = getAnalysisResultsMap(aiSummary);
                            return (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
                                <button
                                  type="button"
                                  disabled={isAnalyzingAudio || !aiSummary.rawTranscript}
                                  onClick={() => handleSelectAiPreset('SUMMARY')}
                                  style={{
                                    padding: '10px 14px',
                                    borderRadius: 'var(--radius-sm)',
                                    border: aiPromptPreset === 'SUMMARY' ? '1px solid var(--primary)' : '1px solid var(--glass-border)',
                                    background: aiPromptPreset === 'SUMMARY' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                                    color: aiPromptPreset === 'SUMMARY' ? '#fff' : 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '2px',
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                    <span style={{ fontWeight: 600, fontSize: '0.88rem', color: aiPromptPreset === 'SUMMARY' ? '#60a5fa' : 'var(--text-primary)' }}>
                                      📋 Саммари звонка
                                    </span>
                                    {map['SUMMARY'] && (
                                      <span style={{ fontSize: '0.7rem', color: '#4ade80', display: 'inline-flex', alignItems: 'center', gap: '2px', fontWeight: 600 }}>
                                        <Check size={11} /> Сохранен
                                      </span>
                                    )}
                                  </div>
                                  <span style={{ fontSize: '0.74rem', opacity: 0.8 }}>
                                    Суть, параметры объекта, даты замера и цены
                                  </span>
                                </button>

                                <button
                                  type="button"
                                  disabled={isAnalyzingAudio || !aiSummary.rawTranscript}
                                  onClick={() => handleSelectAiPreset('SALES_ADVICE')}
                                  style={{
                                    padding: '10px 14px',
                                    borderRadius: 'var(--radius-sm)',
                                    border: aiPromptPreset === 'SALES_ADVICE' ? '1px solid #10b981' : '1px solid var(--glass-border)',
                                    background: aiPromptPreset === 'SALES_ADVICE' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                                    color: aiPromptPreset === 'SALES_ADVICE' ? '#fff' : 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '2px',
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                    <span style={{ fontWeight: 600, fontSize: '0.88rem', color: aiPromptPreset === 'SALES_ADVICE' ? '#34d399' : 'var(--text-primary)' }}>
                                      🎯 Скрипт и дожим
                                    </span>
                                    {map['SALES_ADVICE'] && (
                                      <span style={{ fontSize: '0.7rem', color: '#4ade80', display: 'inline-flex', alignItems: 'center', gap: '2px', fontWeight: 600 }}>
                                        <Check size={11} /> Сохранен
                                      </span>
                                    )}
                                  </div>
                                  <span style={{ fontSize: '0.74rem', opacity: 0.8 }}>
                                    Анализ сомнений, готовый скрипт и аргументы
                                  </span>
                                </button>

                                <button
                                  type="button"
                                  disabled={isAnalyzingAudio || !aiSummary.rawTranscript}
                                  onClick={() => handleSelectAiPreset('CUSTOM')}
                                  style={{
                                    padding: '10px 14px',
                                    borderRadius: 'var(--radius-sm)',
                                    border: aiPromptPreset === 'CUSTOM' ? '1px solid #f59e0b' : '1px solid var(--glass-border)',
                                    background: aiPromptPreset === 'CUSTOM' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                                    color: aiPromptPreset === 'CUSTOM' ? '#fff' : 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '2px',
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                    <span style={{ fontWeight: 600, fontSize: '0.88rem', color: aiPromptPreset === 'CUSTOM' ? '#fbbf24' : 'var(--text-primary)' }}>
                                      ✏️ Свой промпт
                                    </span>
                                    {map['CUSTOM'] && (
                                      <span style={{ fontSize: '0.7rem', color: '#4ade80', display: 'inline-flex', alignItems: 'center', gap: '2px', fontWeight: 600 }}>
                                        <Check size={11} /> Сохранен
                                      </span>
                                    )}
                                  </div>
                                  <span style={{ fontSize: '0.74rem', opacity: 0.8 }}>
                                    Произвольный запрос к стенограмме
                                  </span>
                                </button>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Custom Prompt Box */}
                        {aiPromptPreset === 'CUSTOM' && (
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            background: 'rgba(0, 0, 0, 0.2)',
                            padding: '12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid rgba(245, 158, 11, 0.3)'
                          }}>
                            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fbbf24' }}>
                              Введите ваш промпт / инструкцию для анализа стенограммы:
                            </label>
                            <textarea
                              rows={3}
                              value={customSystemPrompt}
                              onChange={(e) => setCustomSystemPrompt(e.target.value)}
                              placeholder="Например: Выдели только перечень освещения и карнизов, либо составь текст коммерческого предложения для клиента..."
                              style={{
                                width: '100%',
                                background: 'var(--bg-primary)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: 'var(--radius-sm)',
                                color: 'var(--text-primary)',
                                padding: '8px 12px',
                                fontSize: '0.88rem',
                                resize: 'vertical'
                              }}
                            />
                            <button
                              type="button"
                              disabled={isAnalyzingAudio || !customSystemPrompt.trim()}
                              onClick={() => handleRunAiAnalysis('CUSTOM', customSystemPrompt, true)}
                              className="btn btn-primary"
                              style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
                            >
                              <Sparkles size={14} />
                              {isAnalyzingAudio ? 'Генерация анализа...' : '⚡ Запустить анализ'}
                            </button>
                          </div>
                        )}

                        {/* Analysis Result Box */}
                        <div style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          padding: '16px',
                          borderRadius: 'var(--radius-lg)',
                          border: '1px solid var(--glass-border)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
                            <span style={{ fontSize: '0.88rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
                              <Bot size={15} color="var(--accent-primary)" /> Результат анализа:
                              {aiPromptPreset && (
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                                  ({aiPromptPreset === 'SUMMARY' ? 'Саммари звонка' : (aiPromptPreset === 'SALES_ADVICE' ? 'Скрипт и дожим' : 'Свой промпт')})
                                </span>
                              )}
                            </span>
                            {aiSummary.aiSummary && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <button
                                  type="button"
                                  disabled={isAnalyzingAudio}
                                  onClick={() => handleRunAiAnalysis(aiPromptPreset, customSystemPrompt, true)}
                                  className="btn btn-ghost"
                                  style={{
                                    padding: '4px 10px',
                                    fontSize: '0.78rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    color: '#38bdf8',
                                    background: 'rgba(56, 189, 248, 0.1)',
                                    border: '1px solid rgba(56, 189, 248, 0.25)',
                                    borderRadius: 'var(--radius-sm)'
                                  }}
                                  title="Принудительно отправить повторный запрос в AI"
                                >
                                  <RotateCcw size={13} className={isAnalyzingAudio ? 'spinner' : ''} /> Сгенерировать повторно
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCopyTextWithToast(aiSummary.aiSummary!, "Результат анализа скопирован")}
                                  className="btn btn-ghost"
                                  style={{ padding: '4px 8px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                  title="Скопировать в буфер"
                                >
                                  <Copy size={13} /> Копировать
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setAiSubTab('CHAT')}
                                  className="btn btn-primary"
                                  style={{ padding: '4px 10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <MessageSquare size={13} /> Обсудить в чате
                                </button>
                              </div>
                            )}
                          </div>

                          {isAnalyzingAudio ? (
                            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                              <RefreshCw size={20} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                              <span style={{ fontSize: '0.88rem' }}>AI анализирует стенограмму звонка...</span>
                            </div>
                          ) : aiSummary.aiSummary ? (
                            <div style={{ fontSize: '0.92rem', lineHeight: '1.6', whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>
                              {aiSummary.aiSummary}
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '12px 0' }}>
                              {aiSummary.status === 'ERROR' ? 'Ошибка при обработке записи.' : 'Расшифровка завершена. Выберите вариант анализа выше.'}
                            </div>
                          )}
                        </div>

                        {/* Raw Transcript Collapsible */}
                        {aiSummary.rawTranscript && (
                          <details style={{
                            background: 'rgba(0, 0, 0, 0.15)',
                            padding: '10px 14px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--glass-border)'
                          }}>
                            <summary style={{ cursor: 'pointer', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                              📝 Стенограмма звонка (полный текст)
                            </summary>
                            <div style={{ marginTop: '10px', fontSize: '0.84rem', color: 'var(--text-primary)', lineHeight: '1.5', maxHeight: '180px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                              {aiSummary.rawTranscript}
                            </div>
                          </details>
                        )}
                      </div>
                    ) : (
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px dashed var(--glass-border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '40px 16px',
                        textAlign: 'center',
                        color: 'var(--text-secondary)',
                        fontSize: '0.88rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '12px'
                      }}>
                        <div style={{
                          width: '56px',
                          height: '56px',
                          borderRadius: '50%',
                          background: 'rgba(59, 130, 246, 0.12)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--accent-primary)'
                        }}>
                          <Mic size={26} color="var(--accent-primary)" />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '0.98rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            Нет загруженных записей звонков
                          </span>
                          <span style={{ fontSize: '0.8rem', opacity: 0.8, maxWidth: '420px' }}>
                            Загрузите аудиозапись разговора с клиентом (.mp3, .ogg, .wav, .m4a, .aac), чтобы AI расшифровал разговор, выделил ключевые параметры и подсказал скрипт продажи.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => audioFileInputRef.current?.click()}
                          disabled={uploadingAudio}
                          className="btn btn-primary"
                          style={{
                            marginTop: '4px',
                            padding: '10px 22px',
                            fontSize: '0.92rem',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            backgroundColor: '#3b82f6',
                            color: '#ffffff',
                            border: 'none',
                            boxShadow: '0 2px 8px rgba(59, 130, 246, 0.4)'
                          }}
                        >
                          <Mic size={16} color="#ffffff" />
                          {uploadingAudio ? 'Загрузка аудиозаписи...' : 'Выбрать аудиофайл звонка'}
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* Sub-tab 2: ИНТЕРАКТИВНЫЙ ЧАТ С AI */}
                {aiSubTab === 'CHAT' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Notice & Session Export Bar */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '8px',
                      background: 'rgba(59, 130, 246, 0.08)',
                      border: '1px solid rgba(59, 130, 246, 0.25)',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          <Sparkles size={15} style={{ color: '#60a5fa', flexShrink: 0 }} />
                          <span>История диалога сохраняется в заявке.</span>
                        </div>
                        {(() => {
                          const totalTokens = chatMessages.reduce((sum, m) => sum + (m.tokensUsed || 0), 0);
                          const totalCost = chatMessages.reduce((sum, m) => sum + (m.costRubles || 0), 0);
                          if (totalTokens === 0) return null;
                          return (
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              background: 'rgba(234, 179, 8, 0.15)',
                              border: '1px solid rgba(234, 179, 8, 0.35)',
                              color: '#facc15',
                              padding: '2px 8px',
                              borderRadius: '10px'
                            }}>
                              <Coins size={12} />
                              Расход: {totalTokens} ток. (~{totalCost < 0.01 && totalTokens > 0 ? '<0.01' : totalCost.toFixed(2)} ₽)
                            </div>
                          );
                        })()}
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={handleExportChatTxt}
                          className="btn btn-ghost"
                          style={{ padding: '4px 8px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.05)' }}
                          title="Скачать весь диалог в .txt файл"
                        >
                          <FileDown size={13} /> Скачать .txt
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const fullChat = chatMessages.map(m => `[${m.role === 'user' ? 'Менеджер' : 'AI'}]: ${m.text}`).join('\\n\\n');
                            handleCopyTextWithToast(fullChat || "Чат пуст", "История чата скопирована");
                          }}
                          className="btn btn-ghost"
                          style={{ padding: '4px 8px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.05)' }}
                          title="Скопировать переписку"
                        >
                          <Copy size={13} /> Копировать
                        </button>
                        {chatMessages.length > 0 && (
                          <button
                            type="button"
                            onClick={handleClearChat}
                            className="btn btn-ghost"
                            style={{ padding: '4px 8px', fontSize: '0.78rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title="Очистить историю переписки"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Quick Prompts Suggestions */}
                    <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                      {[
                        '💬 Напиши сообщение для WhatsApp с итогом звонка',
                        '🎯 Какие сомнения или возражения остались у клиента?',
                        '🔥 Какой сильный аргумент использовать для закрытия на замер?',
                        '📐 Составь список параметров для замерщика'
                      ].map((suggest, idx) => (
                        <button
                          key={idx}
                          type="button"
                          disabled={isChatReplying}
                          onClick={() => handleSendChatMessage(suggest)}
                          style={{
                            whiteSpace: 'nowrap',
                            fontSize: '0.76rem',
                            padding: '5px 10px',
                            borderRadius: '12px',
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid var(--glass-border)',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {suggest}
                        </button>
                      ))}
                    </div>

                    {/* Chat Messages Stream */}
                    <div style={{
                      background: 'rgba(0, 0, 0, 0.25)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px',
                      minHeight: '260px',
                      maxHeight: '380px',
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      {chatMessages.length === 0 ? (
                        <div style={{
                          margin: 'auto',
                          textAlign: 'center',
                          color: 'var(--text-secondary)',
                          fontSize: '0.86rem',
                          padding: '24px 12px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <Bot size={32} style={{ opacity: 0.7, color: 'var(--accent-primary)' }} />
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Чат с AI-ассистентом по звонку</span>
                          <span style={{ fontSize: '0.78rem', maxWidth: '360px', opacity: 0.8 }}>
                            Задайте любой вопрос по содержанию разговора, попросите сформулировать сообщение клиенту или выделить договоренности.
                          </span>
                        </div>
                      ) : (
                        chatMessages.map((msg, index) => (
                          <div
                            key={index}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                              maxWidth: '85%'
                            }}
                          >
                            <div style={{
                              fontSize: '0.72rem',
                              color: 'var(--text-secondary)',
                              marginBottom: '3px',
                              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              {msg.role === 'user' ? (
                                <><span>Вы (Менеджер)</span> • <span>{msg.timestamp}</span></>
                              ) : (
                                <><Bot size={12} color="var(--accent-primary)" /> <span>AI-Ассистент</span> • <span>{msg.timestamp}</span></>
                              )}
                            </div>
                            <div style={{
                              background: msg.role === 'user' ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.05)',
                              color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                              padding: '10px 14px',
                              borderRadius: msg.role === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                              border: msg.role === 'user' ? 'none' : '1px solid var(--glass-border)',
                              fontSize: '0.9rem',
                              lineHeight: '1.5',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              position: 'relative'
                            }}>
                              {msg.text}
                              {msg.role === 'assistant' && (
                                <button
                                  type="button"
                                  onClick={() => handleCopyTextWithToast(msg.text, "Ответ AI скопирован")}
                                  style={{
                                    position: 'absolute',
                                    top: '6px',
                                    right: '6px',
                                    background: 'rgba(0,0,0,0.3)',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '3px 6px',
                                    cursor: 'pointer',
                                    color: 'var(--text-secondary)',
                                    display: 'flex',
                                    alignItems: 'center'
                                  }}
                                  title="Скопировать сообщение"
                                >
                                  <Copy size={11} />
                                </button>
                              )}
                            </div>
                            {msg.role === 'assistant' && msg.tokensUsed !== undefined && msg.tokensUsed > 0 && (
                              <div style={{
                                fontSize: '0.72rem',
                                color: 'rgba(250, 204, 21, 0.85)',
                                marginTop: '3px',
                                alignSelf: 'flex-start',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                paddingLeft: '4px'
                              }}>
                                <Coins size={11} /> {msg.tokensUsed} токенов • ~{msg.costRubles !== undefined ? msg.costRubles.toFixed(2) : (msg.tokensUsed * 0.0012).toFixed(2)} ₽
                              </div>
                            )}
                          </div>
                        ))
                      )}
                      {isChatReplying && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.82rem', padding: '6px 0' }}>
                          <RefreshCw size={14} className="spinner" style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-primary)' }} />
                          <span>AI формулирует ответ...</span>
                        </div>
                      )}
                      <div ref={chatBottomRef} />
                    </div>

                    {/* Chat Input Bar */}
                    <div
                      style={{
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'center'
                      }}
                    >
                      <input
                        type="text"
                        value={chatInputText}
                        onChange={(e) => setChatInputText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            e.stopPropagation();
                            handleSendChatMessage();
                          }
                        }}
                        placeholder="Спросите AI о звонке (напр. «О чем спорили в конце?», «Напиши текст для WhatsApp»)..."
                        disabled={isChatReplying}
                        className="search-input"
                        style={{
                          flex: 1,
                          padding: '10px 14px',
                          fontSize: '0.88rem',
                          height: '42px',
                          background: 'var(--bg-primary)'
                        }}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleSendChatMessage();
                        }}
                        disabled={isChatReplying || !chatInputText.trim()}
                        className="btn btn-primary"
                        style={{
                          height: '42px',
                          padding: '0 16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          fontWeight: 600
                        }}
                      >
                        <Send size={15} /> Отправить
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="order-drawer-footer modal-actions">
            {editingOrderId && !isWorker ? (
              <button 
                type="button" 
                onClick={handleDeleteOrder}
                className="btn btn-ghost"
                style={{ color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Trash2 size={16} /> {t('kanban.modal.delete') || 'Удалить'}
              </button>
            ) : <div />}

            {editingOrderId && (() => {
              const currentStatus = columns.find(c => c.id.toString() === formData.statusId);
              const isCompleted = currentStatus ? (
                currentStatus.name.toLowerCase().includes('заверш') ||
                currentStatus.name.toLowerCase().includes('готов') ||
                currentStatus.name.toLowerCase().includes('выполнен')
              ) : false;

              if (!isCompleted) {
                const hasInstaller = Boolean(formData.installedById || currentOrder?.installedById || currentOrder?.installedByName);
                const hasAct = formData.attachments.some(a => isActFile(a.fileName, a.isAct)) || pendingFiles.some(f => isActFile(f.name));
                const canComplete = hasInstaller && hasAct;

                let disabledTitle = 'Завершить монтаж и перевести заявку в статус «Завершен»';
                if (!hasInstaller) {
                  disabledTitle = 'Для завершения монтажа необходимо выбрать монтажника';
                } else if (!hasAct) {
                  disabledTitle = 'Для завершения монтажа необходимо прикрепить Акт во вкладке «Файлы»';
                }

                return (
                  <button
                    type="button"
                    disabled={!canComplete}
                    onClick={(e) => handleCompleteInstallation(e, editingOrderId)}
                    className="btn"
                    style={{
                      background: canComplete ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'rgba(255, 255, 255, 0.08)',
                      color: canComplete ? '#fff' : 'var(--text-secondary)',
                      border: canComplete ? 'none' : '1px solid var(--glass-border)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontWeight: 600,
                      padding: '8px 14px',
                      cursor: canComplete ? 'pointer' : 'not-allowed',
                      opacity: canComplete ? 1 : 0.45
                    }}
                    title={disabledTitle}
                  >
                    <CheckCircle2 size={16} /> Завершить монтаж
                  </button>
                );
              }
              return (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#4ade80',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  background: 'rgba(34, 197, 94, 0.12)',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(34, 197, 94, 0.25)'
                }}>
                  <CheckCircle2 size={16} /> Монтаж завершен
                </div>
              );
            })()}

            {(!editingOrderId || isDirty) && (
              <div className="modal-action-btns animate-fade-in" style={{ display: 'flex', gap: '8px' }}>
                <button 
                  type="button" 
                  onClick={handleCancelChanges}
                  className="btn btn-ghost"
                >
                  {t('kanban.modal.cancel') || 'Отмена'}
                </button>
                <button type="submit" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Check size={16} />
                  {editingOrderId ? (t('kanban.modal.save') || 'Сохранить') : (t('kanban.createOrder') || 'Создать заявку')}
                </button>
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Quick Client Modal */}
      <QuickClientModal
        isOpen={isNewClientModalOpen}
        onClose={() => setIsNewClientModalOpen(false)}
        onSubmit={handleCreateQuickClient}
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
        onOpenPassportScanner={() => {
          setPassportScannerTarget('NEW_CLIENT');
          setIsPassportScannerOpen(true);
        }}
        creatingClient={creatingClient}
      />

      {/* Contract Prompt Modal */}
      <ContractPromptModal
        isOpen={isContractPromptOpen}
        onClose={() => setIsContractPromptOpen(false)}
        contractPromptData={contractPromptData}
        setContractPromptData={setContractPromptData}
        onOpenPassportScanner={() => {
          setPassportScannerTarget('CONTRACT');
          setIsPassportScannerOpen(true);
        }}
        onSubmit={async (e) => {
          e.preventDefault();
          if (!editingOrderId) return;
          setContractPromptLoading(true);
          try {
            if (contractPromptData.clientId) {
              await updateClient(contractPromptData.clientId, {
                name: contractPromptData.name,
                phone: contractPromptData.phone,
                birthDate: contractPromptData.birthDate || undefined,
                passportSeriesNumber: contractPromptData.passportSeriesNumber || undefined,
                passportIssuedBy: contractPromptData.passportIssuedBy || undefined,
                passportIssuedDate: contractPromptData.passportIssuedDate || undefined,
                passportDepartmentCode: contractPromptData.passportDepartmentCode || undefined,
                registrationAddress: contractPromptData.registrationAddress || undefined
              });
            }

            const updatedParams: ContractParams = {
              ...getContractParams(),
              area: contractPromptData.area,
              perimeter: contractPromptData.perimeter,
              canvasesCount: contractPromptData.canvasesCount,
              insertLength: contractPromptData.insertLength,
              pipeCount: contractPromptData.pipeCount,
              lightsCount: contractPromptData.lightsCount,
              timberLength: contractPromptData.timberLength,
              canvasArticle: contractPromptData.canvasArticle,
              discount: contractPromptData.discount,
              handoverDate: contractPromptData.handoverDate
            };

            await updateOrder(editingOrderId, {
              contractParams: updatedParams,
              address: contractPromptData.installationAddress || undefined
            });

            const blob = await downloadContractDocx(editingOrderId);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Договор_Заявка_${editingOrderId}.docx`;
            a.click();
            URL.revokeObjectURL(url);
            setIsContractPromptOpen(false);
          } catch (err: any) {
            console.error("Failed to generate docx", err);
            alert(err.response?.data?.message || "Ошибка генерации договора");
          } finally {
            setContractPromptLoading(false);
          }
        }}
        contractPromptLoading={contractPromptLoading}
      />

      {/* Passport OCR Scanner Modal */}
      {isPassportScannerOpen && (
        <PassportScannerModal
          isOpen={isPassportScannerOpen}
          onClose={() => setIsPassportScannerOpen(false)}
          onApply={(res) => {
            if (passportScannerTarget === 'CONTRACT') {
              handleApplyPassportToContract(res);
            } else if (passportScannerTarget === 'NEW_CLIENT') {
              handleApplyPassportToNewClient(res);
            } else if (passportScannerTarget === 'ORDER') {
              handleApplyPassportToOrder(res);
            }
          }}
        />
      )}

      {/* Document Scanner Modal */}
      {isDocScannerOpen && (
        <DocumentScannerModal
          isOpen={isDocScannerOpen}
          onClose={() => setIsDocScannerOpen(false)}
          onScanComplete={async (file) => {
            if (editingOrderId) {
              setUploadingFile(true);
              try {
                const newAtt = await uploadAttachment(editingOrderId, file, docScannerIsAct);
                setFormData(prev => ({
                  ...prev,
                  attachments: [...prev.attachments, newAtt]
                }));
                window.dispatchEvent(new CustomEvent('alta:orders-changed', { detail: { action: 'attachment', orderId: editingOrderId } }));
              } catch (err) {
                console.error("Failed to upload scanned doc", err);
              } finally {
                setUploadingFile(false);
              }
            } else {
              setPendingFiles(prev => [...prev, file]);
            }
          }}
          isAct={docScannerIsAct}
        />
      )}

      {/* Act Upload Action Sheet for Mobile */}
      <ActUploadActionSheet
        isOpen={isActActionSheetOpen}
        onClose={() => setIsActActionSheetOpen(false)}
        onSelectScan={() => {
          setDocScannerIsAct(actionSheetMode === 'ACT');
          setIsDocScannerOpen(true);
        }}
        onSelectFile={() => {
          if (actionSheetMode === 'ACT') {
            actFileInputRef.current?.click();
          } else {
            generalFileInputRef.current?.click();
          }
        }}
        mode={actionSheetMode}
        hasAct={formData.attachments.some(a => a.isAct || isActFile(a.fileName))}
      />

      {/* Unsaved Changes Confirmation Modal */}
      {isUnsavedConfirmOpen && (
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
        </div>
      )}

        </div>,
        document.body
      )}

      {/* In-App Attachment Preview Modal (Works 100% in iOS PWA / Android / Desktop) */}
      <AttachmentPreviewModal
        preview={previewAttachment}
        onClose={handleClosePreviewAttachment}
        onDownload={handleDownloadAttachment}
      />
    </>
  );
};