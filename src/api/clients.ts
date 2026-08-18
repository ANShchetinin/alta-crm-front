import { api } from './axiosConfig';

export interface ClientContact {
  name: string;
  position?: string;
  phone?: string;
  email?: string;
  isPrimary?: boolean;
}

export interface Client {
  id: number;
  clientType?: 'INDIVIDUAL' | 'LEGAL_ENTITY';
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
}

export interface ClientCreateRequest {
  clientType?: 'INDIVIDUAL' | 'LEGAL_ENTITY';
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
