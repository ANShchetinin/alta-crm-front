import { useState, useEffect } from 'react';
import { Bell, BellOff, CheckCircle2, AlertTriangle, Send, RefreshCw } from 'lucide-react';
import {
  isPushNotificationSupported,
  getNotificationPermission,
  enablePushNotifications,
  disablePushNotifications,
  testPushNotification
} from '../utils/pushNotifications';
import { getPushStatus } from '../api/notifications';

export const PushNotificationSettings = () => {
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const checkStatus = async () => {
    const isSupp = isPushNotificationSupported();
    setSupported(isSupp);
    if (!isSupp) {
      setPermission('unsupported');
      return;
    }
    const perm = getNotificationPermission();
    setPermission(perm);

    try {
      const status = await getPushStatus();
      setIsSubscribed(status.isSubscribed && perm === 'granted');
    } catch (e) {
      console.error('Failed to get push status', e);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleToggle = async () => {
    setLoading(true);
    setMessage(null);
    try {
      if (isSubscribed) {
        const res = await disablePushNotifications();
        if (res.success) {
          setIsSubscribed(false);
          setMessage({ text: res.message, type: 'success' });
        } else {
          setMessage({ text: res.message, type: 'error' });
        }
      } else {
        const res = await enablePushNotifications();
        if (res.success) {
          setIsSubscribed(true);
          setPermission('granted');
          setMessage({ text: res.message, type: 'success' });
        } else {
          setMessage({ text: res.message, type: 'error' });
        }
      }
    } finally {
      setLoading(false);
      checkStatus();
    }
  };

  const handleTest = async () => {
    setTestSending(true);
    setMessage(null);
    try {
      const res = await testPushNotification();
      if (res.success) {
        setMessage({ text: 'Тестовое уведомление успешно отправлено на ваше устройство!', type: 'success' });
      } else {
        setMessage({ text: res.message, type: 'error' });
      }
    } finally {
      setTestSending(false);
    }
  };

  if (!supported) {
    return (
      <div style={{
        padding: '14px 16px',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-md)',
        fontSize: '0.88rem',
        color: 'var(--text-secondary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <AlertTriangle size={16} style={{ color: '#f59e0b' }} />
          <strong>Push-уведомления не поддерживаются</strong>
        </div>
        Ваш текущий браузер не поддерживает Web Push API. Рекомендуется использовать Chrome, Edge, Safari (iOS 16.4+) или установить CRM как PWA приложение на телефон.
      </div>
    );
  }

  return (
    <div style={{
      padding: '16px',
      background: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid var(--glass-border)',
      borderRadius: 'var(--radius-md)',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: isSubscribed ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.06)',
            color: isSubscribed ? '#4ade80' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {isSubscribed ? <Bell size={18} /> : <BellOff size={18} />}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
              Push-уведомления на этом устройстве
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {isSubscribed 
                ? 'Уведомления активны (о новых заказах, заявках с сайта и монтажах)'
                : permission === 'denied'
                  ? 'Уведомления заблокированы в настройках браузера'
                  : 'Получайте уведомления о назначенных заказах и заявках с сайта'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {isSubscribed && (
            <button
              type="button"
              onClick={handleTest}
              disabled={testSending || loading}
              className="btn btn-ghost"
              style={{
                fontSize: '0.82rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                border: '1px solid var(--glass-border)'
              }}
              title="Отправить тестовый пуш на это устройство"
            >
              {testSending ? <RefreshCw size={14} className="spin" /> : <Send size={14} />}
              {testSending ? 'Отправка...' : 'Тестовый пуш'}
            </button>
          )}

          <button
            type="button"
            onClick={handleToggle}
            disabled={loading || permission === 'denied'}
            className={isSubscribed ? "btn btn-ghost" : "btn btn-primary"}
            style={{
              fontSize: '0.85rem',
              fontWeight: 600,
              padding: '6px 14px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {loading && <RefreshCw size={14} className="spin" />}
            {isSubscribed ? 'Отключить' : 'Включить пуши'}
          </button>
        </div>
      </div>

      {permission === 'denied' && (
        <div style={{ fontSize: '0.8rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <AlertTriangle size={14} /> Для включения уведомлений разрешите их в настройках браузера (иконка замочка слева от адресной строки).
        </div>
      )}

      {message && (
        <div style={{
          fontSize: '0.82rem',
          padding: '8px 12px',
          borderRadius: 'var(--radius-sm)',
          background: message.type === 'success' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
          color: message.type === 'success' ? '#4ade80' : '#f87171',
          border: `1px solid ${message.type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          {message.type === 'success' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
          {message.text}
        </div>
      )}
    </div>
  );
};
