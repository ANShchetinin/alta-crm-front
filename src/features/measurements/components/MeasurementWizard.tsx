import { useState } from 'react';
import { FileDown, Save } from 'lucide-react';
import type { Material } from '../../../api/storage';
import type { MeasurementCalculateResponse, MeasurementDto } from '../../../api/measurements';
import { useMaterialsQuery } from '../../../hooks/queries/useStorageQuery';
import { useMeasurementEstimate } from '../hooks/useMeasurementEstimate';
import { useIosKeyboardScrollFix } from '../hooks/useIosKeyboardScrollFix';
import { findLinkedSlot, normalizeDisplayUnit, type InitialContractParams } from '../utils/measurementEstimate';
import { RoomTabs } from './RoomTabs';
import { RoomEditor } from './RoomEditor';
import { EstimateSummary } from './estimate/EstimateSummary';
import { EstimateItemsTable } from './estimate/EstimateItemsTable';
import { EstimateItemCards } from './estimate/EstimateItemCards';
import type { EstimateRowProps } from './estimate/ItemFields';
import { WarehouseItemModal } from './WarehouseItemModal';
import { labelStyle } from './wizardStyles';
import '../../../styles/measurements.css';

interface MeasurementWizardProps {
  orderId?: number;
  materials?: Material[];
  initialContractParams?: InitialContractParams;
  canViewCosts: boolean;
  onSaved?: (savedMeasurement: MeasurementDto, calculated: MeasurementCalculateResponse) => void;
  onDownloadDocx?: () => void;
}

const EMPTY_MATERIALS: Material[] = [];

/** Мастер замера: помещения и их геометрия, пакеты работ, интерактивная смета и сохранение в заказ. */
export const MeasurementWizard = ({
  orderId,
  materials = EMPTY_MATERIALS,
  initialContractParams,
  canViewCosts,
  onSaved,
  onDownloadDocx
}: MeasurementWizardProps) => {
  const hasMaterialsProp = materials.length > 0;
  const { data: fetchedMaterials = EMPTY_MATERIALS } = useMaterialsQuery(!hasMaterialsProp);
  const warehouseMaterials = hasMaterialsProp ? materials : fetchedMaterials;

  const estimate = useMeasurementEstimate({
    orderId,
    initialContractParams,
    materials: warehouseMaterials,
    onSaved
  });
  useIosKeyboardScrollFix();

  const [showDetails, setShowDetails] = useState(true);
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);

  if (estimate.loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Загрузка параметров замера...
      </div>
    );
  }

  if (estimate.loadFailed) {
    return (
      <div style={{ padding: '32px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <div style={{ color: 'var(--danger)', fontWeight: 600 }}>Не удалось загрузить сохраненный замер</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', maxWidth: '420px' }}>
          Смета не показана, чтобы ее нельзя было случайно перезаписать пустой. Проверьте соединение и повторите.
        </div>
        <button type="button" onClick={estimate.retryLoad} className="btn btn-primary">
          Повторить
        </button>
      </div>
    );
  }

  const { rooms, currentRoom, activeRoomIdx, items } = estimate;

  const addCustomItem = () => {
    setShowDetails(true);
    estimate.addCustomItem();
  };

  const addWarehouseItem = (materialId: number) => {
    setShowDetails(true);
    if (estimate.addWarehouseItem(materialId)) {
      setIsWarehouseModalOpen(false);
    }
  };

  const rows: EstimateRowProps[] = items.map((item, index) => ({
    item,
    index,
    linkedSlot: findLinkedSlot(estimate.services, item),
    unit: normalizeDisplayUnit(item.unit),
    showRoom: rooms.length > 1,
    onUpdate: patch => estimate.updateItem(index, patch),
    onRemove: () => estimate.removeItem(index),
    onSwitchMaterial: materialId => estimate.switchItemMaterial(index, materialId)
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      <RoomTabs rooms={rooms} activeIdx={activeRoomIdx} onSelect={estimate.setActiveRoomIdx} onAdd={estimate.addRoom} />

      {currentRoom && (
        <RoomEditor
          room={currentRoom}
          canRemove={rooms.length > 1}
          onChange={patch => estimate.updateRoom(activeRoomIdx, patch)}
          onRemove={() => estimate.removeRoom(activeRoomIdx)}
          services={estimate.services}
          isServiceActive={estimate.isServiceActive}
          onToggleService={estimate.toggleService}
        />
      )}

      <div>
        <label style={labelStyle}>📝 Заметки замерщика / особенности монтажа</label>
        <textarea
          rows={2}
          value={estimate.notes}
          onChange={e => estimate.setNotes(e.target.value)}
          placeholder="Особые указания монтажникам, тип проводки, скрытые коммуникации..."
          style={{
            width: '100%',
            background: 'var(--input-bg, rgba(255, 255, 255, 0.04))',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            padding: '8px 12px',
            fontSize: '0.86rem',
            outline: 'none',
            resize: 'vertical',
            boxSizing: 'border-box'
          }}
        />
      </div>

      <div className="wizard-summary-box">
        <EstimateSummary
          totals={estimate.totals}
          roomsCount={rooms.length}
          itemsCount={items.length}
          canViewCosts={canViewCosts}
          isManualEditMode={estimate.isManualEditMode}
          showDetails={showDetails}
          onToggleDetails={() => setShowDetails(prev => !prev)}
          onAddWarehouseItem={() => setIsWarehouseModalOpen(true)}
          onAddCustomItem={addCustomItem}
        />

        {showDetails && (
          <div>
            <EstimateItemsTable rows={rows} />
            <EstimateItemCards
              rows={rows}
              onAddWarehouseItem={() => setIsWarehouseModalOpen(true)}
              onAddCustomItem={addCustomItem}
            />
          </div>
        )}

        <div className="wizard-action-footer" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '10px',
          marginTop: '8px',
          paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
          flexWrap: 'wrap'
        }}>
          {onDownloadDocx && (
            <button
              type="button"
              onClick={onDownloadDocx}
              className="btn btn-ghost wizard-footer-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                border: '1px solid var(--glass-border)',
                padding: '10px 16px',
                fontSize: '0.88rem'
              }}
            >
              <FileDown size={16} /> Скачать Договор (DOCX)
            </button>
          )}

          {orderId && (
            <button
              type="button"
              onClick={estimate.save}
              disabled={estimate.saving}
              className="btn btn-primary wizard-footer-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 22px',
                fontWeight: 600,
                fontSize: '0.94rem'
              }}
            >
              <Save size={16} /> {estimate.saving ? 'Сохранение...' : 'Сохранить смету в заказ'}
            </button>
          )}
        </div>
      </div>

      {isWarehouseModalOpen && (
        <WarehouseItemModal
          materials={warehouseMaterials}
          onAdd={addWarehouseItem}
          onClose={() => setIsWarehouseModalOpen(false)}
        />
      )}
    </div>
  );
};
