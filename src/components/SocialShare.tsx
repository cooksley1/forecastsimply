import type { AssetInfo } from '@/types/assets';
import type { TechnicalData } from '@/types/analysis';

interface Props {
  assetInfo?: AssetInfo | null;
  technicalData?: TechnicalData | null;
}

export default function SocialShare({ assetInfo, technicalData }: Props) {
  const appUrl = 'https://forecastsimply.lovable.app';

  const getText = () => {
    if (assetInfo && technicalData) {
      const signal = technicalData.signal;
      return `📊 ${assetInfo.name} (${assetInfo.symbol}) — Signal: ${signal.label} (${signal.score}/100) | Analysed on ForecastSimply`;
    }
    return '🚀 Check out ForecastSimply — free technical analysis & price forecasting for Crypto, Stocks, ETFs & Forex';
  };

  const shareUrl = appUrl;
  const text = getText();

  const links = [
    {
      icon: '𝕏',
      label: 'X',
      url: `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`,
    },
    {
      icon: '💬',
      label: 'Reddit',
      url: `https://reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(text)}`,
    },
    {
      icon: '🔗',
      label: 'LinkedIn',
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
    },
  ];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${text}\n${shareUrl}`);
    } catch { /* silent */ }
  };

  // Check for native Web Share API
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'ForecastSimply', text, url: shareUrl });
      } catch { /* user cancelled */ }
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      {links.map(l => (
        <a
          key={l.label}
          href={l.url}
          target="_blank"
          rel="noopener noreferrer"
          className="px-2 py-1 rounded-md border border-border text-[10px] font-medium text-muted-foreground hover:text-primary hover:border-primary/40 transition-all"
          title={`Share on ${l.label}`}
        >
          {l.icon}
        </a>
      ))}
      <button
        onClick={handleCopy}
        className="px-2 py-1 rounded-md border border-border text-[10px] font-medium text-muted-foreground hover:text-primary hover:border-primary/40 transition-all"
        title="Copy link"
      >
        📋
      </button>
      {typeof navigator !== 'undefined' && 'share' in navigator && (
        <button
          onClick={handleNativeShare}
          className="px-2 py-1 rounded-md border border-border text-[10px] font-medium text-muted-foreground hover:text-primary hover:border-primary/40 transition-all"
          title="Share"
        >
          📤
        </button>
      )}
    </div>
  );
}
