import { useState, useCallback, useMemo } from 'react';

/* ── Indicator + Condition types ── */
type IndicatorId = 'rsi' | 'sma20' | 'sma50' | 'sma200' | 'ema12' | 'ema26' | 'macd_line' | 'macd_signal' | 'bb_upper' | 'bb_lower' | 'stoch_k' | 'price';
type ConditionType = 'crosses_above' | 'crosses_below' | 'gt' | 'lt';

interface BuilderCondition {
  id: number;
  left: IndicatorId;
  condition: ConditionType;
  right: IndicatorId | 'value';
  value: number;
}

interface CustomSignal {
  name: string;
  direction: 'buy' | 'sell';
  conditions: BuilderCondition[];
}

const INDICATORS: { id: IndicatorId; label: string; group: string }[] = [
  { id: 'price', label: 'Price', group: 'Price' },
  { id: 'rsi', label: 'RSI (14)', group: 'Oscillators' },
  { id: 'stoch_k', label: 'Stochastic %K', group: 'Oscillators' },
  { id: 'macd_line', label: 'MACD Line', group: 'MACD' },
  { id: 'macd_signal', label: 'MACD Signal', group: 'MACD' },
  { id: 'sma20', label: 'SMA 20', group: 'Moving Avg' },
  { id: 'sma50', label: 'SMA 50', group: 'Moving Avg' },
  { id: 'sma200', label: 'SMA 200', group: 'Moving Avg' },
  { id: 'ema12', label: 'EMA 12', group: 'Moving Avg' },
  { id: 'ema26', label: 'EMA 26', group: 'Moving Avg' },
  { id: 'bb_upper', label: 'BB Upper', group: 'Bollinger' },
  { id: 'bb_lower', label: 'BB Lower', group: 'Bollinger' },
];

const CONDITIONS: { id: ConditionType; label: string; desc: string }[] = [
  { id: 'crosses_above', label: 'crosses above', desc: 'value changes from below to above' },
  { id: 'crosses_below', label: 'crosses below', desc: 'value changes from above to below' },
  { id: 'gt', label: 'is above', desc: 'current value is greater than' },
  { id: 'lt', label: 'is below', desc: 'current value is less than' },
];

const TEMPLATES: { label: string; icon: string; signal: CustomSignal }[] = [
  {
    label: 'Golden Cross',
    icon: '✨',
    signal: {
      name: 'Golden Cross',
      direction: 'buy',
      conditions: [
        { id: 1, left: 'sma50', condition: 'crosses_above', right: 'sma200', value: 0 },
        { id: 2, left: 'rsi', condition: 'gt', right: 'value', value: 50 },
      ],
    },
  },
  {
    label: 'Death Cross',
    icon: '💀',
    signal: {
      name: 'Death Cross',
      direction: 'sell',
      conditions: [
        { id: 1, left: 'sma50', condition: 'crosses_below', right: 'sma200', value: 0 },
        { id: 2, left: 'rsi', condition: 'lt', right: 'value', value: 50 },
      ],
    },
  },
  {
    label: 'MACD Bullish',
    icon: '📊',
    signal: {
      name: 'MACD Bullish Crossover',
      direction: 'buy',
      conditions: [
        { id: 1, left: 'macd_line', condition: 'crosses_above', right: 'macd_signal', value: 0 },
        { id: 2, left: 'price', condition: 'gt', right: 'sma20', value: 0 },
      ],
    },
  },
  {
    label: 'Oversold Entry',
    icon: '🎯',
    signal: {
      name: 'Oversold Entry',
      direction: 'buy',
      conditions: [
        { id: 1, left: 'rsi', condition: 'lt', right: 'value', value: 30 },
        { id: 2, left: 'price', condition: 'lt', right: 'bb_lower', value: 0 },
      ],
    },
  },
];

let nextCondId = 100;

interface Props {
  onSaveSignal?: (signal: CustomSignal) => void;
}

