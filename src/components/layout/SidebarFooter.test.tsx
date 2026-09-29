import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SidebarFooter } from './SidebarFooter';
import { MobileBottomNav } from './MobileBottomNav';
import { WhatsNewModal } from '../../features/whatsNew/components/WhatsNewModal';
import { useWhatsNewStore } from '../../features/whatsNew/hooks/useWhatsNew';
import { useAuthStore } from '../../store/useAuthStore';

// Свои данные: тест не зависит от реальных записей, которые меняются с каждым релизом
vi.mock('../../features/whatsNew/releases', () => ({
  RELEASES: [
    {
      version: '2.1.0',
      date: '2026-10-10',
      changes: [
        { kind: 'feature', title: 'Для всех', description: 'Видят все' },
        { kind: 'feature', title: 'Раздел суперадмина', description: 'Только суперадмин', roles: ['SUPERADMIN'] }
      ]
    },
    {
      version: '2.0.0',
      date: '2026-10-01',
      changes: [
        { kind: 'fix', title: 'Для офиса', description: 'Владелец и менеджер', roles: ['OWNER', 'MANAGER'] },
        { kind: 'fix', title: 'Для монтажника', description: 'Только монтажник', roles: ['WORKER'] }
      ]
    }
  ]
}));

const LATEST = '2.1.0';
const PREVIOUS = '2.0.0';

const renderFooter = (onCloseMobile = vi.fn()) => render(
  <MemoryRouter>
    <SidebarFooter canInstallPwa={false} onInstallPwa={vi.fn()} onLogout={vi.fn()} onCloseMobile={onCloseMobile} />
    <MobileBottomNav nav={{ items: [], menuLabel: 'Меню' }} isMenuOpen={false} onToggleMenu={vi.fn()} onNavigate={vi.fn()} />
    <WhatsNewModal />
  </MemoryRouter>
);

const whatsNewButton = () => screen.getByRole('button', { name: /Что нового/ });
const dots = () => document.querySelectorAll('.whats-new-dot');

describe('Что нового', () => {
  beforeEach(() => {
    localStorage.clear();
    useWhatsNewStore.setState({ lastSeenVersion: null, previousSeenVersion: null, isOpen: false });
    useAuthStore.setState({ role: 'OWNER' });
  });

  it('marks unseen news next to the item and on the phone menu button until opened', () => {
    const onCloseMobile = vi.fn();
    renderFooter(onCloseMobile);
    expect(dots()).toHaveLength(2);

    fireEvent.click(whatsNewButton());

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(`v${LATEST}`)).toBeInTheDocument();
    expect(onCloseMobile).toHaveBeenCalled();
    expect(localStorage.getItem('altacrm_whats_new_seen')).toBe(LATEST);
    expect(dots()).toHaveLength(0);
  });

  it('marks only the latest release as new on the first visit', () => {
    renderFooter();
    fireEvent.click(whatsNewButton());

    expect(screen.getAllByText('Новое', { selector: '.whats-new__new-badge' })).toHaveLength(1);
    expect(screen.getByText(`v${LATEST}`).parentElement).toHaveTextContent('Новое');
  });

  it('marks every release after the last seen one and shows no dot when all are seen', () => {
    useWhatsNewStore.setState({ lastSeenVersion: LATEST });
    renderFooter();
    expect(dots()).toHaveLength(0);

    useWhatsNewStore.setState({ lastSeenVersion: PREVIOUS });
    fireEvent.click(whatsNewButton());
    expect(screen.getByText(`v${LATEST}`).parentElement).toHaveTextContent('Новое');
    expect(screen.getByText(`v${PREVIOUS}`).parentElement).not.toHaveTextContent('Новое');
  });

  it('opens from the version number too', () => {
    renderFooter();
    fireEvent.click(screen.getByTitle('Что нового в этой версии'));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows each role only its changes', () => {
    useAuthStore.setState({ role: 'WORKER' });
    renderFooter();
    fireEvent.click(whatsNewButton());

    expect(screen.queryByText('Раздел суперадмина')).not.toBeInTheDocument();
    expect(screen.queryByText('Для офиса')).not.toBeInTheDocument();
    expect(screen.getByText('Для монтажника')).toBeInTheDocument();
    expect(screen.getByText('Для всех')).toBeInTheDocument();
  });
});
