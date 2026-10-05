import { Building2, ChevronDown, CreditCard, FileText, MapPin, PlusCircle, Trash2, Users } from 'lucide-react';
import type { ClientContact } from '../../../../api/clients';
import { PRESET_VAT_STATUSES } from '../../../../constants/clients';
import { AddressInput } from '../../../../components/ui/AddressInput';
import { PhoneInput } from '../../../../components/ui/PhoneInput';
import { FieldGrid, FormSection, MessengerFields, PhoneField, TextField } from './FormFields';
import { bindTextField, type ClientFormProps } from './formBinding';

interface ContactsEditor {
  add: () => void;
  update: <K extends keyof ClientContact>(index: number, field: K, value: ClientContact[K]) => void;
  remove: (index: number) => void;
}

interface LegalEntityFieldsProps extends ClientFormProps {
  contacts: ContactsEditor;
}

const contactInputStyle = { width: '100%', paddingLeft: '8px', fontSize: '0.85rem' } as const;

/** Поля карточки юрлица: организация, реквизиты, адреса, банк и представители. */
export const LegalEntityFields = ({ contacts, ...props }: LegalEntityFieldsProps) => {
  const { form, patch } = props;
  const bind = bindTextField(props);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <FormSection icon={<Building2 size={16} />} title="Данные организации">
        <FieldGrid minColumnWidth={240}>
          <TextField inGrid required label="Краткое наименование *" placeholder="ООО «Альфа» или ИП Иванов И.И." {...bind('name')} />
          <TextField inGrid label="Полное наименование (по уставу)" placeholder="Общество с ограниченной ответственностью «Альфа»" {...bind('legalName')} />
          <PhoneField inGrid required label="Рабочий телефон организации *" {...bind('phone')} />
          <TextField inGrid type="email" label="Корпоративный Email" placeholder="info@company.ru" {...bind('email')} />
          <MessengerFields inGrid whatsapp={form.whatsapp} telegram={form.telegram} onChange={patch} />
        </FieldGrid>
      </FormSection>

      <FormSection icon={<FileText size={16} />} title="Реквизиты и Налогообложение">
        <FieldGrid minColumnWidth={180}>
          <TextField inGrid label="ИНН" placeholder="7701234567" {...bind('inn')} />
          <TextField inGrid label="КПП" placeholder="770101001" {...bind('kpp')} />
          <TextField inGrid label="ОГРН / ОГРНИП" placeholder="1027700132195" {...bind('ogrn')} />
          <div className="form-group" style={{ margin: 0 }}>
            <label>Статус НДС</label>
            <div className="custom-select-wrapper">
              <select value={form.vatStatus} onChange={(e) => patch({ vatStatus: e.target.value })} className="custom-select">
                {PRESET_VAT_STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <ChevronDown className="custom-select-icon" size={16} />
            </div>
          </div>
        </FieldGrid>
      </FormSection>

      <FormSection icon={<MapPin size={16} />} title="Адреса">
        <div className="form-group" style={{ marginBottom: '10px' }}>
          <label>Юридический адрес</label>
          <AddressInput
            withPostalCode
            placeholder="101000, г. Москва, ул. Ленина, д. 10, оф. 101"
            value={form.legalAddress}
            onChange={(legalAddress) => patch({ legalAddress })}
          />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ margin: 0 }}>Фактический адрес</label>
            <button
              type="button"
              onClick={() => patch({ actualAddress: form.legalAddress })}
              style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}
            >
              Скопировать из юридического
            </button>
          </div>
          <AddressInput
            withPostalCode
            placeholder="101000, г. Москва, ул. Ленина, д. 10, оф. 101"
            value={form.actualAddress}
            onChange={(actualAddress) => patch({ actualAddress })}
          />
        </div>
      </FormSection>

      <FormSection icon={<CreditCard size={16} />} title="Банковские реквизиты">
        <FieldGrid minColumnWidth={220}>
          <TextField inGrid label="БИК банка" placeholder="044525225" {...bind('bik')} />
          <TextField inGrid label="Наименование банка" placeholder="ПАО Сбербанк" {...bind('bankName')} />
          <TextField inGrid label="Расчетный счет (р/с)" placeholder="40702810938000012345" {...bind('checkingAccount')} />
          <TextField inGrid label="Корреспондентский счет (к/с)" placeholder="30101810400000000225" {...bind('correspondentAccount')} />
        </FieldGrid>
      </FormSection>

      <FormSection
        icon={<Users size={16} />}
        title="Представители и контакты"
        action={(
          <button
            type="button"
            onClick={contacts.add}
            className="btn btn-sm btn-ghost"
            style={{ color: 'var(--accent-primary)', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px' }}
          >
            <PlusCircle size={14} /> Добавить представителя
          </button>
        )}
      >
        {form.contacts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '12px', fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.01)', borderRadius: 'var(--radius-sm)' }}>
            Нет добавленных представителей. Нажмите «Добавить представителя», чтобы указать директора, бухгалтера или менеджера.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {form.contacts.map((contact, index) => (
              <div key={index} style={{ background: 'rgba(255,255,255,0.04)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-primary)', cursor: 'pointer', margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={contact.isPrimary || false}
                      onChange={(e) => contacts.update(index, 'isPrimary', e.target.checked)}
                    />
                    <span style={{ fontWeight: contact.isPrimary ? 600 : 400, color: contact.isPrimary ? 'var(--accent-primary)' : 'inherit' }}>
                      Основной контакт (ЛПР)
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => contacts.remove(index)}
                    className="action-btn delete"
                    title="Удалить представителя"
                    style={{ padding: '2px' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="ФИО представителя *"
                    value={contact.name}
                    onChange={(e) => contacts.update(index, 'name', e.target.value)}
                    className="search-input"
                    style={contactInputStyle}
                  />
                  <input
                    type="text"
                    placeholder="Должность (Ген. директор...)"
                    value={contact.position || ''}
                    onChange={(e) => contacts.update(index, 'position', e.target.value)}
                    className="search-input"
                    style={contactInputStyle}
                  />
                  <PhoneInput
                    aria-label="Телефон представителя"
                    value={contact.phone || ''}
                    onChange={(value) => contacts.update(index, 'phone', value)}
                    style={contactInputStyle}
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={contact.email || ''}
                    onChange={(e) => contacts.update(index, 'email', e.target.value)}
                    className="search-input"
                    style={contactInputStyle}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </FormSection>
    </div>
  );
};
