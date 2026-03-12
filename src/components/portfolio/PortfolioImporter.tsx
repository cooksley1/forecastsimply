import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, Image, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { parseCSV, type ParsedHolding } from '@/utils/csvPortfolioParser';
import { supabase } from '@/integrations/supabase/client';
import { usePortfolioHoldings } from '@/hooks/usePortfolioHoldings';
import { useActivityTracker } from '@/hooks/useActivityTracker';

export default function PortfolioImporter() {
  const { importBulk, holdings } = usePortfolioHoldings();
  const { track } = useActivityTracker();
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<ParsedHolding[] | null>(null);
  const [importSource, setImportSource] = useState<string>('');
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    setImporting(true);
    setPreview(null);

    const isImage = file.type.startsWith('image/');
    const isCSV = file.name.endsWith('.csv') || file.type === 'text/csv';
    const isText = file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.tsv');
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    try {
      if (isImage) {
        // OCR via AI
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]); // Remove data:... prefix
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const { data, error } = await supabase.functions.invoke('ocr-portfolio', {
          body: { image_base64: base64, mime_type: file.type },
        });

        if (error) throw new Error(error.message || 'OCR failed');
        if (!data?.holdings?.length) {
          toast.error('No holdings found in image. Try a clearer screenshot of your portfolio.');
          setImporting(false);
          return;
        }

        setPreview(data.holdings);
        setImportSource('image (OCR)');
        track('portfolio_import_image', { data: { file_type: file.type, count: data.holdings.length } });
      } else if (isCSV || isText) {
        const text = await file.text();
        const result = parseCSV(text);
        if (result.errors.length > 0) {
          result.errors.forEach(err => toast.error(err, { duration: 5000 }));
        }
        if (result.holdings.length === 0) {
          toast.error('No holdings found in file');
          setImporting(false);
          return;
        }
        setPreview(result.holdings);
        setImportSource(`${result.format} CSV`);
        track('portfolio_import_csv', { data: { format: result.format, count: result.holdings.length } });
      } else if (isExcel) {
        toast.error('Excel files (.xlsx) are not directly supported. Please export as CSV from your spreadsheet app.');
        setImporting(false);
        return;
      } else {
        toast.error(`Unsupported file type: ${file.type || file.name.split('.').pop()}`);
        setImporting(false);
        return;
      }
    } catch (err: any) {
      console.error('Import error:', err);
      toast.error(err.message || 'Failed to process file');
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }, [track]);

  const confirmImport = useCallback(async () => {
    if (!preview) return;
    setImporting(true);
    const items = preview.map(h => ({
      asset_id: h.symbol.toLowerCase().replace(/[.\s]/g, '-'),
      symbol: h.symbol,
      name: h.name,
      asset_type: h.asset_type,
      quantity: h.quantity,
      avg_price: h.avg_price,
      notes: `Imported from ${importSource}`,
    }));
    await importBulk(items);
    setPreview(null);
    setImporting(false);
  }, [preview, importSource, importBulk]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">📂 Import Portfolio</span>
        <span className="text-[10px] text-muted-foreground">{holdings.length} holding{holdings.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Drop zone */}
      {!preview && (
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          className="rounded-xl border-2 border-dashed border-border bg-muted/30 p-5 text-center space-y-2 hover:border-primary/40 transition-colors cursor-pointer"
          onClick={() => fileRef.current?.click()}
        >
          {importing ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Processing file...</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center gap-3">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <Image className="w-5 h-5 text-muted-foreground" />
                <Upload className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-xs text-foreground font-medium">Drop a file or tap to browse</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                <span className="font-semibold">CSV</span> from any broker (Commsec, Stake, IBKR, eToro, Schwab, Fidelity…)<br/>
                <span className="font-semibold">Screenshot</span> of your portfolio — AI reads it via OCR<br/>
                <span className="font-semibold">Text files</span> with columns (Symbol, Qty, Price)
              </p>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt,.tsv,image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}

      {/* Preview */}
      {preview && preview.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-positive">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Found {preview.length} holding{preview.length !== 1 ? 's' : ''} from {importSource}</span>
          </div>

          <div className="max-h-48 overflow-y-auto rounded-lg border border-border divide-y divide-border">
            {preview.map((h, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono font-bold text-foreground">{h.symbol}</span>
                  <span className="text-[10px] text-muted-foreground truncate">{h.name}</span>
                  <span className="text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground">{h.asset_type}</span>
                </div>
                <div className="text-right shrink-0 text-muted-foreground font-mono">
                  {h.quantity > 0 && <span>{h.quantity} × </span>}
                  {h.avg_price > 0 && <span>${h.avg_price.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>}
                  {h.quantity === 0 && h.avg_price === 0 && <span className="text-warning">No data</span>}
                </div>
              </div>
            ))}
          </div>

          {preview.some(h => h.quantity === 0 || h.avg_price === 0) && (
            <div className="flex items-start gap-1.5 text-[10px] text-warning">
              <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
              <span>Some holdings are missing quantity or price. You can edit them after import.</span>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={confirmImport}
              disabled={importing}
              className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {importing ? 'Importing...' : `Import ${preview.length} Holdings`}
            </button>
            <button
              onClick={() => setPreview(null)}
              className="px-3 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
