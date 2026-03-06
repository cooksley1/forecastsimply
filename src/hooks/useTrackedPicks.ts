import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TrackedPick {
  id: string;
  month_start: string;
  asset_type: string;
  asset_id: string;
  symbol: string;
  name: string;
  entry_price: number;
  signal_score: number;
  signal_label: string;
  confidence: number;
  target_price: number | null;
  stop_loss: number | null;
  reasoning: string | null;
  forecast_ensemble: any[];
  forecast_linear: any[];
  forecast_holt: any[];
  forecast_ema_momentum: any[];
  forecast_monte_carlo: any[];
  status: string;
  final_price: number | null;
  final_return_pct: number | null;
  case_study_text: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface PickSnapshot {
  id: string;
  pick_id: string;
  snapshot_date: string;
  price: number;
  change_from_entry_pct: number;
  forecast_ensemble_price: number | null;
  forecast_linear_price: number | null;
  forecast_holt_price: number | null;
  forecast_ema_price: number | null;
  forecast_monte_carlo_price: number | null;
}

export function useActivePicks() {
  return useQuery({
    queryKey: ['tracked-picks', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tracked_picks')
        .select('*')
        .eq('status', 'active')
        .order('month_start', { ascending: false });
      if (error) throw error;
      return (data || []) as TrackedPick[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useAllPicks() {
  return useQuery({
    queryKey: ['tracked-picks', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tracked_picks')
        .select('*')
        .order('month_start', { ascending: false });
      if (error) throw error;
      return (data || []) as TrackedPick[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function usePickSnapshots(pickId: string | null) {
  return useQuery({
    queryKey: ['pick-snapshots', pickId],
    queryFn: async () => {
      if (!pickId) return [];
      const { data, error } = await supabase
        .from('pick_snapshots')
        .select('*')
        .eq('pick_id', pickId)
        .order('snapshot_date', { ascending: true });
      if (error) throw error;
      return (data || []) as PickSnapshot[];
    },
    enabled: !!pickId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAllSnapshots(pickIds: string[]) {
  return useQuery({
    queryKey: ['pick-snapshots', 'bulk', pickIds.join(',')],
    queryFn: async () => {
      if (!pickIds.length) return [];
      const { data, error } = await supabase
        .from('pick_snapshots')
        .select('*')
        .in('pick_id', pickIds)
        .order('snapshot_date', { ascending: true });
      if (error) throw error;
      return (data || []) as PickSnapshot[];
    },
    enabled: pickIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
