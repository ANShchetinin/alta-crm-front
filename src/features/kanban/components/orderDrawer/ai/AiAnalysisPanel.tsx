import React from 'react';
import { Bot, Check, Coins, Copy, MessageSquare, Mic, RefreshCw, RotateCcw, Sparkles } from 'lucide-react';
import { getAnalysisResultsMap, type OrderAiState } from '../../../hooks/useOrderAi';

interface AiAnalysisPanelProps {
  ai: OrderAiState;
  onOpenChat: () => void;
  onPickAudio: () => void;
}

/**
 * Анализ звонка: статус расшифровки, затраты на AI, выбор пресета анализа, результат и стенограмма.
 */
export const AiAnalysisPanel: React.FC<AiAnalysisPanelProps> = ({ ai, onOpenChat, onPickAudio }) => {
  const {
    aiSummary,
    orderAiCost,
    uploadingAudio,
    aiPromptPreset,
    customSystemPrompt,
    setCustomSystemPrompt,
    isAnalyzingAudio,
    refreshAiSummary,
    handleRunAiAnalysis,
    handleSelectAiPreset,
    handleCopyText
  } = ai;

  return (
    <>
      {aiSummary ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Status and Refresh */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 12px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-sm)'
          }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Статус обработки:{' '}
              <strong style={{
                color: aiSummary.status === 'COMPLETED' ? 'var(--success)' : (aiSummary.status === 'ERROR' ? 'var(--danger)' : 'var(--warning)')
              }}>
                {aiSummary.status === 'COMPLETED' ? 'Готово к анализу' : (aiSummary.status === 'ERROR' ? 'Ошибка' : 'Расшифровка аудио...')}
              </strong>
            </span>
            <button
              type="button"
              onClick={refreshAiSummary}
              className="btn btn-ghost"
              style={{ padding: '4px 10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <RefreshCw size={13} /> Обновить статус
            </button>
          </div>

          {/* AI Cost Breakdown for this Order */}
          {orderAiCost && orderAiCost.totalCostRubles > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
              background: 'rgba(234, 179, 8, 0.08)',
              border: '1px solid rgba(234, 179, 8, 0.25)',
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#facc15', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Coins size={15} /> Затраты на ИИ по сделке: {Number(orderAiCost.totalCostRubles).toFixed(2)} ₽
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  {orderAiCost.speechkitCostRubles > 0 && (
                    <span>• Аудио: {Number(orderAiCost.speechkitCostRubles).toFixed(2)} ₽ ({Math.floor(orderAiCost.audioDurationSeconds / 60)}:{String(orderAiCost.audioDurationSeconds % 60).padStart(2, '0')} мин)</span>
                  )}
                  {orderAiCost.gptCostRubles > 0 && (
                    <span>• GPT: {Number(orderAiCost.gptCostRubles).toFixed(2)} ₽ ({orderAiCost.totalTokens} ток.)</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Prompt Presets Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Вариант системного анализа:
            </label>
            {(() => {
              const map = getAnalysisResultsMap(aiSummary);
              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
                  <button
                    type="button"
                    disabled={isAnalyzingAudio || !aiSummary.rawTranscript}
                    onClick={() => handleSelectAiPreset('SUMMARY')}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      border: aiPromptPreset === 'SUMMARY' ? '1px solid var(--primary)' : '1px solid var(--glass-border)',
                      background: aiPromptPreset === 'SUMMARY' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                      color: aiPromptPreset === 'SUMMARY' ? '#fff' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.88rem', color: aiPromptPreset === 'SUMMARY' ? '#60a5fa' : 'var(--text-primary)' }}>
                        📋 Саммари звонка
                      </span>
                      {map['SUMMARY'] && (
                        <span style={{ fontSize: '0.7rem', color: '#4ade80', display: 'inline-flex', alignItems: 'center', gap: '2px', fontWeight: 600 }}>
                          <Check size={11} /> Сохранен
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.74rem', opacity: 0.8 }}>
                      Суть, параметры объекта, даты замера и цены
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={isAnalyzingAudio || !aiSummary.rawTranscript}
                    onClick={() => handleSelectAiPreset('SALES_ADVICE')}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      border: aiPromptPreset === 'SALES_ADVICE' ? '1px solid #10b981' : '1px solid var(--glass-border)',
                      background: aiPromptPreset === 'SALES_ADVICE' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                      color: aiPromptPreset === 'SALES_ADVICE' ? '#fff' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.88rem', color: aiPromptPreset === 'SALES_ADVICE' ? '#34d399' : 'var(--text-primary)' }}>
                        🎯 Скрипт и дожим
                      </span>
                      {map['SALES_ADVICE'] && (
                        <span style={{ fontSize: '0.7rem', color: '#4ade80', display: 'inline-flex', alignItems: 'center', gap: '2px', fontWeight: 600 }}>
                          <Check size={11} /> Сохранен
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.74rem', opacity: 0.8 }}>
                      Анализ сомнений, готовый скрипт и аргументы
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={isAnalyzingAudio || !aiSummary.rawTranscript}
                    onClick={() => handleSelectAiPreset('CUSTOM')}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      border: aiPromptPreset === 'CUSTOM' ? '1px solid #f59e0b' : '1px solid var(--glass-border)',
                      background: aiPromptPreset === 'CUSTOM' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                      color: aiPromptPreset === 'CUSTOM' ? '#fff' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.88rem', color: aiPromptPreset === 'CUSTOM' ? '#fbbf24' : 'var(--text-primary)' }}>
                        ✏️ Свой промпт
                      </span>
                      {map['CUSTOM'] && (
                        <span style={{ fontSize: '0.7rem', color: '#4ade80', display: 'inline-flex', alignItems: 'center', gap: '2px', fontWeight: 600 }}>
                          <Check size={11} /> Сохранен
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.74rem', opacity: 0.8 }}>
                      Произвольный запрос к стенограмме
                    </span>
                  </button>
                </div>
              );
            })()}
          </div>

          {/* Custom Prompt Box */}
          {aiPromptPreset === 'CUSTOM' && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              background: 'rgba(0, 0, 0, 0.2)',
              padding: '12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid rgba(245, 158, 11, 0.3)'
            }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fbbf24' }}>
                Введите ваш промпт / инструкцию для анализа стенограммы:
              </label>
              <textarea
                rows={3}
                value={customSystemPrompt}
                onChange={(e) => setCustomSystemPrompt(e.target.value)}
                placeholder="Например: Выдели только перечень освещения и карнизов, либо составь текст коммерческого предложения для клиента..."
                style={{
                  width: '100%',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  padding: '8px 12px',
                  fontSize: '0.88rem',
                  resize: 'vertical'
                }}
              />
              <button
                type="button"
                disabled={isAnalyzingAudio || !customSystemPrompt.trim()}
                onClick={() => handleRunAiAnalysis('CUSTOM', true)}
                className="btn btn-primary"
                style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
              >
                <Sparkles size={14} />
                {isAnalyzingAudio ? 'Генерация анализа...' : '⚡ Запустить анализ'}
              </button>
            </div>
          )}

          {/* Analysis Result Box */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '16px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--glass-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
                <Bot size={15} color="var(--accent-primary)" /> Результат анализа:
                {aiPromptPreset && (
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                    ({aiPromptPreset === 'SUMMARY' ? 'Саммари звонка' : (aiPromptPreset === 'SALES_ADVICE' ? 'Скрипт и дожим' : 'Свой промпт')})
                  </span>
                )}
              </span>
              {aiSummary.aiSummary && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    disabled={isAnalyzingAudio}
                    onClick={() => handleRunAiAnalysis(aiPromptPreset, true)}
                    className="btn btn-ghost"
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.78rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      color: '#38bdf8',
                      background: 'rgba(56, 189, 248, 0.1)',
                      border: '1px solid rgba(56, 189, 248, 0.25)',
                      borderRadius: 'var(--radius-sm)'
                    }}
                    title="Принудительно отправить повторный запрос в AI"
                  >
                    <RotateCcw size={13} className={isAnalyzingAudio ? 'spinner' : ''} /> Сгенерировать повторно
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyText(aiSummary.aiSummary!, "Результат анализа скопирован")}
                    className="btn btn-ghost"
                    style={{ padding: '4px 8px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    title="Скопировать в буфер"
                  >
                    <Copy size={13} /> Копировать
                  </button>
                  <button
                    type="button"
                    onClick={onOpenChat}
                    className="btn btn-primary"
                    style={{ padding: '4px 10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <MessageSquare size={13} /> Обсудить в чате
                  </button>
                </div>
              )}
            </div>

            {isAnalyzingAudio ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <RefreshCw size={20} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: '0.88rem' }}>AI анализирует стенограмму звонка...</span>
              </div>
            ) : aiSummary.aiSummary ? (
              <div style={{ fontSize: '0.92rem', lineHeight: '1.6', whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>
                {aiSummary.aiSummary}
              </div>
            ) : (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '12px 0' }}>
                {aiSummary.status === 'ERROR' ? 'Ошибка при обработке записи.' : 'Расшифровка завершена. Выберите вариант анализа выше.'}
              </div>
            )}
          </div>

          {/* Raw Transcript Collapsible */}
          {aiSummary.rawTranscript && (
            <details style={{
              background: 'rgba(0, 0, 0, 0.15)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--glass-border)'
            }}>
              <summary style={{ cursor: 'pointer', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                📝 Стенограмма звонка (полный текст)
              </summary>
              <div style={{ marginTop: '10px', fontSize: '0.84rem', color: 'var(--text-primary)', lineHeight: '1.5', maxHeight: '180px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                {aiSummary.rawTranscript}
              </div>
            </details>
          )}
        </div>
      ) : (
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px dashed var(--glass-border)',
          borderRadius: 'var(--radius-md)',
          padding: '40px 16px',
          textAlign: 'center',
          color: 'var(--text-secondary)',
          fontSize: '0.88rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'rgba(59, 130, 246, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-primary)'
          }}>
            <Mic size={26} color="var(--accent-primary)" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.98rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Нет загруженных записей звонков
            </span>
            <span style={{ fontSize: '0.8rem', opacity: 0.8, maxWidth: '420px' }}>
              Загрузите аудиозапись разговора с клиентом (.mp3, .ogg, .wav, .m4a, .aac), чтобы AI расшифровал разговор, выделил ключевые параметры и подсказал скрипт продажи.
            </span>
          </div>
          <button
            type="button"
            onClick={onPickAudio}
            disabled={uploadingAudio}
            className="btn btn-primary"
            style={{
              marginTop: '4px',
              padding: '10px 22px',
              fontSize: '0.92rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              boxShadow: '0 2px 8px rgba(59, 130, 246, 0.4)'
            }}
          >
            <Mic size={16} color="#ffffff" />
            {uploadingAudio ? 'Загрузка аудиозаписи...' : 'Выбрать аудиофайл звонка'}
          </button>
        </div>
      )}
    </>
  );
};
