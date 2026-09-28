import { useState } from 'react';
import type { Client, ClientContact } from '../../../api/clients';
import {
  useCreateClientMutation,
  useDeleteClientMutation,
  useUpdateClientMutation
} from '../../../hooks/queries/useClientsQuery';
import type { PassportApplyResult } from '../../../components/PassportScannerModal';
import { toast } from '../../../utils/toast';
import { confirm } from '../../../utils/confirm';
import { getErrorMessage } from '../../../utils/errorMessage';
import {
  addContact,
  clientToForm,
  emptyClientForm,
  formToRequest,
  removeContact,
  updateContact,
  type ClientFormData,
  type ClientType
} from '../utils/clientForm';

/** Карточка клиента: создание, редактирование и удаление, форма и представители юрлица. */
export const useClientEditor = (tenantId: number) => {
  const createMutation = useCreateClientMutation();
  const updateMutation = useUpdateClientMutation();
  const deleteMutation = useDeleteClientMutation();

  const [isOpen, setIsOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [form, setForm] = useState<ClientFormData>(() => emptyClientForm('INDIVIDUAL', tenantId));

  const patch = (changes: Partial<ClientFormData>) => setForm(prev => ({ ...prev, ...changes }));

  const openCreate = (clientType: ClientType = 'INDIVIDUAL') => {
    setEditingClient(null);
    setForm(emptyClientForm(clientType, tenantId));
    setIsOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditingClient(client);
    setForm(clientToForm(client, tenantId));
    setIsOpen(true);
  };

  const close = () => setIsOpen(false);

  const save = async () => {
    try {
      const request = formToRequest(form, tenantId);
      if (editingClient) {
        await updateMutation.mutateAsync({ id: editingClient.id, data: request });
        toast.success('Клиент успешно обновлен');
      } else {
        await createMutation.mutateAsync(request);
        toast.success('Клиент успешно создан');
      }
      setIsOpen(false);
    } catch (err) {
      console.error(err);
      toast.error(getErrorMessage(err, 'Ошибка при сохранении клиента'));
    }
  };

  const remove = async (id: number) => {
    const ok = await confirm({
      title: 'Удаление клиента',
      message: 'Вы уверены, что хотите удалить клиента?',
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      danger: true
    });
    if (!ok) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Клиент удален');
    } catch (err) {
      console.error(err);
      toast.error(getErrorMessage(err, 'Ошибка при удалении клиента'));
    }
  };

  const contacts = {
    add: () => setForm(prev => ({ ...prev, contacts: addContact(prev.contacts) })),
    update: <K extends keyof ClientContact>(index: number, field: K, value: ClientContact[K]) =>
      setForm(prev => ({ ...prev, contacts: updateContact(prev.contacts, index, field, value) })),
    remove: (index: number) => setForm(prev => ({ ...prev, contacts: removeContact(prev.contacts, index) }))
  };

  /** Подставляет распознанные данные паспорта, не затирая заполненные поля пустыми значениями. */
  const applyPassport = (result: PassportApplyResult) => {
    setForm(prev => ({
      ...prev,
      name: result.name || prev.name,
      birthDate: result.birthDate || prev.birthDate,
      passportSeriesNumber: result.passportSeriesNumber || prev.passportSeriesNumber,
      passportIssuedBy: result.passportIssuedBy || prev.passportIssuedBy,
      passportIssuedDate: result.passportIssuedDate || prev.passportIssuedDate,
      passportDepartmentCode: result.passportDepartmentCode || prev.passportDepartmentCode,
      registrationAddress: result.registrationAddress || prev.registrationAddress
    }));
  };

  return { isOpen, editingClient, form, patch, openCreate, openEdit, close, save, remove, contacts, applyPassport };
};

export type ClientEditor = ReturnType<typeof useClientEditor>;
