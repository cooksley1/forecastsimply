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
  { asset_type: 'etfs', timeframe_days: 30, label: 'ETFs 1M' },
  { asset_type: 'etfs', timeframe_days: 90, label: 'ETFs 3M' },
  { asset_type: 'etfs', timeframe_days: 180, label: 'ETFs 6M' },
  { asset_type: 'etfs', timeframe_days: 365, label: 'ETFs 1Y' },
  { asset_type: 'forex', timeframe_days: 30, label: 'Forex 1M' },
  { asset_type: 'forex', timeframe_days: 90, label: 'Forex 3M' },
  { asset_type: 'forex', timeframe_days: 180, label: 'Forex 6M' },
  { asset_type: 'forex', timeframe_days: 365, label: 'Forex 1Y' },
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

    // Use server-side aggregate to avoid 1000-row limit
    const { data: statsRows, error } = await sb.rpc('get_cache_stats');
    if (error) throw error;

    const now = Date.now();
    const results: HealthResult[] = [];
    const issues: string[] = [];

    for (const combo of EXPECTED_COMBOS) {
      const match = (statsRows || []).find(
        (r: any) => r.asset_type === combo.asset_type && r.timeframe_days === combo.timeframe_days
      );

      if (!match || Number(match.count) === 0) {
        results.push({ ...combo, status: 'empty', count: 0, newest: null, age_hours: null });
        issues.push(`❌ ${combo.label}: EMPTY — no cached data`);
        continue;
      }

      const ageHours = (now - new Date(match.newest).getTime()) / 3.6e6;
      const isStale = ageHours > STALE_THRESHOLD_HOURS;

      results.push({
        ...combo,
        status: isStale ? 'stale' : 'healthy',
        count: Number(match.count),
        newest: match.newest,
        age_hours: Math.round(ageHours * 10) / 10,
      });

      if (isStale) {
        issues.push(`⚠️ ${combo.label}: STALE — ${Math.round(ageHours)}h old (${match.count} rows)`);
      }
    }

    const healthReport = {
      checked_at: new Date().toISOString(),
      results,
      issues,
      healthy: issues.length === 0,
    };

    // Upsert health report
    const { data: existing } = await sb.from('app_config').select('key').eq('key', 'cache_health_report').maybeSingle();
    if (existing) {
      await sb.from('app_config').update({ value: healthReport as any, updated_at: new Date().toISOString() }).eq('key', 'cache_health_report');
    } else {
      await sb.from('app_config').insert({ key: 'cache_health_report', value: healthReport as any, updated_at: new Date().toISOString() });
    }

    // Push notification to admin if issues detected
    if (issues.length > 0) {
      try {
        // Get admin user IDs
        const { data: adminRoles } = await sb.from('user_roles').select('user_id').eq('role', 'admin');
        if (adminRoles && adminRoles.length > 0) {
          const adminIds = adminRoles.map((r: any) => r.user_id);
          // Get push subscriptions for admins
          const { data: subs } = await sb.from('push_subscriptions').select('*').in('user_id', adminIds);
          if (subs && subs.length > 0) {
            const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY');
            const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY');
            if (vapidPrivate && vapidPublic) {
              const payload = JSON.stringify({
                title: '⚠️ Cache Health Alert',
                body: `${issues.length} issue(s): ${issues.slice(0, 2).join('; ')}${issues.length > 2 ? '…' : ''}`,
                url: '/admin',
              });
              // Fire-and-forget push to each subscription
              for (const sub of subs) {
                try {
                  // Use web-push compatible fetch (simplified)
                  console.log(`[health] Would push alert to subscription ${sub.id}`);
                } catch { /* ignore individual push failures */ }
              }
            }
          }
        }
      } catch (e) {
        console.warn('[health] Push notification failed:', e);
      }

      // Store alert flag
      const alertData = { has_issues: true, issue_count: issues.length, issues, checked_at: new Date().toISOString() };
      const { data: alertExisting } = await sb.from('app_config').select('key').eq('key', 'cache_health_alert').maybeSingle();
      if (alertExisting) {
        await sb.from('app_config').update({ value: alertData as any, updated_at: new Date().toISOString() }).eq('key', 'cache_health_alert');
      } else {
        await sb.from('app_config').insert({ key: 'cache_health_alert', value: alertData as any, updated_at: new Date().toISOString() });
      }

      // Auto-backfill: trigger analysis for empty/stale combos
      const emptyOrStale = results.filter(r => r.status === 'empty' || r.status === 'stale');
      if (emptyOrStale.length > 0) {
        console.log(`[health] Auto-backfilling ${emptyOrStale.length} empty/stale combos`);
        const backfillQueue = emptyOrStale.slice(1).map(r => ({ type: r.asset_type, tf: r.timeframe_days }));
        const first = emptyOrStale[0];
        fetch(`${supabaseUrl}/functions/v1/run-daily-analysis`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            asset_type: first.asset_type,
            offset: 0,
            timeframe: first.timeframe_days,
            queue: backfillQueue,
          }),
        }).catch(err => console.warn('[health] Auto-backfill trigger failed:', err));
      }
    } else {
      await sb.from('app_config').update({ value: { has_issues: false, checked_at: new Date().toISOString() } as any, updated_at: new Date().toISOString() }).eq('key', 'cache_health_alert');
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
