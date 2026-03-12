import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Weekly Health Check — pings every edge function and validates
 * cron jobs, database tables, and key app_config entries.
 * Results are stored in app_config for admin dashboard visibility.
 *
 * FUNCTION REGISTRY — update this list when adding/removing functions.
 */
const EDGE_FUNCTIONS = [
  { name: "admin-users", method: "POST", body: { action: "health" }, expectAuth: true },
  { name: "check-cache-health", method: "POST", body: {} },
  { name: "check-price-alerts", method: "POST", body: {} },
  { name: "check-watchlist-alerts", method: "POST", body: {} },
  { name: "crypto-screener", method: "POST", body: {} },
  { name: "curated-digest", method: "POST", body: { action: "health" } },
  { name: "exchange-screener", method: "POST", body: { exchange: "ASX", limit: 1 } },
  { name: "generate-case-study", method: "POST", body: { action: "health" } },
  { name: "get-vapid-key", method: "POST", body: {} },
  { name: "lock-monthly-picks", method: "POST", body: {} },
  { name: "refresh-market-data", method: "POST", body: {}, slow: true },
  { name: "run-daily-analysis", method: "POST", body: { asset_type: "stocks", offset: 0, timeframe: 30, dry_run: true }, slow: true },
  { name: "send-digest", method: "POST", body: { action: "health" } },
  { name: "snapshot-picks", method: "POST", body: {} },
  { name: "yahoo-proxy", method: "POST", body: { symbol: "AAPL", range: "5d", interval: "1d" } },
  { name: "yahoo-search", method: "POST", body: { query: "AAPL" } },
];

const EXPECTED_CRON_JOBS = [
  "daily-analysis-stocks-30",
  "daily-analysis-stocks-90",
  "daily-analysis-stocks-180",
  "daily-analysis-stocks-365",
  "daily-analysis-crypto-30",
  "daily-analysis-crypto-90",
  "daily-analysis-crypto-180",
  "daily-analysis-crypto-365",
  "daily-pick-snapshots",
  "check-cache-health",
  "check-price-alerts",
  "check-watchlist-alerts",
  "weekly-health-check",
];

const EXPECTED_TABLES = [
  "analysis_history",
  "app_config",
  "contact_messages",
  "daily_analysis_cache",
  "login_history",
  "market_digests",
  "newsletter_subscribers",
  "pick_snapshots",
  "price_alerts",
  "profiles",
  "push_subscriptions",
  "tracked_picks",
  "unsupported_coins",
  "user_preferences",
  "user_roles",
  "watchlist_alert_settings",
  "watchlist_alert_state",
  "watchlist_groups",
  "watchlist_items",
];

interface FunctionResult {
  name: string;
  status: "ok" | "error" | "timeout" | "slow_ok";
  http_status: number | null;
  latency_ms: number;
  error?: string;
}

interface CronResult {
  name: string;
  status: "found" | "missing";
  schedule?: string;
}

interface TableResult {
  name: string;
  status: "ok" | "missing" | "error";
  row_count?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    const startTime = Date.now();

    // ── 1. Ping all edge functions ──
    const functionResults: FunctionResult[] = [];

