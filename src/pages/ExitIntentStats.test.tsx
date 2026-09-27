import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithQuery } from '../test-utils/queryWrapper';
import { ExitIntentStats } from './ExitIntentStats';
import * as api from '../api/exitIntentAnalytics';

vi.mock('../api/exitIntentAnalytics', () => ({
  getExitIntentSummary: vi.fn(),
  getExitIntentSessions: vi.fn(),
  deleteExitIntentSession: vi.fn()
}));

const summary = {
  totalSessions: 12,
  totalShows: 25,
  totalCalculatorOpens: 8,
  totalPdfDownloads: 4,
  totalImageDownloads: 2,
  conversionToShowRate: 208.33,
  conversionToCalcRate: 32.0,
  conversionToPdfRate: 16.0,
  conversionToImageRate: 8.0,
  conversionTotalDownloadsRate: 24.0,
  byOs: { Windows: 10, iOS: 2 },
  byDevice: { DESKTOP: 10, MOBILE: 2 },
  byCity: { Саратов: 10, Энгельс: 2 },
  dailyStats: []
};

const session = {
  id: 1,
  sessionId: 'sess-abc-12345678',
  ipAddress: '192.168.1.50',
  city: 'Саратов',
  region: 'Саратовская обл',
  os: 'Windows',
  deviceType: 'DESKTOP',
  browser: 'Chrome',
  shownCount: 2,
  openedCalculator: true,
  openedCalculatorCount: 1,
  pdfDownloadsCount: 1,
  imageDownloadsCount: 0,
  totalPrice: 15400,
  calcData: JSON.stringify({ area: 20, perimeter: 18, canvasType: 'matte' }),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

describe('ExitIntentStats Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.getExitIntentSummary as any).mockResolvedValue(summary);
  });

  it('renders summary cards and sessions correctly', async () => {
    (api.getExitIntentSessions as any).mockResolvedValue({
      content: [session],
      totalElements: 1,
      totalPages: 1,
      size: 15,
      number: 0
    });

    renderWithQuery(<ExitIntentStats />);

    expect(screen.getByText('Аналитика сайта')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('192.168.1.50')).toBeInTheDocument();
      expect(screen.getByText('Саратов, Саратовская обл')).toBeInTheDocument();
      expect(screen.getByText('15 400 ₽')).toBeInTheDocument();
    });
  });

  it('stays on the next page instead of jumping back to the first one', async () => {
    (api.getExitIntentSessions as any).mockImplementation(async ({ page }: { page: number }) => ({
      content: [{ ...session, id: page + 1, ipAddress: `10.0.0.${page + 1}` }],
      totalElements: 45,
      totalPages: 3,
      size: 15,
      number: page
    }));

    renderWithQuery(<ExitIntentStats />);

    const pageLabel = await screen.findByText('Страница 1 из 3');
    const [, nextButton] = Array.from(pageLabel.parentElement!.querySelectorAll('button'));
    fireEvent.click(nextButton);

    expect(await screen.findByText('Страница 2 из 3')).toBeInTheDocument();
    expect(await screen.findByText('10.0.0.2')).toBeInTheDocument();
    expect(api.getExitIntentSessions).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 }));
  });
});
