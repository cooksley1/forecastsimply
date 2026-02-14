import { useState, useEffect } from 'react';
import { getCoinChart, getCoinData, getTopCoins, getTrendingCoins } from '@/services/api/coingecko';
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

const STORAGE_KEY = 'sf_breakout_custom';

interface Props {
  onSelect: (id: string) => void;
}

export default function BreakoutFinder({ onSelect }: Props) {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<BreakoutResult | null>(null);
  const [scanStatus, setScanStatus] = useState('');
  const [totalToScan, setTotalToScan] = useState(0);
  const [scannedCount, setScannedCount] = useState(0);
  const [customCoins, setCustomCoins] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  });
  const [customInput, setCustomInput] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customCoins));
  }, [customCoins]);

  const addCustomCoin = () => {
    const val = customInput.trim().toLowerCase();
    if (val && !customCoins.includes(val)) {
      setCustomCoins(prev => [...prev, val]);
    }
    setCustomInput('');
  };

  const scan = async () => {
    setScanning(true);
    setResult(null);
    setScanStatus('Building scan list...');
    setScannedCount(0);

    try {
      // 1. Gather IDs from all three sources
      const allIds = new Set<string>();

      // Top by market cap
      try {
        setScanStatus('Fetching top coins by market cap...');
        const topCoins = await getTopCoins(15);
        for (const c of topCoins) allIds.add(c.id);
      } catch { /* silent */ }

      // Trending
      try {
        setScanStatus('Fetching trending coins...');
        const trending = await getTrendingCoins();
        for (const c of trending) allIds.add(c.id);
      } catch { /* silent */ }

      // User custom list
      for (const id of customCoins) allIds.add(id);

      const scanList = Array.from(allIds);
      setTotalToScan(scanList.length);
      setScanStatus(`Scanning ${scanList.length} assets...`);

      let best: BreakoutResult | null = null;
      let count = 0;

      for (const coinId of scanList) {
        count++;
        setScannedCount(count);
        setScanStatus(`Analysing ${coinId} (${count}/${scanList.length})...`);

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

          let score = 0;
          const reasoning: string[] = [];

          // 1. RSI
          const rsiArr = ta.indicators?.rsi;
          const lastRsi = rsiArr?.length ? rsiArr[rsiArr.length - 1] : undefined;
          if (lastRsi !== undefined && lastRsi >= 45 && lastRsi <= 65) {
            score += 25;
            reasoning.push(`RSI at ${lastRsi.toFixed(1)} — in the "launch zone" (not overbought, building momentum)`);
          } else if (lastRsi !== undefined && lastRsi >= 35 && lastRsi < 45) {
            score += 10;
            reasoning.push(`RSI at ${lastRsi.toFixed(1)} — recovering from oversold, potential reversal`);
          }

          // 2. Moving averages
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

          // 3. Bollinger Band squeeze
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

          // 4. MACD
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

          // 5. Volume trend
          if (vols.length > 14) {
            const recentVol = vols.slice(-7).reduce((a: number, b: number) => a + b, 0) / 7;
            const priorVol = vols.slice(-14, -7).reduce((a: number, b: number) => a + b, 0) / 7;
            if (recentVol > priorVol * 1.2) {
              score += 15;
              reasoning.push(`Volume increasing ${((recentVol / priorVol - 1) * 100).toFixed(0)}% week-over-week — smart money accumulating`);
            }
          }

          // 6. Forecast
          if (ta.forecast && ta.forecast.length > 0) {
            const lastForecast = ta.forecast[ta.forecast.length - 1];
            if (lastForecast.value > price * 1.05) {
              score += 15;
              reasoning.push(`Forecast projects ${((lastForecast.value / price - 1) * 100).toFixed(1)}% upside — algorithmic model is bullish`);
            }
          }

          if (score > (best?.score || 0) && reasoning.length >= 3) {
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
      setScanStatus('');
    } catch {
      setResult(null);
      setScanStatus('');
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="bg-sf-card border border-border rounded-xl p-3 sm:p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm sm:text-base font-semibold text-foreground">🚀 Breakout Finder</h3>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
            Scans trending + top market cap + your custom picks using RSI, Bollinger Bands, MACD & volume
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCustom(!showCustom)}
            className="px-3 py-2 rounded-lg text-[10px] sm:text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all"
          >
            ⚙️ Custom List {customCoins.length > 0 && `(${customCoins.length})`}
          </button>
          <button
            onClick={scan}
            disabled={scanning}
            className="px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {scanning ? '⏳ Scanning...' : '🔍 Find Breakout'}
          </button>
        </div>
      </div>

      {/* Custom coin list editor */}
      {showCustom && (
        <div className="border border-border rounded-lg p-3 space-y-2 bg-background/50">
          <p className="text-[10px] text-muted-foreground">Add CoinGecko IDs (e.g. "bitcoin", "solana", "pepe"). These get scanned alongside trending & top coins.</p>
          <div className="flex gap-2">
            <input
              value={customInput}
              onChange={e => setCustomInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCustomCoin()}
              placeholder="e.g. dogecoin"
              className="flex-1 bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
            />
            <button onClick={addCustomCoin} className="px-3 py-1.5 rounded-lg text-xs bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30">
              Add
            </button>
          </div>
          {customCoins.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {customCoins.map(c => (
                <span key={c} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-muted/50 text-muted-foreground border border-border">
                  {c}
                  <button onClick={() => setCustomCoins(prev => prev.filter(x => x !== c))} className="text-destructive hover:text-destructive/80">×</button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Scanning progress */}
      {scanning && (
        <div className="text-center py-8 space-y-2">
          <p className="text-primary font-mono text-xs animate-pulse">{scanStatus}</p>
          {totalToScan > 0 && (
            <div className="max-w-xs mx-auto">
              <div className="h-1.5 bg-border rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${(scannedCount / totalToScan) * 100}%` }} />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{scannedCount} / {totalToScan} analysed</p>
            </div>
          )}
        </div>
      )}

      {result && !scanning && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
            {result.image && <img src={result.image} alt={result.name} className="w-8 h-8 rounded-full" />}
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
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

          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold text-foreground">💡 Why This Asset?</h4>
            {result.reasoning.map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-[10px] sm:text-xs text-muted-foreground">
                <span className="text-positive shrink-0 mt-0.5">✓</span>
                <span>{r}</span>
              </div>
            ))}
          </div>

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
          Hit the button to scan trending, top market cap, and your custom coins for breakout setups
        </p>
      )}
    </div>
  );
}
