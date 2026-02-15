export type AssetType = 'crypto' | 'stocks' | 'etfs' | 'forex';
export type ResultTab = 'home' | 'charts' | 'recs' | 'trade' | 'analysis' | 'indicators' | 'info';

export interface PricePoint {
  timestamp: number;
  close: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
}

export interface AssetInfo {
  id: string;
  symbol: string;
  name: string;
  assetType: AssetType;
  price: number;
  priceAud?: number;
  change24h?: number;
  change7d?: number;
  change30d?: number;
  marketCap?: number;
  volume24h?: number;
  circulatingSupply?: number;
  maxSupply?: number;
  ath?: number;
  atl?: number;
  rank?: number;
  high52w?: number;
  low52w?: number;
  exchange?: string;
  currency?: string;
  description?: string;
  image?: string;
  expenseRatio?: number;
  nav?: number;
  dividendYield?: number;
  category?: string;
}

export interface WatchlistItem {
  id: string;
  symbol: string;
  name: string;
  assetType: AssetType;
  price: number;
  change24h?: number;
  addedAt: number;
  addedPrice: number;
  note?: string;
}