export default function IndicatorBuilder({ onSaveSignal }: Props) {
  const [signal, setSignal] = useState<CustomSignal>({
    name: 'Custom Signal',
    direction: 'buy',
    conditions: [],
  });
  const [expanded, setExpanded] = useState(false);

  const addCondition = useCallback(() => {
    setSignal(prev => ({
      ...prev,
      conditions: [...prev.conditions, { id: nextCondId++, left: 'rsi', condition: 'lt', right: 'value', value: 30 }],
    }));
  }, []);

  const removeCondition = useCallback((id: number) => {
    setSignal(prev => ({
      ...prev,
      conditions: prev.conditions.filter(c => c.id !== id),
    }));
  }, []);

  const updateCondition = useCallback((id: number, patch: Partial<BuilderCondition>) => {
    setSignal(prev => ({
      ...prev,
      conditions: prev.conditions.map(c => c.id === id ? { ...c, ...patch } : c),
    }));
  }, []);

  const loadTemplate = useCallback((template: typeof TEMPLATES[number]) => {
    setSignal({ ...template.signal, conditions: template.signal.conditions.map(c => ({ ...c, id: nextCondId++ })) });
  }, []);

  const plainEnglish = useMemo(() => {
    if (signal.conditions.length === 0) return '';
    const parts = signal.conditions.map(c => {
      const left = INDICATORS.find(i => i.id === c.left)?.label || c.left;
      const cond = CONDITIONS.find(cn => cn.id === c.condition)?.label || c.condition;
      const right = c.right === 'value'
        ? String(c.value)
        : (INDICATORS.find(i => i.id === c.right)?.label || c.right);
      return `${left} ${cond} ${right}`;
    });
    return `${signal.direction === 'buy' ? '🟢 BUY' : '🔴 SELL'} when ${parts.join(' AND ')}`;
  }, [signal]);

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full bg-card border border-border rounded-xl p-4 text-left hover:border-primary/30 transition-all group"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              🛠️ Signal Builder
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Combine indicators to create custom buy/sell signals — no code required
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
        <h3 className="text-sm font-semibold text-foreground">🛠️ Signal Builder</h3>
        <button onClick={() => setExpanded(false)} className="text-xs text-muted-foreground hover:text-foreground">Collapse</button>
      </div>

      {/* Templates */}
      <div className="flex flex-wrap gap-1.5">
        {TEMPLATES.map(t => (
          <button
            key={t.label}
            onClick={() => loadTemplate(t)}
            className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-secondary/60 border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Signal header */}
      <div className="flex items-center gap-2">
        <input
          value={signal.name}
          onChange={e => setSignal(prev => ({ ...prev, name: e.target.value }))}
          className="flex-1 text-xs bg-background border border-border rounded-lg px-2 py-1.5 text-foreground"
          placeholder="Signal name"
        />
        <select
          value={signal.direction}
          onChange={e => setSignal(prev => ({ ...prev, direction: e.target.value as 'buy' | 'sell' }))}
          className={`text-[11px] font-medium rounded-lg px-2.5 py-1.5 border ${
            signal.direction === 'buy'
              ? 'bg-positive/10 text-positive border-positive/30'
              : 'bg-destructive/10 text-destructive border-destructive/30'
          }`}
        >
          <option value="buy">🟢 BUY Signal</option>
          <option value="sell">🔴 SELL Signal</option>
        </select>
      </div>

      {/* Conditions */}
      <div className="space-y-2">
        {signal.conditions.map((cond, i) => (
          <div key={cond.id} className="flex items-center gap-1.5 flex-wrap bg-muted/30 rounded-lg p-2">
            {i > 0 && <span className="text-[10px] font-mono text-primary font-medium">AND</span>}
            <select
              value={cond.left}
              onChange={e => updateCondition(cond.id, { left: e.target.value as IndicatorId })}
              className="text-[11px] bg-background border border-border rounded px-1.5 py-1 text-foreground"
            >
              {INDICATORS.map(ind => (
                <option key={ind.id} value={ind.id}>{ind.label}</option>
              ))}
            </select>
            <select
              value={cond.condition}
              onChange={e => updateCondition(cond.id, { condition: e.target.value as ConditionType })}
              className="text-[11px] bg-background border border-border rounded px-1.5 py-1 text-foreground"
            >
              {CONDITIONS.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
            <select
              value={cond.right}
              onChange={e => updateCondition(cond.id, { right: e.target.value as IndicatorId | 'value' })}
              className="text-[11px] bg-background border border-border rounded px-1.5 py-1 text-foreground"
            >
              <option value="value">Fixed value</option>
              {INDICATORS.filter(ind => ind.id !== cond.left).map(ind => (
                <option key={ind.id} value={ind.id}>{ind.label}</option>
              ))}
            </select>
            {cond.right === 'value' && (
              <input
                type="text"
                inputMode="decimal"
                value={cond.value}
                onChange={e => { const v = e.target.value; if (v === '' || v === '-' || !isNaN(Number(v))) updateCondition(cond.id, { value: v === '' || v === '-' ? v as any : Number(v) }); }}
                className="w-16 text-[11px] bg-background border border-border rounded px-1.5 py-1 text-foreground"
              />
            )}
            <button onClick={() => removeCondition(cond.id)} className="text-destructive text-xs hover:text-destructive/80 ml-auto">✕</button>
          </div>
        ))}
        <button onClick={addCondition} className="text-[11px] text-primary hover:text-primary/80 font-medium">
          + Add condition
        </button>
      </div>

      {/* Plain English output */}
      {plainEnglish && (
        <div className="bg-primary/5 border border-primary/15 rounded-lg p-2.5">
          <p className="text-[11px] text-foreground font-medium leading-relaxed">{plainEnglish}</p>
        </div>
      )}

      {/* Save */}
      {signal.conditions.length > 0 && onSaveSignal && (
        <button
          onClick={() => onSaveSignal(signal)}
          className="w-full px-4 py-2 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
        >
          Save Signal
        </button>
      )}

      {/* Educational note */}
      <div className="bg-muted/30 rounded-lg p-2.5 space-y-1">
        <p className="text-[10px] text-muted-foreground font-medium">💡 How signals work</p>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Signals trigger when ALL conditions are true simultaneously. For example, a "Golden Cross" signal fires when the 50-day SMA crosses above the 200-day SMA — historically a strong bullish indicator. Combine multiple conditions to reduce false positives.
        </p>
      </div>
    </div>
  );
}
