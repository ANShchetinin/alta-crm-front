import { useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import {
  createRoomParamDefinition,
  updateRoomParamDefinition,
  type RoomParamAggregation,
  type RoomParamDefinition,
  type RoomParamType
} from '../../../api/roomParams';
import { useInvalidateRoomParams } from '../../../hooks/queries/useRoomParamsQuery';
import { toast } from '../../../utils/toast';
import { getErrorMessage } from '../../../utils/errorMessage';
import {
  ROOM_PARAM_AGGREGATION_LABELS,
  ROOM_PARAM_TYPE_LABELS,
  aggregationsFor,
  emptyRoomParamForm,
  roomParamFormError,
  roomParamFormOf,
  roomParamRequestOf,
  type RoomParamForm
} from '../utils/roomParams';

interface RoomParamModalProps {
  /** Параметр для изменения; без него — новый параметр. */
  initial?: RoomParamDefinition;
  onClose: () => void;
  onSaved?: (param: RoomParamDefinition) => void;
}

/** Окно параметра помещения: добавление (из мастера замера или настроек) и изменение (в настройках). */
export const RoomParamModal = ({ initial, onClose, onSaved }: RoomParamModalProps) => {
  const [form, setForm] = useState<RoomParamForm>(() => (initial ? roomParamFormOf(initial) : emptyRoomParamForm()));
  const [saving, setSaving] = useState(false);
  const invalidateRoomParams = useInvalidateRoomParams();
  const error = roomParamFormError(form);

  const update = (patch: Partial<RoomParamForm>) => setForm(prev => ({ ...prev, ...patch }));

  const changeType = (valueType: RoomParamType) => {
    const allowed = aggregationsFor(valueType);
    update({ valueType, aggregation: allowed.includes(form.aggregation) ? form.aggregation : allowed[0] });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (error) {
      toast.error(error);
      return;
    }
    setSaving(true);
    try {
      const request = roomParamRequestOf(form);
      const saved = initial
        ? await updateRoomParamDefinition(initial.id, request)
        : await createRoomParamDefinition(request);
      await invalidateRoomParams();
      toast.success(initial ? 'Параметр изменён' : 'Параметр добавлен');
      onSaved?.(saved);
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Не удалось сохранить параметр'));
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <h2>{initial ? 'Параметр помещения' : 'Новый параметр помещения'}</h2>
          <button type="button" onClick={onClose} className="btn-icon" aria-label="Закрыть">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={submit} className="modal-form">
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="room-param-label">Название</label>
              <input
                id="room-param-label"
                type="text"
                required
                autoFocus
                value={form.label}
                onChange={e => update({ label: e.target.value })}
                placeholder="Например: Закладные под люстру"
              />
            </div>
            <div className="form-group">
              <label htmlFor="room-param-unit">Единица</label>
              <input
                id="room-param-unit"
                type="text"
                value={form.unit}
                onChange={e => update({ unit: e.target.value })}
                placeholder="шт, м.п., м²"
              />
            </div>
            <div className="form-group">
              <label htmlFor="room-param-type">Тип значения</label>
              <select
                id="room-param-type"
                value={form.valueType}
                disabled={Boolean(initial)}
                onChange={e => changeType(e.target.value as RoomParamType)}
              >
                {(Object.keys(ROOM_PARAM_TYPE_LABELS) as RoomParamType[]).map(type => (
                  <option key={type} value={type}>{ROOM_PARAM_TYPE_LABELS[type]}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="room-param-aggregation">В договор</label>
              <select
                id="room-param-aggregation"
                value={form.aggregation}
                onChange={e => update({ aggregation: e.target.value as RoomParamAggregation })}
              >
                {aggregationsFor(form.valueType).map(aggregation => (
                  <option key={aggregation} value={aggregation}>{ROOM_PARAM_AGGREGATION_LABELS[aggregation]}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="room-param-tag">Тег в шаблоне договора</label>
              <input
                id="room-param-tag"
                type="text"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                value={form.contractTag}
                onChange={e => update({ contractTag: e.target.value })}
                placeholder="например: chandelier_mounts"
              />
              <small style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                {form.contractTag.trim()
                  ? `В шаблоне: {${form.contractTag.trim()}}`
                  : 'Без тега параметр виден в замере, но в договор не попадает'}
              </small>
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-ghost">Отмена</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
