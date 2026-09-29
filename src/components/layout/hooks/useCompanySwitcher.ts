import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { switchTenant } from '../../../api/auth';
import { MY_TENANTS_QUERY_KEY, useMyTenantsQuery } from '../../../hooks/queries/useMyTenantsQuery';
import { useAppStore } from '../../../store/useAppStore';
import { useAuthStore } from '../../../store/useAuthStore';
import { useOrderDrawerStore } from '../../../store/useOrderDrawerStore';
import { useClickOutside } from './useClickOutside';

export const TENANT_CHANGED_EVENT = 'alta:tenant-changed';

/** Кнопка, открывающая список компаний: нажатие на нее не считается «кликом снаружи». */
export const COMPANY_TRIGGER_CLASS = 'company-switcher-trigger';

/**
 * Компании пользователя: список, выпадающее меню, переключение и создание новой.
 * После смены компании очищает кеш запросов, закрывает шторку заказа и вызывает `onTenantChanged`,
 * чтобы обновить профиль и счетчики.
 */
export const useCompanySwitcher = (isTenantUser: boolean, onTenantChanged: () => Promise<unknown>) => {
  const queryClient = useQueryClient();
  const setToken = useAuthStore(state => state.setToken);
  const setTenantSettings = useAppStore(state => state.setTenantSettings);
  const fetchTenantSettings = useAppStore(state => state.fetchTenantSettings);
  const { data } = useMyTenantsQuery(isTenantUser);
  const myTenants = data ?? null;

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(dropdownRef, () => setIsDropdownOpen(false), `.${COMPANY_TRIGGER_CLASS}`);

  const companiesCount = myTenants?.tenants.length ?? 0;
  const canOpenDropdown = companiesCount > 1 || Boolean(myTenants?.canCreateCompany);

  const toggleDropdown = useCallback(() => {
    if (canOpenDropdown) {
      setIsDropdownOpen(prev => !prev);
    }
  }, [canOpenDropdown]);

  const switchCompany = async (targetTenantId: number) => {
    if (targetTenantId === myTenants?.currentTenantId || isSwitching) {
      return;
    }
    setIsSwitching(true);
    setIsDropdownOpen(false);
    useOrderDrawerStore.getState().closeOrder();
    try {
      const res = await switchTenant(targetTenantId);
      // Сначала очищаем кеш, потом меняем компанию: иначе clear() может удалить уже начатые запросы новой компании
      queryClient.clear();
      if (res?.token) {
        setToken(res.token);
      }
      if (res?.tenantSettings) {
        setTenantSettings(res.tenantSettings);
      }
      if (res?.myTenants) {
        queryClient.setQueryData([...MY_TENANTS_QUERY_KEY, useAuthStore.getState().tenantId], res.myTenants);
      }
      onTenantChanged();
      window.dispatchEvent(new CustomEvent(TENANT_CHANGED_EVENT, { detail: { tenantId: targetTenantId } }));
    } catch (err) {
      console.error('Failed to switch company', err);
    } finally {
      setIsSwitching(false);
    }
  };

  const openCreateModal = () => {
    setIsDropdownOpen(false);
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => setIsCreateModalOpen(false);

  const handleCompanyCreated = async (newToken: string) => {
    queryClient.clear();
    setToken(newToken);
    useOrderDrawerStore.getState().closeOrder();
    setIsCreateModalOpen(false);
    setIsDropdownOpen(false);
    await Promise.all([
      fetchTenantSettings(),
      queryClient.invalidateQueries({ queryKey: MY_TENANTS_QUERY_KEY }),
      onTenantChanged()
    ]);
    window.dispatchEvent(new CustomEvent(TENANT_CHANGED_EVENT));
  };

  return {
    myTenants,
    companiesCount,
    canOpenDropdown,
    isDropdownOpen,
    toggleDropdown,
    dropdownRef,
    isSwitching,
    switchCompany,
    isCreateModalOpen,
    openCreateModal,
    closeCreateModal,
    handleCompanyCreated
  };
};

export type CompanySwitcher = ReturnType<typeof useCompanySwitcher>;
