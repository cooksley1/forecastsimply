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

export default function RecommendationPanel({ recommendations }: Props) {
  return (
    <div className="space-y-4">
      <h3 className="text-foreground font-semibold text-sm">Investment Recommendations</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {recommendations.map(rec => (
          <div key={rec.horizon} className="bg-sf-card border border-border rounded-xl p-4">
            <div className="text-xs text-muted-foreground mb-2 font-mono">{horizonLabels[rec.horizon]}</div>
            <div className={`text-lg font-bold mb-3 ${
              rec.color === 'green' ? 'text-positive' : rec.color === 'red' ? 'text-negative' : 'text-neutral-signal'
            }`}>
              {rec.label}
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Entry</span>
                <span className="text-foreground">{fmtPrice(rec.entry)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Target</span>
                <span className="text-positive">{fmtPrice(rec.target)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stop Loss</span>
                <span className="text-negative">{fmtPrice(rec.stopLoss)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Confidence</span>
                <span className="text-foreground">{rec.confidence}%</span>
              </div>
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
