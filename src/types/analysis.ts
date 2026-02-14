export interface Indicators {
  sma20: number[];
  sma50: number[];
  sma200?: number[];
  rsi: number[];
  currentRsi: number;
  bbUpper: number[];
  bbMiddle: number[];
  bbLower: number[];
  macdLine: number[];
  macdSignal: number[];
  macdHistogram: number[];
  stochasticK: number[];
  stochasticD: number[];
  obv?: number[];
  atr?: number[];
  vwap?: number[];
  support: number;
  resistance: number;
}

export type SignalLabel = 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell';
export type SignalColor = 'green' | 'amber' | 'red';

export interface Signal {
  score: number;
  label: SignalLabel;
  color: SignalColor;
  confidence: number;
}

export interface Recommendation {
  horizon: 'short' | 'mid' | 'long' | 'dca';
  label: string;
  action: string;
  confidence: number;
  color: SignalColor;
  entry: number;
  target: number;
  stopLoss: number;
  reasoning: string;
}

export interface TradeSetup {
  type: 'long' | 'short';
  entry: number;
  stop: number;
  tp1: number;
  tp2: number;
  riskReward: number;
  bias: boolean;
}

export interface ForecastPoint {
  timestamp: number;
  value: number;
  upper: number;
  lower: number;
}

export interface TechnicalData {
  prices: { timestamp: number; close: number; volume?: number }[];
  indicators: Indicators;
  signal: Signal;
  recommendations: Recommendation[];
  tradeSetups: TradeSetup[];
  forecast: ForecastPoint[];
  forecastTarget: number;
  marketPhase: string;
  analysisText: string;
}
