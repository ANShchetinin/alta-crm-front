import { useState, useEffect } from 'react';
import { Bell, BellOff, CheckCircle2, AlertTriangle, Send, RefreshCw, Smartphone, ShieldAlert } from 'lucide-react';
import {
  checkPushSupport,
  getNotificationPermission,
  isCurrentDeviceSubscribed,
  enablePushNotifications,
  disablePushNotifications,
  testPushNotification,
  type PushSupportInfo
} from '../utils/pushNotifications';
import { getPushStatus } from '../api/notifications';

export const PushNotificationSettings = () => {
  const [supportInfo, setSupportInfo] = useState<PushSupportInfo>(() => checkPushSupport());
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const checkStatus = async () => {
    const info = checkPushSupport();
    setSupportInfo(info);

    if (!info.supported) {
      setPermission('unsupported');
      return;
    }

    const perm = getNotificationPermission();
    setPermission(perm);

    try {
      const deviceSubscribed = await isCurrentDeviceSubscribed();
      const status = await getPushStatus();
      
      const active = deviceSubscribed || (status.isSubscribed && perm !== 'denied');
      setIsSubscribed(active);
      if (active && perm === 'default') {
        setPermission('granted');
      }
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

  if (!supportInfo.supported) {
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
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          {!supportInfo.isSecureContext ? (
            <ShieldAlert size={20} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
          ) : (
            <AlertTriangle size={20} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
          )}
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
              Push-уведомления недоступны на этом устройстве
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {supportInfo.reason}
            </div>
          </div>
        </div>

        {supportInfo.isIos && !supportInfo.isStandalone && (
          <div style={{
            fontSize: '0.82rem',
            padding: '10px 14px',
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Smartphone size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
            <span>
              <strong>Как включить на iPhone/iPad:</strong> в Safari нажмите <strong>«Поделиться»</strong> (квадрат со стрелкой) → <strong>«На экран “Домой”»</strong>, затем откройте CRM с экрана телефона.
            </span>
          </div>
        )}

        {!supportInfo.isSecureContext && (
          <div style={{
            fontSize: '0.82rem',
            padding: '10px 14px',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            lineHeight: 1.4
          }}>
            🔒 <strong>Почему это происходит:</strong> Веб-стандарт Push API работает исключительно через защищенный протокол <strong>HTTPS</strong>. На ПК через <code>localhost</code> браузер разрешает пуши, но при открытии по IP/HTTP на телефоне мобильный Chrome и Safari их блокируют.
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
          <button
            type="button"
            onClick={checkStatus}
            className="btn btn-ghost"
            style={{ fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} /> Проверить снова
          </button>
        </div>
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
