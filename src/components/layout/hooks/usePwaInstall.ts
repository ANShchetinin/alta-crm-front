import { useCallback, useEffect, useState } from 'react';
import { toast } from '../../../utils/toast';

/** Событие браузера `beforeinstallprompt` (Chrome, Edge, Android): его нет в стандартных типах DOM. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const STANDALONE_QUERY = '(display-mode: standalone)';

const isRunningStandalone = () =>
  window.matchMedia(STANDALONE_QUERY).matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

/** iPhone / iPad; iPadOS 13+ представляется как Mac, но в отличие от него сенсорный. */
export const isIosDevice = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);

/**
 * Установка приложения (PWA): запущено ли оно уже как приложение, системный диалог установки,
 * а на iOS, где такого диалога нет, — инструкция.
 */
export const usePwaInstall = () => {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    const checkStandalone = () => setIsStandalone(isRunningStandalone());
    checkStandalone();
    const standaloneQuery = window.matchMedia(STANDALONE_QUERY);
    standaloneQuery.addEventListener('change', checkStandalone);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      standaloneQuery.removeEventListener('change', checkStandalone);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const install = useCallback(async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstallPrompt(null);
      }
      return;
    }
    if (isIosDevice()) {
      setShowIosGuide(true);
    } else {
      toast.info('Для установки приложения нажмите кнопку меню браузера (⋮) и выберите «Установить приложение» или «Добавить на главный экран».');
    }
  }, [installPrompt]);

  const closeIosGuide = useCallback(() => setShowIosGuide(false), []);

  return { isStandalone, install, showIosGuide, closeIosGuide };
};
