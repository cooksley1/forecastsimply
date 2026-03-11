const STORAGE_KEY = 'sf_rank_refresh';

interface RefreshRecord {
  date: string;
  count: number;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function getRecord(): RefreshRecord {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const rec = JSON.parse(raw) as RefreshRecord;
      if (rec.date === today()) return rec;
    }
  } catch {}
  return { date: today(), count: 0 };
}

function setRecord(rec: RefreshRecord) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rec));
}

/** Check if user has own API keys configured */
export function hasOwnApiKeys(): boolean {
  const av = localStorage.getItem('sf_av_api_key');
  const fmp = localStorage.getItem('sf_fmp_api_key');
  const cg = localStorage.getItem('sf_coingecko_api_key');
  return !!(av || fmp || cg);
}

/** How many live rank refreshes used today */
export function getRankUsageToday(): number {
  return getRecord().count;
}

/** Max allowed per day (without own keys) */
export const DAILY_RANK_LIMIT = 1;

/** Can the user do a live rank refresh? */
export function canRankRefresh(): boolean {
  if (hasOwnApiKeys()) return true;
  return getRecord().count < DAILY_RANK_LIMIT;
}

/** Record a rank refresh usage */
export function recordRankRefresh(): void {
  const rec = getRecord();
  rec.count++;
  setRecord(rec);
}

/** Get remaining refreshes */
export function getRemainingRefreshes(): number {
  if (hasOwnApiKeys()) return Infinity;
  return Math.max(0, DAILY_RANK_LIMIT - getRecord().count);
}
