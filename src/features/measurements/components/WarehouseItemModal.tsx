import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Box } from 'lucide-react';
import type { Material } from '../../../api/storage';
import { SearchSelect, type SearchSelectOption } from '../../../components/SearchSelect';
import { labelStyle } from './wizardStyles';

interface WarehouseItemModalProps {
  materials: Material[];
  onAdd: (materialId: number) => void;
  onClose: () => void;
}

const toOption = (material: Material): SearchSelectOption => ({
  value: material.id,
  label: material.name,
  price: material.salePrice,
  unit: material.unit,
  stock: material.quantityInStock,
  subLabel: material.category || (material.type === 'SERVICE' ? 'Услуга' : 'Материал')
});

/** Окно выбора материала или услуги со склада для добавления в смету. */
export const WarehouseItemModal = ({ materials, onAdd, onClose }: WarehouseItemModalProps) => {
  const [selectedId, setSelectedId] = useState<number | ''>('');

  return createPortal(
    <div className="measurement-warehouse-modal-overlay" onClick={onClose}>
      <div className="measurement-warehouse-modal-box" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Box size={18} style={{ color: 'var(--accent-primary)' }} />
            Добавить позицию со склада
          </h3>
          <button type="button" onClick={onClose} className="btn-icon" style={{ fontSize: '1.2rem', padding: '4px' }}>
            ✕
          </button>
        </div>

        <div>
          <label style={labelStyle}>Выберите материал или услугу:</label>
          <SearchSelect
            options={materials.map(toOption)}
            value={selectedId}
            placeholder="Поиск по номенклатуре склада..."
            onChange={val => setSelectedId(val ? Number(val) : '')}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
          <button type="button" onClick={onClose} className="btn btn-ghost">
            Отмена
          </button>
          <button
            type="button"
            disabled={!selectedId}
            onClick={() => {
              if (selectedId) {
                onAdd(Number(selectedId));
              }
            }}
            className="btn btn-primary"
            style={{ padding: '8px 18px', fontWeight: 600 }}
          >
            Добавить в смету
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
