import { useState } from 'react';
import { createClient, type Client } from '../../../api/clients';
import type { PassportApplyResult } from '../../../components/PassportScannerModal';
import { toast } from '../../../utils/toast';

type ClientType = 'INDIVIDUAL' | 'LEGAL_ENTITY';

interface QuickClientFields {
  clientType: ClientType;
  name: string;
  phone: string;
  whatsapp: string;
  telegram: string;
  inn: string;
  contactPerson: string;
  leadSource: string;
  customLeadSource: string;
}

const EMPTY_FIELDS: QuickClientFields = {
  clientType: 'INDIVIDUAL',
  name: '',
  phone: '',
  whatsapp: '',
  telegram: '',
  inn: '',
  contactPerson: '',
  leadSource: '',
  customLeadSource: ''
};

const optional = (value: string) => value.trim() || undefined;

/**
 * Быстрое создание клиента из шторки заказа. После создания вызывает onCreated и очищает форму (тип клиента сохраняется).
 */
export const useQuickClient = (onCreated: (client: Client) => Promise<void> | void) => {
  const [isOpen, setIsOpen] = useState(false);
  const [fields, setFields] = useState<QuickClientFields>(EMPTY_FIELDS);
  const [creatingClient, setCreatingClient] = useState(false);

  const setField = <K extends keyof QuickClientFields>(key: K) => (value: QuickClientFields[K]) => {
    setFields(prev => ({ ...prev, [key]: value }));
  };

  const close = () => setIsOpen(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fields.name.trim()) {
      return;
    }
    setCreatingClient(true);
    try {
      const isLegal = fields.clientType === 'LEGAL_ENTITY';
      const leadSource = fields.leadSource.toLowerCase() === 'custom' ? optional(fields.customLeadSource) : optional(fields.leadSource);
      const created = await createClient({
        name: fields.name.trim(),
        clientType: fields.clientType,
        phone: fields.phone.trim() || '',
        whatsapp: optional(fields.whatsapp),
        telegram: optional(fields.telegram),
        inn: isLegal ? optional(fields.inn) : undefined,
        contactPerson: isLegal ? optional(fields.contactPerson) : undefined,
        leadSource
      });
      await onCreated(created);
      close();
      toast.success(`Клиент «${created.name}» создан и привязан`);
      setFields(prev => ({ ...EMPTY_FIELDS, clientType: prev.clientType }));
    } catch (err) {
      console.error('Failed to create client', err);
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Не удалось создать клиента');
    } finally {
      setCreatingClient(false);
    }
  };

  /** Подставляет ФИО из распознанного паспорта (клиент — физическое лицо). */
  const applyPassport = (res: PassportApplyResult) => {
    setFields(prev => ({ ...prev, name: res.name || prev.name, clientType: 'INDIVIDUAL' }));
  };

  return {
    open: () => setIsOpen(true),
    applyPassport,
    modalProps: {
      isOpen,
      onClose: close,
      onSubmit: handleSubmit,
      creatingClient,
      clientType: fields.clientType,
      setClientType: setField('clientType'),
      name: fields.name,
      setName: setField('name'),
      phone: fields.phone,
      setPhone: setField('phone'),
      whatsapp: fields.whatsapp,
      setWhatsapp: setField('whatsapp'),
      telegram: fields.telegram,
      setTelegram: setField('telegram'),
      inn: fields.inn,
      setInn: setField('inn'),
      contactPerson: fields.contactPerson,
      setContactPerson: setField('contactPerson'),
      leadSource: fields.leadSource,
      setLeadSource: setField('leadSource'),
      customLeadSource: fields.customLeadSource,
      setCustomLeadSource: setField('customLeadSource')
    }
  };
};
