import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import '../../../styles/kanban.css';
import {
  completeOrder,
  createOrder,
  deleteOrder,
  getOrderById,
  updateOrder,
  uploadAttachment,
  type Order
} from '../../../api/kanban';
import type { AiEstimateResultDto } from '../../../api/aiEstimate';
import { useAppStore } from '../../../store/useAppStore';
import { useAuthStore } from '../../../store/useAuthStore';
import { useOrderDrawerStore } from '../../../store/useOrderDrawerStore';
import { useFeature } from '../../../hooks/useFeatureToggle';
import { MeasurementWizard } from '../../measurements/components/MeasurementWizard';
import { PassportScannerModal, type PassportApplyResult } from '../../../components/PassportScannerModal';
import { isActRequired, isCompletedStatus, isInstallationStage } from '../../../utils/orderStatus';
import { toast } from '../../../utils/toast';
import { confirm } from '../../../utils/confirm';
import { QuickClientModal } from './QuickClientModal';
import { ContractPromptModal } from './ContractPromptModal';
import { AiEstimateModal } from './AiEstimateModal';
import { useOrderLoader } from '../hooks/useOrderLoader';
import { useOrderDrawerData } from '../hooks/useOrderDrawerData';
import { useOrderAttachments } from '../hooks/useOrderAttachments';
import { useOrderAi } from '../hooks/useOrderAi';
import { useOrderContract } from '../hooks/useOrderContract';
import { useQuickClient } from '../hooks/useQuickClient';
import { useSwipeToDismiss } from '../hooks/useSwipeToDismiss';
import {
  buildOrderPayload,
  createEmptyOrderForm,
  hasActAttachment,
  orderToFormData,
  withMeasurementResult,
  type OrderFormData
} from '../utils/orderForm';
import { OrderDrawerHeader } from './orderDrawer/OrderDrawerHeader';
import { OrderDrawerTabs } from './orderDrawer/OrderDrawerTabs';
import { OrderDrawerFooter } from './orderDrawer/OrderDrawerFooter';
import { UnsavedChangesDialog } from './orderDrawer/UnsavedChangesDialog';
import { OrderMainTab } from './orderDrawer/main/OrderMainTab';
import { OrderContractTab } from './orderDrawer/contract/OrderContractTab';
import { OrderFilesTab } from './orderDrawer/files/OrderFilesTab';
import { OrderAiTab } from './orderDrawer/ai/OrderAiTab';

type PassportTarget = 'CONTRACT' | 'NEW_CLIENT';

const notifyOrdersChanged = (action: string, orderId: number | null | undefined) => {
  window.dispatchEvent(new CustomEvent('alta:orders-changed', { detail: { action, orderId } }));
};

const errorMessage = (err: unknown, fallback: string): string =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || (err as Error)?.message || fallback;

/**
 * Шторка заказа (создание и редактирование): связывает загрузку заказа, форму, вкладки и модальные окна.
 */
