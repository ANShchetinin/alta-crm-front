import { useState, useEffect, useRef } from 'react';
import { Plus, MoreVertical, Trash2, Edit2, ChevronDown, Paperclip, Download, Eye, Mic, Phone, MapPin, Navigation, X } from 'lucide-react';
import { AddressSuggestions } from 'react-dadata';
import 'react-dadata/dist/react-dadata.css';
import { useTranslation } from 'react-i18next';
import { getOrderStatuses, getOrders, moveOrder, createOrder, updateOrder, uploadAttachment, fetchAttachmentBlob, deleteAttachment, deleteOrder, createOrderStatus, updateOrderStatus, deleteOrderStatus, reorderOrderStatuses, getAiSummary, uploadAudio } from '../api/kanban';
import type { OrderStatus, Order, OrderMaterial, OrderAttachment, OrderAiSummary } from '../api/kanban';
import { getClients, createClient } from '../api/clients';
import type { Client } from '../api/clients';
import { getMaterials } from '../api/storage';
import type { Material } from '../api/storage';
import { getEmployees } from '../api/employees';
import type { Employee } from '../api/employees';
import { useAppStore } from '../store/useAppStore';
import { useSearchParams } from 'react-router-dom';
import { getYandexMapsUrl, get2GisUrl } from '../utils/navigation';
import '../styles/kanban.css';
import '../styles/clients.css'; 

