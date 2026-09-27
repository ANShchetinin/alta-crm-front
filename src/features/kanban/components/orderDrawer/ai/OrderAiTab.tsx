import React, { useRef, useState } from 'react';
import { Check, MessageSquare, Mic, Sparkles, Trash2 } from 'lucide-react';
import type { OrderAiState } from '../../../hooks/useOrderAi';
import { AiAnalysisPanel } from './AiAnalysisPanel';
import { AiChatPanel } from './AiChatPanel';

interface OrderAiTabProps {
  ai: OrderAiState;
}

/**
 * Вкладка «AI анализ звонков»: загрузка аудиозаписи, анализ звонка и чат с AI.
 */
export const OrderAiTab: React.FC<OrderAiTabProps> = ({ ai }) => {
  const [aiSubTab, setAiSubTab] = useState<'ANALYSIS' | 'CHAT'>('ANALYSIS');
  const audioFileInputRef = useRef<HTMLInputElement | null>(null);
  const { aiSummary, uploadingAudio, chatMessages, copyFeedbackText, handleAudioUpload, handleDeleteAudio } = ai;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      {/* Header with audio upload */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Mic size={16} /> AI Анализ звонков и ассистент
          </h3>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Расшифровка аудиозаписей, анализ переговоров и умный диалог с AI
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {aiSummary && (
            <button
              type="button"
              onClick={handleDeleteAudio}
              className="btn btn-ghost"
              style={{
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                fontWeight: 500,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title="Удалить аудиозапись из S3 и очистить анализ"
            >
              <Trash2 size={14} />
              Удалить звонок
            </button>
          )}
          <button 
            type="button"
            onClick={() => audioFileInputRef.current?.click()}
            disabled={uploadingAudio}
            className="btn btn-primary" 
            style={{ 
              backgroundColor: '#3b82f6', 
              color: '#ffffff', 
              cursor: 'pointer', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px',
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              fontWeight: 600,
              border: 'none',
              boxShadow: '0 2px 8px rgba(59, 130, 246, 0.4)'
            }}
          >
            <Mic size={14} color="#ffffff" />
            {uploadingAudio ? 'Загрузка аудио...' : (aiSummary ? 'Загрузить другой звонок' : 'Загрузить звонок')}
          </button>
          <input 
            ref={audioFileInputRef}
            type="file" 
            accept="audio/*,.mp3,.ogg,.wav,.m4a,.aac,.flac,.webm" 
            onChange={handleAudioUpload} 
            disabled={uploadingAudio} 
            style={{ display: 'none' }} 
          />
        </div>
      </div>

      {/* Sub-tabs: Анализ vs Чат */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'rgba(0, 0, 0, 0.25)',
        padding: '4px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--glass-border)'
      }}>
        <button
          type="button"
          onClick={() => setAiSubTab('ANALYSIS')}
          style={{
            flex: 1,
            padding: '8px 14px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontSize: '0.88rem',
            fontWeight: aiSubTab === 'ANALYSIS' ? 600 : 500,
            background: aiSubTab === 'ANALYSIS' ? 'var(--primary)' : 'transparent',
            color: aiSubTab === 'ANALYSIS' ? '#fff' : 'var(--text-secondary)',
            transition: 'all 0.15s ease'
          }}
        >
          <Sparkles size={15} /> Анализ звонка
        </button>
        <button
          type="button"
          onClick={() => setAiSubTab('CHAT')}
          style={{
            flex: 1,
            padding: '8px 14px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontSize: '0.88rem',
            fontWeight: aiSubTab === 'CHAT' ? 600 : 500,
            background: aiSubTab === 'CHAT' ? 'var(--primary)' : 'transparent',
            color: aiSubTab === 'CHAT' ? '#fff' : 'var(--text-secondary)',
            transition: 'all 0.15s ease'
          }}
        >
          <MessageSquare size={15} /> Чат с AI по звонку
          {chatMessages.length > 0 && (
            <span style={{
              background: 'rgba(255,255,255,0.25)',
              padding: '1px 6px',
              borderRadius: '10px',
              fontSize: '0.75rem',
              fontWeight: 700
            }}>
              {chatMessages.length}
            </span>
          )}
        </button>
      </div>

      {/* Feedback Toast */}
      {copyFeedbackText && (
        <div style={{
          background: 'rgba(34, 197, 94, 0.2)',
          border: '1px solid rgba(34, 197, 94, 0.4)',
          color: '#4ade80',
          padding: '6px 12px',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.82rem',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <Check size={14} /> {copyFeedbackText}
        </div>
      )}

        {aiSubTab === 'ANALYSIS' && (
          <AiAnalysisPanel
            ai={ai}
            onOpenChat={() => setAiSubTab('CHAT')}
            onPickAudio={() => audioFileInputRef.current?.click()}
          />
        )}

        {aiSubTab === 'CHAT' && <AiChatPanel ai={ai} />}
      </div>
  );
};
