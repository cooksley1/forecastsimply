import { useState, useMemo, useCallback } from 'react';
import { generateReport, downloadReport, openReportInNewTab } from '@/utils/reportGenerator';
import type { TechnicalData } from '@/types/analysis';
import type { AssetInfo } from '@/types/assets';

interface Props {
  assetInfo: AssetInfo;
  technicalData: TechnicalData;
  timeframeDays: number;
  riskLevel: number;
  dataSource: string;
}

export default function ReportButton({ assetInfo, technicalData, timeframeDays, riskLevel, dataSource }: Props) {
  const [showDialog, setShowDialog] = useState(false);

  const report = useMemo(
    () => generateReport({ assetInfo, technicalData, timeframeDays, riskLevel, dataSource }),
    [assetInfo, technicalData, timeframeDays, riskLevel, dataSource],
  );

  const handleOpen = useCallback(() => {
    openReportInNewTab(report, assetInfo.name);
    setShowDialog(false);
  }, [report, assetInfo.name]);

  const handleDownload = useCallback(() => {
    downloadReport(report, assetInfo.symbol);
    setShowDialog(false);
  }, [report, assetInfo.symbol]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(report);
    setShowDialog(false);
  }, [report]);

  return (
    <>
      <button
        onClick={() => setShowDialog(true)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] sm:text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all"
        title="Generate analysis report"
      >
        📄 Report
      </button>

      {showDialog && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowDialog(false)}>
          <div className="bg-popover border border-border rounded-xl shadow-2xl p-5 w-[280px] space-y-3" onClick={e => e.stopPropagation()}>
            <h4 className="text-sm font-semibold text-foreground">📄 Analysis Report</h4>
            <p className="text-[11px] text-muted-foreground">{assetInfo.name} ({assetInfo.symbol}) — full technical report</p>
            <div className="space-y-1.5">
              <button onClick={handleOpen} className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-foreground hover:bg-accent rounded-lg transition-colors text-left border border-border">
                🔍 Open in New Tab
              </button>
              <button onClick={handleDownload} className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-foreground hover:bg-accent rounded-lg transition-colors text-left border border-border">
                ⬇️ Download as .txt
              </button>
              <button onClick={handleCopy} className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-foreground hover:bg-accent rounded-lg transition-colors text-left border border-border">
                📋 Copy to Clipboard
              </button>
            </div>
            <button onClick={() => setShowDialog(false)} className="w-full text-[11px] text-muted-foreground hover:text-foreground pt-1 transition-colors">Cancel</button>
          </div>
        </div>
      )}
    </>
  );
}
