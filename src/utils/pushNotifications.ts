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

/**
 * Checks if Service Worker and Push Notifications are supported by the browser
 */
export function isPushNotificationSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Returns the current notification permission state
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isPushNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Subscribes the current device/browser to Web Push notifications
 */
export async function enablePushNotifications(): Promise<{ success: boolean; message: string }> {
  if (!isPushNotificationSupported()) {
    return { success: false, message: 'Push-уведомления не поддерживаются вашим браузером' };
  }

  try {
    // 1. Request user permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, message: 'Разрешение на отправку уведомлений не предоставлено' };
    }

    // 2. Fetch VAPID public key from backend
    const { publicKey } = await getVapidPublicKey();
    if (!publicKey) {
      return { success: false, message: 'Публичный VAPID-ключ не получен с сервера' };
    }

    // 3. Wait for service worker ready
    const registration = await navigator.serviceWorker.ready;

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
  if (!isPushNotificationSupported()) {
    return { success: false, message: 'Push-уведомления не поддерживаются' };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await unsubscribeFromPush(subscription.endpoint);
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
