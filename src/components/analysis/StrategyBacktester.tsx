import { useState, useCallback, useMemo } from 'react';
import { sma, ema, rsi, macd } from '@/analysis/indicators';
import { fetchEquityHistory, fetchCryptoHistory, fetchForexHistory } from '@/services/fetcher';
import type { AssetType } from '@/types/assets';
import type { TechnicalData } from '@/types/analysis';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle, TrendingUp, TrendingDown, Eye } from 'lucide-react';
import { fmtPrice } from '@/utils/format';

/* ── Strategy definitions ── */
interface StrategyDef {
  id: string;
  label: string;
  icon: string;
  desc: string;
  beginnerDesc: string;
  overlayId: string; // which chart overlay to show
  generateSignals: (closes: number[]) => { buy: boolean[]; sell: boolean[] };
  getCurrentState: (closes: number[]) => { zone: 'buy' | 'sell' | 'neutral'; explanation: string; values: Record<string, string> };
}

const STRATEGIES: StrategyDef[] = [
  {
    id: 'rsi_mean_revert',
    label: 'RSI Mean Reversion',
    icon: '🔄',
    desc: 'Buy when RSI < 30 (oversold), sell when RSI > 70 (overbought)',
    beginnerDesc: 'RSI measures if an asset is "on sale" (oversold) or "overpriced" (overbought). This strategy buys when everyone is panic-selling (RSI below 30) and sells when everyone is greedily buying (RSI above 70). Think of it like buying winter coats in summer and selling them in winter.',
    overlayId: 'section-rsi',
    generateSignals: (closes) => {
      const r = rsi(closes, 14);
      const buy = r.map(v => !isNaN(v) && v < 30);
      const sell = r.map(v => !isNaN(v) && v > 70);
      return { buy, sell };
    },
    getCurrentState: (closes) => {
      const r = rsi(closes, 14);
      const last = r.length > 0 ? r[r.length - 1] : NaN;
      if (isNaN(last)) return { zone: 'neutral', explanation: 'Not enough data to calculate RSI.', values: {} };
      const zone = last < 30 ? 'buy' : last > 70 ? 'sell' : 'neutral';
      const explanation = last < 30
        ? `RSI is at ${last.toFixed(1)} — in the BUY zone! The asset appears oversold and may bounce.`
        : last > 70
        ? `RSI is at ${last.toFixed(1)} — in the SELL zone. The asset appears overbought and may pull back.`
        : `RSI is at ${last.toFixed(1)} — neutral zone. No clear buy or sell signal right now.`;
      return { zone, explanation, values: { 'Current RSI': last.toFixed(1), 'Buy below': '30', 'Sell above': '70' } };
    },
  },
  {
    id: 'sma_crossover',
    label: 'SMA 20/50 Crossover',
    icon: '✖️',
    desc: 'Buy when SMA20 crosses above SMA50, sell when it crosses below',
    beginnerDesc: 'This compares the 20-day and 50-day moving averages. When the short-term average rises above the long-term one, it\'s called a "golden cross" — momentum is building. When it drops below, it\'s a "death cross" — momentum is fading. Like comparing this month\'s sales to the quarterly average.',
    overlayId: 'ema_cross',
    generateSignals: (closes) => {
      const s20 = sma(closes, 20);
      const s50 = sma(closes, 50);
      const buy = closes.map((_, i) =>
        i > 0 && !isNaN(s20[i]) && !isNaN(s50[i]) && !isNaN(s20[i - 1]) && !isNaN(s50[i - 1]) &&
        s20[i - 1] <= s50[i - 1] && s20[i] > s50[i]
      );
      const sell = closes.map((_, i) =>
        i > 0 && !isNaN(s20[i]) && !isNaN(s50[i]) && !isNaN(s20[i - 1]) && !isNaN(s50[i - 1]) &&
        s20[i - 1] >= s50[i - 1] && s20[i] < s50[i]
      );
      return { buy, sell };
    },
    getCurrentState: (closes) => {
      const s20 = sma(closes, 20);
      const s50 = sma(closes, 50);
      const last20 = s20.length > 0 ? s20[s20.length - 1] : NaN;
      const last50 = s50.length > 0 ? s50[s50.length - 1] : NaN;
      if (isNaN(last20) || isNaN(last50)) return { zone: 'neutral', explanation: 'Not enough data for SMA calculation.', values: {} };
      const diff = ((last20 - last50) / last50) * 100;
      const zone = last20 > last50 ? 'buy' : last20 < last50 ? 'sell' : 'neutral';
      const explanation = last20 > last50
        ? `SMA 20 (${fmtPrice(last20)}) is ABOVE SMA 50 (${fmtPrice(last50)}) — bullish trend active. Short-term momentum is positive.`
        : `SMA 20 (${fmtPrice(last20)}) is BELOW SMA 50 (${fmtPrice(last50)}) — bearish trend. Short-term momentum is negative.`;
      return { zone, explanation, values: { 'SMA 20': fmtPrice(last20), 'SMA 50': fmtPrice(last50), 'Gap': `${diff > 0 ? '+' : ''}${diff.toFixed(2)}%` } };
    },
  },
  {
    id: 'macd_crossover',
    label: 'MACD Crossover',
    icon: '📊',
    desc: 'Buy when MACD line crosses above signal, sell when it crosses below',
    beginnerDesc: 'MACD tracks momentum shifts. When the MACD line crosses above its signal line, buyers are gaining control. When it crosses below, sellers are taking over. Think of it like two runners — when the fast one overtakes the slow one, the race is changing.',
    overlayId: 'section-rsi',
    generateSignals: (closes) => {
      const m = macd(closes);
      const buy = closes.map((_, i) =>
        i > 0 && m.line[i - 1] <= m.signal[i - 1] && m.line[i] > m.signal[i]
      );
      const sell = closes.map((_, i) =>
        i > 0 && m.line[i - 1] >= m.signal[i - 1] && m.line[i] < m.signal[i]
      );
      return { buy, sell };
    },
    getCurrentState: (closes) => {
      const m = macd(closes);
      const lastLine = m.line.length > 0 ? m.line[m.line.length - 1] : NaN;
      const lastSignal = m.signal.length > 0 ? m.signal[m.signal.length - 1] : NaN;
      if (isNaN(lastLine) || isNaN(lastSignal)) return { zone: 'neutral', explanation: 'Not enough data for MACD.', values: {} };
      const zone = lastLine > lastSignal ? 'buy' : lastLine < lastSignal ? 'sell' : 'neutral';
      const explanation = lastLine > lastSignal
        ? `MACD line (${lastLine.toFixed(4)}) is ABOVE signal (${lastSignal.toFixed(4)}) — bullish momentum. Buyers are in control.`
        : `MACD line (${lastLine.toFixed(4)}) is BELOW signal (${lastSignal.toFixed(4)}) — bearish momentum. Sellers have the edge.`;
      return { zone, explanation, values: { 'MACD Line': lastLine.toFixed(4), 'Signal Line': lastSignal.toFixed(4) } };
    },
  },
  {
    id: 'bollinger_bounce',
    label: 'Bollinger Bounce',
    icon: '📈',
    desc: 'Buy near lower band, sell near upper band',
    beginnerDesc: 'Bollinger Bands create a "price channel" around the average. When price drops to the lower band, it\'s like a ball hitting the floor — it often bounces back up. When it reaches the upper band, it often falls back down. This strategy tries to buy the bounce and sell at the ceiling.',
    overlayId: 'bollinger',
    generateSignals: (closes) => {
      const s = sma(closes, 20);
      const buy = closes.map((c, i) => {
        if (isNaN(s[i])) return false;
        let sum = 0;
        for (let j = Math.max(0, i - 19); j <= i; j++) sum += (closes[j] - s[i]) ** 2;
        const std = Math.sqrt(sum / 20);
        return c < s[i] - 1.8 * std;
      });
      const sell = closes.map((c, i) => {
        if (isNaN(s[i])) return false;
        let sum = 0;
        for (let j = Math.max(0, i - 19); j <= i; j++) sum += (closes[j] - s[i]) ** 2;
        const std = Math.sqrt(sum / 20);
        return c > s[i] + 1.8 * std;
      });
      return { buy, sell };
    },
    getCurrentState: (closes) => {
      const s = sma(closes, 20);
      const lastSma = s.length > 0 ? s[s.length - 1] : NaN;
      const lastClose = closes[closes.length - 1];
      if (isNaN(lastSma)) return { zone: 'neutral', explanation: 'Not enough data for Bollinger Bands.', values: {} };
      let sum = 0;
      const n = closes.length;
      for (let j = Math.max(0, n - 20); j < n; j++) sum += (closes[j] - lastSma) ** 2;
      const std = Math.sqrt(sum / 20);
      const upper = lastSma + 2 * std;
      const lower = lastSma - 2 * std;
      const pctPos = ((lastClose - lower) / (upper - lower)) * 100;
      const zone = lastClose < lastSma - 1.8 * std ? 'buy' : lastClose > lastSma + 1.8 * std ? 'sell' : 'neutral';
      const explanation = zone === 'buy'
        ? `Price (${fmtPrice(lastClose)}) is near the LOWER band (${fmtPrice(lower)}) — potential bounce opportunity! Price is at ${pctPos.toFixed(0)}% of the band range.`
        : zone === 'sell'
        ? `Price (${fmtPrice(lastClose)}) is near the UPPER band (${fmtPrice(upper)}) — may pull back. Price is at ${pctPos.toFixed(0)}% of the band range.`
        : `Price (${fmtPrice(lastClose)}) is in the MIDDLE of the bands — no extreme signal. Price is at ${pctPos.toFixed(0)}% of the band range.`;
      return { zone, explanation, values: { 'Upper Band': fmtPrice(upper), 'Middle': fmtPrice(lastSma), 'Lower Band': fmtPrice(lower), 'Position': `${pctPos.toFixed(0)}%` } };
    },
  },
];

