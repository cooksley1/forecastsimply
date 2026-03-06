import { useState, useCallback, useMemo } from 'react';
import { sma, ema, rsi, macd, bollingerBands, stochastic, calcOBV } from '@/analysis/indicators';
import { fetchEquityHistory, fetchCryptoHistory } from '@/services/fetcher';
import type { AssetType } from '@/types/assets';

/* ── Condition definitions ── */
export type ConditionOp = 'lt' | 'gt' | 'crosses_above' | 'crosses_below';

export interface ScreenerCondition {
  id: string;
  indicator: string;
  op: ConditionOp;
  value: number;
  enabled: boolean;
}

const INDICATOR_OPTIONS = [
  { id: 'rsi14', label: 'RSI (14)', desc: 'Relative Strength Index' },
  { id: 'sma20_pos', label: 'Price vs SMA 20', desc: 'Price relative to 20-period SMA (%)' },
  { id: 'sma50_pos', label: 'Price vs SMA 50', desc: 'Price relative to 50-period SMA (%)' },
  { id: 'macd_hist', label: 'MACD Histogram', desc: 'MACD histogram value (momentum)' },
  { id: 'bb_pct', label: 'Bollinger %B', desc: '0 = lower band, 100 = upper band' },
  { id: 'stoch_k', label: 'Stochastic %K', desc: 'Stochastic oscillator %K' },
  { id: 'obv_slope', label: 'OBV Slope', desc: 'On-Balance Volume trend (+ = bullish)' },
  { id: 'change_pct', label: 'Price Change %', desc: 'Period price change percentage' },
];

const OP_LABELS: Record<ConditionOp, string> = {
  lt: '<', gt: '>', crosses_above: 'crosses above', crosses_below: 'crosses below',
};

const PRESETS: { label: string; icon: string; conditions: Omit<ScreenerCondition, 'id'>[] }[] = [
  {
    label: 'Oversold Reversal',
    icon: '🔄',
    conditions: [
      { indicator: 'rsi14', op: 'lt', value: 30, enabled: true },
      { indicator: 'bb_pct', op: 'lt', value: 10, enabled: true },
      { indicator: 'macd_hist', op: 'gt', value: 0, enabled: true },
    ],
  },
  {
    label: 'Bullish Momentum',
    icon: '🚀',
    conditions: [
      { indicator: 'rsi14', op: 'gt', value: 50, enabled: true },
      { indicator: 'sma20_pos', op: 'gt', value: 0, enabled: true },
      { indicator: 'macd_hist', op: 'gt', value: 0, enabled: true },
    ],
  },
  {
    label: 'Overbought Warning',
    icon: '⚠️',
    conditions: [
      { indicator: 'rsi14', op: 'gt', value: 70, enabled: true },
      { indicator: 'bb_pct', op: 'gt', value: 90, enabled: true },
    ],
  },
  {
    label: 'Mean Reversion',
    icon: '↩️',
    conditions: [
      { indicator: 'sma50_pos', op: 'lt', value: -5, enabled: true },
      { indicator: 'rsi14', op: 'lt', value: 40, enabled: true },
      { indicator: 'obv_slope', op: 'gt', value: 0, enabled: true },
    ],
  },
];

function computeIndicatorValue(
  indicator: string,
  closes: number[],
  volumes: number[],
): number | null {
  if (closes.length < 30) return null;
  const last = closes.length - 1;

  switch (indicator) {
    case 'rsi14': {
      const vals = rsi(closes, 14);
      return isNaN(vals[last]) ? null : vals[last];
    }
    case 'sma20_pos': {
      const s = sma(closes, 20);
      const sv = s[last];
      return isNaN(sv) || sv === 0 ? null : ((closes[last] - sv) / sv) * 100;
    }
    case 'sma50_pos': {
      const s = sma(closes, 50);
      const sv = s[last];
      return isNaN(sv) || sv === 0 ? null : ((closes[last] - sv) / sv) * 100;
    }
    case 'macd_hist': {
      const m = macd(closes);
      return m.histogram[last] || null;
    }
    case 'bb_pct': {
      const bb = bollingerBands(closes, 20, 2);
      const upper = bb.upper[last];
      const lower = bb.lower[last];
      if (isNaN(upper) || isNaN(lower) || upper === lower) return null;
      return ((closes[last] - lower) / (upper - lower)) * 100;
    }
    case 'stoch_k': {
      const st = stochastic(closes);
      return isNaN(st.k[last]) ? null : st.k[last];
    }
    case 'obv_slope': {
      if (!volumes.length) return null;
      const obv = calcOBV(closes, volumes);
      const lookback = Math.min(10, obv.length - 1);
      if (lookback < 2) return null;
      return obv[last] - obv[last - lookback] > 0 ? 1 : -1;
    }
    case 'change_pct': {
      if (closes.length < 2) return null;
      return ((closes[last] - closes[0]) / closes[0]) * 100;
    }
    default:
      return null;
  }
}

