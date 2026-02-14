interface Props {
  text: string;
  marketPhase: string;
}

const phaseExplanations: Record<string, string> = {
  'Markup / Uptrend': 'Price is in a clear upward trend — higher highs and higher lows. This is when bulls are in control.',
  'Markdown / Downtrend': 'Price is in a clear downward trend — lower highs and lower lows. Bears are in control.',
  'Distribution': 'Price has peaked and smart money may be selling. The trend could reverse downward soon.',
  'Accumulation': 'Price has bottomed and smart money may be buying. The trend could reverse upward soon.',
  'Consolidation': 'Price is moving sideways in a tight range. A breakout (up or down) may be coming.',
  'Recovery': 'Price is starting to bounce back after a decline. Early signs of a potential uptrend.',
  'Decline': 'Price is drifting lower with weakening momentum. Could continue down or find support.',
};

export default function AnalysisPanel({ text, marketPhase }: Props) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return (
    <div className="bg-sf-card border border-border rounded-xl p-3 sm:p-5 space-y-4">
      <h3 className="text-foreground font-semibold text-sm">Technical Analysis Summary</h3>

      {/* Market phase explanation */}
      <div className="bg-sf-inset rounded-lg p-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-accent/15 text-accent">{marketPhase}</span>
          <span className="text-[10px] text-muted-foreground">Current Market Phase</span>
        </div>
        <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
          {phaseExplanations[marketPhase] || 'The current market conditions are being assessed.'}
        </p>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">
        {parts.map((part, i) =>
          part.startsWith('**') && part.endsWith('**')
            ? <strong key={i} className="text-foreground font-mono">{part.slice(2, -2)}</strong>
            : <span key={i}>{part}</span>
        )}
      </p>

      {/* Glossary */}
      <div className="border-t border-border pt-3">
        <p className="text-[10px] text-muted-foreground/60 mb-2 font-semibold uppercase tracking-wider">Quick Glossary</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10px] text-muted-foreground/70">
          <div><strong className="text-foreground/70">RSI</strong> — Momentum indicator (0-100). &lt;30 = oversold, &gt;70 = overbought</div>
          <div><strong className="text-foreground/70">SMA</strong> — Simple Moving Average, smooths price over a period</div>
          <div><strong className="text-foreground/70">Golden Cross</strong> — SMA20 crosses above SMA50 (bullish)</div>
          <div><strong className="text-foreground/70">Death Cross</strong> — SMA20 crosses below SMA50 (bearish)</div>
          <div><strong className="text-foreground/70">Volatility</strong> — How much the price swings daily (higher = riskier)</div>
          <div><strong className="text-foreground/70">Projected Target</strong> — Where the algorithm thinks the price is heading</div>
        </div>
      </div>
    </div>
  );
}
