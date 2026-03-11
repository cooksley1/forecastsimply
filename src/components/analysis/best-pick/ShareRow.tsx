import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { BestPick, APP_URL } from './types';

export default function ShareRow({ result }: { result: BestPick }) {
  const [copied, setCopied] = useState(false);
  const text = `📊 Best Pick: ${result.symbol} (${result.name}) — ${result.signal_label} | Confidence ${result.confidence}% | Projected Return +${result.forecast_return_pct.toFixed(1)}% | Analysed on ForecastSimply`;

  const links = [
    { icon: '𝕏', label: 'X', url: `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(APP_URL)}` },
    { icon: '💬', label: 'Reddit', url: `https://reddit.com/submit?url=${encodeURIComponent(APP_URL)}&title=${encodeURIComponent(text)}` },
    { icon: '🔗', label: 'LinkedIn', url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(APP_URL)}` },
  ];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${text}\n${APP_URL}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* silent */ }
  };

  return (
    <div className="flex items-center justify-between gap-2 bg-muted/20 rounded-lg px-3 py-2 border border-border/40">
      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
        <Share2 className="w-3 h-3" /> Share this pick
      </span>
      <div className="flex items-center gap-1">
        {links.map(l => (
          <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer"
            className="px-2 py-1 rounded-md border border-border text-[10px] font-medium text-muted-foreground hover:text-primary hover:border-primary/40 transition-all"
            title={`Share on ${l.label}`}>{l.icon}</a>
        ))}
        <button onClick={handleCopy}
          className="px-2 py-1 rounded-md border border-border text-[10px] font-medium text-muted-foreground hover:text-primary hover:border-primary/40 transition-all"
          title="Copy to clipboard">{copied ? '✓' : '📋'}</button>
      </div>
    </div>
  );
}
