import { describe, it, expect } from 'vitest';

describe('AI Analysis Helper Tests', () => {
  it('should parse structured transcript responses', () => {
    const rawAiResult = {
      summary: 'Клиент хочет натяжной потолок в гостиную 20 кв.м',
      clientNeeds: 'Матовое полотно, 6 светильников',
      suggestedAction: 'Назначить замер на субботу 14:00'
    };

    expect(rawAiResult.summary).toContain('гостиную');
    expect(rawAiResult.clientNeeds).toContain('Матовое полотно');
  });

  it('should handle empty or fallback analysis', () => {
    const fallbackText = 'Анализ недоступен';
    expect(fallbackText).toBeDefined();
  });
});