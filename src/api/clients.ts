import { api } from './axiosConfig';

export interface ClientContact {
  name: string;
  position?: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
  telegram?: string;
  isPrimary?: boolean;
}

export interface Client {
  id: number;
  clientType?: 'INDIVIDUAL' | 'LEGAL_ENTITY';
  avatarUrl?: string;
  name: string;
  legalName?: string;
  phone: string;
  birthDate?: string;
  passportSeriesNumber?: string;
  passportIssuedBy?: string;
  passportIssuedDate?: string;
  registrationAddress?: string;
  email?: string;
  inn?: string;
  kpp?: string;
  ogrn?: string;
  legalAddress?: string;
  actualAddress?: string;
  bankName?: string;
  bik?: string;
  checkingAccount?: string;
  correspondentAccount?: string;
  vatStatus?: string;
  contactPerson?: string;
  contactPosition?: string;
  contacts?: ClientContact[];
  leadSource?: string;
  createdAt: string;
  whatsapp?: string;
  telegram?: string;
}

export interface ClientCreateRequest {
  clientType?: 'INDIVIDUAL' | 'LEGAL_ENTITY';
  avatarUrl?: string | null;
  name: string;
  legalName?: string | null;
  phone: string;
  birthDate?: string | null;
  passportSeriesNumber?: string | null;
  passportIssuedBy?: string | null;
  passportIssuedDate?: string | null;
  registrationAddress?: string | null;
  email?: string | null;
  inn?: string | null;
  kpp?: string | null;
  ogrn?: string | null;
  legalAddress?: string | null;
  actualAddress?: string | null;
  bankName?: string | null;
  bik?: string | null;
  checkingAccount?: string | null;
  correspondentAccount?: string | null;
  vatStatus?: string | null;
  contactPerson?: string | null;
  contactPosition?: string | null;
  contacts?: ClientContact[];
  leadSource?: string | null;
  whatsapp?: string | null;
  telegram?: string | null;
}

export const getClients = async (): Promise<Client[]> => {
  const response = await api.get('/clients');
  return response.data;
};

export const createClient = async (client: ClientCreateRequest): Promise<Client> => {
  const response = await api.post('/clients', client);
  return response.data;
};

export const updateClient = async (id: number, client: ClientCreateRequest): Promise<Client> => {
  const response = await api.put(`/clients/${id}`, client);
  return response.data;
};

export const deleteClient = async (id: number): Promise<void> => {
  await api.delete(`/clients/${id}`);
};

export const uploadClientAvatar = async (id: number, file: File): Promise<Client> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post(`/clients/${id}/avatar`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};
