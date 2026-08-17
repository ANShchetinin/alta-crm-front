import { api } from './axiosConfig';

export interface Client {
  id: number;
  name: string;
  phone: string;
  leadSource?: string;
  createdAt: string;
}

export interface ClientCreateRequest {
  name: string;
  phone: string;
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
