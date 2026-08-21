import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Plus, MoreVertical, Trash2, Edit2, ChevronDown, Paperclip, Download, Eye, Mic, Phone, MapPin, Navigation, X, Search, Tag, Building2, User, RefreshCw, FileText, AlertCircle, AlertTriangle, FileCheck, CheckCircle2, Check } from 'lucide-react';
import { AddressSuggestions } from 'react-dadata';
import 'react-dadata/dist/react-dadata.css';
import { useTranslation } from 'react-i18next';
import { getOrderStatuses, getOrders, moveOrder, completeOrder, createOrder, updateOrder, uploadAttachment, fetchAttachmentBlob, deleteAttachment, renameAttachment, deleteOrder, createOrderStatus, updateOrderStatus, deleteOrderStatus, reorderOrderStatuses, getAiSummary, uploadAudio, getNextOrderNumber, downloadContractDocx } from '../api/kanban';
import type { OrderStatus, Order, OrderMaterial, OrderAttachment, OrderAiSummary, ContractParams } from '../api/kanban';
import { getClients, createClient, updateClient } from '../api/clients';
import type { Client } from '../api/clients';
import { getContractTemplateStatus } from '../api/settings';
import type { ContractTemplateStatus } from '../api/settings';
import { PRESET_LEAD_SOURCES } from './Clients';
import { getMaterials } from '../api/storage';
import type { Material } from '../api/storage';
import { getEmployees } from '../api/employees';
import type { Employee } from '../api/employees';
import { getEmployeeInitials, getAvatarGradient } from './Employees';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { useSearchParams } from 'react-router-dom';
import { getYandexMapsUrl, get2GisUrl } from '../utils/navigation';
import '../styles/kanban.css';
interface MaterialSearchSelectProps {
  value: number;
  materials: Material[];
  onChange: (materialId: number) => void;
}

