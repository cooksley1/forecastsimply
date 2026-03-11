import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

export default function UpdatePrompt() {
  const [showUpdate, setShowUpdate] = useState(false);

  useEffect(() => {
    // Force any waiting service worker to activate immediately
    const activateWaiting = (reg: ServiceWorkerRegistration) => {
      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        setShowUpdate(true);
      });

      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg?.waiting) {
          activateWaiting(reg);
          setShowUpdate(true);
        }
        // Force update check on every page load / visibility change
        reg?.update().catch(() => {});
        reg?.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              activateWaiting(reg);
              setShowUpdate(true);
            }
          });
        });
      });

      // Re-check for updates when PWA comes back to foreground
      const onVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          navigator.serviceWorker.getRegistration().then(reg => {
            reg?.update().catch(() => {});
          });
        }
      };
      document.addEventListener('visibilitychange', onVisibilityChange);

      return () => document.removeEventListener('visibilitychange', onVisibilityChange);
    }

    // Periodic version check (every 2 minutes) for all users
    const checkVersion = async () => {
      try {
        const res = await fetch('/?_v=' + Date.now(), { method: 'HEAD', cache: 'no-store' });
        const etag = res.headers.get('etag') || res.headers.get('last-modified');
        if (etag) {
          const stored = sessionStorage.getItem('app-version');
          if (stored && stored !== etag) {
            setShowUpdate(true);
          }
          sessionStorage.setItem('app-version', etag);
        }
      } catch { /* ignore */ }
    };

    const interval = setInterval(checkVersion, 2 * 60 * 1000);
    checkVersion();
    return () => clearInterval(interval);
  }, []);

  if (!showUpdate) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-2 fade-in duration-300">
      <button
        onClick={() => window.location.reload()}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all text-sm font-medium"
      >
        <RefreshCw className="w-4 h-4" />
        Update available — tap here to reload
      </button>
    </div>
  );
}
