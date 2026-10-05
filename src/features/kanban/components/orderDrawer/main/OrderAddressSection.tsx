import React from 'react';
import { useTranslation } from 'react-i18next';
import { AddressInput } from '../../../../../components/ui/AddressInput';
import { get2GisUrl, getYandexMapsUrl } from '../../../../../utils/navigation';
import type { SetOrderFormData } from '../../../utils/orderForm';

interface OrderAddressSectionProps {
  /** Ключ пересоздания поля DaData при переключении заказа. */
  addressKey: string;
  address: string;
  entrance: string;
  floor: string;
  setFormData: SetOrderFormData;
}

/**
 * Адрес монтажа с подсказками DaData, ссылками на навигаторы, подъездом и этажом.
 */
export const OrderAddressSection: React.FC<OrderAddressSectionProps> = ({ addressKey, address, entrance, floor, setFormData }) => {
  const { t } = useTranslation();

  return (
    <>
      {/* Адрес с подсказками DaData и навигаторами */}
      <div className="form-group">
        <label>{t('kanban.modal.address') || 'Адрес монтажа'}</label>
        <AddressInput
          key={addressKey}
          placeholder={t('kanban.modal.address') || 'Адрес монтажа'}
          value={address}
          onChange={(value) => setFormData(prev => ({ ...prev, address: value }))}
        />
        {address && (
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              {t('kanban.modal.route') || 'Навигатор'}:
            </span>
            <a
              href={getYandexMapsUrl(address, entrance, floor)}
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
              href={get2GisUrl(address, entrance, floor)}
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
            value={entrance}
            onChange={(e) => setFormData(prev => ({ ...prev, entrance: e.target.value }))}
            className="search-input"
            style={{ width: '100%', paddingLeft: '12px' }}
          />
        </div>
        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
          <label>{t('kanban.modal.floor') || 'Этаж'}</label>
          <input 
            type="text" 
            placeholder="4"
            value={floor}
            onChange={(e) => setFormData(prev => ({ ...prev, floor: e.target.value }))}
            className="search-input"
            style={{ width: '100%', paddingLeft: '12px' }}
          />
        </div>
      </div>
    </>
  );
};