function evaluateCondition(cond: ScreenerCondition, val: number | null): boolean {
  if (val === null) return false;
  switch (cond.op) {
    case 'lt': return val < cond.value;
    case 'gt': return val > cond.value;
    case 'crosses_above': return val > cond.value; // simplified
    case 'crosses_below': return val < cond.value;
    default: return false;
  }
}

function conditionToEnglish(cond: ScreenerCondition): string {
  const ind = INDICATOR_OPTIONS.find(i => i.id === cond.indicator);
  return `${ind?.label || cond.indicator} ${OP_LABELS[cond.op]} ${cond.value}`;
}

export interface ScreenerResult {
  symbol: string;
  name: string;
  price: number;
  matchedConditions: number;
  totalConditions: number;
  indicatorValues: Record<string, number | null>;
}

interface Props {
  assetType: AssetType;
  picks: { id: string; label: string; name?: string }[];
  onSelect: (id: string) => void;
}

let nextId = 0;
const makeId = () => `cond_${nextId++}`;

export default function ConditionScreener({ assetType, picks, onSelect }: Props) {
  const [conditions, setConditions] = useState<ScreenerCondition[]>([]);
  const [results, setResults] = useState<ScreenerResult[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const addCondition = useCallback(() => {
    setConditions(prev => [...prev, { id: makeId(), indicator: 'rsi14', op: 'lt', value: 30, enabled: true }]);
  }, []);

  const removeCondition = useCallback((id: string) => {
    setConditions(prev => prev.filter(c => c.id !== id));
  }, []);

  const updateCondition = useCallback((id: string, patch: Partial<ScreenerCondition>) => {
    setConditions(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
  }, []);

  const loadPreset = useCallback((preset: typeof PRESETS[number]) => {
    setConditions(preset.conditions.map(c => ({ ...c, id: makeId() })));
    setResults([]);
  }, []);

  const enabledConditions = useMemo(() => conditions.filter(c => c.enabled), [conditions]);

  const runScan = useCallback(async () => {
    if (enabledConditions.length === 0) return;
    setScanning(true);
    setResults([]);
    setScanned(0);

    const scanPicks = picks.slice(0, 50); // cap at 50 for performance
    const scanResults: ScreenerResult[] = [];

    const fetchOne = async (pick: { id: string; label: string; name?: string }) => {
      try {
        let closes: number[], volumes: number[] = [];
        if (assetType === 'crypto') {
          const r = await fetchCryptoHistory(pick.id, 90);
          closes = r.priceData.closes;
          volumes = r.priceData.volumes || [];
        } else {
          const r = await fetchEquityHistory(pick.id, 90);
          closes = r.data.closes;
          volumes = r.data.volumes || [];
        }

        const indicatorValues: Record<string, number | null> = {};
        let matched = 0;
        for (const cond of enabledConditions) {
          const val = computeIndicatorValue(cond.indicator, closes, volumes);
          indicatorValues[cond.indicator] = val;
          if (evaluateCondition(cond, val)) matched++;
        }

        if (matched > 0) {
          scanResults.push({
            symbol: pick.label,
            name: pick.name || pick.label,
            price: closes[closes.length - 1],
            matchedConditions: matched,
            totalConditions: enabledConditions.length,
            indicatorValues,
          });
        }
      } catch { /* skip */ }
      setScanned(prev => prev + 1);
    };

    // Process in batches of 4
    for (let i = 0; i < scanPicks.length; i += 4) {
      await Promise.all(scanPicks.slice(i, i + 4).map(fetchOne));
    }

    scanResults.sort((a, b) => b.matchedConditions - a.matchedConditions);
    setResults(scanResults);
    setScanning(false);
  }, [enabledConditions, picks, assetType]);

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full bg-card border border-border rounded-xl p-4 text-left hover:border-primary/30 transition-all group"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              🔍 Multi-Condition Screener
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Filter assets by combining technical indicator conditions
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
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          🔍 Multi-Condition Screener
        </h3>
        <button onClick={() => setExpanded(false)} className="text-xs text-muted-foreground hover:text-foreground">Collapse</button>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map(p => (
          <button
            key={p.label}
            onClick={() => loadPreset(p)}
            className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-secondary/60 border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
          >
            {p.icon} {p.label}
          </button>
        ))}
      </div>

      {/* Conditions */}
      <div className="space-y-2">
        {conditions.map((cond, i) => (
          <div key={cond.id} className="flex items-center gap-2 flex-wrap bg-muted/30 rounded-lg p-2">
            {i > 0 && <span className="text-[10px] font-mono text-primary">AND</span>}
            <select
              value={cond.indicator}
              onChange={e => updateCondition(cond.id, { indicator: e.target.value })}
              className="text-[11px] bg-background border border-border rounded px-2 py-1 text-foreground"
            >
              {INDICATOR_OPTIONS.map(o => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
            <select
              value={cond.op}
              onChange={e => updateCondition(cond.id, { op: e.target.value as ConditionOp })}
              className="text-[11px] bg-background border border-border rounded px-2 py-1 text-foreground"
            >
              {(Object.entries(OP_LABELS) as [ConditionOp, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <input
              type="number"
              value={cond.value}
              onChange={e => updateCondition(cond.id, { value: Number(e.target.value) })}
              className="w-16 text-[11px] bg-background border border-border rounded px-2 py-1 text-foreground"
            />
            <button onClick={() => removeCondition(cond.id)} className="text-destructive text-xs hover:text-destructive/80">✕</button>
          </div>
        ))}
        <button onClick={addCondition} className="text-[11px] text-primary hover:text-primary/80 font-medium">
          + Add condition
        </button>
      </div>

      {/* Plain English summary */}
      {enabledConditions.length > 0 && (
        <div className="bg-primary/5 border border-primary/15 rounded-lg p-2.5">
          <p className="text-[11px] text-foreground leading-relaxed">
            <span className="font-medium">Scanning for:</span>{' '}
            {enabledConditions.map((c, i) => (
              <span key={c.id}>
                {i > 0 && <span className="text-primary font-mono"> AND </span>}
                <span className="font-medium">{conditionToEnglish(c)}</span>
              </span>
            ))}
          </p>
        </div>
      )}

      {/* Scan button */}
      <button
        onClick={runScan}
        disabled={scanning || enabledConditions.length === 0}
        className="w-full px-4 py-2 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all"
      >
        {scanning ? `Scanning... (${scanned}/${Math.min(picks.length, 50)})` : `Scan ${Math.min(picks.length, 50)} assets`}
      </button>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] text-muted-foreground font-mono">{results.length} matches found</p>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {results.map(r => (
              <button
                key={r.symbol}
                onClick={() => onSelect(r.symbol)}
                className="w-full flex items-center justify-between bg-muted/30 hover:bg-muted/50 rounded-lg p-2 text-left transition-all"
              >
                <div>
                  <span className="text-xs font-medium text-foreground">{r.symbol}</span>
                  <span className="text-[10px] text-muted-foreground ml-2">{r.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-muted-foreground">${r.price.toFixed(2)}</span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                    r.matchedConditions === r.totalConditions
                      ? 'bg-positive/15 text-positive'
                      : 'bg-warning/15 text-warning'
                  }`}>
                    {r.matchedConditions}/{r.totalConditions}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {!scanning && results.length === 0 && scanned > 0 && (
        <p className="text-[10px] text-muted-foreground text-center py-2">No assets match all conditions. Try relaxing your filters.</p>
      )}
    </div>
  );
}