interface BacktestResult {
  strategyId: string;
  totalReturn: number;
  buyAndHold: number;
  trades: number;
  winRate: number;
  maxDrawdown: number;
  sharpeApprox: number;
  tradeLog: { type: 'buy' | 'sell'; idx: number; price: number }[];
  closes: number[];
  currentState: ReturnType<StrategyDef['getCurrentState']>;
}

function runBacktest(closes: number[], signals: { buy: boolean[]; sell: boolean[] }): Omit<BacktestResult, 'strategyId' | 'closes' | 'currentState'> {
  const trades: { type: 'buy' | 'sell'; idx: number; price: number }[] = [];
  let position: 'long' | 'flat' = 'flat';
  let entryPrice = 0;
  let totalReturn = 0;
  let wins = 0;
  let losses = 0;
  let equity = 100;
  let peak = 100;
  let maxDrawdown = 0;
  const returns: number[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (signals.buy[i] && position === 'flat') {
      position = 'long';
      entryPrice = closes[i];
      trades.push({ type: 'buy', idx: i, price: closes[i] });
    } else if (signals.sell[i] && position === 'long') {
      const ret = ((closes[i] - entryPrice) / entryPrice) * 100;
      totalReturn += ret;
      returns.push(ret);
      if (ret > 0) wins++;
      else losses++;
      equity *= 1 + ret / 100;
      peak = Math.max(peak, equity);
      maxDrawdown = Math.max(maxDrawdown, ((peak - equity) / peak) * 100);
      position = 'flat';
      trades.push({ type: 'sell', idx: i, price: closes[i] });
    }
  }

  if (position === 'long') {
    const ret = ((closes[closes.length - 1] - entryPrice) / entryPrice) * 100;
    totalReturn += ret;
    returns.push(ret);
    if (ret > 0) wins++;
    else losses++;
    trades.push({ type: 'sell', idx: closes.length - 1, price: closes[closes.length - 1] });
  }

  const buyAndHold = closes.length > 1 ? ((closes[closes.length - 1] - closes[0]) / closes[0]) * 100 : 0;
  const totalTrades = wins + losses;
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
  const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const stdReturn = returns.length > 1
    ? Math.sqrt(returns.reduce((s, r) => s + (r - avgReturn) ** 2, 0) / (returns.length - 1))
    : 1;
  const sharpeApprox = stdReturn > 0 ? avgReturn / stdReturn : 0;

  return {
    totalReturn: Math.round(totalReturn * 100) / 100,
    buyAndHold: Math.round(buyAndHold * 100) / 100,
    trades: totalTrades,
    winRate: Math.round(winRate),
    maxDrawdown: Math.round(maxDrawdown * 100) / 100,
    sharpeApprox: Math.round(sharpeApprox * 100) / 100,
    tradeLog: trades,
  };
}

