import { useState, useMemo } from 'react';
import { usePushSubscription } from '@/hooks/usePushSubscription';
import { useAuth } from '@/contexts/AuthContext';

function getBrowserName() {
  const ua = navigator.userAgent;
  if (/edg/i.test(ua)) return 'edge';
  if (/chrome|crios/i.test(ua)) return 'chrome';
  if (/firefox|fxios/i.test(ua)) return 'firefox';
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return 'safari';
  return 'other';
}

function BlockedInstructions() {
  const browser = useMemo(() => getBrowserName(), []);

  const steps: Record<string, { icon: string; name: string; steps: string[] }> = {
    chrome: {
      icon: '🌐',
      name: 'Chrome',
      steps: [
        'Click the 🔒 lock icon (or tune icon) in the address bar',
        'Find "Notifications" and change to "Allow"',
        'Reload the page',
      ],
    },
    edge: {
      icon: '🌐',
      name: 'Edge',
      steps: [
        'Click the 🔒 lock icon in the address bar',
        'Find "Notifications" and change to "Allow"',
        'Reload the page',
      ],
    },
    firefox: {
      icon: '🦊',
      name: 'Firefox',
      steps: [
        'Click the 🔒 lock icon in the address bar',
        'Click "Connection secure" → "More information"',
        'Go to Permissions → Notifications → Allow',
        'Reload the page',
      ],
    },
    safari: {
      icon: '🧭',
      name: 'Safari',
      steps: [
        'Go to Safari → Settings → Websites → Notifications',
        'Find this site and change to "Allow"',
        'Reload the page',
      ],
    },
    other: {
      icon: '⚙️',
      name: 'your browser',
      steps: [
        'Open browser settings → Site settings → Notifications',
        'Find this site and change to "Allow"',
        'Reload the page',
      ],
    },
  };

  const info = steps[browser] || steps.other;

  return (
    <div className="mt-1.5 p-2 rounded-md bg-destructive/5 border border-destructive/20 space-y-1">
      <p className="text-[10px] font-medium text-destructive">
        ⚠️ Notifications are blocked in {info.icon} {info.name}
      </p>
      <ol className="list-decimal list-inside space-y-0.5">
        {info.steps.map((s, i) => (
          <li key={i} className="text-[9px] text-muted-foreground leading-relaxed">{s}</li>
        ))}
      </ol>
    </div>
  );
}

export default function PushNotificationToggle() {
  const { user } = useAuth();
  const { isSupported, isSubscribed, subscribe, unsubscribe, vapidKey } = usePushSubscription();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showBlocked, setShowBlocked] = useState(false);

  if (!user) return null;

  if (!isSupported) {
    return (
      <div className="flex items-center gap-2 p-2 rounded-lg border border-border bg-background">
        <div>
          <p className="text-xs font-medium text-foreground">🔔 Push Notifications</p>
          <p className="text-[9px] text-muted-foreground">Not supported in this browser. Alerts will still be tracked in your account.</p>
        </div>
      </div>
    );
  }

  const isBlocked = typeof Notification !== 'undefined' && Notification.permission === 'denied';

  const handleToggle = async () => {
    if (isBlocked) {
      setShowBlocked(prev => !prev);
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (isSubscribed) {
        await unsubscribe();
      } else {
        const success = await subscribe();
        if (!success) {
          if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
            setShowBlocked(true);
          } else if (!vapidKey) {
            setError('Push service not ready. Try again in a moment.');
          } else {
            setError('Could not enable. Check browser notification permissions.');
          }
        }
      }
    } catch (e: any) {
      setError(e.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-2.5 rounded-lg border border-border bg-background/50 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-foreground">🔔 Push Notifications</p>
          <p className="text-[9px] text-muted-foreground">
            {isBlocked
              ? 'Blocked — tap for instructions to enable'
              : isSubscribed
                ? 'Enabled — you\'ll get alerts on this device'
                : 'Enable to receive price alerts on this device'}
          </p>
        </div>
        <button
          onClick={handleToggle}
          disabled={loading}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold border transition-all disabled:opacity-50 ${
            isBlocked
              ? 'border-destructive/30 text-destructive bg-destructive/10 hover:bg-destructive/20'
              : isSubscribed
                ? 'border-positive/30 text-positive bg-positive/10 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30'
                : 'border-primary/30 text-primary bg-primary/10 hover:bg-primary/20'
          }`}
        >
          {loading ? '...' : isBlocked ? 'Blocked 🚫' : isSubscribed ? 'Enabled ✓' : 'Enable'}
        </button>
      </div>
      {error && <p className="text-[9px] text-destructive">{error}</p>}
      {(showBlocked || isBlocked) && <BlockedInstructions />}
      {isSubscribed && (
        <p className="text-[9px] text-muted-foreground/60">Tip: Install as PWA for reliable notifications on mobile.</p>
      )}
    </div>
  );
}
