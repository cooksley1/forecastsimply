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
  { sym: 'AAPL', name: 'Apple' },
  { sym: 'MSFT', name: 'Microsoft' },
  { sym: 'NVDA', name: 'NVIDIA' },
  { sym: 'GOOGL', name: 'Alphabet' },
  { sym: 'AMZN', name: 'Amazon' },
  { sym: 'TSLA', name: 'Tesla' },
  { sym: 'META', name: 'Meta' },
  { sym: 'JPM', name: 'JPMorgan' },
  { sym: 'V', name: 'Visa' },
  { sym: 'JNJ', name: 'J&J' },
];

export const STOCK_PICKS_ASX = [
  { sym: 'CBA.AX', name: 'CommBank' },
  { sym: 'BHP.AX', name: 'BHP' },
  { sym: 'CSL.AX', name: 'CSL' },
  { sym: 'WES.AX', name: 'Wesfarmers' },
  { sym: 'NAB.AX', name: 'NAB' },
  { sym: 'WBC.AX', name: 'Westpac' },
  { sym: 'ANZ.AX', name: 'ANZ' },
  { sym: 'FMG.AX', name: 'Fortescue' },
  { sym: 'WOW.AX', name: 'Woolworths' },
  { sym: 'TLS.AX', name: 'Telstra' },
];

export const STOCK_PICKS_LSE = [
  { sym: 'SHEL.L', name: 'Shell' },
  { sym: 'AZN.L', name: 'AstraZeneca' },
  { sym: 'HSBA.L', name: 'HSBC' },
  { sym: 'ULVR.L', name: 'Unilever' },
  { sym: 'BP.L', name: 'BP' },
  { sym: 'GSK.L', name: 'GSK' },
  { sym: 'RIO.L', name: 'Rio Tinto' },
  { sym: 'DGE.L', name: 'Diageo' },
];

export const STOCK_PICKS_TSE = [
  { sym: 'RY.TO', name: 'Royal Bank' },
  { sym: 'TD.TO', name: 'TD Bank' },
  { sym: 'SHOP.TO', name: 'Shopify' },
  { sym: 'ENB.TO', name: 'Enbridge' },
  { sym: 'CNR.TO', name: 'CN Rail' },
  { sym: 'BMO.TO', name: 'BMO' },
  { sym: 'BNS.TO', name: 'Scotiabank' },
  { sym: 'CP.TO', name: 'CP Rail' },
];

export const STOCK_PICKS_XETRA = [
  { sym: 'SAP.DE', name: 'SAP' },
  { sym: 'SIE.DE', name: 'Siemens' },
  { sym: 'ALV.DE', name: 'Allianz' },
  { sym: 'DTE.DE', name: 'Deutsche Telekom' },
  { sym: 'BAS.DE', name: 'BASF' },
  { sym: 'MBG.DE', name: 'Mercedes-Benz' },
  { sym: 'BMW.DE', name: 'BMW' },
  { sym: 'ADS.DE', name: 'Adidas' },
];

export const STOCK_PICKS_HKSE = [
  { sym: '0700.HK', name: 'Tencent' },
  { sym: '9988.HK', name: 'Alibaba' },
  { sym: '0005.HK', name: 'HSBC HK' },
  { sym: '1299.HK', name: 'AIA Group' },
  { sym: '3690.HK', name: 'Meituan' },
  { sym: '0941.HK', name: 'China Mobile' },
  { sym: '2318.HK', name: 'Ping An' },
  { sym: '1810.HK', name: 'Xiaomi' },
];

export const STOCK_PICKS_JPX = [
  { sym: '7203.T', name: 'Toyota' },
  { sym: '6758.T', name: 'Sony' },
  { sym: '6861.T', name: 'Keyence' },
  { sym: '6902.T', name: 'Denso' },
  { sym: '9984.T', name: 'SoftBank' },
  { sym: '8306.T', name: 'MUFG' },
  { sym: '6501.T', name: 'Hitachi' },
  { sym: '7741.T', name: 'HOYA' },
];

export const STOCK_PICKS_BY_EXCHANGE: Record<string, { sym: string; name: string }[]> = {
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
