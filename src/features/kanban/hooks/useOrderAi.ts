import { useCallback, useRef, useState } from 'react';
import {
  analyzeAudioWithPrompt,
  chatWithOrderAi,
  clearOrderAiChat,
  deleteOrderAudio,
  getAiSummary,
  uploadAudio,
  type ChatMessage,
  type OrderAiSummary
} from '../../../api/kanban';
import { getOrderAiUsage, type OrderAiCostDto } from '../../../api/aiUsage';
import { SYSTEM_PROMPT_CHAT_ASSISTANT, SYSTEM_PROMPT_SALES_ADVICE, SYSTEM_PROMPT_SUMMARY } from '../../../constants/aiPrompts';
import { downloadBlob } from '../../../utils/download';
import { toast } from '../../../utils/toast';
import { confirm } from '../../../utils/confirm';

export type AiPreset = 'SUMMARY' | 'SALES_ADVICE' | 'CUSTOM';

const errorMessage = (err: unknown, fallback: string): string =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

const nowTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/**
 * Результаты анализа по пресетам (analysisResults приходит JSON-строкой или объектом).
 */
export const getAnalysisResultsMap = (summary: OrderAiSummary | null): Record<string, string> => {
  if (!summary || !summary.analysisResults) {
    return {};
  }
  try {
    if (typeof summary.analysisResults === 'object') {
      return summary.analysisResults as Record<string, string>;
    }
    return JSON.parse(summary.analysisResults);
  } catch {
    return {};
  }
};

const resolvePrompt = (preset: AiPreset, customPrompt: string): string => {
  if (preset === 'SALES_ADVICE') {
    return SYSTEM_PROMPT_SALES_ADVICE;
  }
  if (preset === 'CUSTOM') {
    return customPrompt.trim() || SYSTEM_PROMPT_SUMMARY;
  }
  return SYSTEM_PROMPT_SUMMARY;
};

/**
 * Анализ аудиозаписей звонков и чат с AI по заказу. Ответы по заказу, с которого пользователь уже ушел, игнорируются;
 * история чата кешируется по заказам на время жизни шторки.
 */
