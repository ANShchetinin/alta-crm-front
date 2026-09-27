import React from 'react';
import { useTranslation } from 'react-i18next';
import type { SetOrderFormData } from '../../../utils/orderForm';

interface OrderDetailsSectionProps {
  description: string;
  measurementDate: string;
  installationDate: string;
  setFormData: SetOrderFormData;
  isWorker: boolean;
}

const readOnlyStyle: React.CSSProperties = { opacity: 0.8, cursor: 'not-allowed', background: 'rgba(255, 255, 255, 0.03)' };

/**
 * Описание заказа, даты замера и монтажа (монтажнику — только просмотр дат).
 */
export const OrderDetailsSection: React.FC<OrderDetailsSectionProps> = ({
  description,
  measurementDate,
  installationDate,
  setFormData,
  isWorker
}) => {
  const { t } = useTranslation();

  return (
    <>
      <div className="form-group">
        <label>{t('kanban.modal.description') || 'Комментарии к заказу'}</label>
        <textarea 
          required
          rows={3}
          value={description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
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
          placeholder="Описание заказа..."
        />
      </div>

      <div style={{display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px'}}>
        <div className="form-group" style={{flex: 1, minWidth: '200px'}}>
          <label>Дата и время замера</label>
          <input 
            type="datetime-local" 
            disabled={isWorker}
            readOnly={isWorker}
            value={measurementDate}
            onChange={(e) => setFormData(prev => ({ ...prev, measurementDate: e.target.value }))}
            className="custom-date-input"
            style={{ width: '100%', ...(isWorker ? readOnlyStyle : {}) }}
          />
        </div>
        <div className="form-group" style={{flex: 1, minWidth: '200px'}}>
          <label>{t('kanban.modal.installationDate') || 'Дата монтажа'}</label>
          <input 
            type="date" 
            disabled={isWorker}
            readOnly={isWorker}
            value={installationDate}
            onChange={(e) => setFormData(prev => ({ ...prev, installationDate: e.target.value }))}
            className="custom-date-input"
            style={{ width: '100%', ...(isWorker ? readOnlyStyle : {}) }}
          />
        </div>
      </div>
    </>
  );
};