const METRIC_TOOLTIPS: Record<string, { title: string; explanation: string }> = {
  'Strategy Return': {
    title: 'Strategy Return',
    explanation: 'The total profit/loss if you followed this strategy\'s buy and sell signals over the selected timeframe. A positive number means the strategy was profitable.',
  },
  'Buy & Hold': {
    title: 'Buy & Hold Return',
    explanation: 'What you\'d have made if you simply bought at the start and held until now — no trading at all. Compare this to the strategy return to see if active trading would have been worth it.',
  },
  'Win Rate': {
    title: 'Win Rate',
    explanation: 'The percentage of trades that made money. Above 50% means more winning trades than losing ones. But a low win rate can still be profitable if the wins are much bigger than the losses.',
  },
  'Trades': {
    title: 'Total Trades',
    explanation: 'How many complete buy→sell round trips the strategy made. Fewer trades = less effort and fewer fees. Too many trades may eat into profits through transaction costs.',
  },
  'Max Drawdown': {
    title: 'Maximum Drawdown',
    explanation: 'The biggest peak-to-valley drop in your account value. Think of it as the worst "paper loss" you\'d have experienced. Lower is better — below 10% is conservative, above 20% is aggressive.',
  },
  'Sharpe (approx)': {
    title: 'Sharpe Ratio (approx)',
    explanation: 'Measures return relative to risk. Above 1.0 = good (decent reward for the risk taken). Above 2.0 = excellent. Below 0.5 = the risk may not be worth the reward. It\'s like asking "am I getting paid enough for this rollercoaster?"',
  },
};

