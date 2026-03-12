import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';

const APP_URL = 'https://forecastsimply.lovable.app';

export interface SharePayload {
  asset_id: string;
  symbol: string;
  name: string;
  asset_type: string;
  price: number;
  signal_score?: number | null;
  signal_label?: string | null;
  confidence?: number | null;
  market_phase?: string | null;
  forecast_return_pct?: number | null;
  target_price?: number | null;
  stop_loss?: number | null;
  analysis_summary?: string | null;
}

export function useShareAnalysis() {
  const [sharing, setSharing] = useState(false);
  const shareIdCache = useRef<Record<string, string>>({});

  const createShareLink = useCallback(async (payload: SharePayload): Promise<string | null> => {
    const cacheKey = `${payload.asset_id}-${payload.signal_label}-${Math.round(payload.price * 100)}`;
    if (shareIdCache.current[cacheKey]) {
      return `${APP_URL}/share/${shareIdCache.current[cacheKey]}`;
    }

    setSharing(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('shared_analyses')
        .insert({
          ...payload,
          shared_by: user?.user?.id || null,
        })
        .select('id')
        .single();
      if (error) throw error;
      const id = (data as any).id;
      shareIdCache.current[cacheKey] = id;
      return `${APP_URL}/share/${id}`;
    } catch (err) {
      console.error('[Share] Failed to create link:', err);
      toast.error('Failed to create share link');
      return null;
    } finally {
      setSharing(false);
    }
  }, []);

  const copyShareLink = useCallback(async (payload: SharePayload) => {
    const url = await createShareLink(payload);
    if (!url) return;
    const text = buildShareText(payload, url);
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard!');
    } catch {
      toast.error('Failed to copy');
    }
  }, [createShareLink]);

  const shareWhatsApp = useCallback(async (payload: SharePayload) => {
    const url = await createShareLink(payload);
    if (!url) return;
    const text = buildShareText(payload, url);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }, [createShareLink]);

  const shareX = useCallback(async (payload: SharePayload) => {
    const url = await createShareLink(payload);
    if (!url) return;
    const text = buildShareText(payload);
    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  }, [createShareLink]);

  const shareReddit = useCallback(async (payload: SharePayload) => {
    const url = await createShareLink(payload);
    if (!url) return;
    const text = buildShareText(payload);
    window.open(`https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`, '_blank');
  }, [createShareLink]);

  const downloadSnapshot = useCallback(async (elementRef: HTMLElement | null, filename: string) => {
    if (!elementRef) { toast.error('Nothing to capture'); return; }
    try {
      const canvas = await html2canvas(elementRef, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Snapshot downloaded!');
    } catch {
      toast.error('Failed to capture snapshot');
    }
  }, []);

  return { sharing, createShareLink, copyShareLink, shareWhatsApp, shareX, shareReddit, downloadSnapshot };
}

function buildShareText(payload: SharePayload, url?: string): string {
  const parts = [`📊 ${payload.name} (${payload.symbol})`];
  if (payload.signal_label) parts.push(`Signal: ${payload.signal_label}`);
  if (payload.confidence) parts.push(`Confidence: ${payload.confidence}%`);
  if (payload.forecast_return_pct != null) parts.push(`Forecast: ${payload.forecast_return_pct >= 0 ? '+' : ''}${payload.forecast_return_pct.toFixed(1)}%`);
  parts.push('Analysed on ForecastSimply');
  if (url) parts.push(url);
  return parts.join(' | ');
}
