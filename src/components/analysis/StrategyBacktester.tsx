import { useState, useCallback, useMemo } from 'react';
import { sma, ema, rsi, macd } from '@/analysis/indicators';
import { fetchEquityHistory, fetchCryptoHistory, fetchForexHistory } from '@/services/fetcher';
import type { AssetType } from '@/types/assets';
import type { TechnicalData } from '@/types/analysis';

/* ── Strategy definitions ── */
interface StrategyDef {
  id: string;
  label: string;
  icon: string;
  desc: string;
  generateSignals: (closes: number[]) => { buy: boolean[]; sell: boolean[] };
}

const STRATEGIES: StrategyDef[] = [
  {
    id: 'rsi_mean_revert',
    label: 'RSI Mean Reversion',
    icon: '🔄',
    desc: 'Buy when RSI < 30 (oversold), sell when RSI > 70 (overbought)',
    generateSignals: (closes) => {
      const r = rsi(closes, 14);
      const buy = r.map(v => !isNaN(v) && v < 30);
      const sell = r.map(v => !isNaN(v) && v > 70);
      return { buy, sell };
    },
  },
  {
    id: 'sma_crossover',
    label: 'SMA 20/50 Crossover',
    icon: '✖️',
    desc: 'Buy when SMA20 crosses above SMA50, sell when it crosses below',
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
  },
  {
    id: 'macd_crossover',
    label: 'MACD Crossover',
    icon: '📊',
    desc: 'Buy when MACD line crosses above signal, sell when it crosses below',
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
  },
  {
    id: 'bollinger_bounce',
    label: 'Bollinger Bounce',
    icon: '📈',
    desc: 'Buy near lower band, sell near upper band',
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
}

function runBacktest(closes: number[], signals: { buy: boolean[]; sell: boolean[] }): BacktestResult {
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

  // Close any open position at end
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

  // Simplified Sharpe approximation
  const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const stdReturn = returns.length > 1
    ? Math.sqrt(returns.reduce((s, r) => s + (r - avgReturn) ** 2, 0) / (returns.length - 1))
    : 1;
  const sharpeApprox = stdReturn > 0 ? avgReturn / stdReturn : 0;

  return {
    strategyId: '',
    totalReturn: Math.round(totalReturn * 100) / 100,
    buyAndHold: Math.round(buyAndHold * 100) / 100,
    trades: totalTrades,
    winRate: Math.round(winRate),
    maxDrawdown: Math.round(maxDrawdown * 100) / 100,
    sharpeApprox: Math.round(sharpeApprox * 100) / 100,
    tradeLog: trades,
  };
}

interface Props {
  assetId: string | null;
  assetType: AssetType;
  assetName: string | null;
  technicalData: TechnicalData | null;
}

export default function StrategyBacktester({ assetId, assetType, assetName, technicalData }: Props) {
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
      const res = runBacktest(closes, signals);
      res.strategyId = strategy.id;
      setResult(res);
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
              Test trading strategies against historical data
            </p>
          </div>
          <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">Expand →</span>
        </div>
      </button>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">⏪ Strategy Backtester</h3>
        <button onClick={() => setExpanded(false)} className="text-xs text-muted-foreground hover:text-foreground">Collapse</button>
      </div>

      {!assetId ? (
        <p className="text-[11px] text-muted-foreground text-center py-4">Select an asset first, then backtest strategies against its history.</p>
      ) : (
        <>
          <p className="text-[10px] text-muted-foreground">
            Testing on: <span className="text-foreground font-medium">{assetName || assetId}</span>
          </p>

          {/* Strategy selector */}
          <div className="flex flex-wrap gap-1.5">
            {STRATEGIES.map(s => (
              <button
                key={s.id}
                onClick={() => { setSelectedStrategy(s.id); setResult(null); }}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                  selectedStrategy === s.id
                    ? 'bg-primary/15 text-primary border border-primary/30'
                    : 'bg-secondary/50 border border-border text-muted-foreground hover:text-foreground hover:border-primary/30'
                }`}
              >
                {s.icon} {s.label}
              </button>
            ))}
          </div>

          {/* Strategy explanation */}
          <div className="bg-muted/30 rounded-lg p-2.5">
            <p className="text-[11px] text-foreground">{strategy.desc}</p>
          </div>

          {/* Timeframe + Run */}
          <div className="flex items-center gap-2">
            {(['3M', '6M', '1Y'] as const).map(tf => (
              <button
                key={tf}
                onClick={() => { setTimeframe(tf); setResult(null); }}
                className={`px-2 py-1 rounded text-[10px] font-mono transition-all ${
                  timeframe === tf ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tf}
              </button>
            ))}
            <button
              onClick={runTest}
              disabled={running}
              className="ml-auto px-4 py-1.5 rounded-lg text-[11px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all"
            >
              {running ? 'Running...' : 'Run Backtest'}
            </button>
          </div>

          {/* Results */}
          {result && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <ResultCard label="Strategy Return" value={`${result.totalReturn > 0 ? '+' : ''}${result.totalReturn}%`} positive={result.totalReturn > 0} />
                <ResultCard label="Buy & Hold" value={`${result.buyAndHold > 0 ? '+' : ''}${result.buyAndHold}%`} positive={result.buyAndHold > 0} />
                <ResultCard label="Win Rate" value={`${result.winRate}%`} positive={result.winRate > 50} />
                <ResultCard label="Trades" value={String(result.trades)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <ResultCard label="Max Drawdown" value={`-${result.maxDrawdown}%`} positive={result.maxDrawdown < 10} />
                <ResultCard label="Sharpe (approx)" value={String(result.sharpeApprox)} positive={result.sharpeApprox > 0.5} />
              </div>

              {/* Alpha comparison */}
              <div className={`rounded-lg p-2.5 text-[11px] font-medium ${
                result.totalReturn > result.buyAndHold
                  ? 'bg-positive/10 text-positive border border-positive/20'
                  : 'bg-destructive/10 text-destructive border border-destructive/20'
              }`}>
                {result.totalReturn > result.buyAndHold
                  ? `✅ Strategy beat buy & hold by ${(result.totalReturn - result.buyAndHold).toFixed(1)}%`
                  : `❌ Buy & hold outperformed by ${(result.buyAndHold - result.totalReturn).toFixed(1)}%`}
              </div>

              {/* Trade log */}
              {result.tradeLog.length > 0 && (
                <details className="text-[10px]">
                  <summary className="text-muted-foreground cursor-pointer hover:text-foreground">
                    Trade log ({result.tradeLog.length} entries)
                  </summary>
                  <div className="mt-1 max-h-32 overflow-y-auto space-y-0.5">
                    {result.tradeLog.map((t, i) => (
                      <div key={i} className="flex items-center gap-2 font-mono">
                        <span className={t.type === 'buy' ? 'text-positive' : 'text-destructive'}>
                          {t.type === 'buy' ? '▲ BUY' : '▼ SELL'}
                        </span>
                        <span className="text-muted-foreground">@ ${t.price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              <p className="text-[9px] text-muted-foreground italic">
                ⚠️ Past performance does not indicate future results. Backtests don't account for slippage, fees, or market impact.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ResultCard({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="bg-muted/30 rounded-lg p-2 text-center">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={`text-sm font-semibold font-mono ${
        positive === undefined ? 'text-foreground' :
        positive ? 'text-positive' : 'text-destructive'
      }`}>{value}</div>
    </div>
  );
}
