import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useOrderAi, getAnalysisResultsMap } from './useOrderAi';
import { analyzeAudioWithPrompt, chatWithOrderAi, getAiSummary, type OrderAiSummary } from '../../../api/kanban';
import { getOrderAiUsage, type OrderAiCostDto } from '../../../api/aiUsage';

vi.mock('../../../api/kanban', () => ({
  analyzeAudioWithPrompt: vi.fn(),
  chatWithOrderAi: vi.fn(),
  clearOrderAiChat: vi.fn(),
  deleteOrderAudio: vi.fn(),
  getAiSummary: vi.fn(),
  uploadAudio: vi.fn()
}));
vi.mock('../../../api/aiUsage', () => ({ getOrderAiUsage: vi.fn() }));
vi.mock('../../../utils/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }
}));

const summary = (extra: Partial<OrderAiSummary> = {}): OrderAiSummary => ({
  id: 1,
  orderId: 5,
  status: 'COMPLETED',
  rawTranscript: 'текст',
  ...extra
});
const cost = (totalCostRubles: number) => ({ totalCostRubles } as OrderAiCostDto);

describe('useOrderAi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ignores AI data of an order the user already left', async () => {
    let resolveSummary!: (value: OrderAiSummary) => void;
    vi.mocked(getAiSummary).mockReturnValue(new Promise(resolve => {
      resolveSummary = resolve;
    }));
    vi.mocked(getOrderAiUsage).mockResolvedValue(cost(0));
    const { result, rerender } = renderHook(({ id }) => useOrderAi(id), { initialProps: { id: 5 as number | null } });

    act(() => {
      result.current.loadForOrder(5);
    });
    rerender({ id: 6 });
    await act(async () => {
      resolveSummary(summary());
    });

    expect(result.current.aiSummary).toBeNull();
  });

  it('refreshes the AI cost after a new analysis', async () => {
    vi.mocked(getAiSummary).mockResolvedValue(summary());
    vi.mocked(getOrderAiUsage).mockResolvedValueOnce(cost(1)).mockResolvedValueOnce(cost(3.5));
    vi.mocked(analyzeAudioWithPrompt).mockResolvedValue(summary({ aiSummary: 'итог' }));
    const { result } = renderHook(() => useOrderAi(5));
    act(() => {
      result.current.loadForOrder(5);
    });
    await waitFor(() => expect(result.current.orderAiCost?.totalCostRubles).toBe(1));

    await act(() => result.current.handleRunAiAnalysis('SALES_ADVICE', true));

    await waitFor(() => expect(result.current.orderAiCost?.totalCostRubles).toBe(3.5));
    expect(result.current.aiSummary?.aiSummary).toBe('итог');
  });

  it('shows a saved preset result without a new request', async () => {
    vi.mocked(getAiSummary).mockResolvedValue(summary({ analysisResults: JSON.stringify({ SUMMARY: 'сохраненное саммари' }) }));
    vi.mocked(getOrderAiUsage).mockResolvedValue(cost(0));
    const { result } = renderHook(() => useOrderAi(5));
    act(() => {
      result.current.loadForOrder(5);
    });
    await waitFor(() => expect(result.current.aiSummary).not.toBeNull());

    act(() => {
      result.current.handleSelectAiPreset('SUMMARY');
    });

    expect(result.current.aiSummary?.aiSummary).toBe('сохраненное саммари');
    expect(analyzeAudioWithPrompt).not.toHaveBeenCalled();
  });

  it('copies the chat with real line breaks', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    vi.mocked(chatWithOrderAi).mockResolvedValue({ reply: 'Ответ', tokensUsed: 10, costRubles: 0.01, messages: [] });
    vi.mocked(getOrderAiUsage).mockResolvedValue(cost(0));
    const { result } = renderHook(() => useOrderAi(5));

    await act(() => result.current.handleSendChatMessage('Вопрос'));
    await act(async () => {
      result.current.handleCopyChat();
    });

    expect(writeText).toHaveBeenCalledWith('[Менеджер]: Вопрос\n\n[AI]: Ответ');
  });

  it('parses analysis results given as string or object', () => {
    expect(getAnalysisResultsMap(summary({ analysisResults: '{"CUSTOM":"x"}' }))).toEqual({ CUSTOM: 'x' });
    expect(getAnalysisResultsMap(summary({ analysisResults: 'broken' }))).toEqual({});
    expect(getAnalysisResultsMap(null)).toEqual({});
  });
});
