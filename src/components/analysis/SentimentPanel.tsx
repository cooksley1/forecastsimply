import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Newspaper, TrendingUp, TrendingDown, Minus, Loader2, AlertTriangle, Sparkles, ArrowRight, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AssetInfo } from '@/types/assets';
import type { Signal, SignalLabel, SignalColor } from '@/types/analysis';

interface NewsHeadline {
  title: string;
  source: string;
  date: string;
  url: string | null;
}

interface SentimentData {
  summary: string;
  themes: string[];
  catalysts: { positive: string[]; negative: string[] };
  sentiment: 'Bullish' | 'Neutral' | 'Bearish';
  sentimentScore: number;
  confidence: number;
  technicalAlignment: 'Confirms' | 'Neutral' | 'Contradicts';
  alignmentExplanation: string;
  adjustedSignalLabel: string;
  adjustedSignalScore: number;
  adjustmentReasoning: string;
  newsQuality: 'Rich' | 'Moderate' | 'Limited';
  disclaimer: string;
  headlines?: NewsHeadline[];
  headlineCount?: number;
}

interface Props {
  assetInfo: AssetInfo;
  signal: Signal;
}

const sentimentColors = {
  Bullish: { bg: 'bg-positive/10', border: 'border-positive/30', text: 'text-positive', icon: TrendingUp },
  Neutral: { bg: 'bg-muted/30', border: 'border-border', text: 'text-muted-foreground', icon: Minus },
  Bearish: { bg: 'bg-negative/10', border: 'border-negative/30', text: 'text-negative', icon: TrendingDown },
};

const alignmentColors = {
  Confirms: 'text-positive',
  Neutral: 'text-muted-foreground',
  Contradicts: 'text-negative',
};

function getSignalColor(label: string): SignalColor {
  if (label.includes('Buy')) return 'green';
  if (label.includes('Sell')) return 'red';
  return 'amber';
}

function ScoreBadge({ label, score, maxScore }: { label: string; score: number; maxScore: number }) {
  const color = label.includes('Buy') ? 'text-positive' : label.includes('Sell') ? 'text-negative' : 'text-neutral-signal';
  const bgColor = label.includes('Buy') ? 'bg-positive/10 border-positive/20' : label.includes('Sell') ? 'bg-negative/10 border-negative/20' : 'bg-muted/30 border-border';
  return (
    <div className={`rounded-xl p-3 border ${bgColor} text-center`}>
      <div className={`text-lg font-bold ${color}`}>{label}</div>
      <div className="text-[10px] text-muted-foreground font-mono mt-0.5">Score: {score}/{maxScore}</div>
    </div>
  );
}