    for (const fn of EDGE_FUNCTIONS) {
      const fnStart = Date.now();
      const isSlow = (fn as any).slow === true;
      const timeoutMs = isSlow ? 5000 : 30000; // Quick ping for slow functions

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        const res = await fetch(`${supabaseUrl}/functions/v1/${fn.name}`, {
          method: fn.method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${fn.expectAuth ? serviceKey : anonKey}`,
          },
          body: JSON.stringify(fn.body),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        // Consume body to prevent resource leak
        await res.text();

        functionResults.push({
          name: fn.name,
          status: res.status < 500 ? "ok" : "error",
          http_status: res.status,
          latency_ms: Date.now() - fnStart,
        });
      } catch (e: any) {
        // For slow/long-running functions, a timeout means they started OK
        if (isSlow && e.name === "AbortError") {
          functionResults.push({
            name: fn.name,
            status: "slow_ok",
            http_status: null,
            latency_ms: Date.now() - fnStart,
          });
        } else {
          functionResults.push({
            name: fn.name,
            status: e.name === "AbortError" ? "timeout" : "error",
            http_status: null,
            latency_ms: Date.now() - fnStart,
            error: e.message,
          });
        }
      }
    }

    // ── 2. Verify cron jobs ──
    const cronResults: CronResult[] = [];
    try {
      const { data: cronJobs } = await sb.rpc("get_cron_jobs") as any;
      // Fallback: query cron.job directly
      let jobs: any[] = cronJobs || [];
      if (!jobs.length) {
        // Direct query via raw — may not work, so we'll use a best-effort approach
        const rawRes = await fetch(`${supabaseUrl}/rest/v1/rpc/get_cron_jobs`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
          },
        });
        if (rawRes.ok) {
          jobs = await rawRes.json();
        } else {
          await rawRes.text();
        }
      }

      const jobNames = new Set(jobs.map((j: any) => j.jobname));

      for (const expected of EXPECTED_CRON_JOBS) {
        const found = jobs.find((j: any) => j.jobname === expected);
        cronResults.push({
          name: expected,
          status: found ? "found" : "missing",
          schedule: found?.schedule,
        });
      }
    } catch {
      // If cron query fails, mark all as unknown
      for (const expected of EXPECTED_CRON_JOBS) {
        cronResults.push({ name: expected, status: "missing" });
      }
    }

    // ── 3. Check database tables ──
    const tableResults: TableResult[] = [];

    for (const table of EXPECTED_TABLES) {
      try {
        const { count, error } = await sb
          .from(table)
          .select("*", { count: "exact", head: true });

        if (error) {
          tableResults.push({ name: table, status: "error" });
        } else {
          tableResults.push({ name: table, status: "ok", row_count: count ?? 0 });
        }
      } catch {
        tableResults.push({ name: table, status: "error" });
      }
    }

    // ── 4. Check key app_config entries ──
    const { data: configRows } = await sb
      .from("app_config")
      .select("key, updated_at");

    const configKeys = (configRows || []).map((r: any) => r.key);

    // ── 5. Compile report ──
    const fnOk = functionResults.filter((f) => f.status === "ok").length;
    const fnFail = functionResults.filter((f) => f.status !== "ok").length;
    const cronOk = cronResults.filter((c) => c.status === "found").length;
    const cronMissing = cronResults.filter((c) => c.status === "missing").length;
    const tablesOk = tableResults.filter((t) => t.status === "ok").length;
    const tablesFail = tableResults.filter((t) => t.status !== "ok").length;

    const issues: string[] = [];

    functionResults
      .filter((f) => f.status !== "ok")
      .forEach((f) => issues.push(`❌ Function ${f.name}: ${f.status} (HTTP ${f.http_status ?? "N/A"}) — ${f.error || ""}`));

    cronResults
      .filter((c) => c.status === "missing")
      .forEach((c) => issues.push(`⚠️ Cron job missing: ${c.name}`));

    tableResults
      .filter((t) => t.status !== "ok")
      .forEach((t) => issues.push(`❌ Table ${t.name}: ${t.status}`));

    const report = {
      checked_at: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
      healthy: issues.length === 0,
      summary: {
        functions: { ok: fnOk, failed: fnFail, total: EDGE_FUNCTIONS.length },
        cron_jobs: { found: cronOk, missing: cronMissing, total: EXPECTED_CRON_JOBS.length },
        tables: { ok: tablesOk, failed: tablesFail, total: EXPECTED_TABLES.length },
        app_config_keys: configKeys.length,
      },
      issues,
      details: {
        functions: functionResults,
        cron_jobs: cronResults,
        tables: tableResults,
        app_config_keys: configKeys,
      },
    };

    // ── 6. Store report in app_config ──
    const { data: existing } = await sb
      .from("app_config")
      .select("key")
      .eq("key", "weekly_health_report")
      .maybeSingle();

    if (existing) {
      await sb
        .from("app_config")
        .update({ value: report as any, updated_at: new Date().toISOString() })
        .eq("key", "weekly_health_report");
    } else {
      await sb
        .from("app_config")
        .insert({ key: "weekly_health_report", value: report as any });
    }

    return new Response(JSON.stringify(report, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
