import { getVapidPublicKey, subscribeToPush, unsubscribeFromPush, sendTestPush } from '../api/notifications';

/**
 * Converts a base64 URL-safe string to a Uint8Array for VAPID applicationServerKey
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export interface PushSupportInfo {
  supported: boolean;
  isSecureContext: boolean;
  hasServiceWorker: boolean;
  hasNotification: boolean;
  hasPushManager: boolean;
  isIos: boolean;
  isStandalone: boolean;
  reason?: string;
}

/**
 * Detailed diagnostics of push notification support on the current device
 */
export function checkPushSupport(): PushSupportInfo {
  if (typeof window === 'undefined') {
    return {
      supported: false,
      isSecureContext: false,
      hasServiceWorker: false,
      hasNotification: false,
      hasPushManager: false,
      isIos: false,
      isStandalone: false,
      reason: 'Окружение не поддерживает браузерные API'
    };
  }

  const isSecure = window.isSecureContext === true;
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
  const hasSW = 'serviceWorker' in navigator;
  const hasNotif = 'Notification' in window;
  const hasPM = 'PushManager' in window || (hasSW && 'ServiceWorkerRegistration' in window && 'pushManager' in ServiceWorkerRegistration.prototype);

  let reason = '';
  if (!isSecure) {
    reason = 'Push-уведомления требуют защищенного протокола HTTPS (или localhost). При открытии сайта по обычному HTTP (например, по IP-адресу в локальной сети) мобильные браузеры Android и iOS отключают Service Worker и Push API из соображений безопасности.';
  } else if (isIos && !isStandalone) {
    reason = 'На iPhone / iPad (iOS 16.4+) браузер Safari поддерживает Push-уведомления только после добавления сайта на экран «Домой» как PWA-приложения.';
  } else if (!hasSW) {
    reason = 'Service Worker не поддерживается данным браузером.';
  } else if (!hasNotif && !hasPM) {
    reason = 'Push-уведомления не поддерживаются этой версией браузера.';
  }

  const supported = isSecure && hasSW && (hasNotif || hasPM || isIos);

  return {
    supported,
    isSecureContext: isSecure,
    hasServiceWorker: hasSW,
    hasNotification: hasNotif,
    hasPushManager: hasPM,
    isIos,
    isStandalone,
    reason: supported ? undefined : reason
  };
}

/**
 * Checks if Service Worker and Push Notifications are supported by the browser
 */
export function isPushNotificationSupported(): boolean {
  return checkPushSupport().supported;
}

/**
 * Returns the current notification permission state
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined') return 'unsupported';
  if ('Notification' in window && Notification.permission) {
    return Notification.permission;
  }
  return isPushNotificationSupported() ? 'default' : 'unsupported';
}

/**
 * Checks if the current browser/device has an active PushSubscription in PushManager
 */
export async function isCurrentDeviceSubscribed(): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return false;
    }
    const registration = await navigator.serviceWorker.ready;
    if (!registration || !registration.pushManager) {
      return false;
    }
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch (e) {
    console.warn('Error checking device push subscription:', e);
    return false;
  }
}

/**
 * Subscribes the current device/browser to Web Push notifications
 */
export async function enablePushNotifications(): Promise<{ success: boolean; message: string }> {
  const support = checkPushSupport();
  if (!support.supported) {
    return { 
      success: false, 
      message: support.reason || 'Push-уведомления не поддерживаются вашим браузером' 
    };
  }

  try {
    // 1. Request user permission
    let permission: NotificationPermission = 'default';
    if ('Notification' in window && typeof Notification.requestPermission === 'function') {
      permission = await Notification.requestPermission();
    }

    if (permission !== 'granted' && permission !== 'default') {
      return { 
        success: false, 
        message: 'Уведомления заблокированы в настройках устройства/браузера. Разрешите их в настройках сайта.'
      };
    }

    // 2. Fetch VAPID public key from backend
    const { publicKey } = await getVapidPublicKey();
    if (!publicKey) {
      return { success: false, message: 'Публичный VAPID-ключ не получен с сервера' };
    }

    // 3. Wait for service worker ready
    let registration: ServiceWorkerRegistration;
    if (navigator.serviceWorker.ready) {
      registration = await navigator.serviceWorker.ready;
    } else {
      registration = await navigator.serviceWorker.register('/sw.js');
    }

    if (!registration.pushManager) {
      return { success: false, message: 'PushManager недоступен в Service Worker на этом устройстве' };
    }

    // 4. Subscribe via PushManager
    const applicationServerKey = urlBase64ToUint8Array(publicKey);
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as any
      });
    }

    // 5. Send subscription to backend
    const subscriptionJson = subscription.toJSON();
    if (!subscriptionJson.endpoint || !subscriptionJson.keys?.p256dh || !subscriptionJson.keys?.auth) {
      return { success: false, message: 'Не удалось сгенерировать ключи подписки устройства' };
    }

    await subscribeToPush({
      endpoint: subscriptionJson.endpoint,
      keys: {
        p256dh: subscriptionJson.keys.p256dh,
        auth: subscriptionJson.keys.auth
      },
      userAgent: navigator.userAgent
    });

    return { success: true, message: 'Push-уведомления успешно подключены на этом устройстве' };
  } catch (error: any) {
    console.error('Failed to enable push notifications:', error);
    return {
      success: false,
      message: error.message || 'Ошибка при подключении push-уведомлений'
    };
  }
}

/**
 * Unsubscribes the current device/browser from Web Push notifications
 */
export async function disablePushNotifications(): Promise<{ success: boolean; message: string }> {
  try {
    if (!('serviceWorker' in navigator)) {
      return { success: false, message: 'Service Worker не поддерживается' };
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      try {
        await unsubscribeFromPush(subscription.endpoint);
      } catch (e) {
        console.warn('Failed to delete subscription on server:', e);
      }
      await subscription.unsubscribe();
    }

    return { success: true, message: 'Push-уведомления успешно отключены' };
  } catch (error: any) {
    console.error('Failed to disable push notifications:', error);
    return {
      success: false,
      message: error.message || 'Ошибка при отключении push-уведомлений'
    };
  }
}

/**
 * Sends a test push notification to verify setup
 */
export async function testPushNotification(): Promise<{ success: boolean; message: string }> {
  try {
    await sendTestPush();
    return { success: true, message: 'Тестовое уведомление отправлено' };
  } catch (error: any) {
    console.error('Failed to send test push:', error);
    return {
      success: false,
      message: error.response?.data?.message || error.message || 'Не удалось отправить тестовый пуш'
    };
  }
}
