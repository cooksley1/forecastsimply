# ForecastSimply v7.0 — Complete Technical Blueprint

> **Purpose**: This document contains every detail needed to rebuild the ForecastSimply application from scratch. It covers architecture, data flow, algorithms, UI structure, backend services, and configuration.

---

## Table of Contents

1. [Tech Stack & Dependencies](#1-tech-stack--dependencies)
2. [Project Structure](#2-project-structure)
3. [Data Sources & API Integration](#3-data-sources--api-integration)
4. [Analysis Engine](#4-analysis-engine)
5. [Signal Scoring System](#5-signal-scoring-system)
6. [Forecast Models](#6-forecast-models)
7. [Recommendation Engine](#7-recommendation-engine)
8. [Trade Setup Generator](#8-trade-setup-generator)
9. [UI Component Architecture](#9-ui-component-architecture)
10. [State Management](#10-state-management)
11. [Asset Types & Constants](#11-asset-types--constants)
12. [Caching Strategy](#12-caching-strategy)
13. [Design System](#13-design-system)
14. [Backend Services](#17-backend-services)
15. [Price Alerts & Notifications](#18-price-alerts--notifications)
16. [Newsletter & Market Digest](#19-newsletter--market-digest)
17. [Authentication & Security](#20-authentication--security)

---

## 1. Tech Stack & Dependencies

| Layer | Technology |
|-------|-----------|
| Framework | React 18.3 + TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS + tailwindcss-animate |
| UI Components | shadcn/ui (Radix primitives) |
| Charts | Recharts 2.15 |
| Routing | React Router DOM 6.30 |
| Server State | TanStack React Query 5.83 |
| Forms | React Hook Form + Zod |
| Notifications | Sonner + Radix Toast |

### Key Dev Dependencies
- Vitest (testing)
- ESLint (linting)
- PostCSS + Autoprefixer

---

## 2. Project Structure

```
src/
├── analysis/               # Core analysis engine
│   ├── indicators.ts        # Technical indicator calculations
│   ├── signals.ts           # Composite signal scoring
│   ├── forecast.ts          # 3 forecast models
│   ├── recommendations.ts   # Buy/sell recommendations
│   ├── tradeSetup.ts        # Entry/exit trade setups
│   └── processTA.ts         # Orchestrator — ties everything together
├── components/
│   ├── analysis/            # Analysis display panels
│   │   ├── AnalysisTextPanel.tsx
│   │   ├── BreakoutFinder.tsx
│   │   ├── IndicatorsPanel.tsx
│   │   ├── PortfolioBuilder.tsx
│   │   ├── RecommendationPanel.tsx
│   │   ├── SignalPanel.tsx
│   │   ├── TopPicks.tsx
│   │   └── TradeSetupPanel.tsx
│   ├── charts/              # Chart components
│   │   ├── ChartControls.tsx
│   │   ├── ForecastMethodBar.tsx
│   │   ├── MainChart.tsx
│   │   ├── RSIChart.tsx
│   │   └── VolumeChart.tsx
│   ├── layout/              # App layout
│   │   ├── Header.tsx
│   │   └── WatchlistBar.tsx
│   ├── search/              # Search & discovery
│   │   ├── ForexPairSelector.tsx
│   │   ├── GuidedDiscovery.tsx
│   │   ├── QuickPicks.tsx
│   │   └── SearchBar.tsx
│   ├── settings/
│   │   └── ApiKeySettings.tsx
│   └── ui/                  # shadcn/ui primitives
├── hooks/
│   ├── use-mobile.tsx
│   └── use-toast.ts
├── pages/
│   ├── Index.tsx            # Main page (single-page app)
│   └── NotFound.tsx
├── services/
│   ├── api/
│   │   ├── coingecko.ts     # CoinGecko API client
│   │   ├── coinlore.ts      # CoinLore API client
│   │   ├── dia.ts           # DIA Oracle API client
│   │   ├── frankfurter.ts   # Frankfurter forex API client
│   │   └── yahoo.ts         # Yahoo Finance API client
│   └── cache.ts             # In-memory + localStorage cache
├── types/
│   ├── analysis.ts          # Analysis type definitions
│   └── assets.ts            # Asset type definitions
└── utils/
    ├── constants.ts         # Quick-pick lists, timeframes
    └── format.ts            # Number/currency formatting
```

---

## 3. Data Sources & API Integration

### 3.1 CoinGecko (`services/api/coingecko.ts`)
- **Purpose**: Historical OHLC data for crypto, asset info/metadata
- **Endpoints used**:
  - `/coins/{id}/market_chart` — historical prices (close, volume, timestamps)
  - `/coins/{id}` — metadata (market cap, supply, ATH, etc.)
- **Rate limits**: Free tier ~10-30 req/min
- **Data returned**: `{ prices: [timestamp, price][], volumes: [timestamp, vol][] }`

### 3.2 DIA Oracle (`services/api/dia.ts`)
- **Purpose**: Live individual asset prices (bypasses CoinGecko rate limits)
- **Endpoints used**:
  - `/v1/assetQuotation/{blockchain}/{address}` — live price
- **Use case**: Real-time price display, watchlist updates

### 3.3 CoinLore (`services/api/coinlore.ts`)
- **Purpose**: Bulk crypto screening, top picks, rankings
- **Endpoints used**:
  - `/api/tickers/` — top 100 coins with price, change %, market cap
  - `/api/ticker/?id=` — individual coin data
- **Use case**: TopPicks component, BreakoutFinder, GuidedDiscovery

### 3.4 Yahoo Finance (`services/api/yahoo.ts`)
- **Purpose**: Stocks, ETFs historical data and info
- **Endpoints used**:
  - `/v8/finance/chart/{symbol}` — OHLCV historical data
  - Via proxy or direct (CORS considerations)
- **Timeframe mapping**: `1d`, `5d`, `1mo`, `3mo`, `6mo`, `1y`, `2y`, `5y`
- **Data returned**: timestamps, open, high, low, close, volume arrays

### 3.5 Frankfurter (`services/api/frankfurter.ts`)
- **Purpose**: Forex exchange rates (free, no key needed)
- **Endpoints used**:
  - `/latest?from=X&to=Y` — current rate
  - `/{startDate}..{endDate}?from=X&to=Y` — historical series
- **Supported currencies**: 30+ including AUD, USD, EUR, GBP, JPY, CAD, NZD, CHF

### Data Flow Pipeline
```
User selects asset
  → Fetch historical data (CoinGecko / Yahoo / Frankfurter)
  → Extract closes[], timestamps[], volumes[]
  → Pass to processTA()
  → Returns TechnicalData object
  → Render in UI components
```

---

## 4. Analysis Engine

### 4.1 Orchestrator: `processTA.ts`

**Input**:
- `rawCloses: number[]` — raw closing prices
- `rawTimestamps: number[]` — unix timestamps (ms)
- `rawVolumes: number[]` — volume data
- `forecastPercent: number` — forecast horizon as % of data length
- `assetType: AssetType` — 'crypto' | 'stocks' | 'etfs' | 'forex'
- `forecastMethods: ForecastMethodId[]` — which forecast models to run

**Processing steps**:
1. **Downsample** to max 200 points (preserves last point)
2. **Calculate all indicators** (SMA, RSI, BB, MACD, Stochastic, S/R)
3. **Compute signal** (composite score)
4. **Generate forecasts** (for each selected method)
5. **Generate recommendations** (short/mid/long term)
6. **Generate trade setups** (long & short)
7. **Detect market phase** (Markup, Markdown, Distribution, Accumulation, Consolidation, Recovery, Decline)
8. **Build analysis text** (human-readable summary)

**Output**: `TechnicalData` object (see Types section)

### 4.2 Downsampling Algorithm
```typescript
function downsample<T>(arr: T[], target: number): T[] {
  if (arr.length <= target) return arr;
  const step = arr.length / target;
  const result: T[] = [];
  for (let i = 0; i < target; i++) 
    result.push(arr[Math.floor(i * step)]);
  result[result.length - 1] = arr[arr.length - 1]; // Always include last
  return result;
}
```

### 4.3 Market Phase Detection
Uses SMA20/SMA50 crossover + normalized slope of last 20 data points:

| Condition | Phase |
|-----------|-------|
| Price > SMA20 > SMA50, slope > 0.001 | Markup / Uptrend |
| Price < SMA20 < SMA50, slope < -0.001 | Markdown / Downtrend |
| Price < SMA20, SMA20 > SMA50 | Distribution |
| Price > SMA20, SMA20 < SMA50 | Accumulation |
| 20d range < 3× avg daily move | Consolidation |
| Positive slope (default) | Recovery |
| Negative slope (default) | Decline |

**Normalized slope calculation**:
```
slope = (n × ΣxY - Σx × ΣY) / (n × Σx² - (Σx)²)
normSlope = slope / lastPrice
```

---

## 5. Signal Scoring System (`signals.ts`)

### Composite Score (-10 to +10)

| Indicator | Bullish | Bearish |
|-----------|---------|---------|
| RSI < 25 | +3 | — |
| RSI < 35 | +1 | — |
| RSI > 75 | — | -3 |
| RSI > 65 | — | -1 |
| Price > SMA20 | +1 | — |
| Price < SMA20 | — | -1 |
| Price > SMA50 | +1 | — |
| Price < SMA50 | — | -1 |
| SMA20 > SMA50 (golden cross) | +1 | — |
| SMA20 < SMA50 (death cross) | — | -1 |
| BB position < 0.15 | +1 | — |
| BB position > 0.85 | — | -1 |
| MACD histogram rising | +1 | — |
| MACD histogram falling | — | -1 |
| Stochastic K < 20 | +1 | — |
| Stochastic K > 80 | — | -1 |

### Signal Labels

| Score Range | Label | Color |
|-------------|-------|-------|
| ≥ 6 | Strong Buy | green |
| 2 to 5 | Buy | green |
| -1 to 1 | Hold | amber |
| -5 to -2 | Sell | red |
| ≤ -6 | Strong Sell | red |

### Confidence Calculation
```
confidence = min(95, 45 + |score| × 5)
```

---

## 6. Forecast Models (`forecast.ts`)

Three models available, identified by `ForecastMethodId`:

### 6.1 Holt's Exponential Smoothing (`holt`)
- **Best for**: Trending assets with clear directional momentum
- **Parameters**: α (level smoothing), β (trend smoothing)
- **Process**:
  1. Initialize level = first close, trend = avg of first few differences
  2. Update: `level = α × close + (1-α) × (prevLevel + prevTrend)`
  3. Update: `trend = β × (level - prevLevel) + (1-β) × prevTrend`
  4. Forecast: `level + k × trend` for k steps ahead
- **Confidence band**: Widens linearly with forecast horizon
- **Accuracy**: Best when trends are consistent, can lag at reversals

### 6.2 EMA Momentum / Mean Reversion (`ema_momentum`)
- **Best for**: Volatile or range-bound assets
- **Process**:
  1. Calculate EMA of recent closes
  2. Measure deviation from EMA (momentum)
  3. Apply mean-reversion pull toward EMA
  4. Forecast: `EMA + decaying momentum component`
- **Confidence band**: Based on recent volatility
- **Accuracy**: Best when price oscillates around a mean

### 6.3 Monte Carlo Simulation (`monte_carlo`)
- **Best for**: Risk assessment, understanding range of outcomes
- **Process**:
  1. Calculate daily returns distribution (mean μ, std σ)
  2. Run N simulated price paths using random normal draws
  3. At each future step: `price × e^(μ + σ × Z)` where Z ~ N(0,1)
  4. Forecast value = median of all paths
  5. Upper/lower bands = percentile-based (e.g., 10th and 90th)
- **Confidence band**: Reflects actual probability distribution
- **Accuracy**: Best for showing risk/uncertainty, not point predictions

### Forecast Colors
```typescript
const FORECAST_COLORS = {
  holt: 'hsl(142 71% 45%)',        // Green
  ema_momentum: 'hsl(263 91% 66%)', // Purple
  monte_carlo: 'hsl(38 92% 50%)',   // Orange
};
```

---

## 7. Recommendation Engine (`recommendations.ts`)

Generates 3 recommendations per analysis:

### Horizons

| Horizon | Entry | Target | Stop Loss | Confidence Formula |
|---------|-------|--------|-----------|-------------------|
| **Short** | Current price | Resistance (bull) / Support (bear) | Support + 10% range (bull) / Resistance - 10% range (bear) | min(90, 50 + \|score\| × 8) |
| **Mid** | Current price | Forecast target | min(support, price × 0.9) | min(85, 45 + \|score\| × 7) |
| **Long** | Current price | max(forecast, resistance × 1.1) | min(support, price × 0.85) | min(80, 40 + \|score\| × 7) |

### Asset-Type Labels

| Asset Type | Strong Buy | Buy | Hold | Sell | Strong Sell |
|-----------|-----------|-----|------|------|-------------|
| Crypto/Stocks | Strong Buy | Buy | Hold | Sell | Strong Sell |
| ETFs | Strong Add | Add to Position | Hold/DCA | Reduce | Pause DCA |
| Forex | Strong Long | Go Long | Flat/Neutral | Go Short | Strong Short |

### Reasoning Template
- **Short**: "RSI at {rsi} with {bullish/bearish} momentum. {entry condition}."
- **Mid**: "Forecast projects {%} move. {trend assessment}."
- **Long**: "Long-term outlook based on trend direction and market structure."

---

## 8. Trade Setup Generator (`tradeSetup.ts`)

Generates both long and short setups:

### Long Setup
```
Entry:  support + (resistance - support) × 0.05
Stop:   support × 0.98
TP1:    resistance
TP2:    resistance + (resistance - support) × 0.5
R:R:    (TP1 - Entry) / (Entry - Stop)
Bias:   signal.score >= 0
```

### Short Setup
```
Entry:  resistance - (resistance - support) × 0.05
Stop:   resistance × 1.02
TP1:    support
TP2:    support - (resistance - support) × 0.5
R:R:    (Entry - TP1) / (Stop - Entry)
Bias:   signal.score <= 0
```

---

## 9. UI Component Architecture

### 9.1 Page Layout (`pages/Index.tsx`)
Single-page application with the following sections:
1. **Header** — App title, navigation links
2. **Search Area** — SearchBar + QuickPicks + ForexPairSelector + GuidedDiscovery
3. **Chart Area** — MainChart + ForecastMethodBar + ChartControls
4. **Sub-Charts** — RSIChart + VolumeChart
5. **Analysis Tabs** — Signal, Recommendations, Trade, Analysis, Indicators, Info
6. **Sidebar Features** — TopPicks, BreakoutFinder, PortfolioBuilder
7. **WatchlistBar** — Persistent watchlist at bottom

### 9.2 Chart Components

**MainChart** (`charts/MainChart.tsx`)
- Recharts `AreaChart` for price data
- Overlays: SMA20 (blue), SMA50 (orange), Bollinger Bands (gray fill)
- Support/Resistance horizontal reference lines
- Forecast lines (colored by method)
- Confidence bands as shaded areas
- Responsive container, tooltips with formatted values

**RSIChart** (`charts/RSIChart.tsx`)
- Recharts `LineChart`
- RSI line with overbought (70) / oversold (30) reference lines
- Color coding based on zones

**VolumeChart** (`charts/VolumeChart.tsx`)
- Recharts `BarChart`
- Volume bars colored by price direction (green up, red down)

**ForecastMethodBar** (`charts/ForecastMethodBar.tsx`)
- Toggle buttons for each forecast method
- Color-coded chips matching forecast line colors
- Expandable explainer panel with:
  - Method descriptions
  - Limitations
  - Accuracy context
  - "Pro tip" about consensus

### 9.3 Analysis Panels

**SignalPanel** — Displays composite signal score, label, color, confidence bar
**RecommendationPanel** — Cards for short/mid/long recommendations with entry/target/stop
**TradeSetupPanel** — Long & short setups with R:R ratios, bias indicators
**AnalysisTextPanel** — Rendered markdown analysis summary
**IndicatorsPanel** — Raw indicator values in a table/grid

### 9.4 Search & Discovery

**SearchBar** — Text input with asset type tabs (Crypto, Stocks, ETFs, Forex)
**QuickPicks** — Preset buttons for popular assets per category
**ForexPairSelector** — Two dropdowns (base/quote currency) with swap button, 28+ currencies with flag emojis
**GuidedDiscovery** — Multi-step filter system:
- Crypto: Sector → Market Cap → Ecosystem
- Stocks: Sector → Market → Style
- ETFs: Strategy → Region
- Forex: Pair Type (Majors, Crosses, Exotics)

### 9.5 Sidebar Components

**TopPicks** — Auto-loaded top gainers/losers from CoinLore
**BreakoutFinder** — Scans for assets near support/resistance levels
**PortfolioBuilder** — Add assets to a virtual portfolio, see allocation

---

## 10. State Management

All state lives in `pages/Index.tsx` using React `useState`:

```typescript
// Core state
const [assetType, setAssetType] = useState<AssetType>('crypto');
const [selectedAsset, setSelectedAsset] = useState<string>('');
const [technicalData, setTechnicalData] = useState<TechnicalData | null>(null);
const [assetInfo, setAssetInfo] = useState<AssetInfo | null>(null);
const [loading, setLoading] = useState(false);

// Chart controls
const [timeframe, setTimeframe] = useState(30); // days
const [forecastPercent, setForecastPercent] = useState(20);
const [forecastMethods, setForecastMethods] = useState<ForecastMethodId[]>(['holt']);

// UI state
const [activeTab, setActiveTab] = useState<ResultTab>('home');
const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);

// Forex specific
const [forexBase, setForexBase] = useState('AUD');
const [forexQuote, setForexQuote] = useState('USD');
```

### Persistence (localStorage)
- Watchlist items
- API keys (optional CoinGecko key)
- Cache entries (with TTL)

---

## 11. Asset Types & Constants

### Asset Types
```typescript
type AssetType = 'crypto' | 'stocks' | 'etfs' | 'forex';
```

### Quick Pick Lists

**Crypto** (10 items): BTC, ETH, SOL, BNB, XRP, ADA, DOGE, AVAX, DOT, LINK

**US Stocks** (10 items): AAPL, MSFT, NVDA, GOOGL, AMZN, TSLA, META, JPM, V, JNJ

**ASX Stocks** (5 items): CBA.AX, BHP.AX, CSL.AX, WES.AX, NAB.AX

**US ETFs** (5 items): SPY, QQQ, VTI, VOO, ARKK

**ASX ETFs** (5 items): VGS.AX, VAS.AX, IVV.AX, VDHG.AX, A200.AX

**Forex Pairs** (8 items): AUD/USD, EUR/USD, GBP/USD, USD/JPY, AUD/EUR, USD/CAD, NZD/USD, AUD/GBP

### Timeframes

**Crypto**: 24H, 7D, 30D, 90D, 1Y

**Stocks/ETFs**: 1M, 3M, 6M, 1Y, 2Y, 5Y

---

## 12. Caching Strategy (`services/cache.ts`)

- **In-memory Map** as primary cache
- **localStorage** as persistent fallback
- **TTL-based expiration** — configurable per entry
- **Key format**: `{assetType}:{symbol}:{timeframe}:{dataType}`
- **Default TTLs**:
  - Live prices: 60 seconds
  - Historical data: 5 minutes
  - Asset info/metadata: 15 minutes

---

## 13. Design System

### CSS Variables (index.css)
All colors in HSL format, supporting light and dark modes:

```css
:root {
  --background: /* HSL values */;
  --foreground: /* HSL values */;
  --primary: /* HSL values */;
  --primary-foreground: /* HSL values */;
  --secondary: /* HSL values */;
  --muted: /* HSL values */;
  --accent: /* HSL values */;
  --destructive: /* HSL values */;
  --border: /* HSL values */;
  --ring: /* HSL values */;
  --card: /* HSL values */;
  --popover: /* HSL values */;
}
```

### Tailwind Config Mapping
All CSS variables mapped to Tailwind classes via `tailwind.config.ts`:
- `bg-background`, `text-foreground`
- `bg-primary`, `text-primary-foreground`
- `bg-card`, `bg-muted`, `bg-accent`
- `border-border`, `ring-ring`

### Chart Color Conventions
- **SMA20**: Blue (`hsl(210 100% 56%)`)
- **SMA50**: Orange (`hsl(30 100% 50%)`)
- **Bollinger Bands**: Gray fill with low opacity
- **Support**: Green dashed line
- **Resistance**: Red dashed line
- **Volume Up**: Green bars
- **Volume Down**: Red bars
- **RSI Overbought (70)**: Red reference line
- **RSI Oversold (30)**: Green reference line

---

## 14. Technical Indicator Formulas

### Simple Moving Average (SMA)
```
SMA(period) = Σ(close[i-period+1..i]) / period
```
Returns NaN for indices before period-1.

### Exponential Moving Average (EMA)
```
k = 2 / (period + 1)
EMA[0] = close[0]
EMA[i] = close[i] × k + EMA[i-1] × (1-k)
```

### Relative Strength Index (RSI)
```
Period: 14 (default)
Change = close[i] - close[i-1]
AvgGain = rolling average of gains over period
AvgLoss = rolling average of losses over period
RS = AvgGain / AvgLoss
RSI = 100 - (100 / (1 + RS))
```
Uses Wilder's smoothing: `avgGain = (prevAvgGain × (period-1) + currentGain) / period`

### Bollinger Bands
```
Period: 20, Multiplier: 2
Middle = SMA(20)
StdDev = √(Σ(close - SMA)² / period)
Upper = Middle + 2 × StdDev
Lower = Middle - 2 × StdDev
```

### MACD
```
MACD Line = EMA(12) - EMA(26)
Signal Line = EMA(9) of MACD Line
Histogram = MACD Line - Signal Line
```

### Stochastic Oscillator
```
Period K: 14, Period D: 3
%K = ((Close - LowestLow) / (HighestHigh - LowestLow)) × 100
%D = SMA(3) of %K
```
Falls back to using closes for highs/lows if OHLC not available.

### Support & Resistance
```
1. Find local minima (point lower than 2 neighbors on each side)
2. Find local maxima (point higher than 2 neighbors on each side)
3. Support = average of local minima (or 10th percentile if < 2 found)
4. Resistance = average of local maxima (or 90th percentile if < 2 found)
```

---

## 15. Type Definitions

### TechnicalData (main output)
```typescript
interface TechnicalData {
  prices: { timestamp: number; close: number; volume?: number }[];
  indicators: Indicators;
  signal: Signal;
  recommendations: Recommendation[];
  tradeSetups: TradeSetup[];
  forecast: ForecastPoint[];
  forecastTarget: number;
  forecasts: NamedForecast[];
  marketPhase: string;
  analysisText: string;
}
```

### Indicators
```typescript
interface Indicators {
  sma20: number[];
  sma50: number[];
  sma200?: number[];
  rsi: number[];
  currentRsi: number;
  bbUpper: number[];
  bbMiddle: number[];
  bbLower: number[];
  macdLine: number[];
  macdSignal: number[];
  macdHistogram: number[];
  stochasticK: number[];
  stochasticD: number[];
  obv?: number[];
  atr?: number[];
  vwap?: number[];
  support: number;
  resistance: number;
}
```

### Signal
```typescript
interface Signal {
  score: number;       // -10 to +10
  label: SignalLabel;  // 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell'
  color: SignalColor;  // 'green' | 'amber' | 'red'
  confidence: number;  // 45-95%
}
```

### ForecastPoint
```typescript
interface ForecastPoint {
  timestamp: number;
  value: number;
  upper: number;
  lower: number;
}
```

### AssetInfo
```typescript
interface AssetInfo {
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
```

---

## 16. Volatility Calculation

Used in analysis text generation:
```
Returns[i] = (close[i] - close[i-1]) / close[i-1]
Mean = average(Returns)
DailyVol = √(Σ(return - mean)² / n) × 100  (as percentage)
```

---

---

## 17. Backend Services

### Edge Functions (Supabase)

| Function | Purpose | Auth |
|----------|---------|------|
| `yahoo-proxy` | Proxies Yahoo Finance chart requests (CORS bypass) | Public |
| `yahoo-search` | Proxies Yahoo Finance search queries | Public |
| `exchange-screener` | Screens ASX/LSE/TSE exchange tickers | Public |
| `check-price-alerts` | Cron job: checks triggered price alerts, sends push/email | Cron (no JWT) |
| `get-vapid-key` | Returns VAPID public key for push subscriptions | Public |
| `curated-digest` | Generates AI-curated market digest content | Authenticated |
| `send-digest` | Sends approved digest emails to subscribers | Cron / Admin |
| `refresh-market-data` | Cron job: warms market data cache | Cron (no JWT) |
| `admin-users` | User management (CRUD, ban, roles, impersonate) | Admin only |

### Database Tables

| Table | Purpose | RLS |
|-------|---------|-----|
| `profiles` | User display names, avatars | Owner only |
| `user_roles` | Role-based access (admin, moderator, user) | Owner read, admin manage |
| `user_preferences` | Theme, risk profile, timeframe defaults | Owner only |
| `watchlist_groups` | Named watchlist folders with colors | Owner only |
| `watchlist_items` | Individual watchlist entries | Owner only |
| `analysis_history` | Saved analysis snapshots | Owner only |
| `price_alerts` | User-defined price/percentage alerts | Owner only |
| `push_subscriptions` | Web push notification endpoints | Owner only |
| `login_history` | Sign-in audit trail (IP, user agent, location) | Owner + admin read |
| `newsletter_subscribers` | Email subscriptions with asset preferences | Owner read, public insert |
| `market_digests` | AI-generated weekly market reports | Admin manage, auth read approved |

---

## 18. Price Alerts & Notifications

### Alert Types
- **Price target**: Triggers when asset reaches a specific price
- **Percentage move**: Triggers on a % change from reference price

### Notification Delivery (Priority Order)
1. **Push notifications** — via Web Push API (VAPID keys)
2. **Email fallback** — automatically used when push is unavailable or blocked

### Flow
```
check-price-alerts (cron) →
  Fetch active alerts →
  Check current prices →
  For each triggered alert:
    1. Try push notification (if subscription exists)
    2. If push fails or no subscription → send email via Resend
    3. Mark alert as triggered
```

### Browser-Specific Blocked Notification Instructions
When push notifications are blocked, the UI detects the browser (Chrome, Edge, Firefox, Safari) and shows tailored step-by-step instructions for re-enabling them.

---

## 19. Newsletter & Market Digest

### Subscription
- Anonymous users can subscribe with email only
- Authenticated users auto-link their user_id
- Preferences: crypto, stocks, ETFs, forex (all enabled by default)
- Managed via AccountPanel or footer signup form

### Digest Pipeline
```
curated-digest (admin triggers) →
  Generate AI market summary →
  Save as draft in market_digests →
  Admin reviews & approves →
send-digest (cron or admin) →
  Fetch approved digest →
  Fetch active subscribers →
  Send personalised HTML emails via Resend →
  Includes: greeting, market summary, insights, recommendations, watchlist alerts
```

---

## 20. Authentication & Security

### Auth Methods
- Email/password (with email verification)
- Phone OTP
- Google OAuth (via Lovable Cloud)

### Security Model
- **Row-Level Security (RLS)** on all tables
- **Restrictive policies** scoped to `auth.uid() = user_id`
- **Admin access** via `has_role()` SECURITY DEFINER function
- **Edge function auth**: Admin functions verify caller role server-side
- **Input validation**: Comprehensive validation on admin edge function (UUID, email, password, phone, role, metadata size)
- **CORS**: Configured on all edge functions

### Role System
- Roles stored in dedicated `user_roles` table (not in profiles)
- Enum: `admin | moderator | user`
- Checked via `has_role(_user_id, _role)` function to avoid RLS recursion

---

*End of Blueprint — ForecastSimply v7.0*
