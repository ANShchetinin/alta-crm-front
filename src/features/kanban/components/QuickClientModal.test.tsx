import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuickClientModal } from './QuickClientModal';

describe('QuickClientModal', () => {
  it('does not render when isOpen is false', () => {
    render(
      <QuickClientModal
        isOpen={false}
        clientType="INDIVIDUAL"
        setClientType={() => {}}
        name=""
        setName={() => {}}
        phone=""
        setPhone={() => {}}
        whatsapp=""
        setWhatsapp={() => {}}
        telegram=""
        setTelegram={() => {}}
        inn=""
        setInn={() => {}}
        contactPerson=""
        setContactPerson={() => {}}
        leadSource=""
        setLeadSource={() => {}}
        customLeadSource=""
        setCustomLeadSource={() => {}}
        creatingClient={false}
        onClose={() => {}}
        onOpenPassportScanner={() => {}}
        onSubmit={() => {}}
      />
    );
    expect(screen.queryByLabelText('Close')).not.toBeInTheDocument();
  });

  it('renders and allows switching between individual and legal entity', () => {
    const handleSetClientType = vi.fn();
    const handleSetName = vi.fn();
    const handleSetPhone = vi.fn();
    const handleSubmit = vi.fn((e) => e.preventDefault());
    const handleClose = vi.fn();

    const { container } = render(
      <QuickClientModal
        isOpen={true}
        clientType="INDIVIDUAL"
        setClientType={handleSetClientType}
        name="Петров Петр"
        setName={handleSetName}
        phone="+79998887766"
        setPhone={handleSetPhone}
        whatsapp=""
        setWhatsapp={() => {}}
        telegram=""
        setTelegram={() => {}}
        inn=""
        setInn={() => {}}
        contactPerson=""
        setContactPerson={() => {}}
        leadSource=""
        setLeadSource={() => {}}
        customLeadSource=""
        setCustomLeadSource={() => {}}
        creatingClient={false}
        onClose={handleClose}
        onOpenPassportScanner={() => {}}
        onSubmit={handleSubmit}
      />
    );

    expect(screen.getByDisplayValue('Петров Петр')).toBeInTheDocument();

    const legalRadio = screen.getByText('Юрлицо');
    fireEvent.click(legalRadio);
    expect(handleSetClientType).toHaveBeenCalledWith('LEGAL_ENTITY');

    const form = container.querySelector('form');
    if (form) {
      fireEvent.submit(form);
      expect(handleSubmit).toHaveBeenCalled();
    }
  });
});
