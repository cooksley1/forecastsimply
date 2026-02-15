import { usePushSubscription } from '@/hooks/usePushSubscription';
import { useAuth } from '@/contexts/AuthContext';

export default function PushNotificationToggle() {
  const { user } = useAuth();
  const { isSupported, isSubscribed, subscribe, unsubscribe } = usePushSubscription();

  if (!user || !isSupported) return null;

  return (
    <div className="flex items-center justify-between gap-2 p-2 rounded-lg border border-border bg-background">
      <div>
        <p className="text-xs font-medium text-foreground">🔔 Push Notifications</p>
        <p className="text-[9px] text-muted-foreground">
          {isSubscribed ? 'Enabled — you\'ll get alerts on this device' : 'Enable to receive price alerts'}
        </p>
      </div>
      <button
        onClick={isSubscribed ? unsubscribe : subscribe}
        className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold border transition-all ${
          isSubscribed
            ? 'border-positive/30 text-positive bg-positive/10 hover:bg-positive/20'
            : 'border-primary/30 text-primary bg-primary/10 hover:bg-primary/20'
        }`}
      >
        {isSubscribed ? 'Enabled ✓' : 'Enable'}
      </button>
    </div>
  );
}
