/**
 * Parses CSV text from common broker exports into portfolio holdings.
 * Supports: Generic (Symbol, Quantity, Price), Commsec, Stake, IBKR-style formats.
 */

export interface ParsedHolding {
  symbol: string;
  name: string;
  asset_type: string;
  quantity: number;
  avg_price: number;
}

export interface ParseResult {
  holdings: ParsedHolding[];
  errors: string[];
  format: string;
}

function normalise(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findCol(headers: string[], ...candidates: string[]): number {
  for (const c of candidates) {
    const idx = headers.findIndex(h => normalise(h) === normalise(c));
    if (idx >= 0) return idx;
  }
  // Fuzzy match
  for (const c of candidates) {
    const idx = headers.findIndex(h => normalise(h).includes(normalise(c)));
    if (idx >= 0) return idx;
  }
  return -1;
}

function parseNumber(s: string): number {
  return parseFloat(s.replace(/[$,\s]/g, '')) || 0;
}

function guessAssetType(symbol: string): string {
  const s = symbol.toUpperCase();
  if (s.includes('.AX') || s.includes('.L') || s.includes('.TO')) return 'stocks';
  if (/^[A-Z]{3}\/[A-Z]{3}$/.test(s)) return 'forex';
  // Common ETF patterns
  if (['SPY', 'QQQ', 'VGS', 'IOZ', 'VAS', 'IVV', 'VOO', 'VTI', 'ARKK'].some(e => s.startsWith(e))) return 'etfs';
  return 'stocks';
}

export function parseCSV(text: string): ParseResult {
  const errors: string[] = [];
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) {
    return { holdings: [], errors: ['CSV must have at least a header row and one data row.'], format: 'unknown' };
  }

  // Parse header
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  
  const symbolIdx = findCol(headers, 'Symbol', 'Ticker', 'Code', 'Stock Code', 'Instrument', 'Asset');
  const nameIdx = findCol(headers, 'Name', 'Description', 'Company', 'Stock Name', 'Security');
  const qtyIdx = findCol(headers, 'Quantity', 'Qty', 'Units', 'Shares', 'Holdings', 'Amount');
  const priceIdx = findCol(headers, 'Average Price', 'Avg Price', 'AvgPrice', 'Cost Basis', 'Purchase Price', 'Price', 'Cost');
  const typeIdx = findCol(headers, 'Type', 'Asset Type', 'Category', 'Market');

  if (symbolIdx < 0) {
    return { holdings: [], errors: ['Could not find a Symbol/Ticker column. Expected columns like: Symbol, Ticker, Code, Instrument.'], format: 'unknown' };
  }

  let format = 'generic';
  if (headers.some(h => normalise(h).includes('commsec'))) format = 'commsec';
  else if (headers.some(h => normalise(h).includes('stake'))) format = 'stake';
  else if (headers.some(h => normalise(h).includes('ibkr') || normalise(h).includes('interactive'))) format = 'ibkr';

  const holdings: ParsedHolding[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    const symbol = cols[symbolIdx]?.trim();
    if (!symbol) continue;

    const name = nameIdx >= 0 ? cols[nameIdx]?.trim() || symbol : symbol;
    const quantity = qtyIdx >= 0 ? parseNumber(cols[qtyIdx]) : 0;
    const avgPrice = priceIdx >= 0 ? parseNumber(cols[priceIdx]) : 0;
    const assetType = typeIdx >= 0 ? cols[typeIdx]?.trim().toLowerCase() || guessAssetType(symbol) : guessAssetType(symbol);

    if (quantity <= 0 && avgPrice <= 0) {
      errors.push(`Row ${i + 1}: Skipped "${symbol}" — no quantity or price found.`);
      continue;
    }

    holdings.push({
      symbol: symbol.toUpperCase(),
      name,
      asset_type: assetType === 'etf' ? 'etfs' : assetType,
      quantity: Math.abs(quantity),
      avg_price: Math.abs(avgPrice),
    });
  }

  if (holdings.length === 0 && errors.length === 0) {
    errors.push('No valid holdings found in the CSV.');
  }

  return { holdings, errors, format };
}
