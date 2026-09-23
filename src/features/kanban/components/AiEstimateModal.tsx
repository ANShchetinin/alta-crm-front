import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles,
  Mic,
  Square,
  Send,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RotateCcw,
  Upload,
  Info
} from 'lucide-react';
import {
  requestAiEstimateText,
  requestAiEstimateVoice,
  type AiEstimateResultDto
} from '../../../api/aiEstimate';
import { useAudioRecorder } from '../../../hooks/useAudioRecorder';

export interface AiEstimateModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId?: number;
  orderNumber?: string;
  clientName?: string;
  onEstimateApplied?: (result: AiEstimateResultDto) => void;
}

export const AiEstimateModal: React.FC<AiEstimateModalProps> = ({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  clientName,
  onEstimateApplied
}) => {
  const [activeTab, setActiveTab] = useState<'VOICE' | 'TEXT'>('VOICE');
  const [promptText, setPromptText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiEstimateResultDto | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const {
    isRecording,
    recordingTime,
    audioBlob,
    audioUrl,
    error: recorderError,
    startRecording,
    stopRecording,
    resetRecording
  } = useAudioRecorder();

  if (!isOpen) {
    return null;
  }

  const handleClose = () => {
    if (loading) {
      return;
    }
    if (result && result.success && onEstimateApplied) {
      onEstimateApplied(result);
    }
    resetRecording();
    setResult(null);
    setError(null);
    setPromptText('');
    onClose();
  };

  const handleSendText = async () => {
    if (!promptText.trim()) {
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const response = await requestAiEstimateText({
        orderId,
        query: promptText.trim(),
        prompt: promptText.trim()
      });
      setResult(response);
      if (response.success === false) {
        setError(response.aiMessage || 'ИИ-модель вернула ошибку при обработке');
      }
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Ошибка обработки запроса агентом';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendVoice = async () => {
    if (!audioBlob) {
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const response = await requestAiEstimateVoice(audioBlob, orderId);
      setResult(response);
      if (response.success === false) {
        setError(response.aiMessage || 'ИИ-модель вернула ошибку при обработке');
      }
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Ошибка распознавания или обработки аудио';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const response = await requestAiEstimateVoice(file, orderId);
      setResult(response);
      if (response.success === false) {
        setError(response.aiMessage || 'ИИ-модель вернула ошибку при обработке');
      }
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Ошибка обработки аудиофайла';
      setError(message);
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleApplyAndClose = () => {
    if (result && result.success && onEstimateApplied) {
      onEstimateApplied(result);
    }
    handleClose();
  };

  const handleResetForNewPrompt = () => {
    setResult(null);
    setError(null);
    setPromptText('');
    resetRecording();
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const quickPromptChips = [
    '5 шт профиля стенового и 4 светильника',
    '10 м полотна матового и 15 м вставки',
    '4 светильника GX53 и 2 гардины'
  ];

  return createPortal(
    <div
      className="modal-overlay"
      onClick={(e) => {
        e.stopPropagation();
        handleClose();
      }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100060,
        padding: '16px'
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '580px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-primary, #1e293b)',
          borderRadius: '16px',
          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          color: 'var(--text-primary, #f8fafc)'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 20px',
            borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-secondary, rgba(255, 255, 255, 0.02))'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>
                AI-Смета из остатков склада
              </h3>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #94a3b8)', marginTop: '2px' }}>
                {orderNumber ? (
                  <span>
                    В заказ: <strong>№{orderNumber}</strong> {clientName ? `(${clientName})` : ''}
                  </span>
                ) : (
                  <span>Агент сам найдет заказ в запросе или на складе</span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary, #94a3b8)',
              cursor: loading ? 'not-allowed' : 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 14px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '10px',
                color: '#f87171',
                fontSize: '0.85rem',
                marginBottom: '16px'
              }}
            >
              <AlertTriangle size={18} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{error}</span>
            </div>
          )}

          {recorderError && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 14px',
                background: 'rgba(234, 179, 8, 0.12)',
                border: '1px solid rgba(234, 179, 8, 0.3)',
                borderRadius: '10px',
                color: '#facc15',
                fontSize: '0.85rem',
                marginBottom: '16px'
              }}
            >
              <AlertTriangle size={18} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{recorderError}</span>
            </div>
          )}

          {loading ? (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px'
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(139, 92, 246, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}
              >
                <Loader2 size={32} className="animate-spin" style={{ color: '#a78bfa' }} />
              </div>
              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', fontWeight: 600 }}>
                  AI-агент обрабатывает запрос...
                </h4>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary, #94a3b8)', maxWidth: '360px' }}>
                  Сверяем запрошенные материалы с актуальными остатками на складе и формируем позиции сметы.
                </p>
              </div>
            </div>
          ) : result ? (
            /* Results View */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* AI Agent Message */}
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: '12px',
                  background: 'rgba(139, 92, 246, 0.08)',
                  border: '1px solid rgba(139, 92, 246, 0.25)',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start'
                }}
              >
                <Sparkles size={20} style={{ color: '#a78bfa', flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '0.88rem', lineHeight: '1.45', color: 'var(--text-primary, #f1f5f9)' }}>
                  {result.aiMessage}
                </div>
              </div>

              {/* Added materials section */}
              {(() => {
                const addedList = result.addedMaterials || (result as any).addedItems || [];
                if (addedList.length === 0) return null;
                return (
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '8px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: '#34d399'
                      }}
                    >
                      <CheckCircle2 size={16} />
                      <span>Добавлено в смету заказа ({addedList.length}):</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {addedList.map((item: any, idx: number) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            background: 'rgba(16, 185, 129, 0.06)',
                            border: '1px solid rgba(16, 185, 129, 0.2)',
                            fontSize: '0.84rem'
                          }}
                        >
                          <span style={{ fontWeight: 500 }}>{item.materialName || item.name}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ color: '#34d399', fontWeight: 600 }}>
                              {item.quantity} {item.unit || 'шт.'}
                            </span>
                            {item.salePrice !== undefined && item.salePrice > 0 && (
                              <span style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.78rem' }}>
                                по {item.salePrice} ₽
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Shortage materials section */}
              {(() => {
                const shortageList = result.shortageMaterials || (result as any).shortageItems || [];
                if (shortageList.length === 0) return null;
                return (
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '8px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: '#fbbf24'
                      }}
                    >
                      <AlertTriangle size={16} />
                      <span>Частичный дефицит на складе ({shortageList.length}):</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {shortageList.map((item: any, idx: number) => (
                        <div
                          key={idx}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '8px',
                            background: 'rgba(245, 158, 11, 0.06)',
                            border: '1px solid rgba(245, 158, 11, 0.25)',
                            fontSize: '0.83rem'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 500 }}>{item.materialName || item.name}</span>
                            <span style={{ color: '#fbbf24', fontWeight: 600 }}>
                              Добавлено: {item.addedQuantity} {item.unit || 'шт.'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary, #94a3b8)' }}>
                            Запрошено: {item.requestedQuantity} • На складе было: {item.availableQuantity} •
                            <strong style={{ color: '#f87171', marginLeft: '4px' }}>
                              Не хватает: {item.shortageQuantity} {item.unit || 'шт.'}
                            </strong>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Missing materials section */}
              {(() => {
                const missingList = result.missingMaterials || (result as any).missingItems || [];
                if (missingList.length === 0) return null;
                return (
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '8px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: '#f87171'
                      }}
                    >
                      <XCircle size={16} />
                      <span>Отсутствуют на складе ({missingList.length}):</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {missingList.map((item: any, idx: number) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            background: 'rgba(239, 68, 68, 0.06)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            fontSize: '0.82rem'
                          }}
                        >
                          <span style={{ fontWeight: 500 }}>{item.materialName || item.name}</span>
                          <span style={{ color: '#f87171', fontSize: '0.78rem' }}>
                            {item.reason || 'Нет в наличии'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            /* Input View */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Tab Selector */}
              <div
                style={{
                  display: 'flex',
                  gap: '4px',
                  background: 'var(--bg-secondary, rgba(255, 255, 255, 0.05))',
                  padding: '4px',
                  borderRadius: '10px'
                }}
              >
                <button
                  type="button"
                  onClick={() => setActiveTab('VOICE')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontSize: '0.86rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    background: activeTab === 'VOICE' ? 'var(--accent-primary, #3b82f6)' : 'transparent',
                    color: activeTab === 'VOICE' ? '#ffffff' : 'var(--text-secondary, #94a3b8)',
                    transition: 'all 0.2s'
                  }}
                >
                  <Mic size={16} /> Голосовой ввод
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('TEXT')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontSize: '0.86rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    background: activeTab === 'TEXT' ? 'var(--accent-primary, #3b82f6)' : 'transparent',
                    color: activeTab === 'TEXT' ? '#ffffff' : 'var(--text-secondary, #94a3b8)',
                    transition: 'all 0.2s'
                  }}
                >
                  <Send size={16} /> Текстовый ввод
                </button>
              </div>

              {/* VOICE TAB */}
              {activeTab === 'VOICE' && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '20px 10px',
                    gap: '16px',
                    textAlign: 'center'
                  }}
                >
                  {/* Record Button */}
                  <div style={{ position: 'relative' }}>
                    {isRecording && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '-10px',
                          left: '-10px',
                          right: '-10px',
                          bottom: '-10px',
                          borderRadius: '50%',
                          border: '2px solid rgba(239, 68, 68, 0.4)',
                          animation: 'pulse 1.5s infinite',
                          pointerEvents: 'none',
                          zIndex: 0
                        }}
                      />
                    )}
                    <button
                      type="button"
                      onClick={isRecording ? stopRecording : startRecording}
                      style={{
                        position: 'relative',
                        zIndex: 2,
                        pointerEvents: 'auto',
                        width: '84px',
                        height: '84px',
                        borderRadius: '50%',
                        border: 'none',
                        background: isRecording
                          ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                          : 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: isRecording
                          ? '0 0 24px rgba(239, 68, 68, 0.6)'
                          : '0 8px 20px rgba(139, 92, 246, 0.35)',
                        transition: 'all 0.25s'
                      }}
                    >
                      {isRecording ? <Square size={32} /> : <Mic size={36} />}
                    </button>
                  </div>

                  {/* Status & Timer */}
                  <div>
                    {isRecording ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ef4444' }}>
                          ● {formatSeconds(recordingTime)}
                        </span>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #94a3b8)' }}>
                          Говорите... Нажмите еще раз, чтобы остановить запись.
                        </span>
                        <button
                          type="button"
                          onClick={stopRecording}
                          className="btn btn-secondary"
                          style={{
                            marginTop: '6px',
                            padding: '6px 14px',
                            borderRadius: '8px',
                            fontSize: '0.82rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: '#ef4444',
                            borderColor: 'rgba(239, 68, 68, 0.4)'
                          }}
                        >
                          <Square size={13} fill="#ef4444" /> Остановить запись
                        </button>
                      </div>
                    ) : audioBlob ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#34d399' }}>
                          Аудио записано ({formatSeconds(recordingTime)})
                        </span>
                        {audioUrl && (
                          <audio
                            src={audioUrl}
                            controls
                            style={{ height: '36px', maxWidth: '300px', marginTop: '4px' }}
                          />
                        )}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                          <button
                            type="button"
                            onClick={handleSendVoice}
                            className="btn btn-primary"
                            style={{
                              padding: '8px 18px',
                              borderRadius: '8px',
                              fontSize: '0.85rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <Send size={15} /> Отправить агенту
                          </button>
                          <button
                            type="button"
                            onClick={resetRecording}
                            className="btn btn-secondary"
                            style={{
                              padding: '8px 12px',
                              borderRadius: '8px',
                              fontSize: '0.85rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <RotateCcw size={14} /> Перезаписать
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '0.92rem', fontWeight: 500 }}>
                          Нажмите на микрофон для записи
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #94a3b8)' }}>
                          Например: «Добавь 10 шт стенового профиля и 4 светильника GX53»
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Or upload audio file */}
                  {!isRecording && !audioBlob && (
                    <div style={{ marginTop: '8px' }}>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="audio/*"
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          background: 'transparent',
                          border: '1px dashed var(--border-color, rgba(255, 255, 255, 0.15))',
                          borderRadius: '8px',
                          padding: '6px 14px',
                          color: 'var(--text-secondary, #94a3b8)',
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Upload size={13} /> Или загрузить аудиозапись
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TEXT TAB */}
              {activeTab === 'TEXT' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <textarea
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    placeholder="Например: В заказ 101 добавь 5 шт профиля стенового, 3 светильника и 20м вставки..."
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      backgroundColor: 'var(--bg-secondary, rgba(0, 0, 0, 0.2))',
                      border: '1px solid var(--border-color, rgba(255, 255, 255, 0.12))',
                      color: 'var(--text-primary, #f8fafc)',
                      fontSize: '0.9rem',
                      resize: 'none',
                      fontFamily: 'inherit',
                      outline: 'none'
                    }}
                  />

                  {/* Quick Chips */}
                  <div>
                    <div
                      style={{
                        fontSize: '0.76rem',
                        color: 'var(--text-secondary, #94a3b8)',
                        marginBottom: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Info size={13} /> Быстрые примеры:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {quickPromptChips.map((chip, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setPromptText(chip)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            background: 'var(--bg-secondary, rgba(255, 255, 255, 0.05))',
                            border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
                            color: 'var(--text-secondary, #cbd5e1)',
                            fontSize: '0.76rem',
                            cursor: 'pointer'
                          }}
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSendText}
                    disabled={!promptText.trim()}
                    className="btn btn-primary"
                    style={{
                      padding: '10px 18px',
                      borderRadius: '8px',
                      fontSize: '0.88rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: !promptText.trim() ? 'not-allowed' : 'pointer',
                      opacity: !promptText.trim() ? 0.6 : 1,
                      marginTop: '6px'
                    }}
                  >
                    <Send size={16} /> Наполнить смету через AI
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {result && (
          <div
            style={{
              padding: '14px 20px',
              borderTop: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-secondary, rgba(255, 255, 255, 0.02))'
            }}
          >
            <button
              type="button"
              onClick={handleResetForNewPrompt}
              className="btn btn-secondary"
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <RotateCcw size={14} /> Новый запрос
            </button>

            <button
              type="button"
              onClick={handleApplyAndClose}
              className="btn btn-primary"
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <CheckCircle2 size={16} /> Применить и закрыть
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
