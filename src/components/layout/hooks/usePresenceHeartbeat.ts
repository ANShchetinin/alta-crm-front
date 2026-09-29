import { useEffect } from 'react';
import { sendHeartbeat } from '../../../api/presence';

const HEARTBEAT_INTERVAL_MS = 60000;

const pingIfVisible = () => {
  if (document.visibilityState === 'visible') {
    sendHeartbeat().catch(() => {});
  }
};

/** Отмечает пользователя «в сети», пока вкладка открыта и видима: сразу, раз в минуту и при возврате на вкладку. */
export const usePresenceHeartbeat = (token: string | null) => {
  useEffect(() => {
    if (!token) {
      return;
    }
    sendHeartbeat().catch(() => {});
    const interval = setInterval(pingIfVisible, HEARTBEAT_INTERVAL_MS);
    document.addEventListener('visibilitychange', pingIfVisible);
    window.addEventListener('focus', pingIfVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', pingIfVisible);
      window.removeEventListener('focus', pingIfVisible);
    };
  }, [token]);
};
