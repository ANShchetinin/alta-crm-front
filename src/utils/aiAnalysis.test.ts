import { describe, it, expect } from 'vitest';
import type { OrderAiSummary, ChatMessage } from '../api/kanban';

describe('AI Analysis Caching & Chat History', () => {
  it('should parse analysis results correctly from JSON string', () => {
    const summary: OrderAiSummary = {
      id: 1,
      orderId: 10,
      status: 'COMPLETED',
      rawTranscript: 'Стенограмма звонка...',
      analysisResults: JSON.stringify({
        SUMMARY: 'Саммари звонка',
        SALES_ADVICE: 'Скрипт дожима'
      })
    };

    const parsed = typeof summary.analysisResults === 'string' 
      ? JSON.parse(summary.analysisResults) 
      : summary.analysisResults;

    expect(parsed.SUMMARY).toBe('Саммари звонка');
    expect(parsed.SALES_ADVICE).toBe('Скрипт дожима');
    expect(parsed.CUSTOM).toBeUndefined();
  });

  it('should parse chat history correctly from JSON string', () => {
    const history: ChatMessage[] = [
      { role: 'user', text: 'Какие боли у клиента?', timestamp: '12:00' },
      { role: 'assistant', text: 'Клиент сомневается по цене', timestamp: '12:00', tokensUsed: 80, costRubles: 0.03 }
    ];

    const summary: OrderAiSummary = {
      id: 1,
      orderId: 10,
      status: 'COMPLETED',
      chatHistory: JSON.stringify(history)
    };

    const parsedHistory: ChatMessage[] = typeof summary.chatHistory === 'string'
      ? JSON.parse(summary.chatHistory)
      : summary.chatHistory;

    expect(parsedHistory).toHaveLength(2);
    expect(parsedHistory[0].role).toBe('user');
    expect(parsedHistory[1].role).toBe('assistant');
    expect(parsedHistory[1].tokensUsed).toBe(80);
  });
});
