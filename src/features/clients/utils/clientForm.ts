import type { Client, ClientContact, ClientCreateRequest } from '../../../api/clients';
import { PRESET_LEAD_SOURCES } from '../../../constants/clients';
import { dateForSave } from '../../../utils/dateInput';
import { PHONE_DEFAULT, phoneForSave, phoneMatches } from '../../../utils/phone';

export type ClientType = 'INDIVIDUAL' | 'LEGAL_ENTITY';
export type ClientTypeFilter = 'ALL' | ClientType;

/** Значение селекта источника лида, при котором источник вводится вручную. */
export const CUSTOM_LEAD_SOURCE = 'custom';

export interface ClientFormData {
  clientType: ClientType;
  avatarUrl: string;
  name: string;
  legalName: string;
  phone: string;
  birthDate: string;
  passportSeriesNumber: string;
  passportIssuedBy: string;
  passportIssuedDate: string;
  passportDepartmentCode: string;
  registrationAddress: string;
  email: string;
  inn: string;
  kpp: string;
  ogrn: string;
  legalAddress: string;
  actualAddress: string;
  bankName: string;
  bik: string;
  checkingAccount: string;
  correspondentAccount: string;
  vatStatus: string;
  contactPerson: string;
  contactPosition: string;
  contacts: ClientContact[];
  leadSource: string;
  customLeadSource: string;
  whatsapp: string;
  telegram: string;
  allowedTenantIds: number[];
}

/** Строковые поля формы, которые редактируются обычным текстовым полем. */
export type ClientTextField = {
  [K in keyof ClientFormData]: ClientFormData[K] extends string ? K : never;
}[keyof ClientFormData];

export const clientTypeOf = (client: Client): ClientType => client.clientType || 'INDIVIDUAL';

export const emptyClientForm = (clientType: ClientType, tenantId: number): ClientFormData => ({
  clientType,
  avatarUrl: '',
  name: '',
  legalName: '',
  phone: PHONE_DEFAULT,
  birthDate: '',
  passportSeriesNumber: '',
  passportIssuedBy: '',
  passportIssuedDate: '',
  passportDepartmentCode: '',
  registrationAddress: '',
  email: '',
  inn: '',
  kpp: '',
  ogrn: '',
  legalAddress: '',
  actualAddress: '',
  bankName: '',
  bik: '',
  checkingAccount: '',
  correspondentAccount: '',
  vatStatus: 'NO_VAT',
  contactPerson: '',
  contactPosition: '',
  contacts: [],
  leadSource: '',
  customLeadSource: '',
  whatsapp: '',
  telegram: '',
  allowedTenantIds: [tenantId]
});

/** Форма редактирования существующего клиента; источник не из списка переводится в «ввести вручную». */
export const clientToForm = (client: Client, tenantId: number): ClientFormData => {
  const source = client.leadSource || '';
  const isPreset = PRESET_LEAD_SOURCES.includes(source);
  return {
    clientType: clientTypeOf(client),
    avatarUrl: client.avatarUrl || '',
    name: client.name || '',
    legalName: client.legalName || '',
    phone: client.phone || '',
    birthDate: client.birthDate || '',
    passportSeriesNumber: client.passportSeriesNumber || '',
    passportIssuedBy: client.passportIssuedBy || '',
    passportIssuedDate: client.passportIssuedDate || '',
    passportDepartmentCode: client.passportDepartmentCode || '',
    registrationAddress: client.registrationAddress || '',
    email: client.email || '',
    inn: client.inn || '',
    kpp: client.kpp || '',
    ogrn: client.ogrn || '',
    legalAddress: client.legalAddress || '',
    actualAddress: client.actualAddress || '',
    bankName: client.bankName || '',
    bik: client.bik || '',
    checkingAccount: client.checkingAccount || '',
    correspondentAccount: client.correspondentAccount || '',
    vatStatus: client.vatStatus || 'NO_VAT',
    contactPerson: client.contactPerson || '',
    contactPosition: client.contactPosition || '',
    contacts: client.contacts ? [...client.contacts] : [],
    leadSource: isPreset || !source ? source : CUSTOM_LEAD_SOURCE,
    customLeadSource: !isPreset && source ? source : '',
    whatsapp: client.whatsapp || '',
    telegram: client.telegram || '',
    allowedTenantIds: client.allowedTenantIds && client.allowedTenantIds.length > 0 ? client.allowedTenantIds : [tenantId]
  };
};

const optional = (value: string) => value.trim() || null;

/**
 * Запрос на сохранение клиента: пустые поля — null, представители без имени отбрасываются,
 * ЛПР по умолчанию берется из основного представителя.
 */
