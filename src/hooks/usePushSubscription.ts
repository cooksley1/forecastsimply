import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const VAPID_PUBLIC_KEY = 'PLACEHOLDER'; // Will be fetched from edge function

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export function usePushSubscription() {
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [vapidKey, setVapidKey] = useState<string | null>(null);

  useEffect(() => {
    setIsSupported('serviceWorker' in navigator && 'PushManager' in window);
  }, []);

  // Fetch VAPID public key from edge function
  useEffect(() => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return;

    fetch(`${url}/functions/v1/get-vapid-key`, { headers: { apikey: key } })
      .then(r => r.json())
      .then(d => { if (d.key) setVapidKey(d.key); })
      .catch(() => {});
  }, []);

  // Check existing subscription
  useEffect(() => {
    if (!isSupported || !user) return;
    navigator.serviceWorker.ready.then((reg: any) => {
      reg.pushManager?.getSubscription().then((sub: any) => {
        setIsSubscribed(!!sub);
      });
    });
  }, [isSupported, user]);

  const subscribe = useCallback(async () => {
    if (!isSupported || !user || !vapidKey) return false;
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return false;

      const reg: any = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
      }

      const subJson = sub.toJSON();
      await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint: sub.endpoint,
        p256dh: subJson.keys?.p256dh || '',
        auth: subJson.keys?.auth || '',
      }, { onConflict: 'user_id,endpoint' });

      setIsSubscribed(true);
      return true;
    } catch (e) {
      console.error('Push subscribe failed:', e);
      return false;
    }
  }, [isSupported, user, vapidKey]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported || !user) return;
    try {
      const reg: any = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager?.getSubscription();
      if (sub) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        await sub.unsubscribe();
      }
      setIsSubscribed(false);
    } catch (e) {
      console.error('Push unsubscribe failed:', e);
    }
  }, [isSupported, user]);

  return { isSupported, isSubscribed, subscribe, unsubscribe, vapidKey };
}
