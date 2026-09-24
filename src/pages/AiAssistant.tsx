import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Mic,
  Square,
  Send,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RotateCcw,
  Upload,
  ExternalLink,
  HelpCircle,
  FileSpreadsheet
} from 'lucide-react';
import {
  requestAiEstimateText,
  requestAiEstimateVoice,
  type AiEstimateResultDto
} from '../api/aiEstimate';
import { getOrders, type Order } from '../api/kanban';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useOrderDrawerStore } from '../store/useOrderDrawerStore';
import { toast } from '../utils/toast';
import '../styles/ai-assistant.css';

const EXAMPLE_PROMPTS = [
  'Добавь в смету Анны Смирновой 2 обвода трубы 3 обвода углов и монтаж закладной под люстру',
  'В заказ 1042 добавь 5 шт профиля 60х27 и 2 банки краски',
  'Добавь 20 метров кабеля и 4 розетки для Иванова',
  'Добавь в смету 4 светильника точечных и обвод трубы'
];

export const AiAssistant: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'VOICE' | 'TEXT'>('VOICE');
  const [promptText, setPromptText] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<number | undefined>(undefined);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
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

  useEffect(() => {
    fetchOrdersList();
  }, []);

  const fetchOrdersList = async () => {
    try {
      setLoadingOrders(true);
      const data = await getOrders();
      setOrders(data);
    } catch {
      // Soft fail, user can still type order number/client in prompt
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleSendText = async () => {
    if (!promptText.trim()) {
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const response = await requestAiEstimateText({
        orderId: selectedOrderId,
        query: promptText.trim(),
        prompt: promptText.trim()
      });
      setResult(response);
      if (response.success === false) {
        setError(response.aiMessage || 'ИИ-модель не смогла разобрать позиции');
      } else {
        toast.success('Смета успешно обновлена!');
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
      const response = await requestAiEstimateVoice(audioBlob, selectedOrderId);
      setResult(response);
      if (response.success === false) {
        setError(response.aiMessage || 'ИИ-модель не смогла распознать голос');
      } else {
        toast.success('Смета успешно обновлена!');
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
      const response = await requestAiEstimateVoice(file, selectedOrderId);
      setResult(response);
      if (response.success === false) {
        setError(response.aiMessage || 'ИИ-модель не смогла распознать аудиофайл');
      } else {
        toast.success('Смета успешно обновлена!');
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

  const handleReset = () => {
    setResult(null);
    setError(null);
    setPromptText('');
    resetRecording();
  };

  const handleOpenOrderDrawer = (orderId?: number) => {
    if (orderId) {
      useOrderDrawerStore.getState().openOrder(orderId);
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="ai-assistant-page">
      {/* Header */}
      <div className="ai-assistant-header">
        <div className="ai-assistant-title-group">
          <div className="ai-assistant-icon-box">
            <Sparkles size={24} />
          </div>
          <div>
            <h1 className="ai-assistant-title">
              ИИ-Ассистент сметы
              <span className="nav-badge beta-badge">beta</span>
            </h1>
            <p className="ai-assistant-subtitle">
              Голосовое и текстовое наполнение сметы заказа материалами со склада и услугами монтажа
            </p>
          </div>
        </div>
      </div>

      {/* Main Form Card */}
      <div className="ai-assistant-card">
        {/* Order Selector */}
        <div className="ai-assistant-order-row">
          <FileSpreadsheet size={18} style={{ color: '#8b5cf6' }} />
          <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 500 }}>
            Целевой заказ:
          </span>
          <select
            className="ai-assistant-order-select"
            value={selectedOrderId || ''}
            onChange={(e) => setSelectedOrderId(e.target.value ? Number(e.target.value) : undefined)}
            disabled={loading}
          >
            <option value="">Автоопределение (из текста запроса или голоса)</option>
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.orderNumber || `Заказ #${o.id}`} — {o.clientName || 'Без клиента'} ({o.totalPrice || 0} ₽)
              </option>
            ))}
          </select>
          {loadingOrders && <Loader2 size={16} className="animate-spin" style={{ color: 'var(--text-secondary)' }} />}
        </div>

        {/* Input Mode Tabs */}
        <div className="ai-assistant-tabs">
          <button
            type="button"
            className={`ai-assistant-tab-btn ${activeTab === 'VOICE' ? 'active' : ''}`}
            onClick={() => setActiveTab('VOICE')}
            disabled={loading || isRecording}
          >
            <Mic size={16} />
            Голосовой ввод
          </button>
          <button
            type="button"
            className={`ai-assistant-tab-btn ${activeTab === 'TEXT' ? 'active' : ''}`}
            onClick={() => setActiveTab('TEXT')}
            disabled={loading || isRecording}
          >
            <Send size={16} />
            Текстовый запрос
          </button>
        </div>

        {/* Voice Mode */}
        {activeTab === 'VOICE' && (
          <div className="ai-assistant-voice-box">
            <button
              type="button"
              className={`ai-assistant-mic-btn ${isRecording ? 'recording' : ''}`}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={loading}
              title={isRecording ? 'Остановить запись' : 'Начать запись голоса'}
            >
              {isRecording ? <Square size={30} /> : <Mic size={32} />}
            </button>

            {isRecording ? (
              <div className="ai-assistant-rec-timer">
                <div className="ai-assistant-rec-dot" />
                <span>Запись: {formatSeconds(recordingTime)}</span>
              </div>
            ) : (
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Нажмите на микрофон и продиктуйте материалы или услуги для сметы
              </span>
            )}

            {recorderError && (
              <div style={{ color: '#ef4444', fontSize: '0.85rem' }}>
                {recorderError}
              </div>
            )}

            {audioBlob && !isRecording && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%', maxWidth: '380px' }}>
                {audioUrl && (
                  <audio controls src={audioUrl} style={{ width: '100%', height: '40px' }} />
                )}
                <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={resetRecording}
                    disabled={loading}
                    style={{ flex: 1 }}
                  >
                    <RotateCcw size={15} />
                    Сбросить
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSendVoice}
                    disabled={loading}
                    style={{ flex: 2, background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    Отправить ИИ
                  </button>
                </div>
              </div>
            )}

            {/* File Upload Option */}
            <div style={{ marginTop: '8px', borderTop: '1px solid var(--glass-border)', paddingTop: '14px', width: '100%', display: 'flex', justifyContent: 'center' }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading || isRecording}
                style={{ fontSize: '0.85rem' }}
              >
                <Upload size={15} />
                Загрузить аудиофайл с устройства
              </button>
            </div>
          </div>
        )}

        {/* Text Mode */}
        {activeTab === 'TEXT' && (
          <div className="ai-assistant-text-box">
            <textarea
              className="ai-assistant-textarea"
              placeholder="Введите запрос, например: Добавь в смету Анны Смирновой 2 обвода трубы 3 обвода углов и монтаж закладной под люстру"
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              disabled={loading}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  handleSendText();
                }
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Нажмите <strong>Ctrl+Enter</strong> для быстрой отправки
              </span>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSendText}
                disabled={loading || !promptText.trim()}
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Отправить в смету
              </button>
            </div>
          </div>
        )}

        {/* Example prompts */}
        <div className="ai-assistant-chips-box">
          <div className="ai-assistant-chips-title">
            <HelpCircle size={14} />
            Примеры запросов (нажмите для вставки):
          </div>
          <div className="ai-assistant-chips">
            {EXAMPLE_PROMPTS.map((ex, i) => (
              <button
                key={i}
                type="button"
                className="ai-assistant-chip"
                onClick={() => {
                  setPromptText(ex);
                  setActiveTab('TEXT');
                }}
              >
                «{ex}»
              </button>
            ))}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div style={{
            padding: '12px 16px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.9rem'
          }}>
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Results Card */}
      {result && (
        <div className="ai-assistant-result-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={20} style={{ color: '#10b981' }} />
              Результат разбора и обновления сметы
            </h3>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleReset}
              style={{ fontSize: '0.85rem' }}
            >
              <RotateCcw size={14} />
              Новый запрос
            </button>
          </div>

          {/* Recognized Order Banner */}
          {(result.orderId || result.orderNumber) && (
            <div className="ai-assistant-order-banner">
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  Заказ №{result.orderNumber || result.orderId}
                  {result.clientName && ` — ${result.clientName}`}
                </div>
                {result.addedTotalCost !== undefined && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Добавлено в смету на сумму: <strong>{result.addedTotalCost.toLocaleString('ru-RU')} ₽</strong>
                  </div>
                )}
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleOpenOrderDrawer(result.orderId)}
                style={{ fontSize: '0.85rem', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <ExternalLink size={14} />
                Перейти в карточку заказа
              </button>
            </div>
          )}

          {/* AI Response message */}
          {result.aiMessage && (
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
              {result.aiMessage}
            </div>
          )}

          {/* Added items */}
          {result.addedItems && result.addedItems.length > 0 && (
            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '0.95rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={16} />
                Добавлено в смету ({result.addedItems.length}):
              </h4>
              <div style={{ overflowX: 'auto' }}>
                <table className="ai-assistant-table">
                  <thead>
                    <tr>
                      <th>Категория</th>
                      <th>Наименование</th>
                      <th>Кол-во</th>
                      <th>Цена</th>
                      <th>Сумма</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.addedItems.map((item, idx) => {
                      const name = item.materialName || (item as any).name || 'Материал';
                      const lineCost = (item as any).totalCost ?? ((item.salePrice || 0) * (item.quantity || 0));
                      const isService = name.toLowerCase().includes('монтаж') || name.toLowerCase().includes('обвод');
                      return (
                        <tr key={idx}>
                          <td>
                            {isService ? (
                              <span className="ai-assistant-tag-service">Монтажные работы</span>
                            ) : (
                              <span className="ai-assistant-tag-material">Материалы</span>
                            )}
                          </td>
                          <td style={{ fontWeight: 500 }}>{name}</td>
                          <td>{item.quantity} {item.unit || 'шт'}</td>
                          <td>{item.salePrice ? `${item.salePrice} ₽` : '—'}</td>
                          <td style={{ fontWeight: 600, color: '#10b981' }}>
                            {lineCost ? `${lineCost} ₽` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Shortage items */}
          {result.shortageItems && result.shortageItems.length > 0 && (
            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '0.95rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={16} />
                Частичный дефицит на складе ({result.shortageItems.length}):
              </h4>
              <div style={{ overflowX: 'auto' }}>
                <table className="ai-assistant-table">
                  <thead>
                    <tr>
                      <th>Наименование</th>
                      <th>Запрошено</th>
                      <th>Доступно на складе</th>
                      <th>Не хватило</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.shortageItems.map((item, idx) => {
                      const name = item.materialName || (item as any).name || 'Позиция';
                      return (
                        <tr key={idx}>
                          <td style={{ fontWeight: 500 }}>{name}</td>
                          <td>{item.requestedQuantity} {item.unit || 'шт'}</td>
                          <td style={{ color: '#10b981' }}>{item.availableQuantity} {item.unit || 'шт'}</td>
                          <td style={{ color: '#ef4444', fontWeight: 600 }}>{item.shortageQuantity} {item.unit || 'шт'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Missing items */}
          {result.missingItems && result.missingItems.length > 0 && (
            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '0.95rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <XCircle size={16} />
                Не найдены в номенклатуре ({result.missingItems.length}):
              </h4>
              <div style={{ overflowX: 'auto' }}>
                <table className="ai-assistant-table">
                  <thead>
                    <tr>
                      <th>Запрошенная позиция</th>
                      <th>Кол-во</th>
                      <th>Причина</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.missingItems.map((item, idx) => {
                      const name = item.materialName || (item as any).name || 'Позиция';
                      return (
                        <tr key={idx}>
                          <td style={{ fontWeight: 500 }}>{name}</td>
                          <td>{item.requestedQuantity}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{item.reason}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
