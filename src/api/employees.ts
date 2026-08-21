import { api } from './axiosConfig';

export interface Employee {
  id: number;
  name: string;
  phone?: string;
  position?: string;
  avatarUrl?: string;
  birthDate?: string;
  passportSeriesNumber?: string;
  passportIssuedBy?: string;
  passportIssuedDate?: string;
  passportDepartmentCode?: string;
  registrationAddress?: string;
  userId?: number;
  email?: string;
  password?: string;
  hasAccount?: boolean;
  allowedStatusIds?: number[];
  createdAt?: string;
}

export const getEmployees = async (): Promise<Employee[]> => {
  const response = await api.get('/employees');
  return response.data;
};

export const createEmployee = async (employee: Partial<Employee>): Promise<Employee> => {
  const response = await api.post('/employees', employee);
  return response.data;
};

export const updateEmployee = async (id: number, employee: Partial<Employee>): Promise<Employee> => {
  const response = await api.put(`/employees/${id}`, employee);
  return response.data;
};

export const uploadEmployeeAvatar = async (id: number, file: File): Promise<Employee> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post(`/employees/${id}/avatar`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

export const deleteEmployee = async (id: number): Promise<void> => {
  await api.delete(`/employees/${id}`);
};
