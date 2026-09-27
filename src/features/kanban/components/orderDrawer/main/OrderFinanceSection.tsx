import React from 'react';
import { useTranslation } from 'react-i18next';
import { distributeInstallerAmounts } from '../../../utils/installers';
import { calcOrderProfitability, type OrderFormData, type SetOrderFormData } from '../../../utils/orderForm';

interface OrderFinanceSectionProps {
  formData: OrderFormData;
  setFormData: SetOrderFormData;
  isWorker: boolean;
}

/**
 * Финансы заказа: стоимость монтажа, аванс и остаток с отметками оплаты, итог и показатели прибыльности.
 * Монтажнику показывается только остаток к оплате.
 */
export const OrderFinanceSection: React.FC<OrderFinanceSectionProps> = ({ formData, setFormData, isWorker }) => {
  const { t } = useTranslation();
  const {
    materialsCost: currentMaterialsCost,
    installationPrice: currentInstallationPrice,
    profit: currentProfit,
    marginPercent: currentProfitMargin
  } = calcOrderProfitability(formData);

  return (
    <>
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
              <label>{t('kanban.modal.installationPrice') || 'Стоимость монтажа'}</label>
              <input 
                type="number" 
                min="0" 
                step="0.01"
                placeholder="0"
                value={formData.installationPrice || ''}
                onChange={(e) => {
                  const newInstPrice = e.target.value;
                  const newInstallers = distributeInstallerAmounts(
                    formData.installers,
                    parseFloat(newInstPrice || '0') || 0
                  );
                  setFormData({
                    ...formData,
                    installationPrice: newInstPrice,
                    installers: newInstallers
                  });
                }}
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

          {/* Статусы фактической оплаты */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '14px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              background: formData.prepaymentPaid ? 'rgba(34, 197, 94, 0.12)' : 'rgba(255, 255, 255, 0.02)',
              border: formData.prepaymentPaid ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer'
            }}>
              <input 
                type="checkbox"
                checked={!!formData.prepaymentPaid}
                onChange={(e) => setFormData({ ...formData, prepaymentPaid: e.target.checked })}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.82rem', fontWeight: 500, color: formData.prepaymentPaid ? '#4ade80' : 'var(--text-secondary)' }}>
                {formData.prepaymentPaid ? '✓ Аванс оплачен (в кассе)' : 'Аванс не оплачен'}
              </span>
            </label>

            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              background: formData.remainderPaid ? 'rgba(34, 197, 94, 0.12)' : 'rgba(255, 255, 255, 0.02)',
              border: formData.remainderPaid ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer'
            }}>
              <input 
                type="checkbox"
                checked={!!formData.remainderPaid}
                onChange={(e) => setFormData({ ...formData, remainderPaid: e.target.checked })}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.82rem', fontWeight: 500, color: formData.remainderPaid ? '#4ade80' : 'var(--text-secondary)' }}>
                {formData.remainderPaid ? '✓ Остаток оплачен (в кассе)' : 'Остаток не оплачен'}
              </span>
            </label>
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
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px', lineHeight: '1.3' }}>
              Себестоимость материалов
            </div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#f59e0b', marginTop: 'auto' }}>
              {currentMaterialsCost.toLocaleString('ru-RU')} ₽
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px', lineHeight: '1.3' }}>
              Монтаж
            </div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)', marginTop: 'auto' }}>
              {currentInstallationPrice.toLocaleString('ru-RU')} ₽
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px', lineHeight: '1.3' }}>
              {t('kanban.modal.profit') || 'Прибыль'}
            </div>
            <div style={{
              fontWeight: 700,
              fontSize: '1.05rem',
              color: currentProfit >= 0 ? 'var(--success)' : 'var(--danger)',
              marginTop: 'auto'
            }}>
              {currentProfit >= 0 ? `+${currentProfit.toLocaleString('ru-RU')}` : currentProfit.toLocaleString('ru-RU')} ₽
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px', lineHeight: '1.3' }}>
              {t('kanban.modal.margin') || 'Рентабельность'}
            </div>
            <div style={{
              fontWeight: 700,
              fontSize: '1.05rem',
              color: currentProfitMargin >= 0 ? 'var(--success)' : 'var(--danger)',
              marginTop: 'auto'
            }}>
              {currentProfitMargin}%
            </div>
          </div>
        </div>
      </>
    )}
    </>
  );
};
