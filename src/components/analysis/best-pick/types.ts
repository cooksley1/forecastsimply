export interface BestPick {
  asset_id: string;
  symbol: string;
  name: string;
  asset_type: string;
  price: number;
  change_pct: number;
  signal_score: number;
  signal_label: string;
  confidence: number;
  market_phase: string | null;
  target_price: number | null;
  stop_loss: number | null;
  forecast_return_pct: number;
  rsi: number | null;
  sma20: number | null;
  sma50: number | null;
  bb_position: number | null;
  macd_histogram: number | null;
  stochastic_k: number | null;
  analyzed_at: string;
}

export type AssetClass = 'crypto' | 'stocks' | 'etfs';
export type Timeframe = '1M' | '3M' | '6M' | '1Y';

export const ASSET_OPTIONS: { id: AssetClass; label: string; icon: string }[] = [
  { id: 'crypto', label: 'Crypto', icon: '₿' },
  { id: 'stocks', label: 'Stocks', icon: '📈' },
  { id: 'etfs', label: 'ETFs', icon: '📊' },
];

export const TIMEFRAME_OPTIONS: { id: Timeframe; label: string; days: number }[] = [
  { id: '1M', label: '1 Month', days: 30 },
  { id: '3M', label: '3 Months', days: 90 },
  { id: '6M', label: '6 Months', days: 180 },
  { id: '1Y', label: '1 Year', days: 365 },
];

export const APP_URL = 'https://forecastsimply.lovable.app';
