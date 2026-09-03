import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ContractPromptModal, type ContractPromptData } from './ContractPromptModal';

const initialData: ContractPromptData = {
  clientId: 1,
  name: 'Иванов Иван',
  phone: '+79991112233',
  secondPhone: '',
  birthDate: '01.01.1990',
  passportSeriesNumber: '1234 567890',
  passportIssuedBy: 'УФМС',
  passportIssuedDate: '01.01.2010',
  passportDepartmentCode: '123-456',
  registrationAddress: 'г. Москва',
  installationAddress: 'г. Москва',
  area: '20',
  perimeter: '18',
  canvasesCount: '1',
  insertLength: '18',
  pipeCount: '1',
  lightsCount: '4',
  timberLength: '0',
  canvasArticle: 'MSD Premium',
  discount: '0',
  handoverDate: '05.09.2026'
};

describe('ContractPromptModal', () => {
  it('does not render when isOpen is false', () => {
    render(
      <ContractPromptModal
        isOpen={false}
        contractPromptData={initialData}
        setContractPromptData={() => {}}
        contractPromptLoading={false}
        onClose={() => {}}
        onOpenPassportScanner={() => {}}
        onSubmit={() => {}}
      />
    );
    expect(screen.queryByText('Данные Заказчика для договора')).not.toBeInTheDocument();
  });

  it('renders fields and handles passport recognition and submit buttons', () => {
    const handleClose = vi.fn();
    const handlePassportScanner = vi.fn();
    const handleSubmit = vi.fn((e) => e.preventDefault());

    render(
      <ContractPromptModal
        isOpen={true}
        contractPromptData={initialData}
        setContractPromptData={() => {}}
        contractPromptLoading={false}
        onClose={handleClose}
        onOpenPassportScanner={handlePassportScanner}
        onSubmit={handleSubmit}
      />
    );

    expect(screen.getByText('Данные Заказчика для договора')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Иванов Иван')).toBeInTheDocument();

    const scanBtn = screen.getByText(/Распознать паспорт РФ/i);
    fireEvent.click(scanBtn);
    expect(handlePassportScanner).toHaveBeenCalledTimes(1);

    const submitBtn = screen.getByRole('button', { name: /Сохранить и сформировать договор/i });
    fireEvent.click(submitBtn);
    expect(handleSubmit).toHaveBeenCalled();

    const cancelBtn = screen.getByText('Отмена');
    fireEvent.click(cancelBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
