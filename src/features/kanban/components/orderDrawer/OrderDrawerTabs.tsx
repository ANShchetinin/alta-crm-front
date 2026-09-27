import React from 'react';
import { FileText, Mic, Paperclip, Ruler, User } from 'lucide-react';
import type { OrderModalTab } from '../../../../store/useOrderDrawerStore';

interface OrderDrawerTabsProps {
  activeTab: OrderModalTab;
  onChange: (tab: OrderModalTab) => void;
  showMeasurement: boolean;
  showContract: boolean;
  showAi: boolean;
  filesCount: number;
}

/**
 * Переключатель вкладок шторки заказа; недоступные роли или тарифу вкладки не показываются.
 */
export const OrderDrawerTabs: React.FC<OrderDrawerTabsProps> = ({ activeTab, onChange, showMeasurement, showContract, showAi, filesCount }) => {
  const tabs: { id: OrderModalTab; visible: boolean; label: React.ReactNode }[] = [
    { id: 'MAIN', visible: true, label: <><User size={15} /> Основное</> },
    { id: 'MEASUREMENT', visible: showMeasurement, label: <><Ruler size={15} /> Замер и смета</> },
    { id: 'CONTRACT', visible: showContract, label: <><FileText size={15} /> Договор</> },
    {
      id: 'FILES',
      visible: true,
      label: <><Paperclip size={15} /> Файлы и акты {filesCount > 0 && <span className="order-drawer-tab-badge">{filesCount}</span>}</>
    },
    { id: 'AI', visible: showAi, label: <><Mic size={15} /> AI анализ звонков</> }
  ];

  return (
    <div className="order-drawer-tabs">
      {tabs.filter(tab => tab.visible).map(tab => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`order-drawer-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};
