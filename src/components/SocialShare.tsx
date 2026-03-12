import { useRef } from 'react';
import { Download, Link2, Loader2 } from 'lucide-react';
import { useShareAnalysis, type SharePayload } from '@/hooks/useShareAnalysis';
import type { AssetInfo } from '@/types/assets';
import type { TechnicalData } from '@/types/analysis';

interface Props {
  assetInfo?: AssetInfo | null;
  technicalData?: TechnicalData | null;
  /** Optional ref to a DOM element to capture as snapshot image */
  snapshotRef?: React.RefObject<HTMLElement>;
}

export default function SocialShare({ assetInfo, technicalData, snapshotRef }: Props) {
  const { sharing, copyShareLink, shareWhatsApp, shareX, shareReddit, downloadSnapshot } = useShareAnalysis();

  const getPayload = (): SharePayload | null => {
    if (!assetInfo) return null;
    return {
      asset_id: assetInfo.id,
      symbol: assetInfo.symbol,
      name: assetInfo.name,
      asset_type: assetInfo.assetType,
      price: assetInfo.price,
      signal_score: technicalData?.signal?.score ?? null,
      signal_label: technicalData?.signal?.label ?? null,
      confidence: technicalData?.signal?.confidence ?? null,
      market_phase: technicalData?.marketPhase ?? null,
      forecast_return_pct: technicalData?.forecastTarget
        ? ((technicalData.forecastTarget - assetInfo.price) / assetInfo.price) * 100
        : null,
      target_price: technicalData?.recommendations?.[0]?.target ?? null,
      stop_loss: technicalData?.recommendations?.[0]?.stopLoss ?? null,
      analysis_summary: technicalData?.analysisText?.slice(0, 500) ?? null,
    };
  };

  const handleAction = async (action: (p: SharePayload) => Promise<void>) => {
    const p = getPayload();
    if (!p) return;
    await action(p);
  };

  const btnClass = 'px-2 py-1 rounded-md border border-border text-[10px] font-medium text-muted-foreground hover:text-primary hover:border-primary/40 transition-all disabled:opacity-50';

  return (
    <div className="flex items-center gap-1.5">
      {sharing && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}

      <button onClick={() => handleAction(shareX)} disabled={sharing} className={btnClass} title="Share on X">𝕏</button>
      <button onClick={() => handleAction(shareReddit)} disabled={sharing} className={btnClass} title="Share on Reddit">💬</button>
      <button onClick={() => handleAction(shareWhatsApp)} disabled={sharing} className={btnClass} title="Share via WhatsApp">📱</button>
      <button onClick={() => handleAction(copyShareLink)} disabled={sharing} className={btnClass} title="Copy share link">
        <Link2 className="w-3 h-3" />
      </button>
      {snapshotRef && (
        <button
          onClick={() => downloadSnapshot(snapshotRef.current, `${assetInfo?.symbol || 'analysis'}-forecast`)}
          disabled={sharing}
          className={btnClass}
          title="Download snapshot"
        >
          <Download className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
