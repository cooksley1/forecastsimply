import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type ActivityEvent =
  | 'page_view'
  | 'analysis_run'
  | 'analysis_view'
  | 'watchlist_add'
  | 'watchlist_remove'
  | 'portfolio_add'
  | 'portfolio_remove'
  | 'portfolio_import_csv'
  | 'portfolio_import_image'
  | 'alert_create'
  | 'alert_trigger'
  | 'forecast_view'
  | 'report_download'
  | 'share_analysis'
  | 'search'
  | 'screener_use'
  | 'best_pick_view'
  | 'backtest_run'
  | 'theme_change'
  | 'preference_update'
  | 'newsletter_subscribe'
  | 'newsletter_unsubscribe'
  | 'login'
  | 'signup'
  | 'feature_use';

interface TrackOptions {
  asset_id?: string;
  asset_type?: string;
  page?: string;
  data?: Record<string, unknown>;
}

export function useActivityTracker() {
  const { user } = useAuth();

  const track = useCallback(
    (event: ActivityEvent, opts?: TrackOptions) => {
      if (!user) return; // Only track authenticated users

      // Fire-and-forget — don't block UI
      supabase
        .from('user_activity')
        .insert({
          user_id: user.id,
          event_type: event,
          event_data: opts?.data || {},
          asset_id: opts?.asset_id || null,
          asset_type: opts?.asset_type || null,
          page: opts?.page || window.location.pathname,
        } as any)
        .then(({ error }) => {
          if (error) console.warn('[Activity] Track failed:', error.message);
        });
    },
    [user]
  );

  return { track };
}
