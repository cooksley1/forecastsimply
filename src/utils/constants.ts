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
  { sym: 'AAPL', name: 'Apple', div: true },
  { sym: 'MSFT', name: 'Microsoft', div: true },
  { sym: 'NVDA', name: 'NVIDIA', div: true },
  { sym: 'GOOGL', name: 'Alphabet', div: false },
  { sym: 'AMZN', name: 'Amazon', div: false },
  { sym: 'TSLA', name: 'Tesla', div: false },
  { sym: 'META', name: 'Meta', div: true },
  { sym: 'JPM', name: 'JPMorgan', div: true },
  { sym: 'V', name: 'Visa', div: true },
  { sym: 'JNJ', name: 'J&J', div: true },
  { sym: 'KO', name: 'Coca-Cola', div: true },
  { sym: 'PG', name: 'Procter & Gamble', div: true },
  { sym: 'PEP', name: 'PepsiCo', div: true },
  { sym: 'XOM', name: 'Exxon Mobil', div: true },
  { sym: 'CVX', name: 'Chevron', div: true },
  { sym: 'ABBV', name: 'AbbVie', div: true },
  { sym: 'T', name: 'AT&T', div: true },
  { sym: 'VZ', name: 'Verizon', div: true },
];

export const STOCK_PICKS_ASX = [
  { sym: 'CBA.AX', name: 'CommBank', div: true },
  { sym: 'BHP.AX', name: 'BHP', div: true },
  { sym: 'CSL.AX', name: 'CSL', div: true },
  { sym: 'WES.AX', name: 'Wesfarmers', div: true },
  { sym: 'NAB.AX', name: 'NAB', div: true },
  { sym: 'WBC.AX', name: 'Westpac', div: true },
  { sym: 'ANZ.AX', name: 'ANZ', div: true },
  { sym: 'FMG.AX', name: 'Fortescue', div: true },
  { sym: 'WOW.AX', name: 'Woolworths', div: true },
  { sym: 'TLS.AX', name: 'Telstra', div: true },
];

export const STOCK_PICKS_LSE = [
  { sym: 'SHEL.L', name: 'Shell', div: true },
  { sym: 'AZN.L', name: 'AstraZeneca', div: true },
  { sym: 'HSBA.L', name: 'HSBC', div: true },
  { sym: 'ULVR.L', name: 'Unilever', div: true },
  { sym: 'BP.L', name: 'BP', div: true },
  { sym: 'GSK.L', name: 'GSK', div: true },
  { sym: 'RIO.L', name: 'Rio Tinto', div: true },
  { sym: 'DGE.L', name: 'Diageo', div: true },
];

export const STOCK_PICKS_TSE = [
  { sym: 'RY.TO', name: 'Royal Bank', div: true },
  { sym: 'TD.TO', name: 'TD Bank', div: true },
  { sym: 'SHOP.TO', name: 'Shopify', div: false },
  { sym: 'ENB.TO', name: 'Enbridge', div: true },
  { sym: 'CNR.TO', name: 'CN Rail', div: true },
  { sym: 'BMO.TO', name: 'BMO', div: true },
  { sym: 'BNS.TO', name: 'Scotiabank', div: true },
  { sym: 'CP.TO', name: 'CP Rail', div: true },
];

export const STOCK_PICKS_XETRA = [
  { sym: 'SAP.DE', name: 'SAP', div: true },
  { sym: 'SIE.DE', name: 'Siemens', div: true },
  { sym: 'ALV.DE', name: 'Allianz', div: true },
  { sym: 'DTE.DE', name: 'Deutsche Telekom', div: true },
  { sym: 'BAS.DE', name: 'BASF', div: true },
  { sym: 'MBG.DE', name: 'Mercedes-Benz', div: true },
  { sym: 'BMW.DE', name: 'BMW', div: true },
  { sym: 'ADS.DE', name: 'Adidas', div: true },
];

export const STOCK_PICKS_HKSE = [
  { sym: '0700.HK', name: 'Tencent', div: true },
  { sym: '9988.HK', name: 'Alibaba', div: false },
  { sym: '0005.HK', name: 'HSBC HK', div: true },
  { sym: '1299.HK', name: 'AIA Group', div: true },
  { sym: '3690.HK', name: 'Meituan', div: false },
  { sym: '0941.HK', name: 'China Mobile', div: true },
  { sym: '2318.HK', name: 'Ping An', div: true },
  { sym: '1810.HK', name: 'Xiaomi', div: false },
];

export const STOCK_PICKS_JPX = [
  { sym: '7203.T', name: 'Toyota', div: true },
  { sym: '6758.T', name: 'Sony', div: true },
  { sym: '6861.T', name: 'Keyence', div: true },
  { sym: '6902.T', name: 'Denso', div: true },
  { sym: '9984.T', name: 'SoftBank', div: true },
  { sym: '8306.T', name: 'MUFG', div: true },
  { sym: '6501.T', name: 'Hitachi', div: true },
  { sym: '7741.T', name: 'HOYA', div: true },
];

export type StockPick = { sym: string; name: string; div: boolean };

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
