import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ExitIntentStats } from './ExitIntentStats';
import * as api from '../api/exitIntentAnalytics';

vi.mock('../api/exitIntentAnalytics', () => ({
  getExitIntentSummary: vi.fn(),
  getExitIntentSessions: vi.fn(),
  deleteExitIntentSession: vi.fn()
}));

describe('ExitIntentStats Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders summary cards and sessions correctly', async () => {
    (api.getExitIntentSummary as any).mockResolvedValue({
      totalSessions: 12,
      totalShows: 25,
      totalCalculatorOpens: 8,
      totalPdfDownloads: 4,
      totalImageDownloads: 2,
      conversionToCalcRate: 32.0,
      conversionToPdfRate: 16.0,
      conversionToImageRate: 8.0,
      conversionTotalDownloadsRate: 24.0,
      byOs: { Windows: 10, iOS: 2 },
      byDevice: { DESKTOP: 10, MOBILE: 2 },
      dailyStats: []
    });

    (api.getExitIntentSessions as any).mockResolvedValue({
      content: [
        {
          id: 1,
          sessionId: 'sess-abc-12345678',
          ipAddress: '192.168.1.50',
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
        }
      ],
      totalElements: 1,
      totalPages: 1,
      size: 15,
      number: 0
    });

    render(<ExitIntentStats />);

    expect(screen.getByText('Аналитика сайта')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('25')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('192.168.1.50')).toBeInTheDocument();
      expect(screen.getByText('15 400 ₽')).toBeInTheDocument();
    });
  });
});
