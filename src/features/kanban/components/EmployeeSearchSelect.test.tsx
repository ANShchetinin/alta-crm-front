import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmployeeSearchSelect } from './EmployeeSearchSelect';
import type { Employee } from '../../../api/employees';

const mockEmployees: Employee[] = [
  {
    id: 1,
    name: 'Иван Монтажник',
    phone: '+79990001122',
    position: 'Монтажник'
  },
  {
    id: 2,
    name: 'Петр Замерщик',
    phone: '+79993334455',
    position: 'Замерщик'
  }
];

describe('EmployeeSearchSelect', () => {
  it('renders placeholder when not assigned', () => {
    render(
      <EmployeeSearchSelect
        value=""
        employees={mockEmployees}
        onChange={() => {}}
        placeholder="Не назначен"
      />
    );
    expect(screen.getByText('Не назначен')).toBeInTheDocument();
  });

  it('renders selected employee name and position', () => {
    render(
      <EmployeeSearchSelect
        value="1"
        employees={mockEmployees}
        onChange={() => {}}
      />
    );
    expect(screen.getByText('Иван Монтажник')).toBeInTheDocument();
    expect(screen.getByText('Монтажник')).toBeInTheDocument();
  });
});
