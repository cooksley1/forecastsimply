const CACHE_KEY = 'sf_fx_rates';
const CACHE_TTL = 3600000; // 1 hour
const PREF_KEY = 'sf_secondary_currency';

export const SUPPORTED_CURRENCIES = [
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
];

export function getSecondaryCurrency(): string | null {
  try { return localStorage.getItem(PREF_KEY) || 'AUD'; } catch { return 'AUD'; }
}

export function setSecondaryCurrency(code: string | null) {
  if (code) localStorage.setItem(PREF_KEY, code);
  else localStorage.removeItem(PREF_KEY);
}

interface CachedRates {
  rates: Record<string, number>;
  timestamp: number;
}

let cachedRates: CachedRates | null = null;

async function fetchRates(): Promise<Record<string, number>> {
  if (cachedRates && Date.now() - cachedRates.timestamp < CACHE_TTL) {
    return cachedRates.rates;
  }

  try {
    const stored = localStorage.getItem(CACHE_KEY);
    if (stored) {
      const parsed: CachedRates = JSON.parse(stored);
      if (Date.now() - parsed.timestamp < CACHE_TTL) {
        cachedRates = parsed;
        return parsed.rates;
      }
    }
  } catch { /* ignore */ }

  try {
    const codes = SUPPORTED_CURRENCIES.map(c => c.code).join(',');
    const res = await fetch(`https://api.frankfurter.app/latest?from=USD&to=${codes}`);
    const data = await res.json();
    const rates = data.rates || {};
    cachedRates = { rates, timestamp: Date.now() };
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(cachedRates)); } catch { /* ignore */ }
    return rates;
  } catch {
    return cachedRates?.rates ?? {};
  }
}

export async function convertFromUSD(usdAmount: number, targetCurrency: string): Promise<number | null> {
  if (targetCurrency === 'USD') return usdAmount;
  const rates = await fetchRates();
  const rate = rates[targetCurrency];
  if (!rate) return null;
  return usdAmount * rate;
}

export function getCurrencySymbol(code: string): string {
  return SUPPORTED_CURRENCIES.find(c => c.code === code)?.symbol || code;
}
