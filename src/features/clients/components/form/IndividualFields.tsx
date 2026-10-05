import { useTranslation } from 'react-i18next';
import { FileText } from 'lucide-react';
import { AddressField, DateField, FieldGrid, FormSection, MessengerFields, PhoneField, TextField } from './FormFields';
import { bindTextField, type ClientFormProps } from './formBinding';

interface IndividualFieldsProps extends ClientFormProps {
  /** Кнопка распознавания паспорта (показывается при включенной функции PASSPORT_OCR). */
  onScanPassport?: () => void;
}

/** Поля карточки физлица: контакты и необязательные данные паспорта для договора. */
export const IndividualFields = ({ onScanPassport, ...props }: IndividualFieldsProps) => {
  const { t } = useTranslation();
  const { form, patch } = props;
  const bind = bindTextField(props);

  return (
    <>
      <TextField label={`${t('clients.modal.name')} *`} required placeholder="Иван Иванов" {...bind('name')} />
      <PhoneField label={`${t('clients.modal.phone')} *`} required {...bind('phone')} />
      <div className="form-row">
        <MessengerFields whatsapp={form.whatsapp} telegram={form.telegram} onChange={patch} />
      </div>
      <TextField label="Email" type="email" placeholder="client@mail.ru" {...bind('email')} />

      <FormSection
        icon={<FileText size={16} />}
        title="Данные паспорта и договора"
        style={{ marginTop: '8px' }}
        action={onScanPassport && (
          <button
            type="button"
            onClick={onScanPassport}
            className="btn btn-secondary"
            style={{
              fontSize: '0.78rem',
              padding: '4px 10px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              background: 'rgba(59, 130, 246, 0.15)',
              borderColor: 'rgba(59, 130, 246, 0.3)',
              color: '#60a5fa'
            }}
          >
            📷 Распознать паспорт РФ
          </button>
        )}
      >
        <FieldGrid minColumnWidth={200} style={{ marginBottom: '12px' }}>
          <DateField inGrid label="Дата рождения" {...bind('birthDate')} />
          <TextField inGrid label="Серия и номер паспорта" placeholder="63 10 123456" {...bind('passportSeriesNumber')} />
        </FieldGrid>
        <FieldGrid minColumnWidth={200} style={{ marginBottom: '12px' }}>
          <TextField inGrid label="Кем выдан" placeholder="Отделом УФМС России по..." {...bind('passportIssuedBy')} />
          <DateField inGrid label="Когда выдан" {...bind('passportIssuedDate')} />
          <TextField inGrid label="Код подразделения" placeholder="770-001" {...bind('passportDepartmentCode')} />
        </FieldGrid>
        <AddressField
          inGrid
          label="Адрес по прописке (регистрации)"
          placeholder="г. Москва, ул. Ленина, д. 10, кв. 5"
          {...bind('registrationAddress')}
        />
      </FormSection>
    </>
  );
};
