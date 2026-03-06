import { Info, TrendingUp, TrendingDown, ArrowRight, Pause, RefreshCw, ArrowDown } from 'lucide-react';

interface Props {
  text: string;
  marketPhase: string;
}

const phaseExplanations: Record<string, { description: string; whatToDo: string; icon: typeof TrendingUp }> = {
  'Markup / Uptrend': {
    description: 'Price is making higher highs and higher lows — like climbing stairs. Each dip is higher than the last. Bulls (buyers) are in control.',
    whatToDo: 'Look for buying opportunities on dips. Set stop-losses below recent lows to protect profits.',
    icon: TrendingUp,
  },
  'Markdown / Downtrend': {
    description: 'Price is making lower highs and lower lows — like going down stairs. Each bounce is weaker than the last. Bears (sellers) are in control.',
    whatToDo: 'Avoid buying. If you hold this asset, consider setting tight stop-losses or reducing your position.',
    icon: TrendingDown,
  },
  'Distribution': {
    description: 'Price has peaked and is trading sideways at the top. "Smart money" (large investors) may be quietly selling before a drop.',
    whatToDo: 'Be cautious about opening new positions. Tighten stop-losses on existing holdings. Watch for a breakdown below support.',
    icon: ArrowDown,
  },
  'Accumulation': {
    description: 'Price has bottomed and is trading sideways at the low. "Smart money" may be quietly buying before a rally.',
    whatToDo: 'Start watching for a breakout above resistance. Consider small initial positions with wider stop-losses.',
    icon: RefreshCw,
  },
  'Consolidation': {
    description: 'Price is moving sideways in a tight range — coiling like a spring. A big move (up or down) often follows.',
    whatToDo: 'Wait for a clear breakout before acting. Set alerts above resistance and below support so you don\'t miss the move.',
    icon: Pause,
  },
  'Recovery': {
    description: 'Price is bouncing back after a decline. Early signs of strength are appearing, but it\'s not yet confirmed as a full uptrend.',
    whatToDo: 'Watch for confirmation — if price breaks above recent resistance, it could signal a trend change. Start with small positions.',
    icon: RefreshCw,
  },
  'Decline': {
    description: 'Price is drifting lower with weakening momentum. Not a sharp crash, but a slow grind down.',
    whatToDo: 'Avoid catching falling knives. Wait for a clear support level to form before considering any entry.',
    icon: ArrowDown,
  },
};

export default function AnalysisPanel({ text, marketPhase }: Props) {
  const phase = phaseExplanations[marketPhase];
  const PhaseIcon = phase?.icon || Pause;

  // Parse the analysis text into clean sections
  const sections = text.split(/\n/).filter(Boolean);

  return (
    <div className="bg-card border border-border rounded-xl p-3 sm:p-5 space-y-4">
      {/* Section header with explainer */}
      <div>
        <h3 className="text-foreground font-semibold text-sm">Technical Analysis Summary</h3>
        <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
          This is an automated summary of what the charts and indicators are telling us.
          It translates complex data into plain language so you can understand the current situation at a glance.
        </p>
      </div>

      {/* Market phase card */}
      <div className="bg-muted/30 rounded-lg p-3 space-y-2">
        <div className="flex items-center gap-2">
          <PhaseIcon className="w-4 h-4 text-primary shrink-0" />
          <span className="text-xs font-semibold text-foreground">{marketPhase}</span>
          <span className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">Current Phase</span>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {phase?.description || 'The current market conditions are being assessed.'}
        </p>
        {phase?.whatToDo && (
          <div className="flex items-start gap-1.5 pt-1 border-t border-border/40">
            <ArrowRight className="w-3 h-3 text-primary mt-0.5 shrink-0" />
            <p className="text-[11px] text-primary/90 leading-relaxed font-medium">
              {phase.whatToDo}
            </p>
          </div>
        )}
      </div>

      {/* Parsed analysis sections */}
      <div className="space-y-2">
        {sections.map((section, i) => {
          // Parse **bold** markers
          const parts = section.split(/(\*\*[^*]+\*\*)/g);
          return (
            <div key={i} className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
              {parts.map((part, j) =>
                part.startsWith('**') && part.endsWith('**')
                  ? <strong key={j} className="text-foreground font-medium">{part.slice(2, -2)}</strong>
                  : <span key={j}>{part}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Beginner glossary */}
      <details className="border-t border-border pt-3 group">
        <summary className="flex items-center gap-1.5 cursor-pointer list-none text-[10px] text-muted-foreground hover:text-foreground transition-colors">
          <Info className="w-3 h-3" />
          <span className="font-semibold uppercase tracking-wider">Glossary — What do these terms mean?</span>
          <span className="group-open:rotate-90 transition-transform text-muted-foreground/40">▶</span>
        </summary>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3 text-[10px]">
          <div className="bg-muted/20 rounded-md p-2">
            <strong className="text-foreground">RSI (Relative Strength Index)</strong>
            <p className="text-muted-foreground mt-0.5 leading-relaxed">
              A momentum score from 0-100. Below 30 means the price has dropped a lot recently and might bounce back (oversold).
              Above 70 means it's risen fast and might pull back (overbought). Think of it as a "how stretched is the price?" meter.
            </p>
          </div>
          <div className="bg-muted/20 rounded-md p-2">
            <strong className="text-foreground">SMA (Simple Moving Average)</strong>
            <p className="text-muted-foreground mt-0.5 leading-relaxed">
              The average price over a set period (e.g., 20 days). It smooths out daily noise so you can see the real trend.
              When price is above the SMA, the trend is generally up. Below = generally down.
            </p>
          </div>
          <div className="bg-muted/20 rounded-md p-2">
            <strong className="text-foreground">MACD</strong>
            <p className="text-muted-foreground mt-0.5 leading-relaxed">
              Compares a fast and slow moving average. When the fast one crosses above the slow one, momentum is building upward (bullish).
              When it crosses below, momentum is fading (bearish). It tells you if the trend is getting stronger or weaker.
            </p>
          </div>
          <div className="bg-muted/20 rounded-md p-2">
            <strong className="text-foreground">Golden Cross / Death Cross</strong>
            <p className="text-muted-foreground mt-0.5 leading-relaxed">
              Golden Cross: short-term average crosses above long-term average — historically a bullish signal.
              Death Cross: the opposite — short-term drops below long-term, often bearish. These are trend-change warnings.
            </p>
          </div>
          <div className="bg-muted/20 rounded-md p-2">
            <strong className="text-foreground">Volatility</strong>
            <p className="text-muted-foreground mt-0.5 leading-relaxed">
              How much the price swings up and down each day. High volatility = bigger swings = more risk but more opportunity.
              Low volatility = stable, predictable movement. Helps you set appropriate stop-losses.
            </p>
          </div>
          <div className="bg-muted/20 rounded-md p-2">
            <strong className="text-foreground">Support & Resistance</strong>
            <p className="text-muted-foreground mt-0.5 leading-relaxed">
              Support: a price level where buyers tend to step in, preventing further drops (the "floor").
              Resistance: where sellers tend to appear, preventing further rises (the "ceiling"). Key levels for placing trades.
            </p>
          </div>
        </div>
      </details>
    </div>
  );
}
