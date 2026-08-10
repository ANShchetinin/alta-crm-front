import { api } from './axiosConfig';

export const loginCall = async (email: string, password: string) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data.token;
};