export const OrderDrawer: React.FC = () => {
  const role = useAuthStore(state => state.role);
  const isWorker = role === 'WORKER';
  const canAccessMeasurements = useAuthStore(state => state.canAccessMeasurements);
  const authTenantId = useAuthStore(state => state.tenantId);
  const hasAiSummary = useFeature('AI_SUMMARY');
  const hasContractTemplates = useFeature('CONTRACT_TEMPLATES');
  const hasDocumentScanner = useFeature('DOCUMENT_SCANNER');
  const hasAiEstimate = useFeature('AI_ESTIMATE') && !isWorker;
  const { fetchLowStockMaterials, tenantSettings } = useAppStore();
  const actChecklistTemplate = tenantSettings?.actChecklistTemplate;

  const {
    isOpen,
    orderId: editingOrderId,
    activeTab,
    setActiveTab,
    expandComments,
    setExpandComments,
    closeOrder
  } = useOrderDrawerStore();

  // id заказа, данные которого сейчас в форме; до завершения загрузки отличается от editingOrderId
  const [loadedOrderId, setLoadedOrderId] = useState<number | null>(null);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [formData, setFormData] = useState<OrderFormData>(() => createEmptyOrderForm(undefined));
  const [initialFormDataJson, setInitialFormDataJson] = useState('');
  const [commentsCount, setCommentsCount] = useState(0);
  const [isUnsavedConfirmOpen, setIsUnsavedConfirmOpen] = useState(false);
  const [isAiEstimateModalOpen, setIsAiEstimateModalOpen] = useState(false);
  const [measurementKey, setMeasurementKey] = useState(0);
  const [passportTarget, setPassportTarget] = useState<PassportTarget | null>(null);

  const { columns, clients, employees, materials, templateStatus, reloadClients } = useOrderDrawerData(isOpen, isWorker, hasContractTemplates);
  const files = useOrderAttachments(editingOrderId, setFormData);
  const ai = useOrderAi(editingOrderId);
  const contract = useOrderContract({ orderId: editingOrderId, formData, setFormData, currentOrder, clients, actChecklistTemplate });
  const quickClient = useQuickClient(async created => {
    await reloadClients();
    setFormData(prev => ({ ...prev, clientId: created.id.toString() }));
  });
  const swipe = useSwipeToDismiss(() => requestClose(), closeOrder);

  const isMobile = useMemo(() => window.innerWidth <= 768 || window.matchMedia('(max-width: 768px)').matches, []);
  const selectedStatus = columns.find(c => c.id.toString() === formData.statusId);
  const isCompleted = isCompletedStatus(selectedStatus);
  const hasAct = hasActAttachment(formData.attachments, files.pendingFiles);
  const actRequired = isActRequired(formData.orderNumber);
  const actMissing = actRequired && !hasAct;
  const hasInstaller = Boolean(formData.installedById || currentOrder?.installedById || currentOrder?.installedByName);

  const isDirty = useMemo(() => (
    Boolean(initialFormDataJson) && JSON.stringify({ formData, pendingFilesCount: files.pendingFiles.length }) !== initialFormDataJson
  ), [formData, files.pendingFiles.length, initialFormDataJson]);

  // Смена компании закрывает шторку: открытый заказ принадлежит другому тенанту
  // Актуальный открытый заказ для асинхронных ответов: ответ по заказу, с которого ушли, не применяется
  const editingOrderIdRef = useRef(editingOrderId);
  editingOrderIdRef.current = editingOrderId;

  const prevTenantIdRef = useRef<number | null>(authTenantId);
  useEffect(() => {
    if (prevTenantIdRef.current !== null && prevTenantIdRef.current !== authTenantId) {
      closeOrder();
    }
    prevTenantIdRef.current = authTenantId;
  }, [authTenantId, closeOrder]);

  useEffect(() => {
    window.addEventListener('alta:tenant-changed', closeOrder);
    return () => {
      window.removeEventListener('alta:tenant-changed', closeOrder);
    };
  }, [closeOrder]);

  /** Устанавливает форму и считает ее исходным состоянием (несохраненных изменений нет). */
  const resetFormTo = (form: OrderFormData) => {
    setFormData(form);
    setInitialFormDataJson(JSON.stringify({ formData: form, pendingFilesCount: 0 }));
    files.setPendingFiles([]);
  };

  const populateOrder = (order: Order) => {
    setCurrentOrder(order);
    setCommentsCount(order.commentsCount || 0);
    resetFormTo(orderToFormData(order, actChecklistTemplate));
  };

  useOrderLoader(isOpen, editingOrderId, {
    onLoaded: order => {
      populateOrder(order);
      setLoadedOrderId(order.id);
      if (hasAiSummary) {
        ai.loadForOrder(order.id);
      }
    },
    onNew: () => {
      setCurrentOrder(null);
      setCommentsCount(0);
      ai.reset();
      resetFormTo(createEmptyOrderForm(columns[0]?.id, actChecklistTemplate));
      setLoadedOrderId(null);
    },
    onError: () => {
      toast.error('Не удалось загрузить заказ. Закройте и откройте его снова');
    }
  });

  // Статусы могут загрузиться позже формы нового заказа — подставляем первый статус, не помечая форму измененной
  const firstStatusId = columns[0]?.id?.toString();
  useEffect(() => {
    if (!isOpen || editingOrderId || !firstStatusId) {
      return;
    }
    const withStatus = (form: OrderFormData) => (form.statusId ? form : { ...form, statusId: firstStatusId });
    setFormData(withStatus);
    setInitialFormDataJson(prev => {
      if (!prev) {
        return prev;
      }
      const snapshot = JSON.parse(prev);
      return JSON.stringify({ ...snapshot, formData: withStatus(snapshot.formData) });
    });
  }, [isOpen, editingOrderId, firstStatusId]);

  const handleCommentsCountChange = useCallback((count: number) => {
    setCommentsCount(prev => (prev !== count ? count : prev));
  }, []);

  function requestClose() {
    if (isDirty) {
      setIsUnsavedConfirmOpen(true);
    } else {
      swipe.smoothClose();
    }
  }

  const discardAndClose = () => {
    setIsUnsavedConfirmOpen(false);
    if (initialFormDataJson) {
      setFormData(JSON.parse(initialFormDataJson).formData);
    }
    files.setPendingFiles([]);
    swipe.smoothClose();
  };

  const saveOrder = async (shouldClose: boolean) => {
    if (editingOrderId && loadedOrderId !== editingOrderId) {
      toast.warning('Заказ ещё загружается, попробуйте через секунду');
      return;
    }
    // Как и перенос на доске: в завершающий этап по договору — только с актом (уже завершенные заказы не проверяются)
    const wasCompleted = isCompletedStatus(columns.find(c => c.id === currentOrder?.statusId));
    if (editingOrderId && isCompleted && !wasCompleted && actMissing) {
      const statusName = columns.find(c => c.id.toString() === formData.statusId)?.name;
      toast.warning(`Для перевода заявки с договором в «${statusName}» прикрепите Акт выполненных работ во вкладке «Файлы».`);
      setActiveTab('FILES');
      return;
    }
    try {
      const payload = buildOrderPayload(formData, contract.contractParams, isCompleted);
      const savedOrder = editingOrderId ? await updateOrder(editingOrderId, payload) : await createOrder(payload);

      if (files.pendingFiles.length > 0 && savedOrder.id) {
        for (const file of files.pendingFiles) {
          try {
            await uploadAttachment(savedOrder.id, file);
          } catch (err) {
            console.error('Failed to upload pending file', file.name, err);
          }
        }
        files.setPendingFiles([]);
      }

      setInitialFormDataJson(JSON.stringify({ formData, pendingFilesCount: 0 }));
      fetchLowStockMaterials();
      notifyOrdersChanged(editingOrderId ? 'update' : 'create', savedOrder.id);

      if (shouldClose) {
        swipe.smoothClose();
      } else {
        toast.success(editingOrderId ? 'Заказ успешно сохранен' : 'Новый заказ создан');
      }
    } catch (err) {
      console.error('Failed to save order', err);
      toast.error(errorMessage(err, 'Ошибка при сохранении заказа'));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveOrder(true);
  };

  const handleDeleteOrder = async () => {
    if (!editingOrderId) {
      return;
    }
    const ok = await confirm({
      title: 'Удалить заказ?',
      message: `Вы уверены, что хотите удалить заказ #${editingOrderId}? Все файлы и история будут удалены.`,
      confirmText: 'Удалить',
      danger: true
    });
    if (!ok) {
      return;
    }
    try {
      await deleteOrder(editingOrderId);
      notifyOrdersChanged('delete', editingOrderId);
      swipe.smoothClose();
      toast.success(`Заказ #${editingOrderId} успешно удален`);
    } catch (err) {
      console.error('Failed to delete order', err);
      toast.error('Не удалось удалить заказ');
    }
  };

  const handleCompleteInstallation = async (e: React.MouseEvent, orderId: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (actMissing) {
      toast.warning('По договору для завершения необходимо прикрепить «Акт выполненных работ» во вкладке «Файлы»');
      setActiveTab('FILES');
      return;
    }
    try {
      const updated = await completeOrder(orderId);
      if (updated) {
        populateOrder(updated);
        notifyOrdersChanged('complete', orderId);
        toast.success('Монтаж успешно завершен!');
      }
    } catch (err) {
      console.error('Failed to complete installation', err);
      toast.error(errorMessage(err, 'Не удалось перевести заказ в завершенный статус'));
    }
  };

  /**
   * Смета уже сохранена в заказ на сервере (суммы, монтажники, материалы, параметры договора). Перечитываем
   * заказ и переносим эти поля и в форму, и в ее исходное состояние: повторно сохранять шторку не нужно,
   * а другие несохраненные правки пользователя остаются несохраненными.
   */
  const handleMeasurementSaved = async () => {
    const orderId = editingOrderId;
    if (!orderId) {
      return;
    }
    notifyOrdersChanged('measurement_saved', orderId);
    toast.success('Замер и смета успешно сохранены в заказ!');
    try {
      const updated = await getOrderById(orderId);
      if (editingOrderIdRef.current !== orderId) {
        return;
      }
      const saved = orderToFormData(updated, actChecklistTemplate);
      setCurrentOrder(updated);
      setFormData(prev => withMeasurementResult(prev, saved));
      setInitialFormDataJson(prev => {
        if (!prev) {
          return prev;
        }
        const snapshot = JSON.parse(prev);
        return JSON.stringify({ ...snapshot, formData: withMeasurementResult(snapshot.formData, saved) });
      });
    } catch (err) {
      console.error('Failed to reload order after saving the measurement', err);
      toast.warning('Смета сохранена, но шторка не обновилась. Закройте и откройте заказ заново');
    }
  };

  const handleEstimateApplied = async (aiResult: AiEstimateResultDto) => {
    toast.success('Смета успешно обновлена AI-агентом!');
    setMeasurementKey(k => k + 1);
    const targetId = editingOrderId || aiResult.orderId;
    if (!targetId) {
      return;
    }
    try {
      const updated = await getOrderById(targetId);
      if (updated) {
        populateOrder(updated);
        notifyOrdersChanged('ai_estimate_applied', targetId);
      }
    } catch (err) {
      console.error('Failed to reload order after AI estimate', err);
    }
  };

  const showComments = () => {
    if (activeTab !== 'MAIN') {
      setActiveTab('MAIN');
    }
    setExpandComments(true);
    setTimeout(() => {
      document.getElementById('order-comments-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handlePassportApply = (res: PassportApplyResult) => {
    if (passportTarget === 'CONTRACT') {
      contract.applyPassport(res);
    } else if (passportTarget === 'NEW_CLIENT') {
      quickClient.applyPassport(res);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {createPortal(
        <div
          className="order-drawer-overlay"
          style={{ opacity: swipe.isClosing ? 0 : 1, transition: 'opacity 0.24s cubic-bezier(0.16, 1, 0.3, 1)' }}
          onClick={requestClose}
        >
          <div
            className={`order-drawer-content ${activeTab === 'MEASUREMENT' || activeTab === 'CONTRACT' ? 'is-wide' : ''}`}
            style={swipe.sheetStyle}
            onClick={e => e.stopPropagation()}
          >
            <div className="order-drawer-drag-handle-wrapper" {...swipe.touchHandlers} onClick={requestClose}>
              <div className="order-drawer-drag-handle" />
            </div>

            <OrderDrawerHeader
              orderId={editingOrderId}
              columns={columns}
              statusId={formData.statusId}
              onStatusChange={(statusId) => setFormData(prev => ({ ...prev, statusId }))}
              commentsCount={commentsCount}
              onShowComments={showComments}
              onClose={requestClose}
              touchHandlers={swipe.touchHandlers}
            />

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <OrderDrawerTabs
                activeTab={activeTab}
                onChange={setActiveTab}
                showMeasurement={!isWorker || canAccessMeasurements}
                showContract={!isWorker && hasContractTemplates}
                showAi={!isWorker && hasAiSummary && Boolean(editingOrderId)}
                filesCount={formData.attachments.length + files.pendingFiles.length}
              />

              <div className="order-drawer-body modal-body">
                {activeTab === 'MAIN' && (
                  <OrderMainTab
                    orderId={editingOrderId}
                    formData={formData}
                    setFormData={setFormData}
                    currentOrder={currentOrder}
                    clients={clients}
                    employees={employees}
                    isWorker={isWorker}
                    isCompleted={isCompleted}
                    hasInstaller={hasInstaller}
                    hasAct={hasAct}
                    actRequired={actRequired}
                    timezone={tenantSettings?.timezone}
                    expandComments={Boolean(expandComments)}
                    onAddNewClient={quickClient.open}
                    onOpenFiles={() => setActiveTab('FILES')}
                    onCommentsCountChange={handleCommentsCountChange}
                  />
                )}

                {activeTab === 'MEASUREMENT' && (
                  <MeasurementWizard
                    key={`${editingOrderId}-${measurementKey}`}
                    orderId={editingOrderId || undefined}
                    materials={materials}
                    initialContractParams={contract.contractParams}
                    canViewCosts={role === 'OWNER' || role === 'SUPERADMIN' || role === 'MANAGER'}
                    onDownloadDocx={contract.startGenerate}
                    onSaved={handleMeasurementSaved}
                  />
                )}

                {activeTab === 'CONTRACT' && !isWorker && hasContractTemplates && (
                  <OrderContractTab
                    contract={contract}
                    orderId={editingOrderId}
                    orderNumber={formData.orderNumber}
                    setFormData={setFormData}
                    templateStatus={templateStatus}
                    fieldDefinitions={tenantSettings?.contractFieldDefinitions}
                    hasAiEstimate={hasAiEstimate}
                    onOpenMeasurement={() => setActiveTab('MEASUREMENT')}
                    onOpenAiEstimate={() => setIsAiEstimateModalOpen(true)}
                  />
                )}

                {activeTab === 'FILES' && (
                  <OrderFilesTab
                    attachments={formData.attachments}
                    files={files}
                    isWorker={isWorker}
                    isMobile={isMobile}
                    hasDocumentScanner={hasDocumentScanner}
                  />
                )}

                {activeTab === 'AI' && editingOrderId && !isWorker && hasAiSummary && <OrderAiTab ai={ai} />}
              </div>

              <OrderDrawerFooter
                orderId={editingOrderId}
                isDirty={isDirty}
                isWorker={isWorker}
                isCompleted={isCompleted}
                showComplete={isInstallationStage(selectedStatus, columns)}
                hasInstaller={hasInstaller}
                actMissing={actMissing}
                onCancel={discardAndClose}
                onDelete={handleDeleteOrder}
                onComplete={handleCompleteInstallation}
              />
            </form>
          </div>

          <QuickClientModal {...quickClient.modalProps} onOpenPassportScanner={() => setPassportTarget('NEW_CLIENT')} />

          <ContractPromptModal
            isOpen={contract.isPromptOpen}
            onClose={contract.closePrompt}
            contractPromptData={contract.promptData}
            setContractPromptData={contract.setPromptData}
            onOpenPassportScanner={() => setPassportTarget('CONTRACT')}
            onSubmit={contract.submitGenerate}
            contractPromptLoading={contract.promptLoading}
          />

          {passportTarget && (
            <PassportScannerModal isOpen onClose={() => setPassportTarget(null)} onApply={handlePassportApply} />
          )}
        </div>,
        document.body
      )}

      {isUnsavedConfirmOpen && (
        <UnsavedChangesDialog
          onSave={() => {
            setIsUnsavedConfirmOpen(false);
            saveOrder(true);
          }}
          onDiscard={discardAndClose}
          onContinue={() => setIsUnsavedConfirmOpen(false)}
        />
      )}

      {hasAiEstimate && (
        <AiEstimateModal
          isOpen={isAiEstimateModalOpen}
          onClose={() => setIsAiEstimateModalOpen(false)}
          orderId={editingOrderId || undefined}
          orderNumber={formData.orderNumber}
          clientName={currentOrder?.clientName || contract.selectedClient?.name}
          onEstimateApplied={handleEstimateApplied}
        />
      )}
    </>
  );
};