export default function SentimentPanel({ assetInfo, signal }: Props) {
  const [data, setData] = useState<SentimentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showBlended, setShowBlended] = useState(false);

  const runAnalysis = async () => {
    setLoading(true);
    setData(null);
    setShowBlended(false);
    try {
      const { data: result, error } = await supabase.functions.invoke('sentiment-analysis', {
        body: {
          symbol: assetInfo.symbol,
          name: assetInfo.name,
          assetType: assetInfo.assetType,
          currentPrice: assetInfo.price,
          signalLabel: signal.label,
          signalScore: signal.score,
        },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      setData(result);
    } catch (e: any) {
      toast.error(e.message || 'Sentiment analysis failed');
    } finally {
      setLoading(false);
    }
  };

  if (!data && !loading) {
    return (
      <div className="mt-4 pt-4 border-t border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <div>
              <div className="text-sm font-medium text-foreground">News Sentiment Deep Dive</div>
              <div className="text-[10px] text-muted-foreground">AI-powered analysis of recent news, events & market sentiment</div>
            </div>
          </div>
          <Button size="sm" onClick={runAnalysis} className="gap-1.5">
            <Newspaper className="w-3.5 h-3.5" />
            Analyse Sentiment
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mt-4 pt-4 border-t border-border/50">
        <div className="flex items-center gap-3 py-6 justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <div>
            <div className="text-sm text-foreground font-medium">Scanning news &amp; sentiment...</div>
            <div className="text-[10px] text-muted-foreground">Searching recent headlines and analysing market context</div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const sentimentStyle = sentimentColors[data.sentiment];
  const SentimentIcon = sentimentStyle.icon;

  return (
    <div className="mt-4 pt-4 border-t border-border/50 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">News Sentiment Analysis</span>
          <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono ${
            data.newsQuality === 'Rich' ? 'bg-positive/10 text-positive' :
            data.newsQuality === 'Moderate' ? 'bg-primary/10 text-primary' :
            'bg-muted text-muted-foreground'
          }`}>{data.newsQuality} data</span>
        </div>
        <Button size="sm" variant="ghost" onClick={runAnalysis} className="text-xs gap-1">
          <Newspaper className="w-3 h-3" />
          Re-scan
        </Button>
      </div>

      {/* Summary + Sentiment Badge */}
      <div className={`rounded-xl p-3 border ${sentimentStyle.border} ${sentimentStyle.bg}`}>
        <div className="flex items-center gap-2 mb-2">
          <SentimentIcon className={`w-4 h-4 ${sentimentStyle.text}`} />
          <span className={`font-bold text-sm ${sentimentStyle.text}`}>{data.sentiment}</span>
          <span className="text-[10px] text-muted-foreground font-mono">
            Score: {data.sentimentScore > 0 ? '+' : ''}{data.sentimentScore}/10 · {data.confidence}% confidence
          </span>
        </div>
        <p className="text-xs text-foreground/80 leading-relaxed">{data.summary}</p>
      </div>

      {/* Themes */}
      {data.themes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {data.themes.map((theme, i) => (
            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-muted border border-border text-foreground/70">{theme}</span>
          ))}
        </div>
      )}

      {/* Catalysts */}
      <div className="grid grid-cols-2 gap-2">
        {data.catalysts.positive.length > 0 && (
          <div className="rounded-lg border border-positive/20 bg-positive/5 p-2.5">
            <div className="text-[9px] font-mono text-positive mb-1.5 flex items-center gap-1">
              <TrendingUp className="w-2.5 h-2.5" /> POSITIVE CATALYSTS
            </div>
            {data.catalysts.positive.map((c, i) => (
              <div key={i} className="text-[10px] text-foreground/70 leading-relaxed mb-1">• {c}</div>
            ))}
          </div>
        )}
        {data.catalysts.negative.length > 0 && (
          <div className="rounded-lg border border-negative/20 bg-negative/5 p-2.5">
            <div className="text-[9px] font-mono text-negative mb-1.5 flex items-center gap-1">
              <TrendingDown className="w-2.5 h-2.5" /> NEGATIVE CATALYSTS
            </div>
            {data.catalysts.negative.map((c, i) => (
              <div key={i} className="text-[10px] text-foreground/70 leading-relaxed mb-1">• {c}</div>
            ))}
          </div>
        )}
      </div>

      {/* Technical Alignment */}
      <div className="flex items-start gap-2 rounded-lg bg-muted/30 border border-border/30 p-2.5">
        <Info className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
        <div>
          <div className="text-[10px] text-muted-foreground">
            <span className="font-medium">vs Technical Signal:</span>{' '}
            <span className={`font-bold ${alignmentColors[data.technicalAlignment]}`}>{data.technicalAlignment}</span>
          </div>
          <p className="text-[10px] text-foreground/70 leading-relaxed mt-0.5">{data.alignmentExplanation}</p>
        </div>
      </div>

      {/* Expand details */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full flex items-center justify-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors py-1"
      >
        {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {showDetails ? 'Hide details' : 'Show blended assessment'}
      </button>

      {showDetails && (
        <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
          {/* Side-by-side comparison */}
          {!showBlended ? (
            <div className="text-center">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowBlended(true)}
                className="gap-1.5 text-xs"
              >
                <Sparkles className="w-3 h-3" />
                Apply Sentiment to Technical Signal
                <ArrowRight className="w-3 h-3" />
              </Button>
              <p className="text-[9px] text-muted-foreground mt-1">See how news sentiment adjusts the pure technical recommendation</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 items-center">
                <ScoreBadge label={signal.label} score={signal.score} maxScore={15} />
                <div className="text-center">
                  <ArrowRight className="w-5 h-5 text-primary mx-auto" />
                  <div className="text-[9px] text-muted-foreground mt-0.5 font-mono">+ SENTIMENT</div>
                </div>
                <ScoreBadge label={data.adjustedSignalLabel} score={data.adjustedSignalScore} maxScore={15} />
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-lg border border-border bg-card p-2">
                  <div className="text-[9px] text-muted-foreground font-mono mb-0.5">TECHNICAL ONLY</div>
                  <div className={`text-sm font-bold ${
                    signal.label.includes('Buy') ? 'text-positive' : signal.label.includes('Sell') ? 'text-negative' : 'text-neutral-signal'
                  }`}>{signal.label}</div>
                </div>
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-2">
                  <div className="text-[9px] text-primary font-mono mb-0.5">BLENDED</div>
                  <div className={`text-sm font-bold ${
                    data.adjustedSignalLabel.includes('Buy') ? 'text-positive' : data.adjustedSignalLabel.includes('Sell') ? 'text-negative' : 'text-neutral-signal'
                  }`}>{data.adjustedSignalLabel}</div>
                </div>
              </div>

              <div className="bg-muted/30 rounded-lg p-2.5 border border-border/30">
                <p className="text-[10px] text-foreground/70 leading-relaxed">{data.adjustmentReasoning}</p>
              </div>
            </>
          )}

          {/* Disclaimer */}
          <div className="flex items-start gap-1.5 px-2">
            <AlertTriangle className="w-3 h-3 text-muted-foreground/50 mt-0.5 shrink-0" />
            <p className="text-[9px] text-muted-foreground/50 leading-relaxed italic">{data.disclaimer}</p>
          </div>
        </div>
      )}
    </div>
  );
}
