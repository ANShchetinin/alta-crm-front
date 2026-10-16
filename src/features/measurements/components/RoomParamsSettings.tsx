import { useState } from 'react';
import { Archive, Pencil, Plus, SlidersHorizontal } from 'lucide-react';
import { archiveRoomParamDefinition, type RoomParamDefinition } from '../../../api/roomParams';
import { useInvalidateRoomParams, useRoomParamsQuery } from '../../../hooks/queries/useRoomParamsQuery';
import { confirm } from '../../../utils/confirm';
import { toast } from '../../../utils/toast';
import { getErrorMessage } from '../../../utils/errorMessage';
import { ROOM_PARAM_AGGREGATION_LABELS, activeRoomParams, roomParamLabel } from '../utils/roomParams';
import { RoomParamModal } from './RoomParamModal';
import '../../../styles/measurements.css';

const EMPTY_PARAMS: RoomParamDefinition[] = [];

type Editing = { param?: RoomParamDefinition } | null;

/** Настройки владельца: параметры помещения, которые вводятся в замере и сводятся в теги договора. */
export const RoomParamsSettings = () => {
  const { data: params = EMPTY_PARAMS, isLoading } = useRoomParamsQuery();
  const invalidateRoomParams = useInvalidateRoomParams();
  const [editing, setEditing] = useState<Editing>(null);
  const active = activeRoomParams(params);
  const archivedCount = params.length - active.length;

  const archive = async (param: RoomParamDefinition) => {
    const ok = await confirm({
      title: 'Убрать параметр в архив?',
      message: `«${param.label}» пропадёт из замера и договора. Значения в сохранённых замерах останутся.`,
      confirmText: 'В архив',
      cancelText: 'Отмена'
    });
    if (!ok) {
      return;
    }
    try {
      await archiveRoomParamDefinition(param.id);
      await invalidateRoomParams();
      toast.success('Параметр убран в архив');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Не удалось убрать параметр в архив'));
    }
  };

  return (
    <section className="room-params-settings">
      <div className="room-params-settings-header">
        <div>
          <h3>
            <SlidersHorizontal size={18} style={{ color: 'var(--accent-primary)' }} />
            Параметры помещения
          </h3>
          <p>
            Вводятся в замере по каждому помещению. Договор сводит их в теги шаблона, а пакеты работ
            «по количеству» и «по длине» могут брать из них количество.
          </p>
        </div>
        <button type="button" className="btn btn-primary room-params-settings-add" onClick={() => setEditing({})}>
          <Plus size={16} /> Добавить параметр
        </button>
      </div>

      {isLoading ? (
        <div className="room-params-settings-empty">Загрузка...</div>
      ) : active.length === 0 ? (
        <div className="room-params-settings-empty">Параметров пока нет</div>
      ) : (
        <ul className="room-params-settings-list">
          {active.map(param => (
            <li key={param.key} className="room-params-settings-row">
              <div className="room-params-settings-info">
                <span className="room-params-settings-name">{roomParamLabel(param)}</span>
                <span className="room-params-settings-meta">
                  {ROOM_PARAM_AGGREGATION_LABELS[param.aggregation]}
                  {param.contractTag ? ` · {${param.contractTag}}` : ' · не в договоре'}
                </span>
              </div>
              <div className="room-params-settings-actions">
                <button type="button" className="btn-icon" aria-label={`Изменить «${param.label}»`} onClick={() => setEditing({ param })}>
                  <Pencil size={16} />
                </button>
                <button type="button" className="btn-icon" aria-label={`В архив «${param.label}»`} onClick={() => archive(param)}>
                  <Archive size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {archivedCount > 0 && <div className="room-params-settings-archived">В архиве: {archivedCount}</div>}

      {editing && <RoomParamModal initial={editing.param} onClose={() => setEditing(null)} />}
    </section>
  );
};
