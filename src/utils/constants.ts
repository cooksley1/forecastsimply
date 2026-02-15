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
  { label: '24H', days: 1 },
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
  { label: '1Y', days: 365 },
];

export const STOCK_TIMEFRAMES = [
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '1Y', days: 365 },
  { label: '2Y', days: 730 },
  { label: '5Y', days: 1825 },
];
