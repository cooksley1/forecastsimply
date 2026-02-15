import { useState } from 'react';
import { usePushSubscription } from '@/hooks/usePushSubscription';
import { useAuth } from '@/contexts/AuthContext';

export default function PushNotificationToggle() {
  const { user } = useAuth();
  const { isSupported, isSubscribed, subscribe, unsubscribe, vapidKey } = usePushSubscription();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!user) return null;

  // Show unsupported message if browser doesn't support push
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

  const handleToggle = async () => {
    setLoading(true);
    setError('');
    try {
      if (isSubscribed) {
        await unsubscribe();
      } else {
        const success = await subscribe();
        if (!success) {
          // Check if notifications were denied
          if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
            setError('Notifications blocked. Please allow them in your browser settings.');
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
            {isSubscribed ? 'Enabled — you\'ll get alerts on this device' : 'Enable to receive price alerts on this device'}
          </p>
        </div>
        <button
          onClick={handleToggle}
          disabled={loading}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold border transition-all disabled:opacity-50 ${
            isSubscribed
              ? 'border-positive/30 text-positive bg-positive/10 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30'
              : 'border-primary/30 text-primary bg-primary/10 hover:bg-primary/20'
          }`}
        >
          {loading ? '...' : isSubscribed ? 'Enabled ✓' : 'Enable'}
        </button>
      </div>
      {error && <p className="text-[9px] text-destructive">{error}</p>}
      {isSubscribed && (
        <p className="text-[9px] text-muted-foreground/60">Tip: Install as PWA for reliable notifications on mobile.</p>
      )}
    </div>
  );
}
