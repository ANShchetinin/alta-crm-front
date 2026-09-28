import { describe, it, expect } from 'vitest';
import type { Order } from '../../../api/kanban';
import type { Client } from '../../../api/clients';
import type { Employee } from '../../../api/employees';
import {
  EMPTY_FILTERS,
  activeFiltersCount,
  availableYears,
  clientViewOf,
  filterArchiveOrders,
  installerNameOf,
  sortArchiveOrders
} from './archiveOrders';

const order = (id: number, fields: Partial<Order> = {}) => ({ id, statusId: 1, ...fields } as Order);

const orders = [
  order(1, { orderNumber: 'А-1', clientName: 'Иван Петров', clientPhone: '+79990001122', installedAt: '2026-05-10T10:00:00', totalPrice: 50000, installedById: 10 }),
  order(2, { orderNumber: 'А-2', clientName: 'Анна', address: 'ул. Ленина', createdAt: '2025-12-01T10:00:00', totalPrice: 90000, assigneeId: 11, statusId: 2 }),
  order(3, { orderNumber: 'Б-3', clientId: 7, description: 'Двухуровневый потолок', installedAt: '2026-08-20T10:00:00', measurerId: 10 })
];
const clients = [{ id: 7, name: 'ООО Альфа', phone: '+74950000000', clientType: 'LEGAL_ENTITY' } as Client];
const employees = [{ id: 11, name: 'Олег Монтажник' } as Employee];

const ids = (list: Order[]) => list.map(o => o.id);

describe('archiveOrders', () => {
  it('lists completion years from newest', () => {
    expect(availableYears(orders)).toEqual(['2026', '2025']);
  });

  it('searches by number, client (also from the directory), phone, address, description and employee', () => {
    const search = (value: string) => ids(filterArchiveOrders(orders, { ...EMPTY_FILTERS, search: value }, clients, employees));

    expect(search('а-1')).toEqual([1]);
    expect(search('альфа')).toEqual([3]);
    expect(search('0001122')).toEqual([1]);
    expect(search('ленина')).toEqual([2]);
    expect(search('двухуровневый')).toEqual([3]);
    expect(search('олег')).toEqual([2]);
    expect(search('№2')).toEqual([2]);
  });

  it('filters by completion year and month, employee in any role and status', () => {
    const filter = (changes: Partial<typeof EMPTY_FILTERS>) => ids(filterArchiveOrders(orders, { ...EMPTY_FILTERS, ...changes }, clients, employees));

    expect(filter({ year: '2026' })).toEqual([1, 3]);
    expect(filter({ year: '2026', month: '4' })).toEqual([1]);
    expect(filter({ employeeId: '10' })).toEqual([1, 3]);
    expect(filter({ statusId: '2' })).toEqual([2]);
  });

  it('counts active filters', () => {
    expect(activeFiltersCount(EMPTY_FILTERS)).toBe(0);
    expect(activeFiltersCount({ ...EMPTY_FILTERS, search: '  ', year: '2026', statusId: '2' })).toBe(2);
  });

  it('sorts by completion date, price, number and client in both directions', () => {
    expect(ids(sortArchiveOrders(orders, 'installedAt', 'desc'))).toEqual([3, 1, 2]);
    expect(ids(sortArchiveOrders(orders, 'totalPrice', 'desc'))).toEqual([2, 1, 3]);
    expect(ids(sortArchiveOrders(orders, 'orderNumber', 'asc'))).toEqual([1, 2, 3]);
    expect(ids(sortArchiveOrders(orders, 'clientName', 'asc'))[0]).toBe(3);
  });

  it('takes client details from the order, then from the directory', () => {
    expect(clientViewOf(orders[2], clients)).toMatchObject({ name: 'ООО Альфа', phone: '+74950000000', isLegal: true });
    expect(clientViewOf(order(9, { clientId: 99 }), clients).name).toBe('Клиент #99');
    expect(installerNameOf(orders[1])).toBe('—');
  });
});