interface Props {
  assetId: string | null;
  assetType: AssetType;
  assetName: string | null;
  technicalData: TechnicalData | null;
  onViewChart?: (overlayId: string) => void;
}

export default function StrategyBacktester({ assetId, assetType, assetName, technicalData, onViewChart }: Props) {
  const [selectedStrategy, setSelectedStrategy] = useState(STRATEGIES[0].id);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [timeframe, setTimeframe] = useState<'3M' | '6M' | '1Y'>('6M');

  const tfDays = { '3M': 90, '6M': 180, '1Y': 365 }[timeframe];

  const runTest = useCallback(async () => {
    if (!assetId) return;
    setRunning(true);
    try {
      let closes: number[];
      if (assetType === 'crypto') {
        const r = await fetchCryptoHistory(assetId, tfDays);
        closes = r.priceData.closes;
      } else if (assetType === 'forex') {
        const from = assetId.slice(0, 3);
        const to = assetId.slice(3, 6);
        const r = await fetchForexHistory(from, to, tfDays);
        closes = r.data.closes;
      } else {
        const r = await fetchEquityHistory(assetId, tfDays);
        closes = r.data.closes;
      }

      const strategy = STRATEGIES.find(s => s.id === selectedStrategy)!;
      const signals = strategy.generateSignals(closes);
      const btResult = runBacktest(closes, signals);
      const currentState = strategy.getCurrentState(closes);
      setResult({ ...btResult, strategyId: strategy.id, closes, currentState });
    } catch (e: any) {
      console.warn('[backtester]', e.message);
    } finally {
      setRunning(false);
    }
  }, [assetId, assetType, selectedStrategy, tfDays]);

  const strategy = useMemo(() => STRATEGIES.find(s => s.id === selectedStrategy)!, [selectedStrategy]);

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full bg-card border border-border rounded-xl p-4 text-left hover:border-primary/30 transition-all group"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              ⏪ Strategy Backtester
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              See how trading strategies would have performed on real data — no jargon, just results
            </p>
          </div>
          <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">Expand →</span>
        </div>
      </button>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">⏪ Strategy Backtester</h3>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[280px]">
                <p className="text-xs">Tests how a trading strategy <strong>would have performed</strong> using real historical data. It's like a flight simulator for trading — learn without risking real money.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <button onClick={() => setExpanded(false)} className="text-xs text-muted-foreground hover:text-foreground">Collapse</button>
        </div>

        {/* Beginner intro */}
        <div className="bg-primary/5 border border-primary/15 rounded-lg p-3">
          <p className="text-[11px] text-foreground leading-relaxed">
            💡 <strong>How it works:</strong> Pick a strategy below, choose a timeframe, and hit "Run Backtest". 
            We'll replay history and show you every buy and sell the strategy would have made — plus whether it beat simply holding.
          </p>
        </div>

        {!assetId ? (
          <p className="text-[11px] text-muted-foreground text-center py-4">Select an asset first, then test how different strategies would perform on its history.</p>
        ) : (
          <>
            <p className="text-[10px] text-muted-foreground">
              Testing on: <span className="text-foreground font-medium">{assetName || assetId}</span>
            </p>

            {/* Strategy selector */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Choose a Strategy</span>
              <div className="flex flex-wrap gap-1.5">
                {STRATEGIES.map(s => (
                  <Tooltip key={s.id}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => { setSelectedStrategy(s.id); setResult(null); }}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                          selectedStrategy === s.id
                            ? 'bg-primary/15 text-primary border border-primary/30'
                            : 'bg-secondary/50 border border-border text-muted-foreground hover:text-foreground hover:border-primary/30'
                        }`}
                      >
                        {s.icon} {s.label}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[300px]">
                      <p className="text-xs font-medium mb-1">{s.label}</p>
                      <p className="text-[11px] text-muted-foreground">{s.desc}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>

            {/* Strategy explanation — beginner-friendly */}
            <div className="bg-muted/30 rounded-lg p-3 space-y-2">
              <p className="text-[11px] font-medium text-foreground">{strategy.icon} {strategy.label}</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{strategy.beginnerDesc}</p>
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[9px] font-mono text-muted-foreground/70 bg-muted/50 px-2 py-0.5 rounded">Rule: {strategy.desc}</span>
              </div>
            </div>

            {/* View on Chart button */}
            {onViewChart && (
              <button
                onClick={() => onViewChart(strategy.overlayId)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition-all w-fit"
              >
                <Eye className="w-3.5 h-3.5" />
                View {strategy.label} on Chart
              </button>
            )}

            {/* Timeframe + Run */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground mr-1">Period:</span>
                {(['3M', '6M', '1Y'] as const).map(tf => (
                  <Tooltip key={tf}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => { setTimeframe(tf); setResult(null); }}
                        className={`px-2 py-1 rounded text-[10px] font-mono transition-all ${
                          timeframe === tf ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {tf}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">{tf === '3M' ? 'Last 3 months' : tf === '6M' ? 'Last 6 months' : 'Last 12 months'} of price data</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
              <button
                onClick={runTest}
                disabled={running}
                className="ml-auto px-4 py-1.5 rounded-lg text-[11px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all"
              >
                {running ? '⏳ Analysing...' : '▶ Run Backtest'}
              </button>
            </div>

            {/* Results */}
            {result && (
              <div className="space-y-3">
                {/* Current state indicator */}
                <div className={`rounded-lg p-3 border ${
                  result.currentState.zone === 'buy'
                    ? 'bg-positive/8 border-positive/25'
                    : result.currentState.zone === 'sell'
                    ? 'bg-destructive/8 border-destructive/25'
                    : 'bg-muted/30 border-border'
                }`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    {result.currentState.zone === 'buy' ? (
                      <TrendingUp className="w-4 h-4 text-positive" />
                    ) : result.currentState.zone === 'sell' ? (
                      <TrendingDown className="w-4 h-4 text-destructive" />
                    ) : (
                      <HelpCircle className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className={`text-xs font-semibold ${
                      result.currentState.zone === 'buy' ? 'text-positive' : result.currentState.zone === 'sell' ? 'text-destructive' : 'text-foreground'
                    }`}>
                      Right Now: {result.currentState.zone === 'buy' ? '🟢 Buy Zone' : result.currentState.zone === 'sell' ? '🔴 Sell Zone' : '⚪ Neutral'}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{result.currentState.explanation}</p>
                  {Object.keys(result.currentState.values).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {Object.entries(result.currentState.values).map(([k, v]) => (
                        <span key={k} className="text-[9px] font-mono bg-background/50 px-2 py-0.5 rounded border border-border">
                          {k}: <strong className="text-foreground">{v}</strong>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Metrics grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <ResultCard label="Strategy Return" value={`${result.totalReturn > 0 ? '+' : ''}${result.totalReturn}%`} positive={result.totalReturn > 0} tooltip={METRIC_TOOLTIPS['Strategy Return']} />
                  <ResultCard label="Buy & Hold" value={`${result.buyAndHold > 0 ? '+' : ''}${result.buyAndHold}%`} positive={result.buyAndHold > 0} tooltip={METRIC_TOOLTIPS['Buy & Hold']} />
                  <ResultCard label="Win Rate" value={`${result.winRate}%`} positive={result.winRate > 50} tooltip={METRIC_TOOLTIPS['Win Rate']} />
                  <ResultCard label="Trades" value={String(result.trades)} tooltip={METRIC_TOOLTIPS['Trades']} />
                  <ResultCard label="Max Drawdown" value={`-${result.maxDrawdown}%`} positive={result.maxDrawdown < 10} tooltip={METRIC_TOOLTIPS['Max Drawdown']} />
                  <ResultCard label="Sharpe (approx)" value={String(result.sharpeApprox)} positive={result.sharpeApprox > 0.5} tooltip={METRIC_TOOLTIPS['Sharpe (approx)']} />
                </div>

                {/* Plain-English verdict */}
                <div className={`rounded-lg p-3 text-[11px] leading-relaxed ${
                  result.totalReturn > result.buyAndHold
                    ? 'bg-positive/10 text-positive border border-positive/20'
                    : 'bg-destructive/10 text-destructive border border-destructive/20'
                }`}>
                  {result.totalReturn > result.buyAndHold ? (
                    <>
                      <strong>✅ Strategy beat buy & hold by {(result.totalReturn - result.buyAndHold).toFixed(1)}%</strong>
                      <p className="text-muted-foreground mt-1">
                        Active trading using {strategy.label} would have outperformed simply holding. 
                        {result.winRate >= 60 && ' The high win rate suggests this strategy suits this asset well.'}
                        {result.maxDrawdown > 15 && ' However, the drawdown was significant — be prepared for temporary losses.'}
                      </p>
                    </>
                  ) : (
                    <>
                      <strong>❌ Buy & hold outperformed by {(result.buyAndHold - result.totalReturn).toFixed(1)}%</strong>
                      <p className="text-muted-foreground mt-1">
                        Simply holding would have been more profitable than this strategy over this period. 
                        {result.trades <= 2 && ' Very few trade signals were generated — the strategy may not suit this asset.'}
                        {result.winRate < 40 && ' The low win rate suggests the conditions weren\'t favourable.'}
                      </p>
                    </>
                  )}
                </div>

                {/* Trade log */}
                {result.tradeLog.length > 0 && (
                  <details className="text-[10px]">
                    <summary className="text-muted-foreground cursor-pointer hover:text-foreground flex items-center gap-1">
                      📋 Trade log ({result.tradeLog.length} entries)
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="w-3 h-3" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Every buy and sell the strategy would have made. Each pair (buy → sell) is one complete trade.</p>
                        </TooltipContent>
                      </Tooltip>
                    </summary>
                    <div className="mt-1 max-h-40 overflow-y-auto space-y-0.5 bg-muted/20 rounded-lg p-2">
                      {result.tradeLog.map((t, i) => {
                        const isSell = t.type === 'sell';
                        const prevBuy = isSell ? result.tradeLog.slice(0, i).reverse().find(x => x.type === 'buy') : null;
                        const pnl = prevBuy ? ((t.price - prevBuy.price) / prevBuy.price * 100) : null;
                        return (
                          <div key={i} className="flex items-center gap-2 font-mono">
                            <span className={t.type === 'buy' ? 'text-positive' : 'text-destructive'}>
                              {t.type === 'buy' ? '▲ BUY ' : '▼ SELL'}
                            </span>
                            <span className="text-muted-foreground">@ {fmtPrice(t.price)}</span>
                            {pnl !== null && (
                              <span className={`${pnl >= 0 ? 'text-positive' : 'text-destructive'} text-[9px]`}>
                                ({pnl >= 0 ? '+' : ''}{pnl.toFixed(1)}%)
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </details>
                )}

                <p className="text-[9px] text-muted-foreground italic">
                  ⚠️ This is a simulation using past data — it does not guarantee future results. Real trading involves fees, slippage, and emotional decisions that backtests can't capture.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </TooltipProvider>
  );
}

function ResultCard({ label, value, positive, tooltip }: { label: string; value: string; positive?: boolean; tooltip?: { title: string; explanation: string } }) {
  return (
    <div className="bg-muted/30 rounded-lg p-2 text-center relative group">
      <div className="flex items-center justify-center gap-1">
        <div className="text-[10px] text-muted-foreground">{label}</div>
        {tooltip && (
          <Tooltip>
            <TooltipTrigger>
              <HelpCircle className="w-3 h-3 text-muted-foreground/50" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[260px]">
              <p className="text-xs font-medium mb-1">{tooltip.title}</p>
              <p className="text-[11px] text-muted-foreground">{tooltip.explanation}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className={`text-sm font-semibold font-mono ${
        positive === undefined ? 'text-foreground' :
        positive ? 'text-positive' : 'text-destructive'
      }`}>{value}</div>
    </div>
  );
}
