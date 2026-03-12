import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const EXPECTED_COMBOS = [
  { asset_type: 'stocks', timeframe_days: 30, label: 'Stocks 1M' },
  { asset_type: 'stocks', timeframe_days: 90, label: 'Stocks 3M' },
  { asset_type: 'stocks', timeframe_days: 180, label: 'Stocks 6M' },
  { asset_type: 'stocks', timeframe_days: 365, label: 'Stocks 1Y' },
  { asset_type: 'crypto', timeframe_days: 30, label: 'Crypto 1M' },
  { asset_type: 'crypto', timeframe_days: 90, label: 'Crypto 3M' },
  { asset_type: 'crypto', timeframe_days: 180, label: 'Crypto 6M' },
  { asset_type: 'crypto', timeframe_days: 365, label: 'Crypto 1Y' },
];

const STALE_THRESHOLD_HOURS = 24;

interface HealthResult {
  label: string;
  asset_type: string;
  timeframe_days: number;
  status: 'healthy' | 'stale' | 'empty';
  count: number;
  newest: string | null;
  age_hours: number | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const sb = createClient(supabaseUrl, serviceKey);

    // Fetch all cache rows (only need grouping columns)
    const { data: rows, error } = await sb
      .from('daily_analysis_cache')
      .select('asset_type, timeframe_days, analyzed_at');

    if (error) throw error;

    const now = Date.now();
    const results: HealthResult[] = [];
    const issues: string[] = [];

    for (const combo of EXPECTED_COMBOS) {
      const matching = (rows || []).filter(
        (r: any) => r.asset_type === combo.asset_type && r.timeframe_days === combo.timeframe_days
      );

      if (matching.length === 0) {
        results.push({
          ...combo,
          status: 'empty',
          count: 0,
          newest: null,
          age_hours: null,
        });
        issues.push(`❌ ${combo.label}: EMPTY — no cached data`);
        continue;
      }

      const newest = matching.reduce((a: any, b: any) =>
        new Date(a.analyzed_at) > new Date(b.analyzed_at) ? a : b
      );
      const ageHours = (now - new Date(newest.analyzed_at).getTime()) / 3.6e6;
      const isStale = ageHours > STALE_THRESHOLD_HOURS;

      results.push({
        ...combo,
        status: isStale ? 'stale' : 'healthy',
        count: matching.length,
        newest: newest.analyzed_at,
        age_hours: Math.round(ageHours * 10) / 10,
      });

      if (isStale) {
        issues.push(`⚠️ ${combo.label}: STALE — ${Math.round(ageHours)}h old (${matching.length} rows)`);
      }
    }

    // Store the health check result in app_config for the admin UI
    const healthReport = {
      checked_at: new Date().toISOString(),
      results,
      issues,
      healthy: issues.length === 0,
    };

    // Upsert into app_config
    const { data: existing } = await sb
      .from('app_config')
      .select('key')
      .eq('key', 'cache_health_report')
      .maybeSingle();

    if (existing) {
      await sb
        .from('app_config')
        .update({ value: healthReport as any, updated_at: new Date().toISOString() })
        .eq('key', 'cache_health_report');
    } else {
      await sb
        .from('app_config')
        .insert({ key: 'cache_health_report', value: healthReport as any, updated_at: new Date().toISOString() });
    }

    // If there are issues, store an alert flag for admin notification
    if (issues.length > 0) {
      const alertData = {
        has_issues: true,
        issue_count: issues.length,
        issues,
        checked_at: new Date().toISOString(),
      };

      const { data: alertExisting } = await sb
        .from('app_config')
        .select('key')
        .eq('key', 'cache_health_alert')
        .maybeSingle();

      if (alertExisting) {
        await sb
          .from('app_config')
          .update({ value: alertData as any, updated_at: new Date().toISOString() })
          .eq('key', 'cache_health_alert');
      } else {
        await sb
          .from('app_config')
          .insert({ key: 'cache_health_alert', value: alertData as any, updated_at: new Date().toISOString() });
      }
    } else {
      // Clear alert if everything is healthy
      await sb
        .from('app_config')
        .update({ value: { has_issues: false, checked_at: new Date().toISOString() } as any, updated_at: new Date().toISOString() })
        .eq('key', 'cache_health_alert');
    }

    return new Response(JSON.stringify(healthReport), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
