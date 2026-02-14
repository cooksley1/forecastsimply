import { useState } from 'react';
import { getCoinChart, getCoinData } from '@/services/api/coingecko';
import { processTA } from '@/analysis/processTA';
import { fmtPrice } from '@/utils/format';

interface BreakoutResult {
  id: string;
  name: string;
  symbol: string;
  image: string;
  price: number;
  score: number;
  reasoning: string[];
  plan: { entry: string; stopLoss: string; takeProfit: string; timeframe: string; riskReward: string };
}

const SCAN_IDS = [
  'bitcoin', 'ethereum', 'solana', 'cardano', 'chainlink',
  'avalanche-2', 'polkadot', 'polygon-ecosystem-token', 'near', 'sui',
  'render-token', 'injective-protocol', 'celestia', 'sei-network', 'jupter',
];

interface Props {
  onSelect: (id: string) => void;
}

export default function BreakoutFinder({ onSelect }: Props) {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<BreakoutResult | null>(null);

  const scan = async () => {
    setScanning(true);
    setResult(null);

    try {
      let best: BreakoutResult | null = null;

      for (const coinId of SCAN_IDS) {
        try {
          const [coinData, chartData] = await Promise.all([
            getCoinData(coinId),
            getCoinChart(coinId, 90),
          ]);

          const prices = (chartData.prices || []).map((p: number[]) => p[1]);
          const timestamps = (chartData.prices || []).map((p: number[]) => p[0]);
          const vols = (chartData.total_volumes || []).map((v: number[]) => v[1]);

          if (prices.length < 30) continue;

          const ta = processTA(prices, timestamps, vols, 30, 'crypto', 'holt');
          const price = prices[prices.length - 1];

          // Score breakout potential
          let score = 0;
          const reasoning: string[] = [];

          // 1. RSI between 45-65 = coiling, not overbought
          const rsiArr = ta.indicators?.rsi;
          const lastRsi = rsiArr?.length ? rsiArr[rsiArr.length - 1] : undefined;
          if (lastRsi !== undefined && lastRsi >= 45 && lastRsi <= 65) {
            score += 25;
            reasoning.push(`RSI at ${lastRsi.toFixed(1)} — in the "launch zone" (not overbought, building momentum)`);
          } else if (lastRsi !== undefined && lastRsi >= 35 && lastRsi < 45) {
            score += 10;
            reasoning.push(`RSI at ${lastRsi.toFixed(1)} — recovering from oversold, potential reversal`);
          }

          // 2. Price near/above key moving averages
          const sma20Arr = ta.indicators?.sma20;
          const sma50Arr = ta.indicators?.sma50;
          const lastSma20 = sma20Arr?.length ? sma20Arr[sma20Arr.length - 1] : undefined;
          const lastSma50 = sma50Arr?.length ? sma50Arr[sma50Arr.length - 1] : undefined;
          if (lastSma20 && price > lastSma20) {
            score += 15;
            reasoning.push(`Trading above 20-day SMA (${fmtPrice(lastSma20)}) — short-term bullish`);
          }
          if (lastSma50 && price > lastSma50) {
            score += 10;
            reasoning.push(`Above 50-day SMA (${fmtPrice(lastSma50)}) — medium-term trend intact`);
          }

          // 3. Bollinger Band squeeze (low volatility = breakout incoming)
          const bbUpperArr = ta.indicators?.bbUpper;
          const bbLowerArr = ta.indicators?.bbLower;
          const lastBbUpper = bbUpperArr?.length ? bbUpperArr[bbUpperArr.length - 1] : undefined;
          const lastBbLower = bbLowerArr?.length ? bbLowerArr[bbLowerArr.length - 1] : undefined;
          if (lastBbUpper && lastBbLower && price > 0) {
            const bbWidth = (lastBbUpper - lastBbLower) / price;
            if (bbWidth < 0.15) {
              score += 20;
              reasoning.push(`Bollinger Bands squeezing (width ${(bbWidth * 100).toFixed(1)}%) — volatility compression signals imminent breakout`);
            }
          }

          // 4. MACD bullish crossover or approaching
          const macdLineArr = ta.indicators?.macdLine;
          const macdSignalArr = ta.indicators?.macdSignal;
          const lastMacdLine = macdLineArr?.length ? macdLineArr[macdLineArr.length - 1] : undefined;
          const lastMacdSignal = macdSignalArr?.length ? macdSignalArr[macdSignalArr.length - 1] : undefined;
          if (lastMacdLine !== undefined && lastMacdSignal !== undefined) {
            if (lastMacdLine > lastMacdSignal && lastMacdLine > 0) {
              score += 20;
              reasoning.push(`MACD bullish crossover confirmed — momentum shifting upward`);
            } else if (lastMacdLine > lastMacdSignal) {
              score += 10;
              reasoning.push(`MACD crossing signal line — early momentum shift`);
            }
          }

          // 5. Volume trend (increasing volume = conviction)
          if (vols.length > 14) {
            const recentVol = vols.slice(-7).reduce((a: number, b: number) => a + b, 0) / 7;
            const priorVol = vols.slice(-14, -7).reduce((a: number, b: number) => a + b, 0) / 7;
            if (recentVol > priorVol * 1.2) {
              score += 15;
              reasoning.push(`Volume increasing ${((recentVol / priorVol - 1) * 100).toFixed(0)}% week-over-week — smart money accumulating`);
            }
          }

          // 6. Forecast direction
          if (ta.forecast && ta.forecast.length > 0) {
            const lastForecast = ta.forecast[ta.forecast.length - 1];
            if (lastForecast.value > price * 1.05) {
              score += 15;
              reasoning.push(`Forecast projects ${((lastForecast.value / price - 1) * 100).toFixed(1)}% upside — algorithmic model is bullish`);
            }
          }

          if (score > (best?.score || 0) && reasoning.length >= 3) {
            // Build trade plan
            const support = ta.indicators?.support || price * 0.93;
            const resistance = ta.indicators?.resistance || price * 1.15;
            const stopLoss = support * 0.97;
            const takeProfit = resistance * 1.05;
            const riskReward = ((takeProfit - price) / (price - stopLoss)).toFixed(1);

            best = {
              id: coinId,
              name: coinData.name,
              symbol: coinData.symbol?.toUpperCase(),
              image: coinData.image?.small || '',
              price,
              score,
              reasoning,
              plan: {
                entry: `Buy at market (${fmtPrice(price)}) or set limit order at ${fmtPrice(price * 0.98)} for a better entry`,
                stopLoss: `${fmtPrice(stopLoss)} (${((1 - stopLoss / price) * 100).toFixed(1)}% below entry)`,
                takeProfit: `${fmtPrice(takeProfit)} (${((takeProfit / price - 1) * 100).toFixed(1)}% above entry)`,
                timeframe: '2-4 weeks for the breakout to play out',
                riskReward: `${riskReward}:1 risk/reward ratio`,
              },
            };
          }
        } catch {
          // Skip failed coins
        }
      }

      setResult(best);
    } catch {
      setResult(null);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="bg-sf-card border border-border rounded-xl p-3 sm:p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm sm:text-base font-semibold text-foreground">🚀 Breakout Finder</h3>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
            Scans {SCAN_IDS.length} assets for breakout setups using RSI, Bollinger Bands, MACD & volume analysis
          </p>
        </div>
        <button
          onClick={scan}
          disabled={scanning}
          className="px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          {scanning ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin">⏳</span> Scanning...
            </span>
          ) : (
            '🔍 Find Breakout'
          )}
        </button>
      </div>

      {scanning && (
        <div className="text-center py-8">
          <p className="text-primary font-mono text-xs animate-pulse">
            Analysing {SCAN_IDS.length} assets for breakout patterns...
          </p>
          <p className="text-[10px] text-muted-foreground mt-2">Checking RSI, Bollinger Bands, MACD, volume & forecasts</p>
        </div>
      )}

      {result && !scanning && (
        <div className="space-y-4">
          {/* Asset header */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
            {result.image && <img src={result.image} alt={result.name} className="w-8 h-8 rounded-full" />}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-foreground">{result.name}</span>
                <span className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-1.5 rounded">{result.symbol}</span>
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  Score: {result.score}/120
                </span>
              </div>
              <span className="text-xs font-mono text-foreground">{fmtPrice(result.price)}</span>
            </div>
            <button
              onClick={() => onSelect(result.id)}
              className="px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 transition-all"
            >
              📈 Full Analysis
            </button>
          </div>

          {/* Reasoning */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold text-foreground">💡 Why This Asset?</h4>
            {result.reasoning.map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-[10px] sm:text-xs text-muted-foreground">
                <span className="text-positive shrink-0 mt-0.5">✓</span>
                <span>{r}</span>
              </div>
            ))}
          </div>

          {/* Trade plan */}
          <div className="space-y-2 bg-background/50 border border-border/50 rounded-lg p-3">
            <h4 className="text-xs font-semibold text-foreground">📋 Profit Plan</h4>
            <div className="space-y-1.5">
              {[
                { label: '1. ENTRY', value: result.plan.entry, icon: '🟢' },
                { label: '2. STOP LOSS', value: result.plan.stopLoss, icon: '🔴' },
                { label: '3. TAKE PROFIT', value: result.plan.takeProfit, icon: '🎯' },
                { label: '4. TIMEFRAME', value: result.plan.timeframe, icon: '⏱️' },
                { label: '5. RISK/REWARD', value: result.plan.riskReward, icon: '⚖️' },
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="shrink-0 text-xs">{step.icon}</span>
                  <div>
                    <span className="text-[9px] font-mono text-muted-foreground uppercase">{step.label}</span>
                    <p className="text-[10px] sm:text-xs text-foreground">{step.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[9px] text-muted-foreground/60 italic text-center">
            ⚠️ Algorithmic analysis only — not financial advice. Always manage your risk and only invest what you can afford to lose.
          </p>
        </div>
      )}

      {result === null && !scanning && (
        <p className="text-[10px] text-muted-foreground/60 text-center py-2">
          Hit the button to scan for the best breakout opportunity right now
        </p>
      )}
    </div>
  );
}
