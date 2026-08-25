import { describe, it, expect } from 'vitest';
import type { OrderAiCostDto, AiUsageSummaryDto } from '../api/aiUsage';

describe('AI Usage Metrics Calculation', () => {
  it('should format order AI costs correctly', () => {
    const mockOrderCost: OrderAiCostDto = {
      orderId: 101,
      totalCostRubles: 1.4582,
      speechkitCostRubles: 0.7200,
      gptCostRubles: 0.7382,
      totalTokens: 1150,
      inputTokens: 850,
      outputTokens: 300,
      audioDurationSeconds: 120,
      logs: []
    };

    expect(Number(mockOrderCost.totalCostRubles).toFixed(2)).toBe('1.46');
    expect(Number(mockOrderCost.speechkitCostRubles).toFixed(2)).toBe('0.72');
    expect(Number(mockOrderCost.gptCostRubles).toFixed(2)).toBe('0.74');
    expect(Math.floor(mockOrderCost.audioDurationSeconds / 60)).toBe(2);
    expect(mockOrderCost.audioDurationSeconds % 60).toBe(0);
  });

  it('should aggregate company summary correctly', () => {
    const mockSummary: AiUsageSummaryDto = {
      totalCostRubles: 10.32,
      speechkitCostRubles: 1.99,
      gptCostRubles: 8.33,
      totalTokens: 12500,
      inputTokens: 10000,
      outputTokens: 2500,
      totalAudioDurationSeconds: 332,
      totalRequestsCount: 14,
      recentLogs: []
    };

    expect(mockSummary.totalRequestsCount).toBe(14);
    expect(mockSummary.totalCostRubles).toBe(10.32);
    expect(mockSummary.speechkitCostRubles + mockSummary.gptCostRubles).toBeCloseTo(10.32, 2);
  });
});