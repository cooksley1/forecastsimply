export const CRYPTO_PICKS = [
  { id: 'bitcoin', sym: 'BTC' },
  { id: 'ethereum', sym: 'ETH' },
  { id: 'solana', sym: 'SOL' },
  { id: 'binancecoin', sym: 'BNB' },
  { id: 'ripple', sym: 'XRP' },
  { id: 'cardano', sym: 'ADA' },
  { id: 'dogecoin', sym: 'DOGE' },
  { id: 'avalanche-2', sym: 'AVAX' },
  { id: 'polkadot', sym: 'DOT' },
  { id: 'chainlink', sym: 'LINK' },
];

export const STOCK_PICKS_US = [
  { sym: 'AAPL', name: 'Apple', div: true, yield: 0.5 },
  { sym: 'MSFT', name: 'Microsoft', div: true, yield: 0.7 },
  { sym: 'NVDA', name: 'NVIDIA', div: true, yield: 0.03 },
  { sym: 'GOOGL', name: 'Alphabet', div: false, yield: 0 },
  { sym: 'AMZN', name: 'Amazon', div: false, yield: 0 },
  { sym: 'TSLA', name: 'Tesla', div: false, yield: 0 },
  { sym: 'META', name: 'Meta', div: true, yield: 0.4 },
  { sym: 'JPM', name: 'JPMorgan', div: true, yield: 2.2 },
  { sym: 'V', name: 'Visa', div: true, yield: 0.8 },
  { sym: 'JNJ', name: 'J&J', div: true, yield: 3.1 },
  { sym: 'KO', name: 'Coca-Cola', div: true, yield: 3.0 },
  { sym: 'PG', name: 'Procter & Gamble', div: true, yield: 2.4 },
  { sym: 'PEP', name: 'PepsiCo', div: true, yield: 2.7 },
  { sym: 'XOM', name: 'Exxon Mobil', div: true, yield: 3.4 },
  { sym: 'CVX', name: 'Chevron', div: true, yield: 4.0 },
  { sym: 'ABBV', name: 'AbbVie', div: true, yield: 3.8 },
  { sym: 'T', name: 'AT&T', div: true, yield: 6.5 },
  { sym: 'VZ', name: 'Verizon', div: true, yield: 6.8 },
];

export const STOCK_PICKS_ASX = [
  { sym: 'CBA.AX', name: 'CommBank', div: true, yield: 3.5 },
  { sym: 'BHP.AX', name: 'BHP', div: true, yield: 5.2 },
  { sym: 'CSL.AX', name: 'CSL', div: true, yield: 1.0 },
  { sym: 'WES.AX', name: 'Wesfarmers', div: true, yield: 3.2 },
  { sym: 'NAB.AX', name: 'NAB', div: true, yield: 4.5 },
  { sym: 'WBC.AX', name: 'Westpac', div: true, yield: 5.0 },
  { sym: 'ANZ.AX', name: 'ANZ', div: true, yield: 5.3 },
  { sym: 'FMG.AX', name: 'Fortescue', div: true, yield: 7.0 },
  { sym: 'WOW.AX', name: 'Woolworths', div: true, yield: 2.8 },
  { sym: 'TLS.AX', name: 'Telstra', div: true, yield: 4.2 },
];

export const STOCK_PICKS_LSE = [
  { sym: 'SHEL.L', name: 'Shell', div: true, yield: 3.8 },
  { sym: 'AZN.L', name: 'AstraZeneca', div: true, yield: 2.0 },
  { sym: 'HSBA.L', name: 'HSBC', div: true, yield: 5.5 },
  { sym: 'ULVR.L', name: 'Unilever', div: true, yield: 3.3 },
  { sym: 'BP.L', name: 'BP', div: true, yield: 4.5 },
  { sym: 'GSK.L', name: 'GSK', div: true, yield: 3.6 },
  { sym: 'RIO.L', name: 'Rio Tinto', div: true, yield: 6.0 },
  { sym: 'DGE.L', name: 'Diageo', div: true, yield: 2.5 },
];

export const STOCK_PICKS_TSE = [
  { sym: 'RY.TO', name: 'Royal Bank', div: true, yield: 3.8 },
  { sym: 'TD.TO', name: 'TD Bank', div: true, yield: 4.5 },
  { sym: 'SHOP.TO', name: 'Shopify', div: false, yield: 0 },
  { sym: 'ENB.TO', name: 'Enbridge', div: true, yield: 7.2 },
  { sym: 'CNR.TO', name: 'CN Rail', div: true, yield: 1.8 },
  { sym: 'BMO.TO', name: 'BMO', div: true, yield: 4.3 },
  { sym: 'BNS.TO', name: 'Scotiabank', div: true, yield: 5.8 },
  { sym: 'CP.TO', name: 'CP Rail', div: true, yield: 0.7 },
];

export const STOCK_PICKS_XETRA = [
  { sym: 'SAP.DE', name: 'SAP', div: true, yield: 1.5 },
  { sym: 'SIE.DE', name: 'Siemens', div: true, yield: 2.8 },
  { sym: 'ALV.DE', name: 'Allianz', div: true, yield: 4.8 },
  { sym: 'DTE.DE', name: 'Deutsche Telekom', div: true, yield: 3.5 },
  { sym: 'BAS.DE', name: 'BASF', div: true, yield: 6.0 },
  { sym: 'MBG.DE', name: 'Mercedes-Benz', div: true, yield: 7.5 },
  { sym: 'BMW.DE', name: 'BMW', div: true, yield: 6.2 },
  { sym: 'ADS.DE', name: 'Adidas', div: true, yield: 1.2 },
];

