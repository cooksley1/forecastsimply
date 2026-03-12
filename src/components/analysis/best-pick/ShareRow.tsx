import { useState } from 'react';
import { Download, Link2, Loader2 } from 'lucide-react';
import { useShareAnalysis, type SharePayload } from '@/hooks/useShareAnalysis';
import { BestPick } from './types';

export default function ShareRow({ result, snapshotRef }: { result: BestPick; snapshotRef?: React.RefObject<HTMLElement> }) {
  const { sharing, copyShareLink, shareWhatsApp, shareX, shareReddit, downloadSnapshot } = useShareAnalysis();

  const payload: SharePayload = {
    asset_id: result.asset_id,
    symbol: result.symbol,
    name: result.name,
    asset_type: result.asset_type,
    price: result.price,
    signal_score: result.signal_score,
    signal_label: result.signal_label,
    confidence: result.confidence,
    market_phase: result.market_phase,
    forecast_return_pct: result.forecast_return_pct,
    target_price: result.target_price,
    stop_loss: result.stop_loss,
  };

  const btnClass = 'px-2 py-1 rounded-md border border-border text-[10px] font-medium text-muted-foreground hover:text-primary hover:border-primary/40 transition-all disabled:opacity-50';

  return (
    <div className="flex items-center justify-between gap-2 bg-muted/20 rounded-lg px-3 py-2 border border-border/40">
      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
        {sharing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Link2 className="w-3 h-3" />} Share this pick
      </span>
      <div className="flex items-center gap-1">
        <button onClick={() => shareX(payload)} disabled={sharing} className={btnClass} title="Share on X">𝕏</button>
        <button onClick={() => shareReddit(payload)} disabled={sharing} className={btnClass} title="Share on Reddit">💬</button>
        <button onClick={() => shareWhatsApp(payload)} disabled={sharing} className={btnClass} title="Share via WhatsApp">📱</button>
        <button onClick={() => copyShareLink(payload)} disabled={sharing} className={btnClass} title="Copy share link">
          <Link2 className="w-3 h-3" />
        </button>
        {snapshotRef && (
          <button
            onClick={() => downloadSnapshot(snapshotRef.current, `${result.symbol}-pick`)}
            disabled={sharing}
            className={btnClass}
            title="Download snapshot"
          >
            <Download className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