const MaterialSearchSelect: React.FC<MaterialSearchSelectProps> = ({ value, materials, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedMaterial = materials.find(m => m.id === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filtered = useMemo(() => {
    if (!search.trim()) return materials;
    const q = search.toLowerCase().trim();
    return materials.filter(m => m.name.toLowerCase().includes(q));
  }, [materials, search]);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', minWidth: 0, flex: 3 }}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearch('');
        }}
        className="material-select-btn"
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: selectedMaterial ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
          {selectedMaterial ? (
            <span>
              <span style={{ fontWeight: 600 }}>{selectedMaterial.name}</span>
              {selectedMaterial.unit && (
                <span style={{ opacity: 0.6, marginLeft: '4px', fontSize: '0.75rem' }}>
                  ({selectedMaterial.unit})
                </span>
              )}
            </span>
          ) : 'Выберите позицию...'}
        </span>
        <ChevronDown size={14} style={{ opacity: 0.6, flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>

      {isOpen && (
        <div className="material-select-dropdown">
          <div className="material-select-search-box">
            <Search size={13} className="material-select-search-icon" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск по названию..."
              className="material-select-search-input"
              onClick={e => e.stopPropagation()}
            />
          </div>

          <div className="material-select-list">
            {filtered.length === 0 ? (
              <div className="material-select-empty">
                Ничего не найдено
              </div>
            ) : (
              filtered.map(m => {
                const isSelected = m.id === value;
                return (
                  <div
                    key={m.id}
                    className={`material-select-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      onChange(m.id);
                      setIsOpen(false);
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
                    {m.unit && <span style={{ fontSize: '0.72rem', opacity: 0.6, marginLeft: '6px', flexShrink: 0 }}>{m.unit}</span>}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const Kanban = () => {
  const { t } = useTranslation();
  const role = useAuthStore(state => state.role);
  const isWorker = role === 'WORKER';
  const { setNewOrdersCount, fetchLowStockMaterials } = useAppStore();
  const [columns, setColumns] = useState<OrderStatus[]>([]);
  const [cards, setCards] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [allMaterials, setAllMaterials] = useState<Material[]>([]);
  const [templateStatus, setTemplateStatus] = useState<ContractTemplateStatus | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);

  // Quick Client Creation
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [newClientType, setNewClientType] = useState<'INDIVIDUAL' | 'LEGAL_ENTITY'>('INDIVIDUAL');
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientInn, setNewClientInn] = useState('');
  const [newClientContactPerson, setNewClientContactPerson] = useState('');
  const [newClientLeadSource, setNewClientLeadSource] = useState('');
  const [newClientCustomLeadSource, setNewClientCustomLeadSource] = useState('');
  const [creatingClient, setCreatingClient] = useState(false);

  const [formData, setFormData] = useState({
    clientId: '',
    statusId: '',
    assigneeId: '',
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
    remainder: '',
    installationPrice: '',
    installationDate: '',
    measurementDate: '',
    contractParams: undefined as ContractParams | undefined,
    materials: [] as OrderMaterial[],
    attachments: [] as OrderAttachment[]
  });
  const [uploadingFile, setUploadingFile] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [editingAttachmentId, setEditingAttachmentId] = useState<number | null>(null);
  const [editingAttachmentName, setEditingAttachmentName] = useState('');
  const [renamingAttachment, setRenamingAttachment] = useState(false);
  
  const [aiSummary, setAiSummary] = useState<OrderAiSummary | null>(null);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [editingColumnId, setEditingColumnId] = useState<number | null>(null);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnColor, setNewColumnColor] = useState('#3b82f6');
  const [searchQuery, setSearchQuery] = useState('');

  // Order Modal Tab State
  const [orderModalTab, setOrderModalTab] = useState<'MAIN' | 'CONTRACT' | 'MATERIALS' | 'FILES' | 'AI'>('MAIN');

  // Contract Generation & Prompt Modal State
  const [isContractPromptOpen, setIsContractPromptOpen] = useState(false);
  const [contractPromptLoading, setContractPromptLoading] = useState(false);
  const [contractPromptData, setContractPromptData] = useState({
    clientId: 0,
    name: '',
    phone: '',
    secondPhone: '',
    birthDate: '',
    passportSeriesNumber: '',
    passportIssuedBy: '',
    passportIssuedDate: '',
    registrationAddress: '',
    installationAddress: '',
    // Ceiling params
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

  const DEFAULT_ACT_CHECKLIST: import('../api/kanban').ActChecklistItem[] = [
    { id: '1', name: 'Установка багета (Ал.)', checked: false },
    { id: '2', name: 'Установка багета (Пл.)', checked: false },
    { id: '3', name: 'Установка натяжного потолка', checked: false },
    { id: '4', name: 'Установка потолочного багета', checked: false },
    { id: '5', name: 'Установка маскировочной вставки', checked: false },
    { id: '6', name: 'Установка потолочного карниза (гардины)', checked: false },
    { id: '7', name: 'Установка светового оборудования', checked: false },
    { id: '8', name: 'Установка и разводка электропроводки', checked: false },
    { id: '9', name: 'Установки вентиляции', checked: false },
    { id: '10', name: 'Установка разделительного багета', checked: false },
    { id: '11', name: 'Установка пожарных сигнализаций, камер, и навесного оборудования', checked: false },
    { id: '12', name: 'Установка обвода трубы', checked: false },
    { id: '13', name: 'Демонтаж замена полотна', checked: false },
    { id: '14', name: 'Установка бруса и 2х уровневых конструкций', checked: false },
    { id: '15', name: 'Установка карниза', checked: false }
  ];

  const mergeActChecklist = (savedList?: import('../api/kanban').ActChecklistItem[]): import('../api/kanban').ActChecklistItem[] => {
    if (!savedList || savedList.length === 0) {
      return DEFAULT_ACT_CHECKLIST.map(item => ({ ...item, checked: false }));
    }
    const savedMap = new Map(savedList.map(it => [it.id, it.checked]));
    const savedNameMap = new Map(savedList.map(it => [it.name, it.checked]));

    const merged = DEFAULT_ACT_CHECKLIST.map(defItem => ({
      ...defItem,
      checked: savedMap.has(defItem.id)
        ? !!savedMap.get(defItem.id)
        : (savedNameMap.has(defItem.name) ? !!savedNameMap.get(defItem.name) : false)
    }));

    const defIds = new Set(DEFAULT_ACT_CHECKLIST.map(d => d.id));
    savedList.forEach(savedItem => {
      if (!defIds.has(savedItem.id)) {
        merged.push(savedItem);
      }
    });

    return merged;
  };

  const openEditModal = (order: Order) => {
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

    setEditingOrderId(order.id);
    setOrderModalTab('MAIN');
    setFormData({
      clientId: order.clientId ? order.clientId.toString() : '',
      statusId: order.statusId ? order.statusId.toString() : (columns[0]?.id ? columns[0].id.toString() : ''),
      assigneeId: order.assigneeId ? order.assigneeId.toString() : '',
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
      remainder: (rem != null && rem > 0) ? rem.toString() : '',
      installationPrice: (order.installationPrice != null && order.installationPrice > 0) ? order.installationPrice.toString() : '',
      installationDate: order.installationDate || '',
      measurementDate: order.measurementDate ? order.measurementDate.slice(0, 16) : '',
      materials: order.materials ? [...order.materials] : [],
      attachments: order.attachments ? [...order.attachments] : [],
      contractParams: initialContractParams
    });
    setPendingFiles([]);
    setAiSummary(null);
    setIsModalOpen(true);
    getAiSummary(order.id).then(setAiSummary).catch(() => setAiSummary(null));
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Reactive listener for opening order modal from notifications or external navigation
  useEffect(() => {
    const orderIdParam = searchParams.get('orderId');
    if (!orderIdParam) return;
    const targetId = parseInt(orderIdParam);
    if (isNaN(targetId)) return;

    const orderToOpen = cards.find(o => o.id === targetId);
    if (orderToOpen) {
      openEditModal(orderToOpen);
      searchParams.delete('orderId');
      setSearchParams(searchParams, { replace: true });
    } else if (!loading && cards.length > 0) {
      // If cards are loaded but order is missing, fetch fresh list
      getOrders().then(orders => {
        setCards(orders);
        const freshOrder = orders.find(o => o.id === targetId);
        if (freshOrder) {
          openEditModal(freshOrder);
          searchParams.delete('orderId');
          setSearchParams(searchParams, { replace: true });
        }
      }).catch(err => console.error("Failed to load order from query param", err));
    }
  }, [searchParams, cards, loading]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statuses, orders, clientsData, materialsData, employeesData, tStatus] = await Promise.all([
        getOrderStatuses().catch(() => []),
        getOrders().catch(() => []),
        !isWorker ? getClients().catch(() => []) : Promise.resolve([]),
        !isWorker ? getMaterials().catch(() => []) : Promise.resolve([]),
        !isWorker ? getEmployees().catch(() => []) : Promise.resolve([]),
        !isWorker ? getContractTemplateStatus().catch(() => null) : Promise.resolve(null)
      ]);
      const sortedColumns = statuses.sort((a, b) => a.sortOrder - b.sortOrder);
      setColumns(sortedColumns);
      setCards(orders);
      setClients(clientsData);
      setAllMaterials(materialsData);
      setEmployees(employeesData);
      if (tStatus) setTemplateStatus(tStatus);
      
      const firstStatus = sortedColumns.find(s => s.sortOrder === 1);
      if (firstStatus) {
        setNewOrdersCount(orders.filter(o => o.statusId === firstStatus.id).length);
      }
      
      const orderIdParam = searchParams.get('orderId');
      if (orderIdParam) {
        const orderToOpen = orders.find(o => o.id === parseInt(orderIdParam));
        if (orderToOpen) {
          openEditModal(orderToOpen);
        }
        searchParams.delete('orderId');
        setSearchParams(searchParams, { replace: true });
      }

    } catch (error) {
      console.error("Failed to fetch kanban data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, id: number) => {
    e.dataTransfer.setData('cardId', id.toString());
  };

  const handleDrop = async (e: React.DragEvent, statusId: number) => {
    const cardIdStr = e.dataTransfer.getData('cardId');
    if (!cardIdStr) return;
    const cardId = parseInt(cardIdStr);
    const updatedCards = cards.map(c => c.id === cardId ? { ...c, statusId } : c);
    setCards(updatedCards);
    
    // Update badge count if needed
    const firstStatus = columns.find(s => s.sortOrder === 1);
    if (firstStatus) {
      setNewOrdersCount(updatedCards.filter(o => o.statusId === firstStatus.id).length);
    }

    try {
      await moveOrder(cardId, statusId);
    } catch (err) {
      console.error("Failed to move order", err);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const openCreateModal = () => {
    setEditingOrderId(null);
    setOrderModalTab('MAIN');
    setFormData({
      clientId: '',
      statusId: columns[0]?.id ? columns[0].id.toString() : '',
      assigneeId: '',
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
      remainder: '',
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
    });
    setPendingFiles([]);
    setAiSummary(null);
    setIsModalOpen(true);
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
        leadSource: finalSource || undefined
      });
      setClients(prev => [created, ...prev]);
      setFormData(prev => ({ ...prev, clientId: created.id.toString() }));
      setIsNewClientModalOpen(false);
      setNewClientType('INDIVIDUAL');
      setNewClientName('');
      setNewClientPhone('');
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

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!columns.length) return;
    
    const prep = parseFloat(formData.prepayment || '0');
    const rem = parseFloat(formData.remainder || '0');
    const total = prep + rem;

    const payload = {
      clientId: parseInt(formData.clientId),
      assigneeId: formData.assigneeId ? parseInt(formData.assigneeId) : undefined,
      installedById: formData.installedById ? parseInt(formData.installedById) : undefined,
      installedAt: formData.installedAt || undefined,
      statusId: formData.statusId ? parseInt(formData.statusId) : (editingOrderId ? cards.find(c => c.id === editingOrderId)?.statusId || columns[0].id : columns[0].id),
      orderNumber: (formData.orderNumber && formData.orderNumber.trim()) ? formData.orderNumber.trim() : null,
      address: formData.address,
      entrance: formData.entrance || undefined,
      floor: formData.floor || undefined,
      description: formData.description,
      prepayment: prep,
      remainder: rem,
      totalPrice: total,
      installationPrice: parseFloat(formData.installationPrice || '0'),
      installationDate: formData.installationDate || undefined,
      measurementDate: formData.measurementDate || undefined,
      contractParams: formData.contractParams,
      materials: formData.materials.map(m => ({
        materialId: m.materialId,
        quantity: typeof m.quantity === 'string' ? parseFloat(m.quantity) : m.quantity
      }))
    };

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
      setIsModalOpen(false);
      fetchData(); 
      fetchLowStockMaterials();
    } catch (err) {
      console.error("Failed to save order", err);
    }
  };

  const handleDeleteOrder = async () => {
    if (!editingOrderId) return;
    if (window.confirm("Are you sure you want to delete this order?")) {
      try {
        await deleteOrder(editingOrderId);
        setIsModalOpen(false);
        fetchData();
        fetchLowStockMaterials();
      } catch (err) {
        console.error("Failed to delete order", err);
      }
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
      !client.registrationAddress?.trim() ||
      !formData.address?.trim()
    );

    if (isMissingPassport) {
      const cp = getContractParams();
      setContractPromptData({
        clientId: client.id,
        name: client.name || '',
        phone: client.phone || '',
        secondPhone: cp.secondPhone || (client.contacts?.[0]?.phone || ''),
        birthDate: client.birthDate || '',
        passportSeriesNumber: client.passportSeriesNumber || '',
        passportIssuedBy: client.passportIssuedBy || '',
        passportIssuedDate: client.passportIssuedDate || '',
        registrationAddress: client.registrationAddress || '',
        installationAddress: formData.address || (client.actualAddress || ''),
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
      setIsContractPromptOpen(true);
    } else {
      await executeContractDownload(client.id, getContractParams());
    }
  };

  const executeContractDownload = async (clientId: number, currentContractParams?: ContractParams) => {
    try {
      setContractPromptLoading(true);

      // Ensure order has orderNumber
      let currentOrderNumber = formData.orderNumber?.trim();
      if (!currentOrderNumber) {
        currentOrderNumber = await getNextOrderNumber();
        setFormData(prev => ({ ...prev, orderNumber: currentOrderNumber }));
      }

      let targetOrderId = editingOrderId;
      const prep = parseFloat(formData.prepayment || '0');
      const rem = parseFloat(formData.remainder || '0');
      const total = prep + rem;
      const effectiveContractParams = currentContractParams || getContractParams();

      const payload = {
        clientId,
        statusId: formData.statusId ? parseInt(formData.statusId) : (editingOrderId ? cards.find(c => c.id === editingOrderId)?.statusId || columns[0].id : columns[0].id),
        assigneeId: formData.assigneeId ? parseInt(formData.assigneeId) : undefined,
        installedById: formData.installedById ? parseInt(formData.installedById) : undefined,
        installedAt: formData.installedAt || undefined,
        orderNumber: currentOrderNumber,
        address: formData.address,
        entrance: formData.entrance || undefined,
        floor: formData.floor || undefined,
        description: formData.description,
        prepayment: prep,
        remainder: rem,
        totalPrice: total,
        installationPrice: parseFloat(formData.installationPrice || '0'),
        installationDate: formData.installationDate || undefined,
        measurementDate: formData.measurementDate || undefined,
        contractParams: effectiveContractParams,
        materials: formData.materials.map(m => ({
          materialId: m.materialId,
          quantity: typeof m.quantity === 'string' ? parseFloat(m.quantity) : m.quantity
        }))
      };

      if (!targetOrderId) {
        const created = await createOrder(payload);
        targetOrderId = created.id;
        setEditingOrderId(created.id);
      } else {
        await updateOrder(targetOrderId, payload);
      }

      const docxBlob = await downloadContractDocx(targetOrderId);
      const blobUrl = window.URL.createObjectURL(docxBlob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `Договор_${currentOrderNumber || targetOrderId}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);

      fetchData();
      setIsContractPromptOpen(false);
    } catch (err: any) {
      console.error('Failed to generate contract', err);
      alert('Ошибка при формировании договора: ' + (err.message || err));
    } finally {
      setContractPromptLoading(false);
    }
  };

  const isActFile = (fileName?: string) => {
    if (!fileName) return false;
    const lower = fileName.trim().toLowerCase();
    return lower.includes('акт') || lower.includes('act') || lower.includes('akt');
  };

  const handleCompleteInstallation = async (e: React.MouseEvent, orderId: number) => {
    e.stopPropagation();
    const card = cards.find(c => c.id === orderId);
    const currentAttachments = (editingOrderId === orderId && formData.attachments.length > 0)
      ? formData.attachments 
      : (card?.attachments || []);
    const hasAct = currentAttachments.some(a => isActFile(a.fileName));
    if (!hasAct) {
      alert('Для завершения монтажа необходимо прикрепить «Акт выполненных работ» во вкладке «Файлы».');
      return;
    }

    try {
      const updatedOrder = await completeOrder(orderId);
      setCards(prevCards => prevCards.map(c => c.id === orderId ? {
        ...c,
        statusId: updatedOrder.statusId || c.statusId,
        installedByName: updatedOrder.installedByName || c.installedByName,
        installedAt: updatedOrder.installedAt || new Date().toISOString()
      } : c));
      setIsModalOpen(false);
      setEditingOrderId(null);
      fetchData();
    } catch (err: any) {
      console.error('Failed to complete installation', err);
      alert(err.response?.data?.message || err.message || 'Не удалось перевести заявку в завершенный статус');
    }
  };

  const handleSavePromptAndGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setContractPromptLoading(true);
      // 1. Update client in DB
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
          registrationAddress: contractPromptData.registrationAddress.trim()
        });
      }

      // 2. Update address in formData if modified
      if (contractPromptData.installationAddress.trim()) {
        setFormData(prev => ({ ...prev, address: contractPromptData.installationAddress.trim() }));
      }

      // 3. Update client list
      const updatedClients = await getClients();
      setClients(updatedClients);

      // 4. Download contract preserving current contractParams
      await executeContractDownload(contractPromptData.clientId, getContractParams());
    } catch (err: any) {
      console.error('Failed to save contract data', err);
      alert('Ошибка при сохранении данных: ' + (err.message || err));
      setContractPromptLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (editingOrderId) {
      setUploadingFile(true);
      try {
        const newAttachment = await uploadAttachment(editingOrderId, file);
        setFormData(prev => ({
          ...prev,
          attachments: [...prev.attachments, newAttachment]
        }));
        setCards(prev => prev.map(c => c.id === editingOrderId ? {
          ...c,
          attachments: [...(c.attachments || []), newAttachment]
        } : c));
        fetchData();
      } catch (err: any) {
        console.error("Failed to upload file", err);
        alert(err.response?.data?.message || "Не удалось загрузить файл");
      } finally {
        setUploadingFile(false);
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

  const handleActUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const originalFile = e.target.files?.[0];
    if (!originalFile) return;

    let newFileName = originalFile.name;
    if (!isActFile(newFileName)) {
      newFileName = `Акт выполненных работ - ${originalFile.name}`;
    }
    const file = new File([originalFile], newFileName, { type: originalFile.type });

    if (editingOrderId) {
      setUploadingFile(true);
      try {
        const newAttachment = await uploadAttachment(editingOrderId, file);
        setFormData(prev => ({
          ...prev,
          attachments: [...prev.attachments, newAttachment]
        }));
        setCards(prev => prev.map(c => c.id === editingOrderId ? {
          ...c,
          attachments: [...(c.attachments || []), newAttachment]
        } : c));
        fetchData();
      } catch (err: any) {
        console.error("Failed to upload act file", err);
        alert(err.response?.data?.message || "Не удалось загрузить Акт");
      } finally {
        setUploadingFile(false);
        e.target.value = '';
      }
    } else {
      setPendingFiles(prev => [...prev, file]);
      e.target.value = '';
    }
  };

  const isViewableInBrowser = (fileName: string, contentType?: string) => {
    const name = fileName.toLowerCase();
    const type = (contentType || '').toLowerCase();
    if (type.startsWith('image/') || type.startsWith('audio/') || type.startsWith('video/') || type.startsWith('text/') || type.includes('pdf')) {
      return true;
    }
    return /\.(pdf|png|jpe?g|gif|webp|svg|bmp|txt|csv|log|mp3|wav|ogg|mp4|webm)$/i.test(name);
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
      setCards(prev => prev.map(c => c.id === editingOrderId ? {
        ...c,
        attachments: (c.attachments || []).filter(a => a.id !== attachmentId)
      } : c));
    } catch (err) {
      console.error("Failed to delete attachment", err);
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
      setCards(prev => prev.map(c => c.id === editingOrderId ? {
        ...c,
        attachments: (c.attachments || []).map(a => a.id === attachmentId ? { ...a, fileName: updated.fileName } : a)
      } : c));
      setEditingAttachmentId(null);
      setEditingAttachmentName('');
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
    } catch (err) {
      console.error("Failed to upload audio", err);
    } finally {
      setUploadingAudio(false);
      e.target.value = '';
    }
  };

  const refreshAiSummary = async () => {
    if (editingOrderId) {
      try {
        const summary = await getAiSummary(editingOrderId);
        setAiSummary(summary);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSaveColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingColumnId) {
        await updateOrderStatus(editingColumnId, {
          name: newColumnName,
          color: newColumnColor
        });
      } else {
        await createOrderStatus({
          name: newColumnName,
          color: newColumnColor,
          sortOrder: columns.length + 1
        });
      }
      setIsColumnModalOpen(false);
      setEditingColumnId(null);
      setNewColumnName('');
      setNewColumnColor('#3b82f6');
      fetchData();
    } catch (err) {
      console.error("Failed to save column", err);
    }
  };

  const openColumnEditModal = (col: OrderStatus) => {
    setEditingColumnId(col.id);
    setNewColumnName(col.name);
    setNewColumnColor(col.color || '#3b82f6');
    setIsColumnModalOpen(true);
  };

  const openColumnAddModal = () => {
    setEditingColumnId(null);
    setNewColumnName('');
    setNewColumnColor('#3b82f6');
    setIsColumnModalOpen(true);
  };

  const handleDeleteColumn = async (id: number) => {
    if (cards.some(c => c.statusId === id)) {
      alert(t('kanban.deleteColumnError'));
      return;
    }
    if (window.confirm(t('kanban.deleteColumnConfirm'))) {
      try {
        await deleteOrderStatus(id);
        fetchData();
      } catch (err) {
        console.error("Failed to delete column", err);
        alert(t('kanban.deleteColumnError'));
      }
    }
  };

  const addMaterialRow = () => {
    if (allMaterials.length === 0) return;
    setFormData({
      ...formData,
      materials: [
        ...formData.materials, 
        { materialId: allMaterials[0].id, quantity: 1 }
      ]
    });
  };

  const updateMaterialRow = (index: number, field: string, value: string | number) => {
    const updated = [...formData.materials];
    if (field === 'materialId') updated[index].materialId = typeof value === 'number' ? value : parseInt(value);
    if (field === 'quantity') updated[index].quantity = typeof value === 'number' ? value : (parseFloat(value) || 0);
    setFormData({ ...formData, materials: updated });
  };

  const removeMaterialRow = (index: number) => {
    const updated = formData.materials.filter((_, i) => i !== index);
    setFormData({ ...formData, materials: updated });
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

  const addSpecRow = () => {
    const cp = getContractParams();
    const currentItems = cp.specItems || [];
    const newItem = {
      idx: currentItems.length + 1,
      name: '',
      quantity: '1',
      unit: 'шт.',
      price: 0,
      total: 0
    };
    updateContractParam('specItems', [...currentItems, newItem]);
  };

  const updateSpecRow = (idx: number, field: string, value: any) => {
    const cp = getContractParams();
    const currentItems = [...(cp.specItems || [])];
    if (!currentItems[idx]) return;
    
    const row = { ...currentItems[idx], [field]: value };
    if (field === 'quantity' || field === 'price') {
      const q = parseFloat(String(row.quantity).replace(',', '.') || '0');
      const p = parseFloat(String(row.price) || '0');
      row.total = Math.round(q * p * 100) / 100;
    }
    currentItems[idx] = row;
    updateContractParam('specItems', currentItems);
  };

  const removeSpecRow = (idx: number) => {
    const cp = getContractParams();
    const currentItems = (cp.specItems || []).filter((_, i) => i !== idx);
    updateContractParam('specItems', currentItems);
  };

  const populateSpecFromOrderMaterials = () => {
    if (formData.materials.length === 0) {
      alert('Во вкладке «Материалы» нет добавленных позиций.');
      return;
    }
    const newItems = formData.materials.map((m, idx) => {
      const mat = allMaterials.find(item => item.id === m.materialId);
      const name = mat?.name || 'Материал / Услуга';
      const unit = mat?.unit || 'шт.';
      const qty = String(m.quantity || 1);
      const price = mat?.salePrice != null && mat.salePrice > 0 ? mat.salePrice : (mat?.costPrice || 0);
      const qNum = parseFloat(qty.replace(',', '.') || '0');
      return {
        idx: idx + 1,
        name,
        quantity: qty,
        unit,
        price,
        total: Math.round(qNum * price * 100) / 100
      };
    });
    updateContractParam('specItems', newItems);
  };

  const toggleActItem = (itemId: string) => {
    const cp = getContractParams();
    const list = mergeActChecklist(cp.actChecklist);
    const updated = list.map(it => it.id === itemId ? { ...it, checked: !it.checked } : it);
    updateContractParam('actChecklist', updated);
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

  const currentInstallationPrice = useMemo(() => {
    return Math.round(parseFloat(formData.installationPrice || '0') || 0);
  }, [formData.installationPrice]);

  const currentTotalPrice = useMemo(() => {
    const prep = parseFloat(formData.prepayment || '0') || 0;
    const rem = parseFloat(formData.remainder || '0') || 0;
    return Math.round(prep + rem);
  }, [formData.prepayment, formData.remainder]);

  const currentProfit = useMemo(() => {
    return Math.round(currentTotalPrice - currentMaterialsCost - currentInstallationPrice);
  }, [currentTotalPrice, currentMaterialsCost, currentInstallationPrice]);

  const currentProfitMargin = useMemo(() => {
    if (currentTotalPrice <= 0) return 0;
    return Math.round((currentProfit / currentTotalPrice) * 100);
  }, [currentProfit, currentTotalPrice]);

  if (loading) {
    return <div style={{padding: 24}}>Loading board...</div>;
  }

  const filteredCards = cards.filter(card => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const client = clients.find(cl => cl.id === card.clientId);
    const employee = employees.find(e => e.id === card.assigneeId);

    const orderNumMatch = card.orderNumber?.toLowerCase().includes(q) || false;
    const clientNameMatch = client?.name?.toLowerCase().includes(q) || false;
    const clientPhoneMatch = client?.phone?.includes(q) || false;
    const addressMatch = card.address?.toLowerCase().includes(q) || false;
    const descMatch = card.description?.toLowerCase().includes(q) || false;
    const employeeMatch = employee?.name?.toLowerCase().includes(q) || false;
    const idMatch = card.id.toString() === q || `№${card.id}` === q;

    return orderNumMatch || clientNameMatch || clientPhoneMatch || addressMatch || descMatch || employeeMatch || idMatch;
  });

  return (
    <div className="kanban-wrapper">
      <div className="kanban-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0 }}>{t('kanban.title')}</h1>
          
          <div className="search-input-wrapper" style={{ minWidth: '300px', maxWidth: '400px', position: 'relative' }}>
            <Search className="search-icon" size={18} />
            <input 
              type="text" 
              placeholder="Поиск по клиенту, адресу, № договора..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
              style={{ width: '100%', paddingRight: searchQuery ? '32px' : '12px' }}
            />
            {searchQuery && (
              <button 
                type="button" 
                onClick={() => setSearchQuery('')}
                className="btn-icon"
                style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', padding: '2px', color: 'var(--text-secondary)' }}
                title="Очистить поиск"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {!isWorker && (
          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={18} /> {t('kanban.addOrder')}
          </button>
        )}
      </div>

      <div 
        className="kanban-board"
        ref={boardRef}
        onWheel={(e) => {
          if (e.deltaY !== 0 && !e.shiftKey) {
            const target = e.target as HTMLElement;
            const columnContent = target.closest('.column-content');
            if (columnContent) {
              const canScrollUp = e.deltaY < 0 && columnContent.scrollTop > 0;
              const canScrollDown = e.deltaY > 0 && columnContent.scrollTop + columnContent.clientHeight < columnContent.scrollHeight - 1;
              if (canScrollUp || canScrollDown) {
                return;
              }
            }
            if (boardRef.current) {
              boardRef.current.scrollLeft += e.deltaY;
            }
          }
        }}
      >
        {columns.map(col => {
          const colCards = filteredCards.filter(c => c.statusId === col.id);
          const totalInCol = cards.filter(c => c.statusId === col.id).length;

          return (
          <div 
            key={col.id} 
            className="kanban-column glass-panel"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('columnId', col.id.toString());
            }}
            onDrop={async (e) => {
              e.preventDefault();
              const cardId = e.dataTransfer.getData('cardId');
              if (cardId) {
                handleDrop(e, col.id);
                return;
              }
              const sourceColumnIdStr = e.dataTransfer.getData('columnId');
              if (sourceColumnIdStr) {
                const sourceId = parseInt(sourceColumnIdStr);
                const targetId = col.id;
                if (sourceId !== targetId) {
                  const sourceIndex = columns.findIndex(c => c.id === sourceId);
                  const targetIndex = columns.findIndex(c => c.id === targetId);
                  if (sourceIndex > -1 && targetIndex > -1) {
                    const newColumns = [...columns];
                    const [removed] = newColumns.splice(sourceIndex, 1);
                    newColumns.splice(targetIndex, 0, removed);
                    
                    newColumns.forEach((c, index) => {
                      c.sortOrder = index + 1;
                    });
                    setColumns(newColumns);
                    
                    const firstStatus = newColumns.find(s => s.sortOrder === 1);
                    if (firstStatus) {
                      setNewOrdersCount(cards.filter(o => o.statusId === firstStatus.id).length);
                    }
                    
                    try {
                      await reorderOrderStatuses(newColumns.map(c => c.id));
                    } catch (err) {
                      console.error("Failed to reorder columns", err);
                    }
                  }
                }
              }
            }}
            onDragOver={handleDragOver}
          >
            <div className="column-header">
              <div className="column-title">
                <span className="dot" style={{ backgroundColor: col.color || '#3b82f6' }}></span>
                <h3>{col.name}</h3>
                <span className="count">
                  {searchQuery.trim() && colCards.length !== totalInCol
                    ? `${colCards.length}/${totalInCol}`
                    : totalInCol}
                </span>
              </div>
              {!isWorker && (
                <div style={{display: 'flex', gap: '4px'}}>
                  <button className="btn-icon" onClick={() => openColumnEditModal(col)} title={t('kanban.editColumn')}>
                    <Edit2 size={16} />
                  </button>
                  {totalInCol === 0 ? (
                    <button className="btn-icon" onClick={() => handleDeleteColumn(col.id)} title={t('kanban.modal.delete')}>
                      <Trash2 size={16} />
                    </button>
                  ) : (
                    <button className="btn-icon"><MoreVertical size={16} /></button>
                  )}
                </div>
              )}
            </div>

            <div className="column-content">
              {colCards.map(card => (
                <div 
                  key={card.id} 
                  className="kanban-card"
                  draggable
                  onDragStart={(e) => {
                    e.stopPropagation();
                    handleDragStart(e, card.id);
                  }}
                  onClick={() => openEditModal(card)}
                >
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
                    {(() => {
                      const client = clients.find(cl => cl.id === card.clientId);
                      const cName = card.clientName || client?.name || `Клиент #${card.clientId}`;
                      const cPhone = card.clientPhone || client?.phone;
                      const cType = card.clientType || client?.clientType;
                      const isLegal = cType === 'LEGAL_ENTITY';

                      return (
                        <div style={{display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap'}}>
                          <span 
                            style={{ 
                              fontSize: '0.72rem', 
                              fontWeight: 700, 
                              color: 'var(--text-secondary)', 
                              background: 'rgba(255, 255, 255, 0.06)', 
                              padding: '1px 5px', 
                              borderRadius: '4px' 
                            }}
                            title="Внутренний номер заявки"
                          >
                            #{card.id}
                          </span>
                          <div className="card-client" style={{marginBottom: 0, display: 'flex', alignItems: 'center', gap: '4px'}}>
                            {isLegal && <Building2 size={13} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />}
                            {cName}
                          </div>
                          {card.orderNumber && (
                            <span 
                              style={{
                                fontSize: '0.7rem',
                                fontFamily: 'monospace',
                                fontWeight: 700,
                                background: 'rgba(34, 197, 94, 0.15)',
                                color: '#4ade80',
                                padding: '2px 6px',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid rgba(34, 197, 94, 0.3)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                              title="Номер заключенного договора"
                            >
                              <FileText size={10} />
                              № {card.orderNumber}
                            </span>
                          )}
                          {cPhone && (
                            <a
                              href={`tel:${cPhone}`}
                              onClick={(e) => e.stopPropagation()}
                              title={`Позвонить: ${cPhone}`}
                              style={{
                                color: 'var(--success)',
                                padding: '3px 6px',
                                background: 'rgba(34, 197, 94, 0.12)',
                                border: '1px solid rgba(34, 197, 94, 0.25)',
                                borderRadius: 'var(--radius-sm)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                textDecoration: 'none',
                                fontSize: '0.75rem',
                                fontWeight: 500
                              }}
                            >
                              <Phone size={12} />
                            </a>
                          )}
                        </div>
                      );
                    })()}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      {card.createdAt && (
                        <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>
                          {new Date(card.createdAt).toLocaleDateString('ru-RU')}
                        </div>
                      )}
                      {(() => {
                        const assignee = employees.find(e => e.id === card.assigneeId);
                        const aName = card.assigneeName || assignee?.name;
                        const aAvatar = card.assigneeAvatarUrl || assignee?.avatarUrl;
                        if (!aName) return null;
                        return (
                          <div
                            title={`Ответственный: ${aName}${assignee?.position ? ` (${assignee.position})` : ''}`}
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '50%',
                              overflow: 'hidden',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              color: '#fff',
                              background: aAvatar ? 'transparent' : getAvatarGradient(aName),
                              border: '2px solid rgba(255, 255, 255, 0.18)',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                              flexShrink: 0,
                              cursor: 'default'
                            }}
                          >
                            {aAvatar ? (
                              <img 
                                src={aAvatar} 
                                alt={aName} 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                              />
                            ) : (
                              getEmployeeInitials(aName)
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  <div 
                    className="card-desc" 
                    style={{ 
                      whiteSpace: 'pre-wrap', 
                      wordBreak: 'break-word',
                      maxHeight: '140px',
                      overflowY: 'auto'
                    }}
                  >
                    {card.description}
                  </div>
                  
                  {card.address && (
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        fontSize: '0.8rem', 
                        color: 'var(--text-secondary)',
                        background: 'rgba(255, 255, 255, 0.03)',
                        padding: '4px 8px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        marginBottom: '8px',
                        gap: '6px'
                      }}
                    >
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1
                      }}>
                        <MapPin size={13} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {card.address}
                          {(card.entrance || card.floor) && (
                            <span style={{ opacity: 0.85, marginLeft: '4px', fontSize: '0.75rem' }}>
                              ({[card.entrance ? `под. ${card.entrance}` : '', card.floor ? `эт. ${card.floor}` : ''].filter(Boolean).join(', ')})
                            </span>
                          )}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                        <a
                          href={getYandexMapsUrl(card.address, card.entrance)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Маршрут в Яндекс.Картах"
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            color: '#ff3333',
                            background: 'rgba(255, 51, 51, 0.1)',
                            border: '1px solid rgba(255, 51, 51, 0.2)',
                            borderRadius: '4px',
                            padding: '2px 5px',
                            textDecoration: 'none'
                          }}
                        >
                          Яндекс
                        </a>
                        <a
                          href={get2GisUrl(card.address, card.entrance)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Маршрут в 2ГИС"
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            color: '#22c55e',
                            background: 'rgba(34, 197, 94, 0.1)',
                            border: '1px solid rgba(34, 197, 94, 0.2)',
                            borderRadius: '4px',
                            padding: '2px 5px',
                            textDecoration: 'none'
                          }}
                        >
                          2ГИС
                        </a>
                      </div>
                    </div>
                  )}

                  <div style={{display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px'}}>
                    {card.installationDate && (
                      <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 500}}>
                        <span>{t('kanban.modal.installationDate')}:</span>
                        <span>{new Date(card.installationDate).toLocaleDateString('ru-RU')}</span>
                      </div>
                    )}
                    {card.measurementDate && (
                      <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500}}>
                        <span>Замер:</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {new Date(card.measurementDate).toLocaleString('ru-RU', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                  {isWorker ? (() => {
                    const col = columns.find(c => c.id === card.statusId);
                    const isCardCompleted = col ? (
                      col.name.toLowerCase().includes('заверш') ||
                      col.name.toLowerCase().includes('готов') ||
                      col.name.toLowerCase().includes('выполнен')
                    ) : false;
                    const hasAct = (card.attachments || []).some(a => isActFile(a.fileName));

                    return (
                      <div className="card-footer" style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'stretch' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            Остаток к оплате: <strong style={{ color: 'var(--accent-primary)', fontSize: '0.9rem' }}>{(card.remainder != null ? card.remainder : (card.totalPrice || 0)).toLocaleString('ru-RU')} ₽</strong>
                          </div>
                          {card.attachments && card.attachments.length > 0 && (
                            <div style={{display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: hasAct ? '#4ade80' : 'var(--text-secondary)'}} title={hasAct ? 'Акт выполненных работ прикреплен' : undefined}>
                              <Paperclip size={12} /> {card.attachments.length} {hasAct && <span style={{ fontWeight: 600 }}>✓ Акт</span>}
                            </div>
                          )}
                        </div>

                        {isCardCompleted ? (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            padding: '6px 10px',
                            background: 'rgba(34, 197, 94, 0.12)',
                            border: '1px solid rgba(34, 197, 94, 0.25)',
                            borderRadius: 'var(--radius-sm)',
                            color: '#4ade80',
                            fontSize: '0.8rem',
                            fontWeight: 600
                          }}>
                            <CheckCircle2 size={14} /> Монтаж завершен
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <button
                              type="button"
                              disabled={!hasAct}
                              onClick={(e) => handleCompleteInstallation(e, card.id)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                padding: '7px 12px',
                                background: hasAct ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'rgba(255, 255, 255, 0.08)',
                                border: hasAct ? 'none' : '1px solid var(--glass-border)',
                                borderRadius: 'var(--radius-sm)',
                                color: hasAct ? '#fff' : 'var(--text-secondary)',
                                fontSize: '0.82rem',
                                fontWeight: 600,
                                cursor: hasAct ? 'pointer' : 'not-allowed',
                                opacity: hasAct ? 1 : 0.6,
                                boxShadow: hasAct ? '0 2px 8px rgba(34, 197, 94, 0.25)' : 'none',
                                transition: 'all 0.15s ease'
                              }}
                              title={hasAct ? 'Перевести заявку в статус «Завершено»' : 'Для завершения монтажа необходимо прикрепить Акт выполненных работ в карточке заказа'}
                            >
                              <CheckCircle2 size={15} /> Завершить монтаж
                            </button>
                            {!hasAct && (
                              <div style={{ fontSize: '0.72rem', color: '#f59e0b', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                <AlertTriangle size={11} /> Требуется Акт выполненных работ
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })() : (
                    <div className="card-footer" style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'stretch' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="card-price">{(card.totalPrice || 0).toLocaleString('ru-RU')} ₽</span>
                        <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                          {card.attachments && card.attachments.length > 0 && (
                            <div style={{display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)'}}>
                              <Paperclip size={12} /> {card.attachments.length}
                            </div>
                          )}
                          {card.profitMargin != null && card.profitMargin > 0 && (
                            <span style={{fontSize: '0.75rem', color: 'var(--success)'}}>+{card.profitMargin.toFixed(1)}%</span>
                          )}
                        </div>
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        fontSize: '0.75rem', 
                        color: 'var(--text-secondary)',
                        background: 'rgba(255, 255, 255, 0.03)',
                        padding: '3px 6px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid rgba(255, 255, 255, 0.04)'
                      }}>
                        <span>Аванс: <strong style={{ color: 'var(--text-primary)' }}>{(card.prepayment || 0).toLocaleString('ru-RU')} ₽</strong></span>
                        <span>Остаток: <strong style={{ color: 'var(--text-primary)' }}>{((card.remainder != null ? card.remainder : card.totalPrice) || 0).toLocaleString('ru-RU')} ₽</strong></span>
                      </div>
                      {card.installedByName && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          color: '#4ade80',
                          background: 'rgba(34, 197, 94, 0.08)',
                          border: '1px solid rgba(34, 197, 94, 0.2)',
                          padding: '3px 7px',
                          borderRadius: '4px',
                          gap: '4px'
                        }} title={card.installedAt ? `Монтаж завершен: ${new Date(card.installedAt).toLocaleString('ru-RU')}` : 'Монтаж выполнен'}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <CheckCircle2 size={12} style={{ flexShrink: 0 }} /> Монтажник: {card.installedByName}
                          </span>
                          {card.installedAt && (
                            <span style={{ fontSize: '0.68rem', opacity: 0.8, color: 'var(--text-secondary)', flexShrink: 0 }}>
                              {new Date(card.installedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {searchQuery.trim() && colCards.length === 0 && (
                <div style={{ textAlign: 'center', padding: '24px 12px', fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                  Нет совпадений
                </div>
              )}
            </div>
          </div>
          );
        })}
        
        {!isWorker && (
          <button 
            className="kanban-column add-column-btn glass-panel" 
            onClick={openColumnAddModal}
            style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minWidth: '320px', cursor: 'pointer', opacity: 0.7, border: '2px dashed var(--glass-border)' }}
          >
            <Plus size={24} style={{ marginRight: '8px' }} />
            <span style={{ fontSize: '1.1rem', fontWeight: 500 }}>{t('kanban.addColumn')}</span>
          </button>
        )}
      </div>

      {isModalOpen && createPortal(
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px', width: '92%', minHeight: '620px', display: 'flex', flexDirection: 'column' }}>
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
                onClick={() => setIsModalOpen(false)} 
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
                {!isWorker && (
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
                    {formData.orderNumber ? (
                      <span style={{ fontSize: '0.72rem', background: 'rgba(34, 197, 94, 0.18)', color: '#4ade80', padding: '1px 6px', borderRadius: '8px', fontWeight: 600 }}>
                        {formData.orderNumber}
                      </span>
                    ) : null}
                  </button>
                )}
                {!isWorker && (
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
                    <Tag size={15} /> Материалы и услуги {formData.materials.length > 0 && `(${formData.materials.length})`}
                  </button>
                )}
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
                  <Paperclip size={15} /> Файлы {(formData.attachments.length + pendingFiles.length) > 0 && `(${formData.attachments.length + pendingFiles.length})`}
                </button>
                {!isWorker && editingOrderId && (
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
                    <Mic size={15} /> AI анализ звонков
                  </button>
                )}
              </div>

              <div className="modal-body" style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', padding: '16px 20px' }}>
                {/* 1. ОСНОВНОЕ */}
                {orderModalTab === 'MAIN' && (
                  <>
                    <div className="form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label style={{ margin: 0 }}>{t('kanban.modal.client')}</label>
                        {!isWorker && (
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
                      {isWorker ? (() => {
                        const currentOrder = cards.find(c => c.id === editingOrderId);
                        const selectedClient = clients.find(c => c.id.toString() === formData.clientId);
                        const cName = currentOrder?.clientName || selectedClient?.name || 'Клиент';
                        const cPhone = currentOrder?.clientPhone || selectedClient?.phone;
                        const cType = currentOrder?.clientType || selectedClient?.clientType;
                        const isLegal = cType === 'LEGAL_ENTITY';

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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {isLegal ? <Building2 size={16} style={{ color: 'var(--accent-primary)' }} /> : <User size={16} style={{ color: 'var(--accent-primary)' }} />}
                              <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{cName}</span>
                              <span style={{
                                fontSize: '0.72rem',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: isLegal ? 'rgba(59, 130, 246, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                                color: isLegal ? '#60a5fa' : '#4ade80'
                              }}>
                                {isLegal ? '🏢 Юр. лицо' : '👤 Физ. лицо'}
                              </span>
                            </div>
                            {cPhone && (
                              <a
                                href={`tel:${cPhone}`}
                                style={{
                                  color: 'var(--success)',
                                  padding: '4px 10px',
                                  background: 'rgba(34, 197, 94, 0.12)',
                                  border: '1px solid rgba(34, 197, 94, 0.25)',
                                  borderRadius: 'var(--radius-sm)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  textDecoration: 'none',
                                  fontSize: '0.85rem',
                                  fontWeight: 600
                                }}
                              >
                                <Phone size={14} /> {cPhone}
                              </a>
                            )}
                          </div>
                        );
                      })() : (
                        <>
                          <div className="custom-select-wrapper">
                            <select 
                              required
                              value={formData.clientId}
                              onChange={(e) => {
                                if (e.target.value === '__NEW_CLIENT__') {
                                  setIsNewClientModalOpen(true);
                                } else {
                                  setFormData({...formData, clientId: e.target.value});
                                }
                              }}
                              className="custom-select"
                            >
                              <option value="" disabled>{t('kanban.modal.selectClient')}</option>
                              <option value="__NEW_CLIENT__" style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>
                                + {t('clients.addClient') || 'Создать клиента...'}
                              </option>
                              {clients.map(c => {
                                const isLegal = c.clientType === 'LEGAL_ENTITY';
                                return (
                                  <option key={c.id} value={c.id}>
                                    {isLegal ? `🏢 ${c.name} ${c.inn ? `(ИНН: ${c.inn})` : ''}` : `👤 ${c.name} ${c.phone ? `(${c.phone})` : ''}`}
                                  </option>
                                );
                              })}
                            </select>
                            <ChevronDown className="custom-select-icon" size={16} />
                          </div>
                          {(() => {
                            const selectedClient = clients.find(c => c.id.toString() === formData.clientId);
                            if (selectedClient) {
                              const isLegal = selectedClient.clientType === 'LEGAL_ENTITY';
                              return (
                                <div style={{
                                  marginTop: '8px',
                                  padding: '8px 12px',
                                  background: 'rgba(255, 255, 255, 0.03)',
                                  border: '1px solid var(--glass-border)',
                                  borderRadius: 'var(--radius-sm)',
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  gap: '12px',
                                  alignItems: 'center'
                                }}>
                                  <span style={{
                                    padding: '3px 8px',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    borderRadius: 'var(--radius-sm)',
                                    background: isLegal ? 'rgba(59, 130, 246, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                                    color: isLegal ? '#60a5fa' : '#4ade80',
                                    border: isLegal ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(34, 197, 94, 0.3)'
                                  }}>
                                    {isLegal ? '🏢 Юр. лицо' : '👤 Физ. лицо'}
                                  </span>
                                  {selectedClient.phone && (
                                    <a
                                      href={`tel:${selectedClient.phone}`}
                                      style={{
                                        fontSize: '0.85rem',
                                        color: 'var(--accent-primary)',
                                        textDecoration: 'none',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px'
                                      }}
                                    >
                                      <Phone size={13} /> {selectedClient.phone}
                                    </a>
                                  )}
                                  {selectedClient.leadSource && (
                                    <span style={{
                                      padding: '3px 8px',
                                      fontSize: '0.8rem',
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

                    <div className="form-group">
                      <label>{t('kanban.modal.assignee') || 'Ответственный'}</label>
                      {isWorker ? (() => {
                        const currentOrder = cards.find(c => c.id === editingOrderId);
                        const assignedEmployee = employees.find(e => e.id.toString() === formData.assigneeId);
                        const aName = currentOrder?.assigneeName || assignedEmployee?.name || 'Вы назначены ответственным';
                        return (
                          <input 
                            type="text"
                            disabled
                            readOnly
                            value={aName}
                            className="search-input"
                            style={{ width: '100%', paddingLeft: '12px', opacity: 0.8, cursor: 'not-allowed', background: 'rgba(255, 255, 255, 0.03)' }}
                          />
                        );
                      })() : (
                        <div className="custom-select-wrapper">
                          <select 
                            value={formData.assigneeId}
                            onChange={(e) => setFormData({...formData, assigneeId: e.target.value})}
                            className="custom-select"
                          >
                            <option value="">{t('kanban.modal.selectAssignee') || 'Без ответственного'}</option>
                            {employees.map(e => (
                              <option key={e.id} value={e.id}>{e.name} {e.position ? `(${e.position})` : ''}</option>
                            ))}
                          </select>
                          <ChevronDown className="custom-select-icon" size={16} />
                        </div>
                      )}
                    </div>

                    {/* Исполнитель монтажа (если монтаж выполнен или заказ в завершенном статусе) */}
                    {(() => {
                      const currentOrder = cards.find(c => c.id === editingOrderId);
                      const statusObj = columns.find(c => c.id.toString() === formData.statusId);
                      const isCompleted = statusObj ? (
                        statusObj.name.toLowerCase().includes('заверш') ||
                        statusObj.name.toLowerCase().includes('готов') ||
                        statusObj.name.toLowerCase().includes('выполнен')
                      ) : false;

                      const hasInstaller = !!(formData.installedById || currentOrder?.installedByName || isCompleted);
                      if (!hasInstaller && !isCompleted) return null;

                      const installerEmployee = employees.find(e => e.id.toString() === formData.installedById);
                      const installerName = installerEmployee?.name || currentOrder?.installedByName || (formData.assigneeId ? employees.find(e => e.id.toString() === formData.assigneeId)?.name : null);
                      const installerAvatar = installerEmployee?.avatarUrl || currentOrder?.installedByAvatarUrl;
                      const installedAt = formData.installedAt || currentOrder?.installedAt;

                      return (
                        <div style={{
                          marginBottom: '16px',
                          padding: '12px 14px',
                          background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(16, 185, 129, 0.03) 100%)',
                          border: '1px solid rgba(34, 197, 94, 0.25)',
                          borderRadius: 'var(--radius-sm)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#4ade80' }}>
                              <CheckCircle2 size={16} /> Исполнитель монтажа
                            </div>
                            {installedAt && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                Завершен: <strong style={{ color: 'var(--text-primary)' }}>{new Date(installedAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong>
                              </div>
                            )}
                          </div>

                          {isWorker ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                overflow: 'hidden',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: '#fff',
                                background: installerAvatar ? 'transparent' : getAvatarGradient(installerName || 'Монтажник'),
                                border: '2px solid rgba(34, 197, 94, 0.4)'
                              }}>
                                {installerAvatar ? (
                                  <img src={installerAvatar} alt={installerName || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  getEmployeeInitials(installerName || 'М')
                                )}
                              </div>
                              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                {installerName || 'Не указан'}
                              </span>
                            </div>
                          ) : (
                            <div className="custom-select-wrapper">
                              <select
                                value={formData.installedById || (currentOrder?.installedById ? currentOrder.installedById.toString() : '')}
                                onChange={(e) => setFormData({ ...formData, installedById: e.target.value })}
                                className="custom-select"
                                style={{ background: 'rgba(0, 0, 0, 0.2)' }}
                              >
                                <option value="">{installerName ? `Текущий: ${installerName}` : 'Выберите монтажника...'}</option>
                                {employees.map(e => (
                                  <option key={e.id} value={e.id}>{e.name} {e.position ? `(${e.position})` : ''}</option>
                                ))}
                              </select>
                              <ChevronDown className="custom-select-icon" size={16} />
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Баннер статуса Акта выполненных работ (для монтажников) */}
                    {isWorker && (() => {
                      const hasAct = formData.attachments.some(a => isActFile(a.fileName)) || pendingFiles.some(f => isActFile(f.name));
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

                    <div className="form-group">
                      <label>{t('kanban.modal.address')}</label>
                      {(import.meta.env.VITE_DADATA_API_KEY || '66396b2e45d9ff46356592aae66a087ead7d082e') ? (
                        <AddressSuggestions
                          token={import.meta.env.VITE_DADATA_API_KEY || '66396b2e45d9ff46356592aae66a087ead7d082e'}
                          defaultQuery={formData.address}
                          onChange={(suggestion) => setFormData({...formData, address: suggestion?.value || formData.address})}
                          inputProps={{
                            placeholder: t('kanban.modal.address'),
                            className: "search-input",
                            style: {width: '100%', paddingLeft: '12px', paddingRight: '12px', boxSizing: 'border-box'},
                            onChange: (e: any) => setFormData({...formData, address: e.target.value})
                          }}
                        />
                      ) : (
                        <input 
                          type="text" 
                          placeholder={t('kanban.modal.address')}
                          className="search-input"
                          style={{width: '100%', paddingLeft: '12px', paddingRight: '12px', boxSizing: 'border-box'}}
                          value={formData.address}
                          onChange={(e) => setFormData({...formData, address: e.target.value})}
                        />
                      )}
                      {formData.address && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('kanban.modal.route') || 'Маршрут'}:</span>
                          <a
                            href={getYandexMapsUrl(formData.address, formData.entrance)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              padding: '5px 12px',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              color: '#ff3333',
                              background: 'rgba(255, 51, 51, 0.1)',
                              border: '1px solid rgba(255, 51, 51, 0.25)',
                              borderRadius: 'var(--radius-sm)',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px'
                            }}
                          >
                            <Navigation size={13} /> {t('kanban.modal.routeYandex') || 'Яндекс.Карты'}
                          </a>
                          <a
                            href={get2GisUrl(formData.address, formData.entrance)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              padding: '5px 12px',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              color: '#22c55e',
                              background: 'rgba(34, 197, 94, 0.1)',
                              border: '1px solid rgba(34, 197, 94, 0.25)',
                              borderRadius: 'var(--radius-sm)',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px'
                            }}
                          >
                            <Navigation size={13} /> {t('kanban.modal.route2gis') || '2ГИС'}
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
                              <label>{t('kanban.modal.installationPrice')}</label>
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
                  </>
                )}

                {/* 2. ДОГОВОР И СПЕЦИФИКАЦИЯ */}
                {orderModalTab === 'CONTRACT' && (
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
                          const missingTemplateMsg = `Шаблон договора для ${isLegal ? 'юридических' : 'физических'} лиц не загружен.\n\nПожалуйста, перейдите в раздел «Шаблоны договоров» и загрузите .docx файл договора.`;

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

                    {/* Блок 2: Спецификация товаров и услуг */}
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px',
                      marginBottom: '18px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <FileText size={15} style={{ color: '#4ade80' }} />
                          2. Спецификация товаров и услуг (Приложение №4)
                        </h4>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={populateSpecFromOrderMaterials}
                            className="btn btn-ghost"
                            style={{ padding: '4px 10px', fontSize: '0.78rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title="Заполнить из вкладки Материалы"
                          >
                            <RefreshCw size={12} /> Заполнить из материалов
                          </button>
                          <button
                            type="button"
                            onClick={addSpecRow}
                            className="btn btn-ghost"
                            style={{ padding: '4px 10px', fontSize: '0.78rem', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Plus size={13} /> + Строка
                          </button>
                        </div>
                      </div>

                      {(getContractParams().specItems || []).length > 0 ? (
                        <>
                          {/* Mobile Card Layout */}
                          <div className="spec-mobile-cards">
                            {(getContractParams().specItems || []).map((it, idx) => (
                              <div key={idx} className="spec-card">
                                <div className="spec-card-header">
                                  <span className="spec-card-num">#{idx + 1}</span>
                                  <input
                                    type="text"
                                    value={it.name}
                                    onChange={e => updateSpecRow(idx, 'name', e.target.value)}
                                    placeholder="Наименование (товар или услуга)..."
                                    className="spec-card-name-input"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeSpecRow(idx)}
                                    className="spec-card-delete-btn"
                                    title="Удалить позицию"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                                <div className="spec-card-grid">
                                  <div className="spec-card-field">
                                    <label>Кол-во</label>
                                    <input
                                      type="text"
                                      value={it.quantity}
                                      onChange={e => updateSpecRow(idx, 'quantity', e.target.value)}
                                      placeholder="1"
                                    />
                                  </div>
                                  <div className="spec-card-field">
                                    <label>Ед. изм.</label>
                                    <input
                                      type="text"
                                      value={it.unit}
                                      onChange={e => updateSpecRow(idx, 'unit', e.target.value)}
                                      placeholder="м²"
                                    />
                                  </div>
                                  <div className="spec-card-field">
                                    <label>Цена (₽)</label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={it.price}
                                      onChange={e => updateSpecRow(idx, 'price', e.target.value)}
                                      placeholder="0"
                                    />
                                  </div>
                                  <div className="spec-card-field spec-card-sum-box">
                                    <label>Сумма</label>
                                    <div className="spec-card-sum-val">
                                      {(it.total || 0).toLocaleString('ru-RU')} ₽
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Desktop Table Layout */}
                          <div className="spec-desktop-table">
                            <table className="spec-table">
                              <thead>
                                <tr>
                                  <th style={{ width: '35px' }}>№</th>
                                  <th>Наименование</th>
                                  <th style={{ width: '80px' }}>Кол-во</th>
                                  <th style={{ width: '70px' }}>Ед.</th>
                                  <th style={{ width: '110px' }}>Цена (₽)</th>
                                  <th style={{ width: '120px' }}>Сумма (₽)</th>
                                  <th style={{ width: '40px' }}></th>
                                </tr>
                              </thead>
                              <tbody>
                                {(getContractParams().specItems || []).map((it, idx) => (
                                  <tr key={idx}>
                                    <td style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{idx + 1}</td>
                                    <td>
                                      <input
                                        type="text"
                                        value={it.name}
                                        onChange={e => updateSpecRow(idx, 'name', e.target.value)}
                                        placeholder="Полотно / Монтаж..."
                                        className="spec-table-input"
                                      />
                                    </td>
                                    <td>
                                      <input
                                        type="text"
                                        value={it.quantity}
                                        onChange={e => updateSpecRow(idx, 'quantity', e.target.value)}
                                        placeholder="1"
                                        className="spec-table-input"
                                      />
                                    </td>
                                    <td>
                                      <input
                                        type="text"
                                        value={it.unit}
                                        onChange={e => updateSpecRow(idx, 'unit', e.target.value)}
                                        placeholder="м² / шт."
                                        className="spec-table-input"
                                      />
                                    </td>
                                    <td>
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={it.price}
                                        onChange={e => updateSpecRow(idx, 'price', e.target.value)}
                                        className="spec-table-input"
                                      />
                                    </td>
                                    <td style={{ fontWeight: 700, color: '#4ade80' }}>
                                      {(it.total || 0).toLocaleString('ru-RU')} ₽
                                    </td>
                                    <td>
                                      <button
                                        type="button"
                                        onClick={() => removeSpecRow(idx)}
                                        style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                                        title="Удалить"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </>
                      ) : (
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: '12px', padding: '12px', background: 'rgba(255,255,255,0.01)', borderRadius: 'var(--radius-sm)' }}>
                          Спецификация формируется автоматически из расчета заказа или может быть заполнена вручную кнопкой «+ Строка» / «Заполнить из материалов».
                        </div>
                      )}

                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px',
                        flexWrap: 'wrap',
                        marginTop: '12px',
                        paddingTop: '12px',
                        borderTop: '1px solid var(--glass-border)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <label style={{ fontSize: '0.85rem', margin: 0, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Скидка (₽):</label>
                          <input
                            type="text"
                            placeholder="0"
                            value={getContractParams().discount || ''}
                            onChange={(e) => updateContractParam('discount', e.target.value)}
                            className="spec-table-input"
                            style={{ width: '110px', height: '36px' }}
                          />
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                          Итого по спецификации:{' '}
                          <strong style={{ fontSize: '1.05rem', color: '#4ade80', marginLeft: '4px' }}>
                            {((getContractParams().specItems || []).reduce((acc, it) => acc + (it.total || 0), 0) - (parseFloat(getContractParams().discount || '0') || 0)).toLocaleString('ru-RU')} ₽
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Блок 3: Чек-лист выполненных работ для Акта */}
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px'
                    }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileCheck size={15} style={{ color: '#60a5fa' }} />
                        3. Чек-лист выполненных работ для Акта (Приложение №3)
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

                {/* 3. МАТЕРИАЛЫ И УСЛУГИ */}
                {orderModalTab === 'MATERIALS' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px'}}>
                      <div>
                        <h3 style={{margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)'}}>{t('kanban.modal.materials')}</h3>
                        <p style={{margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)'}}>
                          Материалы со склада и доп. услуги (монтаж, установка светильников и т.д.)
                        </p>
                      </div>
                      <button type="button" onClick={addMaterialRow} className="btn btn-ghost" style={{padding: '6px 12px', fontSize: '0.85rem', color: 'var(--accent-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px'}}>
                        <Plus size={15} /> {t('kanban.modal.addMaterial')}
                      </button>
                    </div>

                    {formData.materials.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {formData.materials.map((mat, index) => (
                          <div key={index} style={{
                            display: 'flex', 
                            gap: '8px', 
                            alignItems: 'center',
                            background: 'var(--input-bg)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '6px 8px'
                          }}>
                            <MaterialSearchSelect
                              value={mat.materialId}
                              materials={allMaterials}
                              onChange={(newId) => updateMaterialRow(index, 'materialId', newId)}
                            />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '85px', flexShrink: 0 }}>
                              <input 
                                type="number" 
                                step="0.01" 
                                min="0"
                                value={mat.quantity} 
                                onChange={(e) => updateMaterialRow(index, 'quantity', e.target.value)}
                                style={{ width: '100%', padding: '5px 8px', fontSize: '0.82rem', height: '32px' }}
                                placeholder="Кол-во"
                                className="custom-number-input"
                              />
                            </div>
                            <button 
                              type="button" 
                              onClick={() => removeMaterialRow(index)} 
                              style={{background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', opacity: 0.8}}
                              title="Удалить строку"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        ))}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px 16px',
                          background: 'rgba(245, 158, 11, 0.08)',
                          border: '1px solid rgba(245, 158, 11, 0.25)',
                          borderRadius: 'var(--radius-sm)',
                          marginTop: '4px'
                        }}>
                          <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                            Итого себестоимость материалов со склада:
                          </span>
                          <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f59e0b' }}>
                            {currentMaterialsCost.toLocaleString('ru-RU')} ₽
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        background: 'var(--input-bg)',
                        border: '1px dashed var(--glass-border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '32px 16px',
                        textAlign: 'center',
                        color: 'var(--text-secondary)',
                        fontSize: '0.88rem'
                      }}>
                        В заказ пока не добавлены материалы со склада. Нажмите «+ Добавить материал» выше.
                      </div>
                    )}
                  </div>
                )}

                {/* 4. ФАЙЛЫ */}
                {orderModalTab === 'FILES' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
                    {/* Выделенный блок для Акта выполненных работ */}
                    {(() => {
                      const actAttachment = formData.attachments.find(a => isActFile(a.fileName));
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

                            <label 
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
                              <Paperclip size={14} />
                              {hasAct ? 'Заменить Акт' : 'Загрузить Акт выполненных работ'}
                              <input type="file" onChange={handleActUpload} disabled={uploadingFile} />
                            </label>
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
                                      onClick={() => handleOpenAttachment(actAttachment)}
                                      className="btn btn-ghost"
                                      style={{ padding: '6px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                      title="Посмотреть в браузере"
                                    >
                                      <Eye size={16} />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadAttachment(actAttachment)}
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
                        <h3 style={{margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)'}}>{t('kanban.modal.attachments')}</h3>
                        <p style={{margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)'}}>
                          Прикрепленные файлы, чертежи, фото и сканы документов
                        </p>
                      </div>
                      <label className="file-upload-btn" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Paperclip size={14} />
                        {uploadingFile ? t('kanban.modal.uploading') : t('kanban.modal.attachFile')}
                        <input type="file" onChange={handleFileUpload} disabled={uploadingFile} />
                      </label>
                    </div>
                    
                    {formData.attachments.length > 0 || pendingFiles.length > 0 ? (
                      <div className="attachments-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {formData.attachments.map(att => {
                          const canPreview = isViewableInBrowser(att.fileName, att.contentType);
                          return (
                            <div key={att.id} className="attachment-item" style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 14px',
                              background: 'rgba(255, 255, 255, 0.02)',
                              border: '1px solid var(--glass-border)',
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
                                  <span 
                                    style={{fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '50%'}}
                                    title={att.fileName}
                                  >
                                    {att.fileName}
                                  </span>
                                  <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
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
                                        onClick={() => handleOpenAttachment(att)} 
                                        className="btn btn-ghost" 
                                        style={{padding: '6px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}
                                        title="Посмотреть в браузере"
                                      >
                                        <Eye size={16} />
                                      </button>
                                    )}
                                    <button 
                                      type="button" 
                                      onClick={() => handleDownloadAttachment(att)} 
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
                        {pendingFiles.map((pf, index) => (
                          <div key={`pending-${index}`} className="attachment-item" style={{
                            borderStyle: 'dashed',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            background: 'rgba(255, 255, 255, 0.01)',
                            borderRadius: 'var(--radius-sm)'
                          }}>
                            <span style={{fontSize: '0.9rem'}}>{pf.name} (ожидает сохранения)</span>
                            <button type="button" onClick={() => removePendingFile(index)} style={{background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center'}}>
                              <Trash2 size={15} />
                            </button>
                          </div>
                        ))}
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
                        {t('kanban.modal.noAttachments')}
                      </div>
                    )}
                  </div>
                )}

                {/* 5. AI АНАЛИЗ */}
                {orderModalTab === 'AI' && editingOrderId && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px'}}>
                      <div>
                        <h3 style={{margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '6px'}}>
                          <Mic size={16} /> AI Анализ звонков
                        </h3>
                        <p style={{margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)'}}>
                          Автоматическая расшифровка аудиозаписей звонков и саммари договорённостей
                        </p>
                      </div>
                      <label className="file-upload-btn" style={{backgroundColor: 'var(--primary)', color: 'white', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px'}}>
                        <Mic size={14} />
                        {uploadingAudio ? 'Загрузка...' : 'Загрузить звонок'}
                        <input type="file" accept="audio/*" onChange={handleAudioUpload} disabled={uploadingAudio} />
                      </label>
                    </div>
                    {aiSummary ? (
                      <div style={{background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
                          <span style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>
                            Статус: <strong style={{color: aiSummary.status === 'COMPLETED' ? 'var(--success)' : (aiSummary.status === 'ERROR' ? 'var(--danger)' : 'var(--warning)')}}>{aiSummary.status}</strong>
                          </span>
                          {aiSummary.status !== 'COMPLETED' && aiSummary.status !== 'ERROR' && (
                            <button type="button" onClick={refreshAiSummary} className="btn btn-ghost" style={{padding: '2px 8px', fontSize: '0.75rem'}}>
                              Обновить
                            </button>
                          )}
                        </div>
                        {aiSummary.aiSummary ? (
                          <div style={{fontSize: '0.95rem', lineHeight: '1.5', whiteSpace: 'pre-wrap'}}>
                            {aiSummary.aiSummary}
                          </div>
                        ) : (
                          <div style={{fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic'}}>
                            {aiSummary.status === 'ERROR' ? 'Ошибка при обработке.' : 'Анализ в процессе...'}
                          </div>
                        )}
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
                        Нет загруженных записей звонков по данной сделке.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="modal-actions">
                {editingOrderId && !isWorker ? (
                  <button 
                    type="button" 
                    onClick={handleDeleteOrder}
                    className="btn btn-ghost"
                    style={{color: 'var(--danger)'}}
                  >
                    <Trash2 size={16} style={{marginRight: '6px'}} /> {t('kanban.modal.delete')}
                  </button>
                ) : null}
                {isWorker && editingOrderId && (() => {
                  const currentStatus = columns.find(c => c.id.toString() === formData.statusId);
                  const isCompleted = currentStatus ? (
                    currentStatus.name.toLowerCase().includes('заверш') ||
                    currentStatus.name.toLowerCase().includes('готов') ||
                    currentStatus.name.toLowerCase().includes('выполнен')
                  ) : false;

                  if (!isCompleted) {
                    const hasAct = formData.attachments.some(a => isActFile(a.fileName)) || pendingFiles.some(f => isActFile(f.name));
                    return (
                      <button
                        type="button"
                        disabled={!hasAct}
                        onClick={(e) => handleCompleteInstallation(e, editingOrderId)}
                        className="btn"
                        style={{
                          background: hasAct ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'rgba(255, 255, 255, 0.08)',
                          color: hasAct ? '#fff' : 'var(--text-secondary)',
                          border: hasAct ? 'none' : '1px solid var(--glass-border)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontWeight: 600,
                          padding: '8px 14px',
                          cursor: hasAct ? 'pointer' : 'not-allowed',
                          opacity: hasAct ? 1 : 0.6
                        }}
                        title={hasAct ? 'Завершить монтаж' : 'Для завершения монтажа необходимо прикрепить Акт во вкладке «Файлы»'}
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
                <div className="modal-action-btns">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="btn btn-ghost"
                  >
                    {t('kanban.modal.cancel')}
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {t('kanban.modal.save')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {isColumnModalOpen && createPortal(
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth: '420px'}}>
            <div className="modal-header">
              <h2>{editingColumnId ? t('kanban.editColumn') : t('kanban.addColumn')}</h2>
              <button 
                type="button" 
                onClick={() => setIsColumnModalOpen(false)} 
                className="btn-icon"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveColumn} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div className="modal-body">
                <div className="form-group">
                  <label>{t('kanban.columnName')}</label>
                  <input 
                    type="text" 
                    required
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    className="search-input"
                    style={{width: '100%', paddingLeft: '12px'}}
                  />
                </div>
                <div className="form-group">
                  <label>{t('kanban.columnColor')}</label>
                  
                  {/* Preset colors grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '14px' }}>
                    {[
                      '#3b82f6', '#06b6d4', '#10b981', '#22c55e', '#84cc16', '#eab308', '#f97316',
                      '#ef4444', '#f43f5e', '#ec4899', '#a855f7', '#8b5cf6', '#6366f1', '#64748b'
                    ].map(color => (
                      <button 
                        key={color}
                        type="button"
                        onClick={() => setNewColumnColor(color)}
                        style={{
                          width: '100%',
                          aspectRatio: '1',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: color, 
                          cursor: 'pointer',
                          border: newColumnColor.toLowerCase() === color.toLowerCase() ? '2px solid white' : '1px solid rgba(255, 255, 255, 0.1)',
                          boxShadow: newColumnColor.toLowerCase() === color.toLowerCase() ? '0 0 0 2px var(--accent-primary), 0 2px 8px rgba(0, 0, 0, 0.2)' : 'none',
                          transform: newColumnColor.toLowerCase() === color.toLowerCase() ? 'scale(1.08)' : 'scale(1)',
                          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                          outline: 'none',
                          padding: 0
                        }}
                        title={color}
                      />
                    ))}
                  </div>

                  {/* Custom color input with picker + hex input + preview */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255, 255, 255, 0.03)', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                    <div style={{ position: 'relative', width: '36px', height: '36px', flexShrink: 0 }}>
                      <input 
                        type="color" 
                        value={newColumnColor.startsWith('#') && newColumnColor.length === 7 ? newColumnColor : '#3b82f6'} 
                        onChange={(e) => setNewColumnColor(e.target.value)}
                        style={{ 
                          position: 'absolute', 
                          top: 0, 
                          left: 0, 
                          width: '100%', 
                          height: '100%', 
                          opacity: 0, 
                          cursor: 'pointer' 
                        }} 
                        title="Выбрать цвет из палитры"
                      />
                      <div 
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          borderRadius: 'var(--radius-sm)', 
                          backgroundColor: newColumnColor || '#3b82f6', 
                          border: '2px solid rgba(255, 255, 255, 0.3)',
                          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
                          pointerEvents: 'none'
                        }} 
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <input 
                        type="text" 
                        value={newColumnColor} 
                        onChange={(e) => setNewColumnColor(e.target.value)}
                        className="search-input" 
                        placeholder="#3B82F6"
                        style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.9rem', padding: '6px 10px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', paddingLeft: '4px', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: newColumnColor || '#3b82f6', display: 'inline-block', flexShrink: 0 }}></span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{newColumnName || 'Статус'}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setIsColumnModalOpen(false)} className="btn btn-ghost">
                  {t('kanban.modal.cancel')}
                </button>
                <button type="submit" className="btn btn-primary">
                  {t('kanban.modal.save')}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Quick Create Client Modal */}
      {isNewClientModalOpen && createPortal(
        <div className="modal-overlay" style={{ zIndex: 100000 }}>
          <div className="modal-content animate-fade-in" style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <h2>{newClientType === 'LEGAL_ENTITY' ? 'Новая компания / Юрлицо' : t('clients.modal.addTitle')}</h2>
              <button 
                type="button" 
                onClick={() => {
                  setIsNewClientModalOpen(false);
                  setNewClientType('INDIVIDUAL');
                  setNewClientName('');
                  setNewClientPhone('');
                  setNewClientInn('');
                  setNewClientContactPerson('');
                  setNewClientLeadSource('');
                  setNewClientCustomLeadSource('');
                }} 
                className="btn-icon"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleQuickCreateClient} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div className="modal-body">
                {/* Type toggle */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
                  <button
                    type="button"
                    onClick={() => setNewClientType('INDIVIDUAL')}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '6px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: newClientType === 'INDIVIDUAL' ? 'var(--accent-primary)' : 'transparent',
                      color: newClientType === 'INDIVIDUAL' ? '#fff' : 'var(--text-secondary)',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.8rem'
                    }}
                  >
                    <User size={14} />
                    <span>Физлицо</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewClientType('LEGAL_ENTITY')}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '6px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: newClientType === 'LEGAL_ENTITY' ? 'var(--accent-primary)' : 'transparent',
                      color: newClientType === 'LEGAL_ENTITY' ? '#fff' : 'var(--text-secondary)',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.8rem'
                    }}
                  >
                    <Building2 size={14} />
                    <span>Юрлицо</span>
                  </button>
                </div>

                <div className="form-group">
                  <label>{newClientType === 'LEGAL_ENTITY' ? 'Наименование организации' : t('clients.modal.name')} *</label>
                  <input 
                    type="text" 
                    required
                    placeholder={newClientType === 'LEGAL_ENTITY' ? 'ООО «Альфа» или ИП Иванов' : (t('clients.modal.namePlaceholder') || 'Иван Иванов')}
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    className="search-input"
                    style={{ width: '100%', paddingLeft: '12px' }}
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label>{newClientType === 'LEGAL_ENTITY' ? 'Рабочий телефон' : t('clients.modal.phone')} *</label>
                  <input 
                    type="tel" 
                    required
                    placeholder={t('clients.modal.phonePlaceholder') || '+7 (999) 000-00-00'}
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    className="search-input"
                    style={{ width: '100%', paddingLeft: '12px' }}
                  />
                </div>
                {newClientType === 'LEGAL_ENTITY' && (
                  <>
                    <div className="form-group">
                      <label>ИНН</label>
                      <input 
                        type="text" 
                        placeholder="7701234567"
                        value={newClientInn}
                        onChange={(e) => setNewClientInn(e.target.value)}
                        className="search-input"
                        style={{ width: '100%', paddingLeft: '12px' }}
                      />
                    </div>
                    <div className="form-group">
                      <label>Контактное лицо (ЛПР)</label>
                      <input 
                        type="text" 
                        placeholder="Иванов Иван Иванович"
                        value={newClientContactPerson}
                        onChange={(e) => setNewClientContactPerson(e.target.value)}
                        className="search-input"
                        style={{ width: '100%', paddingLeft: '12px' }}
                      />
                    </div>
                  </>
                )}
                <div className="form-group">
                  <label>{t('clients.modal.leadSource', 'Источник лида')}</label>
                  <div className="custom-select-wrapper" style={{ marginBottom: newClientLeadSource === 'custom' ? '8px' : '0' }}>
                    <select
                      value={newClientLeadSource}
                      onChange={(e) => setNewClientLeadSource(e.target.value)}
                      className="custom-select"
                    >
                      <option value="">Не указан</option>
                      {PRESET_LEAD_SOURCES.map(source => (
                        <option key={source} value={source}>{source}</option>
                      ))}
                      <option value="custom">Другой вариант (ввести вручную)...</option>
                    </select>
                    <ChevronDown className="custom-select-icon" size={16} />
                  </div>
                  {newClientLeadSource === 'custom' && (
                    <input
                      type="text"
                      required
                      placeholder="Укажите источник (например: Листовка, Баннер...)"
                      value={newClientCustomLeadSource}
                      onChange={(e) => setNewClientCustomLeadSource(e.target.value)}
                      className="search-input"
                      style={{ width: '100%', paddingLeft: '12px', marginTop: '6px' }}
                      autoFocus
                    />
                  )}
                </div>
              </div>
              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn btn-ghost"
                  onClick={() => {
                    setIsNewClientModalOpen(false);
                    setNewClientType('INDIVIDUAL');
                    setNewClientName('');
                    setNewClientPhone('');
                    setNewClientInn('');
                    setNewClientContactPerson('');
                    setNewClientLeadSource('');
                    setNewClientCustomLeadSource('');
                  }}
                >
                  {t('clients.modal.cancel')}
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={creatingClient}
                >
                  {creatingClient ? t('clients.modal.saving') : (newClientType === 'LEGAL_ENTITY' ? 'Создать компанию' : t('clients.modal.create', 'Создать клиента'))}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Contract Data Prompt Modal (Only for missing client passport data) */}
      {isContractPromptOpen && createPortal(
        <div className="modal-overlay" onClick={() => !contractPromptLoading && setIsContractPromptOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '580px', width: '92%' }}>
            <div className="modal-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.05rem', margin: 0 }}>
                <FileCheck size={20} style={{ color: 'var(--accent-primary)' }} />
                Данные Заказчика для договора
              </h2>
              <button 
                type="button" 
                onClick={() => setIsContractPromptOpen(false)} 
                className="btn-icon"
                aria-label="Close"
                disabled={contractPromptLoading}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSavePromptAndGenerate}>
              <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto', padding: '16px 20px' }}>
                <div style={{
                  background: 'rgba(59, 130, 246, 0.08)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 14px',
                  marginBottom: '16px',
                  fontSize: '0.85rem',
                  color: '#93c5fd',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>Для формирования договора физлица заполните недостающие паспортные данные:</span>
                </div>

                <div className="form-group">
                  <label>ФИО Заказчика *</label>
                  <input
                    type="text"
                    required
                    placeholder="Иванов Иван Иванович"
                    value={contractPromptData.name}
                    onChange={(e) => setContractPromptData({ ...contractPromptData, name: e.target.value })}
                    className="search-input"
                    style={{ width: '100%', paddingLeft: '12px' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  <div className="form-group">
                    <label>Телефон 1 *</label>
                    <input
                      type="text"
                      required
                      placeholder="+7 (917) 000-00-00"
                      value={contractPromptData.phone}
                      onChange={(e) => setContractPromptData({ ...contractPromptData, phone: e.target.value })}
                      className="search-input"
                      style={{ width: '100%', paddingLeft: '12px' }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Телефон 2 (дополнительный)</label>
                    <input
                      type="text"
                      placeholder="+7 (987) 000-00-00"
                      value={contractPromptData.secondPhone}
                      onChange={(e) => setContractPromptData({ ...contractPromptData, secondPhone: e.target.value })}
                      className="search-input"
                      style={{ width: '100%', paddingLeft: '12px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  <div className="form-group">
                    <label>Дата рождения *</label>
                    <input
                      type="text"
                      required
                      placeholder="21.05.1985"
                      value={contractPromptData.birthDate}
                      onChange={(e) => setContractPromptData({ ...contractPromptData, birthDate: e.target.value })}
                      className="search-input"
                      style={{ width: '100%', paddingLeft: '12px' }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Серия и номер паспорта *</label>
                    <input
                      type="text"
                      required
                      placeholder="6315 123456"
                      value={contractPromptData.passportSeriesNumber}
                      onChange={(e) => setContractPromptData({ ...contractPromptData, passportSeriesNumber: e.target.value })}
                      className="search-input"
                      style={{ width: '100%', paddingLeft: '12px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  <div className="form-group">
                    <label>Кем выдан паспорт *</label>
                    <input
                      type="text"
                      required
                      placeholder="Отделом УФМС России по Саратовской обл..."
                      value={contractPromptData.passportIssuedBy}
                      onChange={(e) => setContractPromptData({ ...contractPromptData, passportIssuedBy: e.target.value })}
                      className="search-input"
                      style={{ width: '100%', paddingLeft: '12px' }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Дата выдачи паспорта *</label>
                    <input
                      type="text"
                      required
                      placeholder="11.06.2015"
                      value={contractPromptData.passportIssuedDate}
                      onChange={(e) => setContractPromptData({ ...contractPromptData, passportIssuedDate: e.target.value })}
                      className="search-input"
                      style={{ width: '100%', paddingLeft: '12px' }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Адрес по прописке (регистрации) *</label>
                  <input
                    type="text"
                    required
                    placeholder="г. Саратов, ул. Чернышевского, д. 10, кв. 5"
                    value={contractPromptData.registrationAddress}
                    onChange={(e) => setContractPromptData({ ...contractPromptData, registrationAddress: e.target.value })}
                    className="search-input"
                    style={{ width: '100%', paddingLeft: '12px' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Адрес установки (монтажа) *</label>
                  <input
                    type="text"
                    required
                    placeholder="г. Саратов, 1-й проезд Степана Разина, 3/7 кв. 222"
                    value={contractPromptData.installationAddress}
                    onChange={(e) => setContractPromptData({ ...contractPromptData, installationAddress: e.target.value })}
                    className="search-input"
                    style={{ width: '100%', paddingLeft: '12px' }}
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setIsContractPromptOpen(false)}
                  disabled={contractPromptLoading}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={contractPromptLoading}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <FileText size={16} />
                  {contractPromptLoading ? 'Формирование договора...' : 'Сохранить и сформировать договор (Word)'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Kanban;

