import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { SystemAnnouncement } from '../../../api/announcements';
import { AnnouncementBanner } from './AnnouncementBanner';

const announcement = (overrides: Partial<SystemAnnouncement>): SystemAnnouncement => ({
  id: 1,
  title: 'Плановое обновление',
  message: '29.09 с 22:00 до 23:00 сервис может быть недоступен',
  severity: 'WARNING',
  showFrom: '2026-09-29T10:00:00Z',
  showUntil: null,
  dismissible: true,
  createdAt: '2026-09-29T10:00:00Z',
  updatedAt: '2026-09-29T10:00:00Z',
  ...overrides
});

describe('AnnouncementBanner', () => {
  it('renders nothing without announcements', () => {
    const { container } = render(<AnnouncementBanner announcements={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the title and text with a tone by severity', () => {
    render(<AnnouncementBanner announcements={[announcement({ id: 1 }), announcement({ id: 2, title: 'Работы', severity: 'CRITICAL', dismissible: false })]} />);

    expect(screen.getByText('Плановое обновление').closest('.announcement')).toHaveClass('announcement--warning');
    expect(screen.getByText('Работы').closest('.announcement')).toHaveClass('announcement--critical');
    expect(screen.getAllByText(/сервис может быть недоступен/)).toHaveLength(2);
    expect(screen.getAllByRole('alert')).toHaveLength(2);
  });

  it('lets the user hide only non-critical announcements', () => {
    const onDismiss = vi.fn();
    render(
      <AnnouncementBanner
        announcements={[announcement({ id: 1 }), announcement({ id: 2, title: 'Работы', severity: 'CRITICAL', dismissible: false })]}
        onDismiss={onDismiss}
      />
    );

    const buttons = screen.getAllByRole('button', { name: 'Скрыть объявление' });
    expect(buttons).toHaveLength(1);
    fireEvent.click(buttons[0]);
    expect(onDismiss).toHaveBeenCalledWith(1);
  });

  it('has no hide button without a handler (login page)', () => {
    render(<AnnouncementBanner announcements={[announcement({ severity: 'INFO' })]} />);

    expect(screen.queryByRole('button', { name: 'Скрыть объявление' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