const Kanban = () => {
  const { t } = useTranslation();
  const { setNewOrdersCount, fetchLowStockMaterials } = useAppStore();
  const [columns, setColumns] = useState<OrderStatus[]>([]);
  const [cards, setCards] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [allMaterials, setAllMaterials] = useState<Material[]>([]);
  const boardRef = useRef<HTMLDivElement>(null);
  
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);

  // Quick Client Creation
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [creatingClient, setCreatingClient] = useState(false);

  const [formData, setFormData] = useState({
    clientId: '',
    statusId: '',
    assigneeId: '',
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
    materials: [] as OrderMaterial[],
    attachments: [] as OrderAttachment[]
  });

  const [orderProfit, setOrderProfit] = useState<number | null>(null);
  const [orderMargin, setOrderMargin] = useState<number | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  
  const [aiSummary, setAiSummary] = useState<OrderAiSummary | null>(null);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [editingColumnId, setEditingColumnId] = useState<number | null>(null);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnColor, setNewColumnColor] = useState('#3b82f6');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statuses, orders, clientsData, materialsData, employeesData] = await Promise.all([
        getOrderStatuses(),
        getOrders(),
        getClients(),
        getMaterials(),
        getEmployees()
      ]);
      const sortedColumns = statuses.sort((a, b) => a.sortOrder - b.sortOrder);
      setColumns(sortedColumns);
      setCards(orders);
      setClients(clientsData);
      setAllMaterials(materialsData);
      setEmployees(employeesData);
      
      const firstStatus = sortedColumns.find(s => s.sortOrder === 1);
      if (firstStatus) {
        setNewOrdersCount(orders.filter(o => o.statusId === firstStatus.id).length);
      }
      
      const orderIdParam = searchParams.get('orderId');
      if (orderIdParam) {
        const orderToOpen = orders.find(o => o.id === parseInt(orderIdParam));
        if (orderToOpen) {
          // Open edit modal directly
          const prep = orderToOpen.prepayment != null ? orderToOpen.prepayment : 0;
          const rem = orderToOpen.remainder != null ? orderToOpen.remainder : (orderToOpen.totalPrice != null ? Math.max(0, orderToOpen.totalPrice - prep) : 0);
          const tot = orderToOpen.totalPrice != null ? orderToOpen.totalPrice : (prep + rem);

          setEditingOrderId(orderToOpen.id);
          setFormData({
            clientId: orderToOpen.clientId ? orderToOpen.clientId.toString() : '',
            statusId: orderToOpen.statusId ? orderToOpen.statusId.toString() : (sortedColumns[0]?.id ? sortedColumns[0].id.toString() : ''),
            assigneeId: orderToOpen.assigneeId ? orderToOpen.assigneeId.toString() : '',
            address: orderToOpen.address || '',
            entrance: orderToOpen.entrance || '',
            floor: orderToOpen.floor || '',
            description: orderToOpen.description || '',
            totalPrice: tot.toString(),
            prepayment: prep.toString(),
            remainder: rem.toString(),
            installationPrice: orderToOpen.installationPrice != null ? orderToOpen.installationPrice.toString() : '0',
            installationDate: orderToOpen.installationDate || '',
            measurementDate: orderToOpen.measurementDate ? orderToOpen.measurementDate.slice(0, 16) : '',
            materials: orderToOpen.materials ? [...orderToOpen.materials] : [],
            attachments: orderToOpen.attachments ? [...orderToOpen.attachments] : []
          });
          setOrderProfit(orderToOpen.profit ?? null);
          setOrderMargin(orderToOpen.profitMargin ?? null);
          setPendingFiles([]);
          setIsModalOpen(true);
          getAiSummary(orderToOpen.id).then(setAiSummary).catch(() => setAiSummary(null));
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
    setFormData({
      clientId: '',
      statusId: columns[0]?.id ? columns[0].id.toString() : '',
      assigneeId: '',
      address: '',
      entrance: '',
      floor: '',
      description: '',
      totalPrice: '0',
      prepayment: '0',
      remainder: '0',
      installationPrice: '0',
      installationDate: '',
      measurementDate: '',
      materials: [],
      attachments: []
    });
    setOrderProfit(null);
    setOrderMargin(null);
    setPendingFiles([]);
    setAiSummary(null);
    setIsModalOpen(true);
  };

  const handleQuickCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim() || !newClientPhone.trim()) return;
    
    setCreatingClient(true);
    try {
      const created = await createClient({ name: newClientName.trim(), phone: newClientPhone.trim() });
      setClients(prev => [created, ...prev]);
      setFormData(prev => ({ ...prev, clientId: created.id.toString() }));
      setIsNewClientModalOpen(false);
      setNewClientName('');
      setNewClientPhone('');
    } catch (err: any) {
      console.error("Failed to create client", err);
      alert(err.response?.data?.message || 'Не удалось создать клиента');
    } finally {
      setCreatingClient(false);
    }
  };

  const openEditModal = (order: Order) => {
    const prep = order.prepayment != null ? order.prepayment : 0;
    const rem = order.remainder != null ? order.remainder : (order.totalPrice != null ? Math.max(0, order.totalPrice - prep) : 0);
    const tot = order.totalPrice != null ? order.totalPrice : (prep + rem);

    setEditingOrderId(order.id);
    setFormData({
      clientId: order.clientId ? order.clientId.toString() : '',
      statusId: order.statusId ? order.statusId.toString() : (columns[0]?.id ? columns[0].id.toString() : ''),
      assigneeId: order.assigneeId ? order.assigneeId.toString() : '',
      address: order.address || '',
      entrance: order.entrance || '',
      floor: order.floor || '',
      description: order.description || '',
      totalPrice: tot.toString(),
      prepayment: prep.toString(),
      remainder: rem.toString(),
      installationPrice: order.installationPrice != null ? order.installationPrice.toString() : '0',
      installationDate: order.installationDate || '',
      measurementDate: order.measurementDate ? order.measurementDate.slice(0, 16) : '',
      materials: order.materials ? [...order.materials] : [],
      attachments: order.attachments ? [...order.attachments] : []
    });
    setOrderProfit(order.profit ?? null);
    setOrderMargin(order.profitMargin ?? null);
    setPendingFiles([]);
    setAiSummary(null);
    setIsModalOpen(true);
    getAiSummary(order.id).then(setAiSummary).catch(() => setAiSummary(null));
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
      statusId: formData.statusId ? parseInt(formData.statusId) : (editingOrderId ? cards.find(c => c.id === editingOrderId)?.statusId || columns[0].id : columns[0].id),
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
        fetchData();
      } catch (err) {
        console.error("Failed to upload file", err);
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

  const updateMaterialRow = (index: number, field: string, value: string) => {
    const updated = [...formData.materials];
    if (field === 'materialId') updated[index].materialId = parseInt(value);
    if (field === 'quantity') updated[index].quantity = parseFloat(value) || 0;
    setFormData({ ...formData, materials: updated });
  };

  const removeMaterialRow = (index: number) => {
    const updated = formData.materials.filter((_, i) => i !== index);
    setFormData({ ...formData, materials: updated });
  };

  if (loading) {
    return <div style={{padding: 24}}>Loading board...</div>;
  }

  return (
    <div className="kanban-wrapper">
      <div className="kanban-header">
        <h1>{t('kanban.title')}</h1>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <Plus size={18} /> {t('kanban.addOrder')}
        </button>
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
        {columns.map(col => (
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
                <span className="count">{cards.filter(c => c.statusId === col.id).length}</span>
              </div>
              <div style={{display: 'flex', gap: '4px'}}>
                <button className="btn-icon" onClick={() => openColumnEditModal(col)} title={t('kanban.editColumn')}>
                  <Edit2 size={16} />
                </button>
                {cards.filter(c => c.statusId === col.id).length === 0 ? (
                  <button className="btn-icon" onClick={() => handleDeleteColumn(col.id)} title={t('kanban.modal.delete')}>
                    <Trash2 size={16} />
                  </button>
                ) : (
                  <button className="btn-icon"><MoreVertical size={16} /></button>
                )}
              </div>
            </div>

            <div className="column-content">
              {cards.filter(c => c.statusId === col.id).map(card => (
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
                      return (
                        <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                          <div className="card-client" style={{marginBottom: 0}}>
                            {client?.name || `Client #${card.clientId}`}
                          </div>
                          {client?.phone && (
                            <a
                              href={`tel:${client.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              title={`Позвонить: ${client.phone}`}
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
                    {card.createdAt && (
                      <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>
                        {new Date(card.createdAt).toLocaleDateString('ru-RU')}
                      </div>
                    )}
                  </div>
                  <div className="card-desc">{card.description}</div>
                  
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
                    {card.assigneeId && (
                      <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)'}}>
                        <span>{t('kanban.card.assignee')}:</span>
                        <span style={{textAlign: 'right'}}>{employees.find(e => e.id === card.assigneeId)?.name || '...'}</span>
                      </div>
                    )}
                    {(() => {
                      const materialsCost = card.materials?.reduce((sum, m) => {
                        const mat = allMaterials.find(x => x.id === m.materialId);
                        return sum + (mat ? (mat.costPrice * m.quantity) : 0);
                      }, 0) || 0;
                      if (materialsCost > 0) {
                        return (
                          <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--warning)', fontWeight: 500}}>
                            <span>{t('kanban.card.materialsCost')}:</span>
                            <span>{materialsCost} ₽</span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
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
                      <span>Остаток: <strong style={{ color: 'var(--text-primary)' }}>{(card.remainder != null ? card.remainder : card.totalPrice).toLocaleString('ru-RU')} ₽</strong></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        
        <button 
          className="kanban-column add-column-btn glass-panel" 
          onClick={openColumnAddModal}
          style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minWidth: '320px', cursor: 'pointer', opacity: 0.7, border: '2px dashed var(--glass-border)' }}
        >
          <Plus size={24} style={{ marginRight: '8px' }} />
          <span style={{ fontSize: '1.1rem', fontWeight: 500 }}>{t('kanban.addColumn')}</span>
        </button>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth: '680px'}}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: 1, minWidth: 0, paddingRight: '8px' }}>
                <h2 style={{ margin: 0, whiteSpace: 'nowrap' }}>{editingOrderId ? t('kanban.editOrder') : t('kanban.addOrder')}</h2>
                
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
              <div className="modal-body">
              
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ margin: 0 }}>{t('kanban.modal.client')}</label>
                  <button 
                    type="button" 
                    onClick={() => setIsNewClientModalOpen(true)}
                    className="btn-icon"
                    style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 6px' }}
                  >
                    <Plus size={14} /> {t('clients.addClient') || 'Новый клиент'}
                  </button>
                </div>
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
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>
                    ))}
                  </select>
                  <ChevronDown className="custom-select-icon" size={16} />
                </div>
                {(() => {
                  const selectedClient = clients.find(c => c.id.toString() === formData.clientId);
                  if (selectedClient?.phone) {
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Телефон:</span>
                        <a
                          href={`tel:${selectedClient.phone}`}
                          style={{
                            padding: '3px 8px',
                            fontSize: '0.8rem',
                            color: 'var(--success)',
                            background: 'rgba(34, 197, 94, 0.1)',
                            border: '1px solid rgba(34, 197, 94, 0.2)',
                            borderRadius: 'var(--radius-sm)',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontWeight: 500
                          }}
                        >
                          <Phone size={13} /> {selectedClient.phone} (Позвонить)
                        </a>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              <div className="form-group">
                <label>{t('kanban.modal.assignee') || 'Ответственный'}</label>
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
              </div>

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
                <label>{t('kanban.modal.description')}</label>
                <input 
                  type="text" 
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="search-input"
                  style={{width: '100%', paddingLeft: '12px'}}
                />
              </div>

              <hr style={{margin: '24px 0', border: 'none', borderTop: '1px solid var(--glass-border)'}} />
              
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
                <h3 style={{margin: 0, fontSize: '1.1rem'}}>{t('kanban.modal.materials')}</h3>
                <button type="button" onClick={addMaterialRow} className="btn btn-ghost" style={{padding: '6px 12px', fontSize: '0.85rem'}}>
                  <Plus size={14} style={{marginRight: '4px'}} /> {t('kanban.modal.addMaterial')}
                </button>
              </div>

              {formData.materials.map((mat, index) => (
                <div key={index} style={{display: 'flex', gap: '12px', marginBottom: '12px', alignItems: 'center'}}>
                  <div className="custom-select-wrapper" style={{flex: 2}}>
                    <select 
                      value={mat.materialId} 
                      onChange={(e) => updateMaterialRow(index, 'materialId', e.target.value)}
                      className="custom-select"
                    >
                      {allMaterials.map(m => (
                        <option key={m.id} value={m.id}>{m.name} ({m.costPrice}₽)</option>
                      ))}
                    </select>
                    <ChevronDown className="custom-select-icon" size={16} />
                  </div>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    value={mat.quantity} 
                    onChange={(e) => updateMaterialRow(index, 'quantity', e.target.value)}
                    style={{flex: 1}}
                    placeholder="Qty"
                    className="custom-number-input"
                  />
                  <button type="button" onClick={() => removeMaterialRow(index)} style={{background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '8px'}}>
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}

              <hr style={{margin: '24px 0', border: 'none', borderTop: '1px solid var(--glass-border)'}} />

              {/* Attachments Section */}
              <div style={{marginBottom: '24px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
                  <h3 style={{margin: 0, fontSize: '1.1rem'}}>{t('kanban.modal.attachments')}</h3>
                  <label className="file-upload-btn">
                    <Paperclip size={14} />
                    {uploadingFile ? t('kanban.modal.uploading') : t('kanban.modal.attachFile')}
                    <input type="file" onChange={handleFileUpload} disabled={uploadingFile} />
                  </label>
                </div>
                
                {formData.attachments.length > 0 || pendingFiles.length > 0 ? (
                  <div className="attachments-list">
                    {formData.attachments.map(att => {
                      const canPreview = isViewableInBrowser(att.fileName, att.contentType);
                      return (
                        <div key={att.id} className="attachment-item">
                          <span style={{fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '45%'}}>
                            {att.fileName}
                          </span>
                          <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                            {canPreview && (
                              <button 
                                type="button" 
                                onClick={() => handleOpenAttachment(att)} 
                                className="btn btn-ghost" 
                                style={{padding: '4px 8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px'}}
                                title="Посмотреть в браузере"
                              >
                                <Eye size={14} /> Просмотр
                              </button>
                            )}
                            <button 
                              type="button" 
                              onClick={() => handleDownloadAttachment(att)} 
                              className="btn btn-ghost" 
                              style={{padding: '4px 8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px'}}
                              title="Скачать файл"
                            >
                              <Download size={14} /> {t('kanban.modal.download')}
                            </button>
                            <button 
                              type="button" 
                              onClick={() => handleDeleteAttachment(att.id)} 
                              title={t('kanban.modal.delete') || 'Удалить'} 
                              style={{background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px'}}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {pendingFiles.map((pf, index) => (
                      <div key={`pending-${index}`} className="attachment-item" style={{borderStyle: 'dashed'}}>
                        <span style={{fontSize: '0.9rem'}}>{pf.name} (pending)</span>
                        <button type="button" onClick={() => removePendingFile(index)} style={{background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center'}}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic'}}>
                    {t('kanban.modal.noAttachments')}
                  </div>
                )}
                <hr style={{margin: '24px 0', border: 'none', borderTop: '1px solid var(--glass-border)'}} />
              </div>

              {/* AI Audio Summary Section */}
              {editingOrderId && (
                <div style={{marginBottom: '24px'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
                    <h3 style={{margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '6px'}}>
                      <Mic size={16} /> AI Анализ звонков
                    </h3>
                    <label className="file-upload-btn" style={{backgroundColor: 'var(--primary)', color: 'white'}}>
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
                    <div style={{fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic'}}>
                      Нет загруженных звонков
                    </div>
                  )}
                  <hr style={{margin: '24px 0', border: 'none', borderTop: '1px solid var(--glass-border)'}} />
                </div>
              )}

              <div style={{display: 'flex', gap: '16px', marginBottom: '16px'}}>
                <div className="form-group" style={{flex: 1}}>
                  <label>{t('kanban.modal.installationPrice')}</label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    step="0.01"
                    value={formData.installationPrice}
                    onChange={(e) => setFormData({...formData, installationPrice: e.target.value})}
                    className="custom-number-input"
                  />
                </div>
                <div className="form-group" style={{flex: 1}}>
                  <label>Аванс (₽)</label>
                  <input 
                    type="number" 
                    min="0"
                    step="0.01"
                    value={formData.prepayment}
                    onChange={(e) => {
                      const newPrep = e.target.value;
                      const prepNum = parseFloat(newPrep || '0');
                      const remNum = parseFloat(formData.remainder || '0');
                      setFormData({
                        ...formData, 
                        prepayment: newPrep,
                        totalPrice: (prepNum + remNum).toString()
                      });
                    }}
                    className="custom-number-input"
                    placeholder="0"
                  />
                </div>
                <div className="form-group" style={{flex: 1}}>
                  <label>Остаток (₽)</label>
                  <input 
                    type="number" 
                    min="0"
                    step="0.01"
                    value={formData.remainder}
                    onChange={(e) => {
                      const newRem = e.target.value;
                      const remNum = parseFloat(newRem || '0');
                      const prepNum = parseFloat(formData.prepayment || '0');
                      setFormData({
                        ...formData, 
                        remainder: newRem,
                        totalPrice: (prepNum + remNum).toString()
                      });
                    }}
                    className="custom-number-input"
                    placeholder="0"
                  />
                </div>
              </div>
              <div style={{
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                background: 'rgba(59, 130, 246, 0.08)', 
                border: '1px solid rgba(59, 130, 246, 0.2)', 
                borderRadius: 'var(--radius-md)', 
                padding: '10px 16px', 
                marginBottom: '16px'
              }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Итого для клиента (Аванс + Остаток):</span>
                <span style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                  {(parseFloat(formData.prepayment || '0') + parseFloat(formData.remainder || '0')).toLocaleString('ru-RU')} ₽
                </span>
              </div>
              <div style={{display: 'flex', gap: '16px', flexWrap: 'wrap'}}>
                <div className="form-group" style={{flex: 1, minWidth: '200px'}}>
                  <label>Дата и время замера</label>
                  <input 
                    type="datetime-local" 
                    value={formData.measurementDate}
                    onChange={(e) => setFormData({...formData, measurementDate: e.target.value})}
                    className="search-input"
                    style={{width: '100%', paddingLeft: '12px'}}
                  />
                </div>
                <div className="form-group" style={{flex: 1, minWidth: '200px'}}>
                  <label>{t('kanban.modal.installationDate') || 'Дата монтажа'}</label>
                  <input 
                    type="date" 
                    value={formData.installationDate}
                    onChange={(e) => setFormData({...formData, installationDate: e.target.value})}
                    className="search-input"
                    style={{width: '100%', paddingLeft: '12px'}}
                  />
                </div>
              </div>

              {editingOrderId && orderProfit !== null && (
                <div style={{display: 'flex', gap: '16px', marginTop: '12px', marginBottom: '24px', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-lg)'}}>
                  <div style={{flex: 1}}>
                    <div style={{fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px'}}>{t('kanban.modal.profit')}</div>
                    <div style={{fontWeight: 600, fontSize: '1.2rem', color: orderProfit >= 0 ? 'var(--success)' : 'var(--danger)'}}>
                      {orderProfit} ₽
                    </div>
                  </div>
                  <div style={{flex: 1}}>
                    <div style={{fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px'}}>{t('kanban.modal.margin')}</div>
                    <div style={{fontWeight: 600, fontSize: '1.2rem', color: (orderMargin || 0) >= 0 ? 'var(--success)' : 'var(--danger)'}}>
                      {orderMargin}%
                    </div>
                  </div>
                </div>
              )}
              </div>

              <div className="modal-actions" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                {editingOrderId ? (
                  <button 
                    type="button" 
                    onClick={handleDeleteOrder}
                    className="btn btn-ghost"
                    style={{color: 'var(--danger)'}}
                  >
                    <Trash2 size={16} style={{marginRight: '6px'}} /> {t('kanban.modal.delete')}
                  </button>
                ) : <div></div>}
                <div style={{display: 'flex', gap: '12px'}}>
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
        </div>
      )}

      {isColumnModalOpen && (
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
                  <div style={{display: 'flex', gap: '8px'}}>
                    {['#3b82f6', '#eab308', '#22c55e', '#ef4444', '#8b5cf6', '#f97316'].map(color => (
                      <div 
                        key={color}
                        onClick={() => setNewColumnColor(color)}
                        style={{
                          width: '32px', height: '32px', borderRadius: '50%', backgroundColor: color, 
                          cursor: 'pointer', border: newColumnColor === color ? '2px solid white' : 'none',
                          boxShadow: newColumnColor === color ? '0 0 0 2px var(--primary)' : 'none'
                        }}
                      />
                    ))}
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
        </div>
      )}

      {/* Quick Create Client Modal */}
      {isNewClientModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content animate-fade-in" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h2>{t('clients.modal.addTitle')}</h2>
              <button 
                type="button" 
                onClick={() => {
                  setIsNewClientModalOpen(false);
                  setNewClientName('');
                  setNewClientPhone('');
                }} 
                className="btn-icon"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleQuickCreateClient} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div className="modal-body">
                <div className="form-group">
                  <label>{t('clients.modal.name')} *</label>
                  <input 
                    type="text" 
                    required
                    placeholder={t('clients.modal.namePlaceholder') || 'Иван Иванов'}
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    className="search-input"
                    style={{ width: '100%', paddingLeft: '12px' }}
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label>{t('clients.modal.phone')} *</label>
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
              </div>
              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn btn-ghost"
                  onClick={() => {
                    setIsNewClientModalOpen(false);
                    setNewClientName('');
                    setNewClientPhone('');
                  }}
                >
                  {t('clients.modal.cancel')}
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={creatingClient}
                >
                  {creatingClient ? t('clients.modal.saving') : t('clients.modal.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Kanban;

