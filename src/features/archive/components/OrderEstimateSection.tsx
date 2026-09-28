import { Calculator, Layers } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Order } from '../../../api/kanban';
import type { MeasurementDto } from '../../../api/measurements';

const TH = { padding: '6px 8px' } as const;
const TD = { padding: '6px 8px' } as const;
const NUM_TH = { padding: '6px 4px', width: '30px' } as const;
const NUM_TD = { padding: '6px 4px', color: 'var(--text-secondary)' } as const;
const RIGHT = { textAlign: 'right' } as const;

const SpecTable = ({ headers, children }: { headers: ReactNode; children: ReactNode }) => (
  <div style={{ overflowX: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
      <thead>
        <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', textAlign: 'left' }}>{headers}</tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  </div>
);

const ROW = { borderBottom: '1px solid var(--glass-border)' } as const;

/**
 * Смета заказа: помещения и позиции сохраненного замера, иначе спецификация договора, иначе материалы заказа.
 */
export const OrderEstimateSection = ({ order, measurement, loading }: { order: Order; measurement: MeasurementDto | null; loading: boolean }) => {
  const renderBody = () => {
    if (measurement?.rooms && measurement.rooms.length > 0) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {measurement.rooms.map((room, idx) => (
              <div
                key={idx}
                style={{
                  padding: '6px 12px',
                  background: 'rgba(59, 130, 246, 0.08)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Layers size={13} style={{ color: 'var(--accent-primary)' }} />
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{room.roomName || `Помещение ${idx + 1}`}</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                  ({room.area || 0} м², {room.perimeter || 0} м/п)
                </span>
              </div>
            ))}
          </div>

          {measurement.items && measurement.items.length > 0 ? (
            <div style={{ marginTop: '4px' }}>
              <SpecTable headers={(
                <>
                  <th style={NUM_TH}>№</th>
                  <th style={TH}>Наименование</th>
                  <th style={TH}>Помещение</th>
                  <th style={{ ...TH, ...RIGHT }}>Кол-во</th>
                  <th style={{ ...TH, ...RIGHT }}>Цена</th>
                  <th style={{ ...TH, ...RIGHT }}>Сумма</th>
                </>
              )}>
                {measurement.items.map((item, i) => (
                  <tr key={i} style={ROW}>
                    <td style={NUM_TD}>{i + 1}</td>
                    <td style={{ ...TD, color: 'var(--text-primary)', fontWeight: 500 }}>{item.name}</td>
                    <td style={{ ...TD, color: 'var(--text-secondary)' }}>{item.roomName || '—'}</td>
                    <td style={{ ...TD, ...RIGHT, color: 'var(--text-primary)' }}>{item.quantity} {item.unit}</td>
                    <td style={{ ...TD, ...RIGHT, color: 'var(--text-secondary)' }}>{item.unitSalePrice?.toLocaleString('ru-RU')} ₽</td>
                    <td style={{ ...TD, ...RIGHT, fontWeight: 600, color: '#22c55e' }}>{item.totalSalePrice?.toLocaleString('ru-RU')} ₽</td>
                  </tr>
                ))}
              </SpecTable>
            </div>
          ) : (
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Позиции расчета зафиксированы в параметрах комнат
            </div>
          )}
        </div>
      );
    }

    const specItems = order.contractParams?.specItems;
    if (specItems && specItems.length > 0) {
      return (
        <SpecTable headers={(
          <>
            <th style={NUM_TH}>№</th>
            <th style={TH}>Наименование</th>
            <th style={{ ...TH, ...RIGHT }}>Кол-во</th>
            <th style={{ ...TH, ...RIGHT }}>Цена</th>
            <th style={{ ...TH, ...RIGHT }}>Сумма</th>
          </>
        )}>
          {specItems.map((item, i) => (
            <tr key={i} style={ROW}>
              <td style={NUM_TD}>{item.idx || i + 1}</td>
              <td style={{ ...TD, color: 'var(--text-primary)', fontWeight: 500 }}>{item.name}</td>
              <td style={{ ...TD, ...RIGHT, color: 'var(--text-primary)' }}>{item.quantity} {item.unit || 'шт.'}</td>
              <td style={{ ...TD, ...RIGHT, color: 'var(--text-secondary)' }}>{item.price?.toLocaleString('ru-RU')} ₽</td>
              <td style={{ ...TD, ...RIGHT, fontWeight: 600, color: '#22c55e' }}>{item.total?.toLocaleString('ru-RU')} ₽</td>
            </tr>
          ))}
        </SpecTable>
      );
    }

    if (order.materials && order.materials.length > 0) {
      return (
        <SpecTable headers={(
          <>
            <th style={NUM_TH}>№</th>
            <th style={TH}>Материал</th>
            <th style={{ ...TH, ...RIGHT }}>Кол-во</th>
            <th style={{ ...TH, ...RIGHT }}>Цена</th>
          </>
        )}>
          {order.materials.map((m, i) => (
            <tr key={i} style={ROW}>
              <td style={NUM_TD}>{i + 1}</td>
              <td style={{ ...TD, color: 'var(--text-primary)' }}>{m.materialName || `Материал #${m.materialId}`}</td>
              <td style={{ ...TD, ...RIGHT, color: 'var(--text-primary)' }}>{m.quantity}</td>
              <td style={{ ...TD, ...RIGHT, color: '#22c55e', fontWeight: 600 }}>
                {m.fixedSalePrice != null ? `${m.fixedSalePrice.toLocaleString('ru-RU')} ₽` : '—'}
              </td>
            </tr>
          ))}
        </SpecTable>
      );
    }

    return (
      <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', padding: '6px 0' }}>
        Детальная спецификация сметы не сохранена. Фиксация стоимости произведена в договоре.
      </div>
    );
  };

  return (
    <div style={{ padding: '14px 16px', background: 'var(--chip-bg, rgba(255, 255, 255, 0.04))', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Calculator size={16} style={{ color: 'var(--accent-primary)' }} />
          Смета и спецификация заказа
        </div>
        {loading && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Загрузка сметы...</span>}
      </div>
      {renderBody()}
    </div>
  );
};
