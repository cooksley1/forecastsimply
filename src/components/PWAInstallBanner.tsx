import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Check if already dismissed this session
    if (sessionStorage.getItem('pwa-banner-dismissed')) {
      setDismissed(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const installedHandler = () => setInstalled(true);

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);

    // Check if already running as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstalled(true);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    sessionStorage.setItem('pwa-banner-dismissed', '1');
  }, []);

  // Don't show if: no prompt available, already dismissed, already installed, or on desktop
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  // For iOS (no beforeinstallprompt), show manual instructions
  if (isIOS && !installed && !dismissed) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-[60] px-3 pb-3 animate-in slide-in-from-bottom duration-300">
        <div className="max-w-lg mx-auto bg-card border border-border rounded-xl shadow-2xl p-4 flex items-start gap-3">
          <span className="text-2xl shrink-0">📲</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Install ForecastSimply</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Tap <span className="inline-flex items-center"><svg className="w-3.5 h-3.5 inline text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg></span> then <strong>"Add to Home Screen"</strong>
            </p>
          </div>
          <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground text-lg leading-none shrink-0">&times;</button>
        </div>
      </div>
    );
  }

  if (!deferredPrompt || dismissed || installed || !isMobile) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] px-3 pb-3 animate-in slide-in-from-bottom duration-300">
      <div className="max-w-lg mx-auto bg-card border border-border rounded-xl shadow-2xl p-4 flex items-center gap-3">
        <span className="text-2xl shrink-0">📲</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Install ForecastSimply</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Add to your home screen for quick access & offline use</p>
        </div>
        <button onClick={handleInstall} className="shrink-0 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity">
          Install
        </button>
        <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground text-lg leading-none shrink-0">&times;</button>
      </div>
    </div>
  );
}
