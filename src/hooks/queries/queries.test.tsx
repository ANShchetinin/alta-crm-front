import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useClientsQuery, useCreateClientMutation, useUpdateClientMutation, useDeleteClientMutation } from './useClientsQuery';
import { useEmployeesQuery, useCreateEmployeeMutation, useUpdateEmployeeMutation, useDeleteEmployeeMutation } from './useEmployeesQuery';
import { useMaterialsQuery, useCreateMaterialMutation, useUpdateMaterialMutation, useDeleteMaterialMutation } from './useStorageQuery';
import { useOrderStatusesQuery, useCreateOrderStatusMutation, useUpdateOrderStatusMutation, useDeleteOrderStatusMutation, useReorderOrderStatusesMutation } from './useOrderStatusesQuery';

import * as clientsApi from '../../api/clients';
import * as employeesApi from '../../api/employees';
import * as storageApi from '../../api/storage';
import * as kanbanApi from '../../api/kanban';

vi.mock('../../api/clients');
vi.mock('../../api/employees');
vi.mock('../../api/storage');
vi.mock('../../api/kanban');

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 }
    }
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('React Query Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Clients Query Hooks', () => {
    it('useClientsQuery fetches clients successfully', async () => {
      const mockClients = [{ id: 1, name: 'Client 1', phone: '123', createdAt: '2026-01-01' }];
      vi.mocked(clientsApi.getClients).mockResolvedValueOnce(mockClients);

      const { result } = renderHook(() => useClientsQuery(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockClients);
    });

    it('mutations call API functions', async () => {
      vi.mocked(clientsApi.createClient).mockResolvedValueOnce({ id: 1, name: 'New Client', phone: '123', createdAt: '2026-01-01' });
      vi.mocked(clientsApi.updateClient).mockResolvedValueOnce({ id: 1, name: 'Updated Client', phone: '123', createdAt: '2026-01-01' });
      vi.mocked(clientsApi.deleteClient).mockResolvedValueOnce();

      const { result: createRes } = renderHook(() => useCreateClientMutation(), { wrapper: createWrapper() });
      await createRes.current.mutateAsync({ name: 'New Client', phone: '123' });
      expect(clientsApi.createClient).toHaveBeenCalledWith({ name: 'New Client', phone: '123' });

      const { result: updateRes } = renderHook(() => useUpdateClientMutation(), { wrapper: createWrapper() });
      await updateRes.current.mutateAsync({ id: 1, data: { name: 'Updated Client', phone: '123' } });
      expect(clientsApi.updateClient).toHaveBeenCalledWith(1, { name: 'Updated Client', phone: '123' });

      const { result: deleteRes } = renderHook(() => useDeleteClientMutation(), { wrapper: createWrapper() });
      await deleteRes.current.mutateAsync(1);
      expect(clientsApi.deleteClient).toHaveBeenCalledWith(1);
    });
  });

  describe('Employees Query Hooks', () => {
    it('useEmployeesQuery fetches employees successfully', async () => {
      const mockEmployees = [{ id: 1, name: 'Employee 1' }];
      vi.mocked(employeesApi.getEmployees).mockResolvedValueOnce(mockEmployees);

      const { result } = renderHook(() => useEmployeesQuery(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockEmployees);
    });

    it('employee mutations call API functions', async () => {
      vi.mocked(employeesApi.createEmployee).mockResolvedValueOnce({ id: 1, name: 'New Emp' });
      vi.mocked(employeesApi.updateEmployee).mockResolvedValueOnce({ id: 1, name: 'Updated Emp' });
      vi.mocked(employeesApi.deleteEmployee).mockResolvedValueOnce();

      const { result: createRes } = renderHook(() => useCreateEmployeeMutation(), { wrapper: createWrapper() });
      await createRes.current.mutateAsync({ name: 'New Emp' });
      expect(employeesApi.createEmployee).toHaveBeenCalledWith({ name: 'New Emp' });

      const { result: updateRes } = renderHook(() => useUpdateEmployeeMutation(), { wrapper: createWrapper() });
      await updateRes.current.mutateAsync({ id: 1, data: { name: 'Updated Emp' } });
      expect(employeesApi.updateEmployee).toHaveBeenCalledWith(1, { name: 'Updated Emp' });

      const { result: deleteRes } = renderHook(() => useDeleteEmployeeMutation(), { wrapper: createWrapper() });
      await deleteRes.current.mutateAsync(1);
      expect(employeesApi.deleteEmployee).toHaveBeenCalledWith(1);
    });
  });

  describe('Storage Query Hooks', () => {
    it('useMaterialsQuery fetches materials successfully', async () => {
      const mockMaterials = [{ id: 1, name: 'Material 1', unit: 'm', quantityInStock: 10, costPrice: 100 }];
      vi.mocked(storageApi.getMaterials).mockResolvedValueOnce(mockMaterials);

      const { result } = renderHook(() => useMaterialsQuery(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockMaterials);
    });

    it('material mutations call storage API functions', async () => {
      vi.mocked(storageApi.createMaterial).mockResolvedValueOnce({ id: 1, name: 'Mat', unit: 'm', quantityInStock: 10, costPrice: 100 });
      vi.mocked(storageApi.updateMaterial).mockResolvedValueOnce({ id: 1, name: 'Mat Updated', unit: 'm', quantityInStock: 10, costPrice: 100 });
      vi.mocked(storageApi.deleteMaterial).mockResolvedValueOnce();

      const { result: createRes } = renderHook(() => useCreateMaterialMutation(), { wrapper: createWrapper() });
      await createRes.current.mutateAsync({ name: 'Mat' });
      expect(storageApi.createMaterial).toHaveBeenCalledWith({ name: 'Mat' });

      const { result: updateRes } = renderHook(() => useUpdateMaterialMutation(), { wrapper: createWrapper() });
      await updateRes.current.mutateAsync({ id: 1, data: { name: 'Mat Updated' } });
      expect(storageApi.updateMaterial).toHaveBeenCalledWith(1, { name: 'Mat Updated' });

      const { result: deleteRes } = renderHook(() => useDeleteMaterialMutation(), { wrapper: createWrapper() });
      await deleteRes.current.mutateAsync(1);
      expect(storageApi.deleteMaterial).toHaveBeenCalledWith(1);
    });
  });

  describe('OrderStatuses Query Hooks', () => {
    it('useOrderStatusesQuery fetches order statuses', async () => {
      const mockStatuses = [{ id: 1, name: 'New', color: '#fff', sortOrder: 1 }];
      vi.mocked(kanbanApi.getOrderStatuses).mockResolvedValueOnce(mockStatuses);

      const { result } = renderHook(() => useOrderStatusesQuery(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockStatuses);
    });

    it('order status mutations call kanban API functions', async () => {
      vi.mocked(kanbanApi.createOrderStatus).mockResolvedValueOnce({ id: 2, name: 'Col', color: '#000', sortOrder: 2 });
      vi.mocked(kanbanApi.updateOrderStatus).mockResolvedValueOnce({ id: 2, name: 'Col Renamed', color: '#000', sortOrder: 2 });
      vi.mocked(kanbanApi.deleteOrderStatus).mockResolvedValueOnce();
      vi.mocked(kanbanApi.reorderOrderStatuses).mockResolvedValueOnce();

      const { result: createRes } = renderHook(() => useCreateOrderStatusMutation(), { wrapper: createWrapper() });
      await createRes.current.mutateAsync({ name: 'Col' });
      expect(kanbanApi.createOrderStatus).toHaveBeenCalledWith({ name: 'Col' });

      const { result: updateRes } = renderHook(() => useUpdateOrderStatusMutation(), { wrapper: createWrapper() });
      await updateRes.current.mutateAsync({ id: 2, data: { name: 'Col Renamed' } });
      expect(kanbanApi.updateOrderStatus).toHaveBeenCalledWith(2, { name: 'Col Renamed' });

      const { result: reorderRes } = renderHook(() => useReorderOrderStatusesMutation(), { wrapper: createWrapper() });
      await reorderRes.current.mutateAsync([1, 2]);
      expect(kanbanApi.reorderOrderStatuses).toHaveBeenCalledWith([1, 2]);

      const { result: deleteRes } = renderHook(() => useDeleteOrderStatusMutation(), { wrapper: createWrapper() });
      await deleteRes.current.mutateAsync(2);
      expect(kanbanApi.deleteOrderStatus).toHaveBeenCalledWith(2);
    });
  });
});
