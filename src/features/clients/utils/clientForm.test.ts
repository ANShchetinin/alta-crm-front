import { describe, it, expect } from 'vitest';
import type { Client } from '../../../api/clients';
import {
  addContact,
  clientToForm,
  emptyClientForm,
  filterClients,
  formToRequest,
  removeContact,
  toggleTenant,
  updateContact
} from './clientForm';

const client = (id: number, fields: Partial<Client> = {}): Client => ({ id, name: `Клиент ${id}`, phone: '', createdAt: '2026-09-01', ...fields });

describe('clientForm', () => {
  it('starts a new client with a phone prefix and the current company', () => {
    const form = emptyClientForm('LEGAL_ENTITY', 7);

    expect(form).toMatchObject({ clientType: 'LEGAL_ENTITY', phone: '+7', vatStatus: 'NO_VAT', allowedTenantIds: [7] });
  });

  it('maps a client to the form, switching an unknown lead source to manual input', () => {
    const preset = clientToForm(client(1, { leadSource: 'Авито', allowedTenantIds: [2, 3] }), 7);
    const custom = clientToForm(client(1, { leadSource: 'Листовка' }), 7);

    expect(preset).toMatchObject({ clientType: 'INDIVIDUAL', leadSource: 'Авито', customLeadSource: '', allowedTenantIds: [2, 3] });
    expect(custom).toMatchObject({ leadSource: 'custom', customLeadSource: 'Листовка', allowedTenantIds: [7] });
  });

  it('builds the request: trims, formats phones, empties to null, drops nameless contacts, takes the decision maker from the primary contact', () => {
    const form = {
      ...emptyClientForm('LEGAL_ENTITY', 7),
      name: '  ООО Альфа ',
      phone: ' +7 495 000 ',
      inn: ' ',
      leadSource: 'custom',
      customLeadSource: ' Выставка ',
      contacts: [
        { name: 'Петров', position: 'Директор', phone: '84950001122', isPrimary: true },
        { name: '  ', phone: '123' }
      ],
      allowedTenantIds: []
    };

    const request = formToRequest(form, 7);

    expect(request).toMatchObject({
      name: 'ООО Альфа',
      phone: '+7 (495) 000',
      inn: null,
      leadSource: 'Выставка',
      contactPerson: 'Петров',
      contactPosition: 'Директор',
      allowedTenantIds: [7]
    });
    expect(request.contacts).toEqual([{ name: 'Петров', position: 'Директор', phone: '+7 (495) 000-11-22', isPrimary: true }]);
  });

  it('adds contacts with the first one primary, updates and removes them', () => {
    const one = addContact([]);
    const two = addContact(one);

    expect(two.map(c => c.isPrimary)).toEqual([true, false]);
    expect(updateContact(two, 1, 'name', 'Иванов')[1].name).toBe('Иванов');
    expect(updateContact(two, 1, 'isPrimary', true).map(c => c.isPrimary)).toEqual([false, true]);
    expect(removeContact(two, 0)).toHaveLength(1);
  });

  it('does not modify the original contacts, which belong to the cached client list', () => {
    const original = [{ name: 'Петров', isPrimary: true }, { name: 'Сидоров', isPrimary: false }];

    const updated = updateContact(original, 1, 'isPrimary', true);

    expect(updated.map(c => c.isPrimary)).toEqual([false, true]);
    expect(original.map(c => c.isPrimary)).toEqual([true, false]);
  });

  it('toggles company access but never leaves the client without a company', () => {
    expect(toggleTenant([1, 2], 2)).toEqual([1]);
    expect(toggleTenant([1], 3)).toEqual([1, 3]);
    expect(toggleTenant([1], 1)).toEqual([1]);
  });

  it('filters by type and searches names, phones, requisites and contacts', () => {
    const clients = [
      client(1, { name: 'Иван Петров', phone: '+79990001122' }),
      client(2, { name: 'ООО Альфа', clientType: 'LEGAL_ENTITY', inn: '7701234567', contacts: [{ name: 'Сидоров' }] }),
      client(3, { name: 'Мария', telegram: '@maria_ceiling' })
    ];
    const ids = (search: string, type: Parameters<typeof filterClients>[2] = 'ALL') => filterClients(clients, search, type).map(c => c.id);

    expect(ids('')).toEqual([1, 2, 3]);
    expect(ids('', 'LEGAL_ENTITY')).toEqual([2]);
    expect(ids('', 'INDIVIDUAL')).toEqual([1, 3]);
    expect(ids('петров')).toEqual([1]);
    expect(ids('0001122')).toEqual([1]);
    expect(ids('770123')).toEqual([2]);
    expect(ids('сидоров')).toEqual([2]);
    expect(ids('MARIA')).toEqual([3]);
  });
});
