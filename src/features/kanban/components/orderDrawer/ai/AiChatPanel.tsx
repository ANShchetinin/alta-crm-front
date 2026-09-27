import React from 'react';
import { Bot, Coins, Copy, FileDown, RefreshCw, Send, Sparkles, Trash2 } from 'lucide-react';
import type { OrderAiState } from '../../../hooks/useOrderAi';

const QUICK_PROMPTS = [
  '💬 Напиши сообщение для WhatsApp с итогом звонка',
  '🎯 Какие сомнения или возражения остались у клиента?',
  '🔥 Какой сильный аргумент использовать для закрытия на замер?',
  '📐 Составь список параметров для замерщика'
];

interface AiChatPanelProps {
  ai: OrderAiState;
}

/**
 * Интерактивный чат с AI по стенограмме звонка: быстрые подсказки, лента сообщений с расходом токенов, экспорт.
 */
export const AiChatPanel: React.FC<AiChatPanelProps> = ({ ai }) => {
  const {
    chatMessages,
    chatInputText,
    setChatInputText,
    isChatReplying,
    chatBottomRef,
    handleSendChatMessage,
    handleCopyText,
    handleCopyChat,
    handleExportChatTxt,
    handleClearChat
  } = ai;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Notice & Session Export Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        background: 'rgba(59, 130, 246, 0.08)',
        border: '1px solid rgba(59, 130, 246, 0.25)',
        padding: '8px 12px',
        borderRadius: 'var(--radius-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <Sparkles size={15} style={{ color: '#60a5fa', flexShrink: 0 }} />
            <span>История диалога сохраняется в заказе.</span>
          </div>
          {(() => {
            const totalTokens = chatMessages.reduce((sum, m) => sum + (m.tokensUsed || 0), 0);
            const totalCost = chatMessages.reduce((sum, m) => sum + (m.costRubles || 0), 0);
            if (totalTokens === 0) {
              return null;
            }
            return (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.78rem',
                fontWeight: 600,
                background: 'rgba(234, 179, 8, 0.15)',
                border: '1px solid rgba(234, 179, 8, 0.35)',
                color: '#facc15',
                padding: '2px 8px',
                borderRadius: '10px'
              }}>
                <Coins size={12} />
                Расход: {totalTokens} ток. (~{totalCost < 0.01 && totalTokens > 0 ? '<0.01' : totalCost.toFixed(2)} ₽)
              </div>
            );
          })()}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            onClick={handleExportChatTxt}
            className="btn btn-ghost"
            style={{ padding: '4px 8px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.05)' }}
            title="Скачать весь диалог в .txt файл"
          >
            <FileDown size={13} /> Скачать .txt
          </button>
          <button
            type="button"
            onClick={handleCopyChat}
            className="btn btn-ghost"
            style={{ padding: '4px 8px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.05)' }}
            title="Скопировать переписку"
          >
            <Copy size={13} /> Копировать
          </button>
          {chatMessages.length > 0 && (
            <button
              type="button"
              onClick={handleClearChat}
              className="btn btn-ghost"
              style={{ padding: '4px 8px', fontSize: '0.78rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '4px' }}
              title="Очистить историю переписки"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Quick Prompts Suggestions */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
        {QUICK_PROMPTS.map((suggest, idx) => (
          <button
            key={idx}
            type="button"
            disabled={isChatReplying}
            onClick={() => handleSendChatMessage(suggest)}
            style={{
              whiteSpace: 'nowrap',
              fontSize: '0.76rem',
              padding: '5px 10px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            {suggest}
          </button>
        ))}
      </div>

      {/* Chat Messages Stream */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.25)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-md)',
        padding: '14px',
        minHeight: '260px',
        maxHeight: '380px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {chatMessages.length === 0 ? (
          <div style={{
            margin: 'auto',
            textAlign: 'center',
            color: 'var(--text-secondary)',
            fontSize: '0.86rem',
            padding: '24px 12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Bot size={32} style={{ opacity: 0.7, color: 'var(--accent-primary)' }} />
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Чат с AI-ассистентом по звонку</span>
            <span style={{ fontSize: '0.78rem', maxWidth: '360px', opacity: 0.8 }}>
              Задайте любой вопрос по содержанию разговора, попросите сформулировать сообщение клиенту или выделить договоренности.
            </span>
          </div>
        ) : (
          chatMessages.map((msg, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%'
              }}
            >
              <div style={{
                fontSize: '0.72rem',
                color: 'var(--text-secondary)',
                marginBottom: '3px',
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                {msg.role === 'user' ? (
                  <><span>Вы (Менеджер)</span> • <span>{msg.timestamp}</span></>
                ) : (
                  <><Bot size={12} color="var(--accent-primary)" /> <span>AI-Ассистент</span> • <span>{msg.timestamp}</span></>
                )}
              </div>
              <div style={{
                background: msg.role === 'user' ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.05)',
                color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                padding: '10px 14px',
                borderRadius: msg.role === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                border: msg.role === 'user' ? 'none' : '1px solid var(--glass-border)',
                fontSize: '0.9rem',
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                position: 'relative'
              }}>
                {msg.text}
                {msg.role === 'assistant' && (
                  <button
                    type="button"
                    onClick={() => handleCopyText(msg.text, "Ответ AI скопирован")}
                    style={{
                      position: 'absolute',
                      top: '6px',
                      right: '6px',
                      background: 'rgba(0,0,0,0.3)',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '3px 6px',
                      cursor: 'pointer',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="Скопировать сообщение"
                  >
                    <Copy size={11} />
                  </button>
                )}
              </div>
              {msg.role === 'assistant' && msg.tokensUsed !== undefined && msg.tokensUsed > 0 && (
                <div style={{
                  fontSize: '0.72rem',
                  color: 'rgba(250, 204, 21, 0.85)',
                  marginTop: '3px',
                  alignSelf: 'flex-start',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  paddingLeft: '4px'
                }}>
                  <Coins size={11} /> {msg.tokensUsed} токенов • ~{msg.costRubles !== undefined ? msg.costRubles.toFixed(2) : (msg.tokensUsed * 0.0012).toFixed(2)} ₽
                </div>
              )}
            </div>
          ))
        )}
        {isChatReplying && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.82rem', padding: '6px 0' }}>
            <RefreshCw size={14} className="spinner" style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-primary)' }} />
            <span>AI формулирует ответ...</span>
          </div>
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* Chat Input Bar */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center'
        }}
      >
        <input
          type="text"
          value={chatInputText}
          onChange={(e) => setChatInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              e.stopPropagation();
              handleSendChatMessage();
            }
          }}
          placeholder="Спросите AI о звонке (напр. «О чем спорили в конце?», «Напиши текст для WhatsApp»)..."
          disabled={isChatReplying}
          className="search-input"
          style={{
            flex: 1,
            padding: '10px 14px',
            fontSize: '0.88rem',
            height: '42px',
            background: 'var(--bg-primary)'
          }}
        />
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleSendChatMessage();
          }}
          disabled={isChatReplying || !chatInputText.trim()}
          className="btn btn-primary"
          style={{
            height: '42px',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontWeight: 600
          }}
        >
          <Send size={15} /> Отправить
        </button>
      </div>
    </div>
  );
};
