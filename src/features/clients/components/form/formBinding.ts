import type { ClientFormData, ClientTextField } from '../../utils/clientForm';

export interface ClientFormProps {
  form: ClientFormData;
  patch: (changes: Partial<ClientFormData>) => void;
}

/** Связывает текстовое поле формы клиента с `TextField`: значение и обработчик изменения. */
export const bindTextField = ({ form, patch }: ClientFormProps) => (field: ClientTextField) => ({
  value: form[field],
  onChange: (value: string) => patch({ [field]: value })
});