export const formToRequest = (form: ClientFormData, tenantId: number): ClientCreateRequest => {
  const leadSource = form.leadSource === CUSTOM_LEAD_SOURCE ? form.customLeadSource.trim() : form.leadSource;
  const contacts = form.contacts
    .filter(c => c.name.trim().length > 0)
    .map(c => ({ ...c, phone: phoneForSave(c.phone) }));
  const primary = contacts.find(c => c.isPrimary);

  return {
    clientType: form.clientType,
    avatarUrl: form.avatarUrl || null,
    name: form.name.trim(),
    legalName: optional(form.legalName),
    phone: phoneForSave(form.phone),
    birthDate: optional(dateForSave(form.birthDate)),
    passportSeriesNumber: optional(form.passportSeriesNumber),
    passportIssuedBy: optional(form.passportIssuedBy),
    passportIssuedDate: optional(dateForSave(form.passportIssuedDate)),
    passportDepartmentCode: optional(form.passportDepartmentCode),
    registrationAddress: optional(form.registrationAddress),
    email: optional(form.email),
    inn: optional(form.inn),
    kpp: optional(form.kpp),
    ogrn: optional(form.ogrn),
    legalAddress: optional(form.legalAddress),
    actualAddress: optional(form.actualAddress),
    bankName: optional(form.bankName),
    bik: optional(form.bik),
    checkingAccount: optional(form.checkingAccount),
    correspondentAccount: optional(form.correspondentAccount),
    vatStatus: form.vatStatus || null,
    contactPerson: form.contactPerson.trim() || primary?.name || null,
    contactPosition: form.contactPosition.trim() || primary?.position || null,
    contacts,
    leadSource: leadSource || null,
    whatsapp: optional(form.whatsapp),
    telegram: optional(form.telegram),
    allowedTenantIds: form.allowedTenantIds.length > 0 ? form.allowedTenantIds : [tenantId]
  };
};

/** Новый представитель; первый добавленный становится основным. */
export const addContact = (contacts: ClientContact[]): ClientContact[] => [
  ...contacts,
  { name: '', position: '', phone: '', email: '', isPrimary: contacts.length === 0 }
];

/**
 * Изменение поля представителя; отметка «основной» снимается с остальных. Возвращает новые объекты:
 * исходные принадлежат кешу списка клиентов, и их изменение было бы видно до сохранения.
 */
export const updateContact = <K extends keyof ClientContact>(
  contacts: ClientContact[],
  index: number,
  field: K,
  value: ClientContact[K]
): ClientContact[] => {
  if (field === 'isPrimary' && value === true) {
    return contacts.map((c, i) => ({ ...c, isPrimary: i === index }));
  }
  return contacts.map((c, i) => (i === index ? { ...c, [field]: value } : c));
};

export const removeContact = (contacts: ClientContact[], index: number): ClientContact[] =>
  contacts.filter((_, i) => i !== index);

/** Переключение доступа клиента в компании; последнюю компанию снять нельзя. */
export const toggleTenant = (allowedTenantIds: number[], tenantId: number): number[] => {
  const next = allowedTenantIds.includes(tenantId)
    ? allowedTenantIds.filter(id => id !== tenantId)
    : [...allowedTenantIds, tenantId];
  return next.length ? next : [tenantId];
};

const includesText = (value: string | undefined, query: string) => Boolean(value && value.toLowerCase().includes(query));
const includesDigits = (value: string | undefined, query: string) => Boolean(value && value.includes(query));

/** Клиенты по типу и поиску по названию, реквизитам, телефонам, мессенджерам и представителям. */
export const filterClients = (clients: Client[], search: string, typeFilter: ClientTypeFilter): Client[] => {
  const q = search.toLowerCase().trim();
  return clients.filter(c => {
    if (!c) {
      return false;
    }
    if (typeFilter !== 'ALL' && clientTypeOf(c) !== typeFilter) {
      return false;
    }
    if (!q) {
      return true;
    }
    return includesText(c.name, q)
      || includesText(c.legalName, q)
      || phoneMatches(c.phone, q)
      || includesDigits(c.inn, q)
      || includesText(c.email, q)
      || includesText(c.contactPerson, q)
      || includesText(c.leadSource, q)
      || includesDigits(c.passportSeriesNumber, q)
      || includesText(c.whatsapp, q)
      || includesText(c.telegram, q)
      || (Array.isArray(c.contacts) && c.contacts.some(cnt => includesText(cnt?.name, q) || phoneMatches(cnt?.phone, q)));
  });
};
