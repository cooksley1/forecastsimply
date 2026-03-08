import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

export default function UpdatePrompt() {
  const [showUpdate, setShowUpdate] = useState(false);

  useEffect(() => {
    // Listen for service worker updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        setShowUpdate(true);
      });

      // Also check for waiting service workers on load
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg?.waiting) {
          setShowUpdate(true);
        }
        reg?.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setShowUpdate(true);
            }
          });
        });
      });
    }

    // Periodic version check (every 5 minutes) for non-PWA users
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

    const interval = setInterval(checkVersion, 5 * 60 * 1000);
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
        <RefreshCw className="w-4 h-4 animate-spin" />
        New version available — tap to refresh
      </button>
    </div>
  );
}
