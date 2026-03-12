import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CachedAnalysis {
  asset_id: string;
  symbol: string;
  name: string;
  asset_type: string;
  exchange: string | null;
  price: number;
  change_pct: number;
  dividend_yield: number;
  signal_score: number;
  signal_label: string;
  confidence: number;
  market_phase: string | null;
  target_price: number | null;
  stop_loss: number | null;
  forecast_return_pct: number;
  rsi: number | null;
  analyzed_at: string;
  timeframe_days: number;
}

interface UseDailyAnalysisOptions {
  assetType: 'stocks' | 'crypto' | 'etfs';
  exchange?: string;
  timeframeDays?: number;
  enabled?: boolean;
}

export function useDailyAnalysis({ assetType, exchange, timeframeDays = 90, enabled = true }: UseDailyAnalysisOptions) {
  const [data, setData] = useState<CachedAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyzedAt, setAnalyzedAt] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('daily_analysis_cache')
        .select('*')
        .eq('asset_type', assetType)
        .eq('timeframe_days', timeframeDays)
        .order('signal_score', { ascending: false });

      if (exchange && assetType === 'stocks') {
        query = query.eq('exchange', exchange);
      }

      // Fetch in pages of 1000 (Supabase default limit)
      const allResults: any[] = [];
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const from = page * 1000;
        const to = from + 999;
        const { data: pageData, error: pageError } = await query.range(from, to);

        if (pageError) throw pageError;
        if (!pageData || pageData.length === 0) {
          hasMore = false;
        } else {
          allResults.push(...pageData);
          if (pageData.length < 1000) hasMore = false;
          page++;
        }
      }

      setData(allResults as CachedAnalysis[]);

      // Find most recent analyzed_at
      if (allResults.length > 0) {
        const latest = allResults.reduce((a, b) =>
          new Date(a.analyzed_at) > new Date(b.analyzed_at) ? a : b
        );
        setAnalyzedAt(latest.analyzed_at);
      }
    } catch (e: any) {
      console.warn('[useDailyAnalysis]', e.message);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [assetType, exchange, timeframeDays, enabled]);

  useEffect(() => {
    fetch_();
  }, [fetch_]);

  return { data, loading, error, analyzedAt, refetch: fetch_ };
}

/**
 * Get cached analysis for a specific asset.
 * Returns null if not found.
 */
export async function getCachedAnalysis(
  assetId: string,
  timeframeDays = 90,
): Promise<CachedAnalysis | null> {
  try {
    const { data, error } = await supabase
      .from('daily_analysis_cache')
      .select('*')
      .eq('asset_id', assetId)
      .eq('timeframe_days', timeframeDays)
      .single();

    if (error || !data) return null;
    return data as CachedAnalysis;
  } catch {
    return null;
  }
}