export const useOrderAi = (orderId: number | null) => {
  const [aiSummary, setAiSummary] = useState<OrderAiSummary | null>(null);
  const [orderAiCost, setOrderAiCost] = useState<OrderAiCostDto | null>(null);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [aiPromptPreset, setAiPromptPreset] = useState<AiPreset>('SUMMARY');
  const [customSystemPrompt, setCustomSystemPrompt] = useState('');
  const [isAnalyzingAudio, setIsAnalyzingAudio] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInputText, setChatInputText] = useState('');
  const [isChatReplying, setIsChatReplying] = useState(false);
  const [copyFeedbackText, setCopyFeedbackText] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const chatCacheRef = useRef<Record<number, ChatMessage[]>>({});
  const activeOrderIdRef = useRef(orderId);
  activeOrderIdRef.current = orderId;

  const isActive = (id: number) => activeOrderIdRef.current === id;

  const refreshCost = useCallback((id: number) => {
    getOrderAiUsage(id)
      .then(cost => {
        if (activeOrderIdRef.current === id) {
          setOrderAiCost(cost);
        }
      })
      .catch(() => {});
  }, []);

  /** Сбрасывает AI-данные (новый заказ). */
  const reset = useCallback(() => {
    setAiSummary(null);
    setOrderAiCost(null);
    setChatMessages([]);
  }, []);

  /** Загружает анализ, затраты и кешированную историю чата открытого заказа. */
  const loadForOrder = useCallback((id: number) => {
    getAiSummary(id)
      .then(summary => {
        if (activeOrderIdRef.current === id) {
          setAiSummary(summary);
        }
      })
      .catch(() => {
        if (activeOrderIdRef.current === id) {
          setAiSummary(null);
        }
      });
    getOrderAiUsage(id)
      .then(cost => {
        if (activeOrderIdRef.current === id) {
          setOrderAiCost(cost);
        }
      })
      .catch(() => {
        if (activeOrderIdRef.current === id) {
          setOrderAiCost(null);
        }
      });
    setChatMessages(chatCacheRef.current[id] || []);
  }, []);

  const refreshAiSummary = () => {
    if (!orderId) {
      return;
    }
    const id = orderId;
    getAiSummary(id)
      .then(summary => {
        if (isActive(id)) {
          setAiSummary(summary);
        }
      })
      .catch(() => {});
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !orderId) {
      return;
    }
    const id = orderId;
    setUploadingAudio(true);
    try {
      await uploadAudio(id, file);
      const summary = await getAiSummary(id);
      if (isActive(id)) {
        setAiSummary(summary);
      }
      refreshCost(id);
      toast.success('Аудиозапись успешно загружена и отправлена на анализ');
    } catch (err) {
      console.error('Failed to upload audio', err);
      toast.error('Не удалось загрузить аудиозапись');
    } finally {
      setUploadingAudio(false);
      e.target.value = '';
    }
  };

  const handleDeleteAudio = async () => {
    if (!orderId) {
      return;
    }
    const ok = await confirm({
      title: 'Удалить аудиозапись?',
      message: 'Удалить аудиозапись звонка и результаты анализа? Аудиофайл будет безвозвратно удален из хранилища.',
      confirmText: 'Удалить',
      danger: true
    });
    if (!ok) {
      return;
    }
    try {
      await deleteOrderAudio(orderId);
      setAiSummary(null);
      setChatMessages([]);
      delete chatCacheRef.current[orderId];
      toast.success('Аудиозапись звонка удалена');
    } catch (err) {
      console.error('Failed to delete audio', err);
      toast.error(errorMessage(err, 'Не удалось удалить аудиозапись звонка'));
    }
  };

  const handleRunAiAnalysis = async (preset: AiPreset, force = false) => {
    if (!orderId) {
      return;
    }
    const id = orderId;
    setAiPromptPreset(preset);

    const saved = getAnalysisResultsMap(aiSummary)[preset];
    if (!force && preset !== 'CUSTOM' && saved) {
      if (aiSummary) {
        setAiSummary({ ...aiSummary, aiSummary: saved });
      }
      return;
    }

    setIsAnalyzingAudio(true);
    try {
      const updated = await analyzeAudioWithPrompt(id, resolvePrompt(preset, customSystemPrompt), preset, force);
      if (isActive(id)) {
        setAiSummary(updated);
      }
      refreshCost(id);
      toast.success('AI анализ завершен');
    } catch (err) {
      console.error('Failed to run AI analysis', err);
      toast.error(errorMessage(err, 'Ошибка при анализе стенограммы'));
    } finally {
      setIsAnalyzingAudio(false);
    }
  };

  /** Выбор пресета: сохраненный результат показывается сразу, иначе запускается анализ. */
  const handleSelectAiPreset = (preset: AiPreset) => {
    setAiPromptPreset(preset);
    if (preset === 'CUSTOM') {
      return;
    }
    const saved = getAnalysisResultsMap(aiSummary)[preset];
    if (saved) {
      if (aiSummary) {
        setAiSummary({ ...aiSummary, aiSummary: saved });
      }
    } else {
      handleRunAiAnalysis(preset);
    }
  };

  const handleSendChatMessage = async (textToSend?: string) => {
    const text = (textToSend || chatInputText).trim();
    if (!text || !orderId || isChatReplying) {
      return;
    }
    const id = orderId;
    setChatInputText('');
    const history = [...chatMessages, { role: 'user' as const, text, timestamp: nowTime() }];
    setChatMessages(history);
    chatCacheRef.current[id] = history;
    setIsChatReplying(true);

    try {
      const res = await chatWithOrderAi(id, SYSTEM_PROMPT_CHAT_ASSISTANT, chatMessages, text);
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        text: res.reply,
        timestamp: nowTime(),
        tokensUsed: res.tokensUsed,
        costRubles: res.costRubles
      };
      const finalHistory = res.messages && res.messages.length > 0 ? res.messages : [...history, assistantMsg];
      chatCacheRef.current[id] = finalHistory;
      if (isActive(id)) {
        setChatMessages(finalHistory);
      }
      refreshCost(id);
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error('Failed to chat with AI', err);
      const reason = errorMessage(err, (err as Error)?.message || 'Не удалось получить ответ');
      if (isActive(id)) {
        setChatMessages([...history, { role: 'assistant', text: `⚠️ Ошибка: ${reason}`, timestamp: nowTime() }]);
      }
    } finally {
      setIsChatReplying(false);
    }
  };

  const handleCopyText = (text: string, label = 'Скопировано') => {
    if (!navigator.clipboard) {
      return;
    }
    navigator.clipboard.writeText(text).then(() => {
      setCopyFeedbackText(label);
      setTimeout(() => setCopyFeedbackText(null), 2200);
    }).catch(err => {
      console.error('Failed to copy', err);
    });
  };

  const handleCopyChat = () => {
    const fullChat = chatMessages.map(m => `[${m.role === 'user' ? 'Менеджер' : 'AI'}]: ${m.text}`).join('\n\n');
    handleCopyText(fullChat || 'Чат пуст', 'История чата скопирована');
  };

  const handleExportChatTxt = () => {
    if (chatMessages.length === 0) {
      return;
    }
    const lines = [
      `=== История диалога с AI по заказу #${orderId} ===`,
      `Дата экспорта: ${new Date().toLocaleString('ru-RU')}`,
      '--------------------------------------------------\n'
    ];
    chatMessages.forEach(m => {
      lines.push(`[${m.timestamp}] ${m.role === 'user' ? 'Менеджер' : 'AI-Ассистент'}:`);
      lines.push(m.text);
      if (m.tokensUsed) {
        lines.push(`(Токенов: ${m.tokensUsed})`);
      }
      lines.push('');
    });
    downloadBlob(new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }), `order-${orderId}-ai-chat.txt`);
  };

  const handleClearChat = async () => {
    if (!orderId) {
      return;
    }
    const ok = await confirm({
      title: 'Очистка истории диалога',
      message: 'Очистить историю диалога с AI для этого заказа?',
      confirmText: 'Очистить',
      cancelText: 'Отмена',
      danger: true
    });
    if (!ok) {
      return;
    }
    try {
      await clearOrderAiChat(orderId);
      delete chatCacheRef.current[orderId];
      toast.success('История диалога с AI очищена');
    } catch (err) {
      console.error('Failed to clear chat', err);
    }
    setChatMessages([]);
  };

  return {
    aiSummary,
    orderAiCost,
    uploadingAudio,
    aiPromptPreset,
    customSystemPrompt,
    setCustomSystemPrompt,
    isAnalyzingAudio,
    chatMessages,
    chatInputText,
    setChatInputText,
    isChatReplying,
    copyFeedbackText,
    chatBottomRef,
    reset,
    loadForOrder,
    refreshAiSummary,
    handleAudioUpload,
    handleDeleteAudio,
    handleRunAiAnalysis,
    handleSelectAiPreset,
    handleSendChatMessage,
    handleCopyText,
    handleCopyChat,
    handleExportChatTxt,
    handleClearChat
  };
};

export type OrderAiState = ReturnType<typeof useOrderAi>;
