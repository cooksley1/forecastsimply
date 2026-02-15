import { getCached, setCache } from '../cache';

const BASE = 'https://api.frankfurter.app';
const CACHE_TTL = 60 * 60 * 1000; // 60 min (ECB updates daily)

function subtractDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
}

function fmtDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

export interface ForexResult {
  from: string;
  to: string;
  pairName: string;
  currentRate: number;
  timestamps: number[];
  closes: number[];
}

export async function getForexChart(from: string, to: string, days: number): Promise<ForexResult> {
  const key = `fx_${from}_${to}_${days}`;
  const cached = getCached<ForexResult>(key, CACHE_TTL);
  if (cached) return cached;

  const end = new Date();
  const start = subtractDays(end, days);

  const url = `${BASE}/${fmtDate(start)}..${fmtDate(end)}?from=${from}&to=${to}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Frankfurter API error: ${res.status}`);

  const data = await res.json();
  const rates: Record<string, Record<string, number>> = data.rates || {};

  const sortedDates = Object.keys(rates).sort();
  const timestamps: number[] = [];
  const closes: number[] = [];

  for (const date of sortedDates) {
    const rate = rates[date]?.[to];
    if (rate != null) {
      timestamps.push(new Date(date).getTime());
      closes.push(rate);
    }
  }

  if (closes.length < 3) throw new Error(`Insufficient forex data for ${from}/${to}`);

  const result: ForexResult = {
    from,
    to,
    pairName: `${from}/${to}`,
    currentRate: closes[closes.length - 1],
    timestamps,
    closes,
  };

  setCache(key, result);
  return result;
}

/**
 * Get latest rate for a pair
 */
export async function getLatestRate(from: string, to: string): Promise<number> {
  const key = `fx_latest_${from}_${to}`;
  const cached = getCached<number>(key, 5 * 60 * 1000);
  if (cached) return cached;

  const res = await fetch(`${BASE}/latest?from=${from}&to=${to}`);
  if (!res.ok) throw new Error(`Frankfurter error: ${res.status}`);
  const data = await res.json();
  const rate = data.rates?.[to];
  if (!rate) throw new Error(`No rate found for ${from}/${to}`);
  setCache(key, rate);
  return rate;
}
