import { useTranslation } from 'react-i18next';
import { Building2, Plus, Search, User } from 'lucide-react';
import type { Client } from '../../../api/clients';
import { clientTypeOf, type ClientTypeFilter } from '../utils/clientForm';

interface ClientsHeaderProps {
  clients: Client[];
  typeFilter: ClientTypeFilter;
  onTypeFilterChange: (filter: ClientTypeFilter) => void;
  search: string;
  onSearchChange: (search: string) => void;
  onAdd: () => void;
}

const FILTER_BUTTON_STYLE = { fontSize: '0.8rem', padding: '4px 12px', height: '32px', display: 'inline-flex', alignItems: 'center', gap: '6px' } as const;

/** Заголовок базы клиентов: фильтр по типу со счетчиками, поиск и добавление. */
export const ClientsHeader = ({ clients, typeFilter, onTypeFilterChange, search, onSearchChange, onAdd }: ClientsHeaderProps) => {
  const { t } = useTranslation();
  const individualCount = clients.filter(c => clientTypeOf(c) === 'INDIVIDUAL').length;
  const legalCount = clients.filter(c => c.clientType === 'LEGAL_ENTITY').length;
  const filterClass = (filter: ClientTypeFilter) => `btn btn-sm ${typeFilter === filter ? 'btn-primary' : 'btn-ghost'}`;

  return (
    <div className="clients-header">
      <div>
        <h1>{t('clients.title')}</h1>
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <button onClick={() => onTypeFilterChange('ALL')} className={filterClass('ALL')} style={FILTER_BUTTON_STYLE}>
            Все ({clients.length})
          </button>
          <button onClick={() => onTypeFilterChange('INDIVIDUAL')} className={filterClass('INDIVIDUAL')} style={FILTER_BUTTON_STYLE}>
            <User size={14} /> Физлица ({individualCount})
          </button>
          <button onClick={() => onTypeFilterChange('LEGAL_ENTITY')} className={filterClass('LEGAL_ENTITY')} style={FILTER_BUTTON_STYLE}>
            <Building2 size={14} /> Компании / Юрлица ({legalCount})
          </button>
        </div>
      </div>

      <div className="clients-actions">
        <div className="search-input-wrapper">
          <Search className="search-icon" size={18} />
          <input
            type="text"
            placeholder="Поиск по имени, ИНН, телефону..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="search-input"
          />
        </div>
        <button onClick={onAdd} className="btn btn-primary">
          <Plus size={18} />
          <span>{t('clients.addClient')}</span>
        </button>
      </div>
    </div>
  );
};