export const STOCK_PICKS_HKSE = [
  { sym: '0700.HK', name: 'Tencent', div: true, yield: 0.8 },
  { sym: '9988.HK', name: 'Alibaba', div: false, yield: 0 },
  { sym: '0005.HK', name: 'HSBC HK', div: true, yield: 5.5 },
  { sym: '1299.HK', name: 'AIA Group', div: true, yield: 2.0 },
  { sym: '3690.HK', name: 'Meituan', div: false, yield: 0 },
  { sym: '0941.HK', name: 'China Mobile', div: true, yield: 6.5 },
  { sym: '2318.HK', name: 'Ping An', div: true, yield: 5.0 },
  { sym: '1810.HK', name: 'Xiaomi', div: false, yield: 0 },
];

export const STOCK_PICKS_JPX = [
  { sym: '7203.T', name: 'Toyota', div: true, yield: 2.5 },
  { sym: '6758.T', name: 'Sony', div: true, yield: 0.5 },
  { sym: '6861.T', name: 'Keyence', div: true, yield: 0.3 },
  { sym: '6902.T', name: 'Denso', div: true, yield: 2.8 },
  { sym: '9984.T', name: 'SoftBank', div: true, yield: 4.5 },
  { sym: '8306.T', name: 'MUFG', div: true, yield: 3.2 },
  { sym: '6501.T', name: 'Hitachi', div: true, yield: 1.5 },
  { sym: '7741.T', name: 'HOYA', div: true, yield: 0.8 },
];

export type StockPick = { sym: string; name: string; div: boolean; yield: number };

export const STOCK_PICKS_BY_EXCHANGE: Record<string, StockPick[]> = {
  ALL: [...STOCK_PICKS_US, ...STOCK_PICKS_ASX, ...STOCK_PICKS_LSE, ...STOCK_PICKS_TSE, ...STOCK_PICKS_XETRA, ...STOCK_PICKS_HKSE, ...STOCK_PICKS_JPX],
  US: STOCK_PICKS_US,
  ASX: STOCK_PICKS_ASX,
  LSE: STOCK_PICKS_LSE,
  TSE: STOCK_PICKS_TSE,
  XETRA: STOCK_PICKS_XETRA,
  HKSE: STOCK_PICKS_HKSE,
  JPX: STOCK_PICKS_JPX,
};

export const ETF_PICKS_US = [
  { sym: 'SPY', name: 'S&P 500 ETF' },
  { sym: 'QQQ', name: 'NASDAQ-100 ETF' },
  { sym: 'VTI', name: 'Total US Market' },
  { sym: 'VOO', name: 'Vanguard S&P 500' },
  { sym: 'ARKK', name: 'ARK Innovation' },
  { sym: 'VGT', name: 'Vanguard IT' },
  { sym: 'SCHD', name: 'Schwab Dividend' },
  { sym: 'VYM', name: 'Vanguard High Div' },
  { sym: 'BND', name: 'Vanguard Total Bond' },
  { sym: 'IVV', name: 'iShares Core S&P 500' },
];

export const ETF_PICKS_ASX = [
  { sym: 'VGS.AX', name: 'Vanguard Intl Shares' },
  { sym: 'VAS.AX', name: 'Vanguard AU Shares' },
  { sym: 'IVV.AX', name: 'iShares S&P 500 (AUD)' },
  { sym: 'VDHG.AX', name: 'Vanguard Diversified' },
  { sym: 'A200.AX', name: 'BetaShares ASX 200' },
  { sym: 'VTS.AX', name: 'Vanguard US Total' },
  { sym: 'IOZ.AX', name: 'iShares ASX 200' },
  { sym: 'ETHI.AX', name: 'BetaShares Ethical' },
  { sym: 'NDQ.AX', name: 'BetaShares NASDAQ' },
  { sym: 'HACK.AX', name: 'BetaShares Cybersecurity' },
];

export const ETF_PICKS_LSE = [
  { sym: 'VWRL.L', name: 'Vanguard FTSE All-World' },
  { sym: 'ISF.L', name: 'iShares Core FTSE 100' },
  { sym: 'VUSA.L', name: 'Vanguard S&P 500 (GBP)' },
  { sym: 'SGLN.L', name: 'iShares Physical Gold' },
  { sym: 'EQQQ.L', name: 'Invesco NASDAQ-100' },
  { sym: 'VMID.L', name: 'Vanguard FTSE 250' },
];

export const ETF_PICKS_BY_EXCHANGE: Record<string, { sym: string; name: string }[]> = {
  ALL: [...ETF_PICKS_US, ...ETF_PICKS_ASX, ...ETF_PICKS_LSE],
  US: ETF_PICKS_US,
  ASX: ETF_PICKS_ASX,
  LSE: ETF_PICKS_LSE,
};

export const FOREX_PICKS = [
  { from: 'AUD', to: 'USD', name: 'AUD/USD' },
  { from: 'EUR', to: 'USD', name: 'EUR/USD' },
  { from: 'GBP', to: 'USD', name: 'GBP/USD' },
  { from: 'USD', to: 'JPY', name: 'USD/JPY' },
  { from: 'AUD', to: 'EUR', name: 'AUD/EUR' },
  { from: 'USD', to: 'CAD', name: 'USD/CAD' },
  { from: 'NZD', to: 'USD', name: 'NZD/USD' },
  { from: 'AUD', to: 'GBP', name: 'AUD/GBP' },
];

export const CRYPTO_TIMEFRAMES = [
  { label: '1H', days: 0.042 },
  { label: '4H', days: 0.167 },
  { label: '24H', days: 1 },
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
  { label: '1Y', days: 365 },
  { label: 'ALL', days: 99999 },
];

export const STOCK_TIMEFRAMES = [
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '1Y', days: 365 },
  { label: '2Y', days: 730 },
  { label: '5Y', days: 1825 },
];
