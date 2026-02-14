import type { Recommendation } from '@/types/analysis';
import { fmtPrice } from '@/utils/format';

interface Props {
  recommendations: Recommendation[];
}

const horizonLabels: Record<string, string> = {
  short: 'Short-Term (1-7 days)',
  mid: 'Mid-Term (1-3 months)',
  long: 'Long-Term (6-12+ months)',
  dca: 'DCA Timing',
};

const horizonExplain: Record<string, string> = {
  short: 'Quick trades or swing positions. Good for active traders looking at days, not months.',
  mid: 'For investors willing to hold a few weeks to months. Balances risk and opportunity.',
  long: 'For patient investors. Long-term trends tend to be more reliable than short-term noise.',
  dca: 'Dollar-cost averaging: invest a fixed amount regularly regardless of price.',
};

const termExplain: Record<string, string> = {
  Entry: 'The suggested price to buy or enter the position.',
  Target: 'The price the analysis predicts the asset could reach — your profit goal.',
  'Stop Loss': 'The price where you should sell to limit losses if the trade goes wrong.',
  Confidence: 'How sure the algorithm is about this recommendation (higher = more signals agree).',
};

export default function RecommendationPanel({ recommendations }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-foreground font-semibold text-sm">Investment Recommendations</h3>
        <p className="text-[11px] text-muted-foreground mt-1">
          These are algorithmic suggestions based on technical indicators. Each timeframe has different risk levels and strategies.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {recommendations.map(rec => (
          <div key={rec.horizon} className="bg-sf-card border border-border rounded-xl p-4">
            <div className="text-xs text-muted-foreground mb-1 font-mono">{horizonLabels[rec.horizon]}</div>
            <p className="text-[10px] text-muted-foreground/70 mb-2 italic">{horizonExplain[rec.horizon]}</p>
            <div className={`text-lg font-bold mb-3 ${
              rec.color === 'green' ? 'text-positive' : rec.color === 'red' ? 'text-negative' : 'text-neutral-signal'
            }`}>
              {rec.label}
            </div>

            <div className="space-y-2 text-xs font-mono">
              {[
                { label: 'Entry', value: fmtPrice(rec.entry), explain: termExplain.Entry },
                { label: 'Target', value: fmtPrice(rec.target), color: 'text-positive', explain: termExplain.Target },
                { label: 'Stop Loss', value: fmtPrice(rec.stopLoss), color: 'text-negative', explain: termExplain['Stop Loss'] },
                { label: 'Confidence', value: `${rec.confidence}%`, explain: termExplain.Confidence },
              ].map(row => (
                <div key={row.label} className="group">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className={row.color || 'text-foreground'}>{row.value}</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground/60 leading-tight mt-0.5 hidden group-hover:block">{row.explain}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground leading-relaxed">{rec.reasoning}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground italic">⚠️ Algorithmic analysis only. Not financial advice. Always do your own research.</p>
    </div>
  );
}
