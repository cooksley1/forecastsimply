# ForecastSimply v9.0 — Complete Technical Blueprint

> **Purpose**: This document contains every detail needed to rebuild the ForecastSimply application from scratch — pixel-perfect, data-accurate, and functionally identical. It covers architecture, data flow, algorithms (with exact constants), UI structure, backend services, design system (with exact HSL values), and configuration.

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
14. [Technical Indicator Formulas](#14-technical-indicator-formulas)
15. [Type Definitions](#15-type-definitions)
16. [Data Fetcher & Fallback Chain](#16-data-fetcher--fallback-chain)
17. [Backend Services](#17-backend-services)
18. [Price Alerts & Notifications](#18-price-alerts--notifications)
19. [Newsletter & Market Digest](#19-newsletter--market-digest)
20. [Authentication & Security](#20-authentication--security)
21. [Admin Panel](#21-admin-panel)
22. [Watchlist & PnL Tracking](#22-watchlist--pnl-tracking)
23. [Strategy Backtester](#23-strategy-backtester)
24. [Breakout Finder](#24-breakout-finder)
25. [Top Picks & Unified Scoring](#25-top-picks--unified-scoring)
26. [Routing & Pages](#26-routing--pages)
27. [PWA Configuration](#27-pwa-configuration)
28. [SEO & Meta](#28-seo--meta)

---

## 1. Tech Stack & Dependencies

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React + TypeScript | ^18.3.1 |
| Build Tool | Vite | latest |
| Styling | Tailwind CSS + tailwindcss-animate | latest + ^1.0.7 |
| UI Components | shadcn/ui (Radix primitives) | latest |
| Charts | Recharts | ^2.15.4 |
| Routing | React Router DOM | ^6.30.1 |
| Server State | TanStack React Query | ^5.83.0 |
| Forms | React Hook Form + Zod | ^7.61.1 + ^3.25.76 |
| Notifications | Sonner + Radix Toast | ^1.7.4 |
| Auth | Supabase JS + @lovable.dev/cloud-auth-js | ^2.95.3 + ^0.0.3 |
| Icons | Lucide React | ^0.462.0 |
| Theme | next-themes | ^0.3.0 |
| Carousel | Embla Carousel React | ^8.6.0 |
| Resizable Panels | react-resizable-panels | ^2.1.9 |
| Drawer | vaul | ^0.9.9 |
| OTP Input | input-otp | ^1.4.2 |
| Date Picker | react-day-picker + date-fns | ^8.10.1 + ^3.6.0 |
| PWA | vite-plugin-pwa | ^1.2.0 |
| Class Utils | clsx + class-variance-authority + tailwind-merge | ^2.1.1 + ^0.7.1 + ^2.6.0 |
| Command Palette | cmdk | ^1.1.1 |

### Key Dev Dependencies
- Vitest (testing)
- ESLint (linting)
- PostCSS + Autoprefixer
- TypeScript ^5.x

---

## 2. Project Structure

```
src/
├── analysis/                   # Core analysis engine
│   ├── indicators.ts            # 15 technical indicator calculations (SMA, EMA, RSI, BB, MACD, Stochastic, S/R, ATR, OBV, VWAP, Ichimoku, Fibonacci, EMA Pair)
│   ├── signals.ts               # 15-factor composite signal scoring with breakdowns
│   ├── marketStructure.ts       # BOS, CHoCH, Supply/Demand zones, Fibonacci, Volume Profile
│   ├── crossTimeframe.ts        # Cross-timeframe signal consistency dampening
│   ├── forecast.ts              # 5 forecast models (Ensemble, Linear, Holt, EMA Momentum, Monte Carlo)
│   ├── recommendations.ts       # 14-step recommendation engine with regime alignment
│   ├── tradeSetup.ts            # ATR-based entry/exit trade setups with risk scaling
│   └── processTA.ts             # Orchestrator — ties everything together, market phase detection, analysis text
├── components/
│   ├── account/
│   │   └── AccountPanel.tsx     # User account settings (profile, preferences, theme, currency, newsletter)
│   ├── admin/
│   │   ├── AdminAnalyticsTab.tsx  # Platform analytics dashboard (KPIs, charts, country breakdown)
│   │   └── AdminSubscribersTab.tsx # Newsletter subscriber management
│   ├── alerts/
│   │   ├── PriceAlertDialog.tsx  # Create/edit price alerts dialog
│   │   ├── PriceAlertsList.tsx   # List of user's price alerts
│   │   └── PushNotificationToggle.tsx # Push notification permission toggle
│   ├── analysis/
│   │   ├── AnalysisTextPanel.tsx  # Rendered markdown analysis summary
│   │   ├── BreakoutFinder.tsx    # Scans 300+ crypto + watchlist for breakout candidates
│   │   ├── ConditionScreener.tsx # Custom condition-based screener
│   │   ├── CongressTrades.tsx    # Congressional trading activity display
│   │   ├── IndicatorBuilder.tsx  # Custom indicator combination builder
│   │   ├── IndicatorsPanel.tsx   # Raw indicator values display
│   │   ├── PortfolioBuilder.tsx  # Virtual portfolio allocation builder
│   │   ├── RecommendationPanel.tsx # Short/mid/long/DCA recommendation cards
│   │   ├── ReportButton.tsx      # Generate PDF/text analysis report
│   │   ├── SignalPanel.tsx       # Composite signal score with breakdown
│   │   ├── SimulationTracker.tsx # Track simulation performance over time
│   │   ├── StrategyBacktester.tsx # Backtest trading strategies with chart integration
│   │   ├── TopPicks.tsx          # Top crypto picks from CoinLore (unified scoring)
│   │   ├── TopPicksDashboard.tsx # Dashboard view of top picks (unified scoring)
│   │   └── TradeSetupPanel.tsx   # Long & short trade setup display
│   ├── auth/
│   │   └── LoginDialog.tsx      # Login/signup dialog with email, phone, Google
│   ├── charts/
│   │   ├── AnalysisOverlayBar.tsx # Toggle overlays (Ichimoku, Fibonacci, EMA, VWAP, Volume SMA)
│   │   ├── ChartControls.tsx     # Timeframe, forecast %, risk level controls
│   │   ├── ForecastMethodBar.tsx  # Forecast method toggle buttons with explainer
│   │   ├── FullscreenChart.tsx   # Fullscreen chart modal
│   │   ├── MainChart.tsx         # Primary Recharts AreaChart with overlays
│   │   ├── RSIChart.tsx          # RSI line chart with overbought/oversold zones
│   │   └── VolumeChart.tsx       # Volume bar chart with direction coloring
│   ├── layout/
│   │   ├── Header.tsx            # App header with logo, nav, theme toggle, auth
│   │   ├── StickySubNav.tsx      # Two-row sticky sub-navigation
│   │   ├── WatchlistBar.tsx      # Persistent watchlist bar
│   │   └── WatchlistDropdown.tsx # Watchlist dropdown with PnL tracking, groups, notes
│   ├── search/
│   │   ├── ExchangeSelector.tsx  # Stock/ETF exchange selector (US, ASX, LSE, HKSE, JPX)
│   │   ├── ForexPairSelector.tsx # Base/quote currency dropdowns with swap + 28 currencies
│   │   ├── GuidedDiscovery.tsx   # Multi-step filter (Sector → Cap → Ecosystem)
│   │   ├── QuickPicks.tsx        # Preset asset buttons with sorting + rankings
│   │   └── SearchBar.tsx         # Text search with asset type tabs
│   ├── settings/
│   │   └── ApiKeySettings.tsx    # Optional API key configuration (CoinGecko, Alpha Vantage, FMP)
│   ├── ui/                       # 50+ shadcn/ui primitives (accordion, dialog, popover, etc.)
│   ├── BackToHome.tsx
│   ├── CookieBanner.tsx
│   ├── ErrorBoundary.tsx
│   ├── NavLink.tsx
│   ├── NewsletterSignup.tsx
│   ├── ScrollToTop.tsx
│   ├── SEO.tsx
│   ├── SmartFeed.tsx             # AI-powered smart feed of analysis insights
│   └── SocialShare.tsx           # Social sharing buttons
├── contexts/
│   ├── AuthContext.tsx           # Supabase auth state provider
│   └── ThemeContext.tsx          # Theme (dark/light) provider using next-themes
├── hooks/
│   ├── use-mobile.tsx            # Mobile detection hook (breakpoint: 768px)
│   ├── use-toast.ts              # Toast notification hook
│   ├── useAdminCheck.ts          # Check if user has admin role
│   ├── useAssetData.ts           # React Query hooks for crypto/equity/forex data
│   ├── useCryptoScreener.ts      # Crypto screener data hook
│   ├── useExchangeScreener.ts    # Exchange-specific stock screener
│   └── usePushSubscription.ts    # Push notification subscription management
├── integrations/
│   ├── lovable/index.ts          # Lovable AI integration
│   └── supabase/
│       ├── client.ts             # Auto-generated Supabase client (DO NOT EDIT)
│       └── types.ts              # Auto-generated database types (DO NOT EDIT)
├── pages/
│   ├── About.tsx
│   ├── Admin.tsx                 # Admin panel with 4 tabs (Analytics, Users, Subscribers, Digests)
│   ├── Contact.tsx
│   ├── Disclaimer.tsx
│   ├── FAQ.tsx
│   ├── Index.tsx                 # Main dashboard (1051 lines — primary SPA)
│   ├── Landing.tsx               # Landing page (redirects authenticated users to Index)
│   ├── NotFound.tsx
│   ├── Privacy.tsx
│   └── Terms.tsx
├── services/
│   ├── api/
│   │   ├── alphavantage.ts       # Alpha Vantage (stocks, forex fallback)
│   │   ├── coingecko.ts          # CoinGecko (crypto primary)
│   │   ├── coinlore.ts           # CoinLore (bulk crypto screening, 300+ coins)
│   │   ├── coinpaprika.ts        # CoinPaprika (crypto fallback)
│   │   ├── dia.ts                # DIA Oracle (live crypto prices)
│   │   ├── fmp.ts                # Financial Modeling Prep (stocks fallback)
│   │   ├── frankfurter.ts        # Frankfurter (forex primary, free, no key)
│   │   └── yahoo.ts              # Yahoo Finance (stocks/ETFs primary, crypto fallback)
│   ├── cache.ts                  # localStorage cache with TTL
│   └── fetcher.ts                # Multi-source fetcher with fallback chains & cooldowns
├── types/
│   ├── analysis.ts               # Analysis type definitions
│   └── assets.ts                 # Asset type definitions
├── utils/
│   ├── constants.ts              # Quick-pick lists, timeframes, exchange data
│   ├── currencyConversion.ts     # Multi-currency conversion (30+ currencies)
│   ├── format.ts                 # Number/currency formatting utilities
│   └── reportGenerator.ts        # PDF/text report generation
├── App.tsx                       # Root component with routing
├── App.css
├── index.css                     # Design system tokens (HSL), fonts, utilities
├── main.tsx                      # Entry point
└── vite-env.d.ts

supabase/
├── config.toml                   # Auto-generated Supabase config (DO NOT EDIT)
└── functions/
    ├── admin-users/index.ts      # User management edge function
    ├── check-price-alerts/index.ts # Cron: check and trigger price alerts
    ├── crypto-screener/index.ts   # Crypto screening edge function
    ├── curated-digest/index.ts    # AI market digest generation
    ├── exchange-screener/index.ts # Stock exchange screening
    ├── get-vapid-key/index.ts     # Return VAPID public key
    ├── lock-monthly-picks/index.ts # Cron: lock top monthly picks
    ├── refresh-market-data/index.ts # Cron: warm market data cache
    ├── run-daily-analysis/index.ts # Cron: full 15-indicator analysis + cross-timeframe dampening
    ├── send-digest/index.ts       # Send digest emails via Resend
    ├── snapshot-picks/index.ts    # Cron: daily pick price snapshots
    ├── yahoo-proxy/index.ts       # Yahoo Finance CORS proxy
    └── yahoo-search/index.ts      # Yahoo Finance search proxy
```

---

## 3. Data Sources & API Integration

### 3.1 CoinGecko (`services/api/coingecko.ts`)
- **Purpose**: Primary source for crypto historical OHLC data + asset metadata
- **Endpoints**:
  - `GET /coins/{id}/market_chart?vs_currency=usd&days={days}` → `{ prices: [ts, price][], total_volumes: [ts, vol][] }`
  - `GET /coins/{id}` → full metadata (market cap, supply, ATH, ATL, description, image)
- **Rate limits**: Free tier ~10-30 req/min. On 429, source enters 45s cooldown.
- **Key parsing**: `prices.map(p => p[0])` for timestamps, `prices.map(p => p[1])` for closes

### 3.2 CoinPaprika (`services/api/coinpaprika.ts`)
- **Purpose**: Crypto fallback when CoinGecko is rate-limited
- **ID Mapping**: `geckoIdToCoinPaprikaId()` converts CoinGecko IDs → CoinPaprika IDs (e.g., `bitcoin` → `btc-bitcoin`)
- **Returns**: `PriceData { timestamps, closes, volumes }`

### 3.3 CoinLore (`services/api/coinlore.ts`)
- **Purpose**: Bulk crypto screening (no rate limits), top picks, breakout finder
- **Endpoints**:
  - `GET /api/tickers/?start={n}&limit=100` → top coins with price, 24h/7d change %, market cap, volume
  - `GET /api/ticker/?id={id}` → individual coin
- **Key fields per ticker**: `price_usd`, `percent_change_24h`, `percent_change_7d`, `market_cap_usd`, `volume24`, `csupply`, `msupply`, `rank`, `symbol`, `name`
- **ID mapping**: `coinloreSymbolToGeckoId(symbol, name)` maps CoinLore symbols to CoinGecko IDs

### 3.4 DIA Oracle (`services/api/dia.ts`)
- **Purpose**: Live crypto prices when other sources are rate-limited
- **Endpoint**: `GET /v1/assetQuotation/{blockchain}/{address}`
- **Mapping**: `geckoIdToDIASymbol(geckoId)` → DIA symbol
- **Returns**: `{ price: number, change24h: number }`

### 3.5 Yahoo Finance (`services/api/yahoo.ts`)
- **Purpose**: Primary for stocks/ETFs, fallback for crypto and forex
- **Endpoint**: `GET /v8/finance/chart/{symbol}?range={range}&interval={interval}`
- **Proxied via**: Supabase edge function `yahoo-proxy` (CORS bypass)
- **Timeframe mapping**:
  - 1-2 days → range `5d`, interval `15m`
  - 3-30 days → range `1mo`, interval `1d`
  - 31-90 days → range `3mo`, interval `1d`
  - 91-180 days → range `6mo`, interval `1d`
  - 181-365 days → range `1y`, interval `1d`
  - 366-730 days → range `2y`, interval `1wk`
  - 731+ days → range `5y`, interval `1wk`
  - ALL (99999) → range `max`, interval `1wk`
- **Returns**: timestamps[], open[], high[], low[], close[], volume[]

### 3.6 Frankfurter (`services/api/frankfurter.ts`)
- **Purpose**: Primary forex rates (free, no API key needed)
- **Endpoints**:
  - `GET /latest?from={X}&to={Y}` → current rate
  - `GET /{startDate}..{endDate}?from={X}&to={Y}` → historical series
- **Supported currencies**: AUD, BGN, BRL, CAD, CHF, CNY, CZK, DKK, EUR, GBP, HKD, HRK, HUF, IDR, ILS, INR, ISK, JPY, KRW, MXN, MYR, NOK, NZD, PHP, PLN, RON, SEK, SGD, THB, TRY, USD, ZAR

### 3.7 Alpha Vantage (`services/api/alphavantage.ts`)
- **Purpose**: Fallback for stocks and forex when Yahoo fails
- **Functions**: `avDailyHistory(symbol)`, `avForexDaily(from, to)`
- **Requires**: API key (optional, stored in localStorage)

### 3.8 Financial Modeling Prep (`services/api/fmp.ts`)
- **Purpose**: Third-tier fallback for stocks
- **Function**: `fmpDailyHistory(symbol)`
- **Requires**: API key (optional, stored in localStorage)

### 3.9 CoinGecko-to-Yahoo Mapping
For crypto on Yahoo Finance, these exact mappings are used:
```typescript
const GECKO_TO_YAHOO: Record<string, string> = {
  'bitcoin': 'BTC-USD', 'ethereum': 'ETH-USD', 'solana': 'SOL-USD',
  'binancecoin': 'BNB-USD', 'ripple': 'XRP-USD', 'cardano': 'ADA-USD',
  'dogecoin': 'DOGE-USD', 'avalanche-2': 'AVAX-USD', 'polkadot': 'DOT-USD',
  'chainlink': 'LINK-USD', 'litecoin': 'LTC-USD', 'bitcoin-cash': 'BCH-USD',
  'uniswap': 'UNI-USD', 'cosmos': 'ATOM-USD', 'near': 'NEAR-USD',
  'tron': 'TRX-USD', 'shiba-inu': 'SHIB-USD', 'aave': 'AAVE-USD',
  'maker': 'MKR-USD', 'pepe': 'PEPE-USD', 'sui': 'SUI-USD',
  'the-open-network': 'TON-USD', 'filecoin': 'FIL-USD', 'arbitrum': 'ARB-USD',
  'optimism': 'OP-USD', 'aptos': 'APT-USD', 'vechain': 'VET-USD',
  'stellar': 'XLM-USD', 'hedera-hashgraph': 'HBAR-USD', 'internet-computer': 'ICP-USD',
};
```

### Data Fetcher Fallback Chains (`services/fetcher.ts`)

**Crypto** (`fetchCryptoHistory`):
1. If ALL-time → Yahoo Finance first (full history)
2. CoinGecko (primary, 45s cooldown on 429)
3. CoinPaprika (fallback, 45s cooldown on 429)
4. Yahoo Finance (non-ALL fallback)
5. CoinLore + DIA (synthetic chart from % changes)
6. CoinPaprika retry (3s delay)

**Stocks/ETFs** (`fetchEquityHistory`):
1. Yahoo Finance (via `yahoo-proxy` edge function)
2. Alpha Vantage (if key configured)
3. FMP (if key configured)

**Forex** (`fetchForexHistory`):
1. Frankfurter (free, no key)
2. Alpha Vantage (if key configured)
3. Yahoo Finance (`{FROM}{TO}=X` ticker format)

**Source Cooldown Logic**:
```typescript
const SOURCE_COOLDOWN = 45_000; // 45 seconds
// On 429 error: sourceFailures[source] = Date.now()
// isSourceCoolingDown: checks if < 45s since failure
```

**Synthetic Fallback Chart** (CoinLore+DIA):
- Gets live price from DIA, change % from CoinLore
- Builds up to 30 synthetic data points via linear interpolation
- Adds sine-wave noise: `Math.sin(progress * PI * 4) * price * 0.005`
- Last point always matches live price

---

## 4. Analysis Engine

### 4.1 Orchestrator: `processTA.ts`

**Signature**:
```typescript
function processTA(
  rawCloses: number[],
  rawTimestamps: number[],
  rawVolumes: number[],
  forecastPercent: number,        // default 30
  assetType: AssetType,
  forecastMethods: ForecastMethodId[] = ['ensemble'],
  riskLevel: number = 3,         // 1-5
): TechnicalData
```

**Processing Pipeline** (exact order):
1. **Downsample** to max 200 points (preserves last point via `result[result.length - 1] = arr[arr.length - 1]`)
2. **Calculate core indicators**: SMA20, SMA50 (capped at 40% of data length), RSI(14), BB(20,2), MACD(12,26,9), Stochastic(14,3), Support/Resistance
3. **Calculate extended indicators**: ATR(14), OBV (if volume > 0), VWAP (if volume > 0)
4. **Calculate overlay data**: Ichimoku(9,26,52), Fibonacci levels, EMA pair(12,26), Volume SMA(20)
5. **Calculate SMA200** (only if ≥200 data points, or ≥100 for stocks/ETFs using data length as period)
6. **Compute composite signal** via `computeSignal()`
7. **Generate forecasts** for each selected method
8. **Calculate BB position** for DCA: `(price - bbLower) / (bbUpper - bbLower)`
9. **Generate recommendations** with all context
10. **Generate trade setups** with ATR values and risk level
11. **Detect market phase**
12. **Generate analysis text** (human-readable markdown)
13. **Align hero signal** to short-term recommendation (label, color, confidence)

**Output**: `TechnicalData` + `overlayData` (VWAP, Ichimoku, Fibonacci, EMA pair, Volume SMA20)

### 4.2 Downsampling Algorithm
```typescript
function downsample<T>(arr: T[], target: number): T[] {
  if (arr.length <= target) return arr;
  const step = arr.length / target;
  const result: T[] = [];
  for (let i = 0; i < target; i++) result.push(arr[Math.floor(i * step)]);
  result[result.length - 1] = arr[arr.length - 1]; // Always include last
  return result;
}
```

### 4.3 Market Phase Detection
Uses SMA20/SMA50 crossover + normalized slope of last 20 data points.

**Normalized slope** (linear regression on last 20 closes):
```
sumX = Σi, sumY = Σclose[i], sumXY = Σ(i × close[i]), sumX2 = Σ(i²)
slope = (n × sumXY - sumX × sumY) / (n × sumX2 - sumX²)
normSlope = slope / lastPrice
```

| Priority | Condition | Phase |
|----------|-----------|-------|
| 1 | Price > SMA20 > SMA50 AND normSlope > 0.001 | Markup / Uptrend |
| 2 | Price < SMA20 < SMA50 AND normSlope < -0.001 | Markdown / Downtrend |
| 3 | Price < SMA20 AND SMA20 > SMA50 | Distribution |
| 4 | Price > SMA20 AND SMA20 < SMA50 | Accumulation |
| 5 | 20d range < 3× avg daily move | Consolidation |
| 6 | normSlope > 0 (default) | Recovery |
| 7 | normSlope ≤ 0 (default) | Decline |

### 4.4 Analysis Text Generation
Produces a multi-section markdown string with these sections (exact format):
1. `📈 **TREND:** SMA20 is **{above/below}** SMA50 ({golden/death cross} structure).{SMA200 text}`
2. `⚡ **MOMENTUM:** RSI at **{rsi}** — {zone}. Stochastic %K at **{k}** — {zone}.`
3. `📊 **VOLATILITY:** Daily volatility is **{vol}%**. Bollinger Band width is **{bbWidth}%**. {squeeze comment}`
4. `🔄 **MACD:** {assessment}{momentum}.`
5. `📦 **VOLUME:** {OBV text}`
6. `🎯 **LEVELS:** Support at **{support}** ({dist}% below). Resistance at **{resistance}** ({dist}% above).`
7. `🔮 **PHASE:** Currently in **{phase}**. {phase commentary}`
8. `📋 **SUMMARY:** **{signal}** with **{confidence}%** confidence (score {score}/10). Projected target: **{target}** ({change}%). {next watch}`

---

## 5. Signal Scoring System (`signals.ts`)

### 15-Factor Composite Score (clamped to -15 to +15)

Each factor contributes to the raw score. Strong trend detection modifies some factors. Four new market-structure indicators (12–15) were added for short-term accuracy.

**Trend strength detection** (computed first):
```typescript
const sma20Rising = sma20[len-1] > sma20[len-5];
const sma50Rising = sma50[len-1] > sma50[len-5];
const strongUptrend = sma20 > sma50 && sma20Rising && sma50Rising;
const strongDowntrend = sma20 < sma50 && !sma20Rising && !sma50Rising;
```

| # | Factor | Weight | Bullish (+) | Bearish (-) | Notes |
|---|--------|--------|-------------|-------------|-------|
| 1 | SMA(20) | 12% | Price > SMA20 → +1 | Price < SMA20 → -1 | — |
| 2 | SMA(50) | 10% | Price > SMA50 → +1 | Price < SMA50 → -1 | — |
| 3 | MA Crossover | 10% | SMA20 > SMA50 (Golden) → +1 | SMA20 < SMA50 (Death) → -1 | — |
| 4 | RSI(14) | 10% | <25 → +3, <35 → +1 | >75 → -3, >65 → -1 | Trend override: halved if against strong trend |
| 5 | MACD | 8% | Histogram rising → +1, Fresh bullish cross → +1 extra | Histogram falling → -1, Fresh bearish cross → -1 extra | Trend override: halved if against strong trend |
| 6 | Bollinger Bands | 6% | BB position < 0.15 → +1 | BB position > 0.85 → -1 | — |
| 7 | Stochastic %K | 6% | K < 20 → +1 | K > 80 → -1 | — |
| 8 | OBV Divergence | 4% | Price ↓ but OBV ↑ → +1 | Price ↑ but OBV ↓ → -1 | Requires volume data |
| 9 | VWAP | 4% | Price > VWAP×1.005 → +1 | Price < VWAP×0.995 → -1 | Stocks/ETFs only |
| 10 | RSI Divergence | 5% | Bullish divergence → +2 | Bearish divergence → -2 | Requires 30+ data points |
| 11 | Trend Strength | 4% | Strong uptrend → +2 | Strong downtrend → -2 | Only when trend detected |
| 12 | Market Structure (BOS/CHoCH) | 8% | Bullish BOS → +1, Bullish CHoCH → +3 | Bearish BOS → -1, Bearish CHoCH → -3 | Swing-point analysis (order=3) |
| 13 | Supply/Demand Zones | 6% | Near demand zone → +1 to +3 | Near supply zone → -1 to -3 | Clustered swing highs/lows within 0.5 ATR |
| 14 | Fibonacci Levels | 5% | Price above key fib support → +1 to +2 | Price below key fib resistance → -1 to -2 | Key ratios: 0.382, 0.5, 0.618 |
| 15 | Volume Profile | 6% | Up-day vol > 1.5× down-day vol → +2 | Down-day vol > 1.5× up-day vol → -2 | Also detects volume trend divergences |

### Market Structure Details (`marketStructure.ts`)

**BOS (Break of Structure)**: Price breaks the most recent swing high/low in the SAME trend direction → continuation.
**CHoCH (Change of Character)**: Price breaks a swing point AGAINST the prevailing trend → potential reversal. Scored ±3 (stronger than BOS).

**Supply/Demand Zones**: Swing highs/lows are clustered within 0.5× ATR. Zones with 2+ touches are considered meaningful. Strength scales with touch count (max 3).

**Fibonacci Scoring**: Computes retracement levels from last 60 data points. Key levels (38.2%, 50%, 61.8%) scored by proximity × level strength (0.618 = 1.5× weight).

**Volume Profile**: Splits recent 20-day volume into up-day and down-day averages. Ratio > 1.5 = accumulation (+2), < 0.67 = distribution (-2). Also detects volume trend divergences.

### Signal Label Mapping (calibrated for 15-indicator range)

| Score Range | Label | Color |
|-------------|-------|-------|
| ≥ 8 | Strong Buy | green |
| 4 to 7 | Buy | green |
| -3 to 3 | Hold | amber |
| -7 to -4 | Sell | red |
| ≤ -8 | Strong Sell | red |

### Confidence Calculation
```
confidence = min(95, 40 + |score| × 4)
```

### Cross-Timeframe Consistency (`crossTimeframe.ts`)

After the signal is computed, an optional cross-timeframe check compares the current timeframe's signal against cached longer-timeframe data from `daily_analysis_cache`. If contradictions exist:

| Condition | Dampening |
|-----------|-----------|
| ≥50% of longer timeframes show opposite bias | Score × 0.5 |
| <50% show opposite bias | Score × 0.75 |
| ≥50% show low confidence (no contradictions) | Score × 0.8 |

A `crossTimeframeNote` warning is appended to the signal when dampening is applied. A "Cross-Timeframe" entry is added to the signal breakdown.

### Signal Breakdown
Each factor produces a `SignalBreakdown` object:
```typescript
interface SignalBreakdown {
  name: string;        // e.g., "SMA(20)"
  value: string;       // e.g., "$42,150.00"
  signal: 'bullish' | 'bearish' | 'neutral';
  contribution: number; // actual score contribution
  weight: number;       // percentage weight
  explanation: string;  // human-readable explanation
}
```

---

## 6. Forecast Models (`forecast.ts`)

Five models, identified by `ForecastMethodId`: `'ensemble' | 'linear' | 'holt' | 'ema_momentum' | 'monte_carlo'`

### Common Utilities

**Projection length**: `max(3, floor(closes.length × forecastPercent / 100))`

**Timestamp gap**: `(lastTimestamp - firstTimestamp) / (length - 1)` or 86400000ms default

**Daily volatility**:
```typescript
returns[i] = (close[i] - close[i-1]) / close[i-1]
mean = avg(returns)
variance = avg((return - mean)²)
dailyVol = sqrt(variance)
```

**Asset-type volatility scale**:
| Asset | Scale |
|-------|-------|
| crypto | 1.8 |
| stocks | 1.2 |
| etfs | 0.9 |
| forex | 0.6 |

### 6.1 Linear Regression (`linear`)
- **Backtest result**: 64.1% directional accuracy (best single method)
- **Window**: Last 60 data points (or all if < 60)
- **Process**:
  1. Least squares: `slope = (n·Σxy - Σx·Σy) / (n·Σx² - (Σx)²)`, `intercept = (Σy - slope·Σx) / n`
  2. Residual std: `std = √(Σ(close - predicted)² / n)`
  3. Band multiplier: **1.67×** (from backtest, was 41.9% capture, target 70%)
  4. Band: `std × 1.67 × 1.96 × √(1 + 1/n) × volScale`
- **Value**: `intercept + slope × x` (extended beyond data)
- **Floor**: `max(lastClose × 0.01, value)`

### 6.2 Holt's Double Exponential Smoothing (`holt`)
- **Backtest result**: 83.3% band capture (best), 44.9% directional (worst)
- **Parameters by asset type**:

| Param | crypto | stocks | etfs | forex |
|-------|--------|--------|------|-------|
| α (level) | 0.35 | 0.30 | 0.25 | 0.20 |
| β (trend) | 0.15 | 0.12 | 0.10 | 0.08 |
| φ (damping) | 0.90 | 0.92 | 0.94 | 0.95 |

- **Process**:
  1. Initialize trend from first 5 differences: `trend = avg(close[i+1] - close[i])`
  2. Update level: `level = α × close + (1-α) × (prevLevel + prevTrend)`
  3. Update trend: `trend = β × (level - prevLevel) + (1-β) × prevTrend`
  4. Forecast: `level + cumPhi × trend` where `cumPhi = Σ(φ^h)`
  5. Band: `currentPrice × dailyVol × √h × 1.5 × volScale`

### 6.3 EMA Momentum (`ema_momentum`)
- **Dampened 40%**, capped at **±15%** from current price (from backtest)
- **Process**:
  1. Short EMA period: `max(5, floor(n × 0.1))`, Long EMA period: `max(10, floor(n × 0.3))`
  2. Momentum: `(shortEMA[last] - longEMA[last]) / currentPrice`
  3. Dampen: `momentum × 0.6`
  4. Mean reversion strength: crypto=0.03, stocks=0.06, etfs=0.08, forex=0.12
  5. S-curve blending: `1 / (1 + e^(-6(t - 0.5)))`
  6. Value: `current + (momContrib + revContrib) × h × sCurve`
  7. Smoothing: `prev × 0.2 + value × 0.8`
  8. Clamp: `[current × 0.85, current × 1.15]`
  9. Band: `current × dailyVol × √h × 1.5 × volScale × 1.2`

### 6.4 Monte Carlo Simulation (`monte_carlo`)
- **500 simulations** with deterministic seeded PRNG
- **Seed**: `closes.reduce((a,b) => a + round(b*100), 0) % 2147483647`
- **PRNG**: `seed = (seed × 16807) % 2147483647`
- **Box-Muller transform** for normal distribution
- **Process**:
  1. Log returns: `ln(close[i] / close[i-1])`
  2. Mean and std of log returns
  3. Each step: `price × e^(meanRet + stdRet × Z)` where Z ~ N(0,1)
  4. Floor: `max(current × 0.01, price)`
- **Output**: median (50th percentile), upper (85th), lower (15th)

### 6.5 Ensemble (★ Default)
- **Weights**: Linear **52%** + Holt **29%** + Momentum **19%** (from 234 backtests across 13 assets)
- **Process**: Runs Linear, Holt, EMA Momentum, then blends:
  ```
  value = linear.value × 0.52 + holt.value × 0.29 + momentum.value × 0.19
  upper = linear.upper × 0.52 + holt.upper × 0.29 + momentum.upper × 0.19
  lower = linear.lower × 0.52 + holt.lower × 0.29 + momentum.lower × 0.19
  ```

### Forecast Display Colors
```typescript
const FORECAST_COLORS = {
  ensemble: 'hsl(210 90% 55%)',      // Blue
  linear: 'hsl(350 80% 55%)',        // Red-pink
  holt: 'hsl(142 71% 45%)',          // Green
  ema_momentum: 'hsl(263 91% 66%)',  // Purple
  monte_carlo: 'hsl(38 92% 50%)',    // Orange
};
```

---

## 7. Recommendation Engine (`recommendations.ts`)

### Architecture: 14-Step Pipeline

The recommendation engine produces 3 recommendations (short/mid/long) + optional DCA for ETFs.

**Step 1: Extract Indicator Signals** (`extractSignals`)
Each indicator produces +1 / 0 / -1:
- RSI: <30 = +1, >70 = -1
- MACD: histogram positive & rising = +1, negative & falling = -1
- EMA Cross: SMA20 > SMA50 & price > SMA20 = +1, opposite = -1
- Volume (OBV): second half > first half × 1.05 = +1, < 0.95 = -1
- Volatility (ATR): atrPct < 1.5% = +1, > 4% = -1

**Step 2: Weighted Trend Score** (-100 to +100)
| Horizon | RSI | MACD | EMA | Volume | Volatility |
|---------|-----|------|-----|--------|------------|
| short | 0.30 | 0.30 | 0.20 | 0.10 | 0.10 |
| mid | 0.25 | 0.25 | 0.25 | 0.15 | 0.10 |
| long | 0.20 | 0.20 | 0.30 | 0.15 | 0.15 |

`trendScore = round(weightedSum × 100)`

**Step 3: Score to Label**
| Score | Label |
|-------|-------|
| ≥ 60 | Strong Buy |
| ≥ 25 | Buy |
| > -25 | Hold |
| > -60 | Sell |
| ≤ -60 | Strong Sell |

**Step 4: Market Regime Classification**
```
forecastReturn > +15% → bullish (allowed: Strong Buy, Buy, Hold)
forecastReturn < -15% → bearish (allowed: Sell, Strong Sell)
else → neutral (allowed: Hold only)
```

**Step 5: Strategy Alignment** — constrain label to regime's allowed signals (nearest neighbor)

**Step 6: Override Rules**
- If forecast < -20% and label is Hold → force Sell
- If forecast > +20% and label is Sell → force Hold

**Step 7: Risk Parameters** (per horizon × risk level 1-5)
| Horizon | Risk Range | Target Range |
|---------|-----------|--------------|
| short | 5-10% | 10-25% |
| mid | 8-15% | 15-35% |
| long | 12-25% | 25-60% |

Linear interpolation: `t = (riskLevel - 1) / 4` → 0 to 1

**Step 8: Entry/Target/Stop-Loss Generation**
- Entry = current price
- Bullish: target = entry × (1 + max(targetPct, |forecastReturn|/100 × 0.8)), stopLoss = entry × (1 - riskPct)
- Bearish: target = entry × (1 - max(targetPct, |forecastReturn|/100 × 0.8)), stopLoss = entry × (1 + riskPct)

**Step 9: Level Validation**
- Minimum distance: 1% of entry
- Bullish: target > entry, stopLoss < entry (auto-correct to ±5% if violated)
- Bearish: target < entry, stopLoss > entry

**Step 10: Aggregate Forecast Return**
When multiple forecasts available, weighted average:
- Holt: 35%, EMA Momentum: 30%, Monte Carlo: 35%

**Step 11: Confidence Calculation**
```
alignment = |Σ(nonZeroSignals)| / count(nonZeroSignals) × 100
forecastAgreement = 80 if same direction, 30 otherwise
volPenalty = max(20, 100 - |forecastReturn| × 1.5)
confidence = 0.35 × alignment + 0.35 × forecastAgreement + 0.30 × volPenalty
Clamped: [20, 95]
```

**Step 12: Reasoning Text**
Format: `RSI {status}. MACD {status}. Price {vs averages}. Volume {status}. Forecast: {±pct}% ({regime}). {outlook} [{riskLabel}, {duration}]`

Risk labels: conservative, moderately conservative, moderate, moderately aggressive, aggressive

Horizon durations: short = "1–7 days", mid = "1–3 months", long = "6–24 months"

**Step 13: Asset-Type Label Overrides**
| Asset | Strong Buy | Buy | Hold | Sell | Strong Sell |
|-------|-----------|-----|------|------|-------------|
| crypto/stocks | Strong Buy | Buy | Hold | Sell | Strong Sell |
| ETFs | Strong Add | Add to Position | Hold/DCA | Sell | Pause DCA |
| Forex | Strong Long | Go Long | Flat/Neutral | Go Short | Strong Short |

**Step 14: DCA Recommendation** (ETFs only)
Conditions for DCA actions:
- RSI < oversoldThreshold AND bbPosition < 0.2 → "Accelerate DCA" (or "Aggressive DCA Increase" if risk ≥ 4)
- RSI > overboughtThreshold AND bbPosition > 0.8 → "Pause DCA" (or "Pause & Protect" if risk ≤ 2)
- RSI < 30 AND dist from SMA50 < -8% AND SMA20 > SMA50 → "Lump Sum Entry" (or "Small Extra Buy" if risk < 3)
- Default → "Continue DCA"

Oversold thresholds: risk ≤ 2 → 30, else → 35. Overbought: risk ≤ 2 → 70, else → 75.

---

## 8. Trade Setup Generator (`tradeSetup.ts`)

Generates both long and short setups with ATR-based stops and risk-adjusted targets.

### Risk-Adjusted Parameters (indexed by riskLevel 1-5)

| Risk Level | ATR Stop Mult | TP1 Scale | TP2 Scale |
|-----------|---------------|-----------|-----------|
| 1 (conservative) | 1.5 | 0.40 | 0.85 |
| 2 | 1.75 | 0.45 | 0.90 |
| 3 (moderate) | 2.0 | 0.50 | 1.00 |
| 4 | 2.5 | 0.55 | 1.10 |
| 5 (aggressive) | 3.0 | 0.60 | 1.20 |

### Long Setup
```
range = resistance - support
margin = range × 0.03
entry = support + margin
stop = if ATR available: entry - (atrMultiplier × currentATR)
       else: support - margin × fallbackMultiplier
tp1 = support + range × tp1Scale
tp2 = support + range × tp2Scale
R:R = (tp2 - entry) / max(0.01, entry - stop)
bias = signal.score > 0
```

### Short Setup
```
entry = resistance - margin
stop = if ATR available: entry + (atrMultiplier × currentATR)
       else: resistance + margin × fallbackMultiplier
tp1 = resistance - range × tp1Scale
tp2 = resistance - range × tp2Scale
R:R = (entry - tp2) / max(0.01, stop - entry)
bias = signal.score <= 0
```

### Validation Rules
- Long: stop < entry, tp1 > entry, tp2 > tp1
- Short: stop > entry, tp1 < entry, tp2 < tp1
- Minimum distance: 0.5% of entry price
- Auto-correction: stop = entry × 0.95/1.05, tp1 = entry × 1.03/0.97
- R:R clamped to [0.1, 20]

---

## 9. UI Component Architecture

### 9.1 Page Layout (`pages/Index.tsx` — 1051 lines)

The entire app is a single-page application. All state lives in `Index.tsx`.

**Layout structure** (top to bottom):
1. **Header** (64px sticky) — Logo, nav links, theme toggle, auth button
2. **StickySubNav** (two rows, sticky below header):
   - Row 1: Asset type tabs (Crypto, Stocks, ETFs, Forex) + Exchange selector
   - Row 2: Horizontally scrollable section jump links
3. **Search Area** — SearchBar + QuickPicks/ForexPairSelector + GuidedDiscovery
4. **SmartFeed** — AI-powered analysis insights
5. **Chart Area** (id="section-chart"):
   - ChartControls (timeframe, forecast %, risk level)
   - AnalysisOverlayBar (Ichimoku, Fibonacci, EMA, VWAP, Volume SMA toggles)
   - ForecastMethodBar (5 method toggles with explainer)
   - MainChart (Recharts AreaChart) + FullscreenChartButton
6. **Sub-Charts** (side by side on desktop):
   - VolumeChart (id="section-volume")
   - RSIChart (id="section-rsi")
7. **Analysis Section** (id="section-analysis"):
   - SignalPanel (composite signal with breakdown)
   - RecommendationPanel (short/mid/long/DCA cards)
   - TradeSetupPanel (long & short setups)
   - AnalysisTextPanel (markdown summary)
   - IndicatorsPanel (raw values)
8. **Tools Section**:
   - TopPicksDashboard (top crypto picks)
   - BreakoutFinder (scan for breakout candidates)
   - CongressTrades
   - ConditionScreener
   - StrategyBacktester (with chart integration)
   - IndicatorBuilder
   - PortfolioBuilder (virtual portfolio)
   - SimulationTracker
9. **WatchlistDropdown** — Persistent watchlist with PnL tracking
10. **Footer** — Links, newsletter signup, social share

**Section scroll offset**: 160px (clears sticky header + sub-nav)

### 9.2 Chart Components

**MainChart** (`charts/MainChart.tsx`)
- Recharts `ComposedChart` with `Area` (price), multiple `Line` elements
- Overlays: SMA20 (blue `hsl(210 100% 56%)`), SMA50 (orange `hsl(30 100% 50%)`), Bollinger Bands (gray fill)
- Support: green dashed `ReferenceLine`
- Resistance: red dashed `ReferenceLine`
- Forecast lines: colored by method, with confidence bands as `Area` fill
- Optional overlays (toggled via AnalysisOverlayBar):
  - Ichimoku Cloud (SenkouA/B as filled area)
  - Fibonacci retracement levels
  - EMA pair (12/26)
  - VWAP line
  - Volume SMA(20)
- Responsive container, custom tooltip with formatted values

**RSIChart** (`charts/RSIChart.tsx`)
- Recharts `LineChart`
- RSI line with overbought (70) / oversold (30) `ReferenceLine` elements
- Color coding based on zones

**VolumeChart** (`charts/VolumeChart.tsx`)
- Recharts `BarChart`
- Volume bars colored by price direction (green up, red down)

**ForecastMethodBar** (`charts/ForecastMethodBar.tsx`)
- Toggle buttons for each of 5 forecast methods
- Color-coded chips matching forecast line colors
- Expandable explainer panel with method descriptions, limitations, accuracy, "Pro tip"

**AnalysisOverlayBar** (`charts/AnalysisOverlayBar.tsx`)
- Toggle buttons for overlays: `'ichimoku' | 'fibonacci' | 'ema_pair' | 'vwap' | 'volume_sma'`

**ChartControls** (`charts/ChartControls.tsx`)
- Timeframe buttons (asset-type specific)
- Forecast horizon slider (% of data)
- Risk level selector (1-5 with labels: Conservative, Mod Conservative, Moderate, Mod Aggressive, Aggressive)
- Risk profile type: `type RiskLevel = 1 | 2 | 3 | 4 | 5`

### 9.3 Search & Discovery

**SearchBar** — Text input with asset type context
**QuickPicks** — Preset buttons per category with sorting (A-Z, Price, Cap, Change) and ranking timeframes
**ForexPairSelector** — Two dropdowns (base/quote) with swap, 28+ currencies with flag emojis
**GuidedDiscovery** — Multi-step filter:
- Crypto: Sector → Market Cap → Ecosystem
- Stocks: Sector → Market → Style
- ETFs: Strategy → Region
- Forex: Pair Type (Majors, Crosses, Exotics)

**ExchangeSelector** — Tabs for exchanges:
- Stocks: US, ASX, LSE, HKSE, JPX
- ETFs: US, ASX, LSE

---

## 10. State Management

All state lives in `pages/Index.tsx` using React `useState`:

```typescript
// Core state
const [assetType, setAssetType] = useState<AssetType>('crypto');
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [assetInfo, setAssetInfo] = useState<AssetInfo | null>(null);
const [technicalData, setTechnicalData] = useState<TechnicalData | null>(null);

// Chart controls
const [timeframeDays, setTimeframeDays] = useState(90);
const [forecastPercent, setForecastPercent] = useState(30);
const [forecastMethods, setForecastMethods] = useState<ForecastMethodId[]>(['ensemble']);
const [riskLevel, setRiskLevel] = useState<RiskLevel>(3);

// UI state
const [activeTab, setActiveTab] = useState<ResultTab>('home');
const [activeOverlays, setActiveOverlays] = useState<OverlayId[]>([]);
const [fullscreenChart, setFullscreenChart] = useState(false);

// Forex specific
const [forexBase, setForexBase] = useState('AUD');
const [forexQuote, setForexQuote] = useState('USD');

// Exchange selection
const [stockExchange, setStockExchange] = useState('US');
const [etfExchange, setEtfExchange] = useState('US');

// Currency conversion
const [secondaryCurrency, setSecondaryCurrencyState] = useState(getSecondaryCurrency());
```

### Data Fetching Pattern
Uses `useCallback` + `useState` (not React Query for main analysis):
```typescript
const handleAnalyse = useCallback(async (id, type, days) => {
  setLoading(true);
  setError(null);
  try {
    const rawData = await fetchXxxHistory(...);
    const ta = processTA(closes, timestamps, volumes, forecastPercent, type, forecastMethods, riskLevel);
    setTechnicalData(ta);
    setAssetInfo(info);
    // Save to analysis_history (Supabase)
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
}, [forecastPercent, forecastMethods, riskLevel]);
```

### Watchlist Persistence
- Stored in **Supabase** `watchlist_items` table (authenticated users)
- Falls back to `localStorage` for unauthenticated users
- Synced on login via `useEffect`
- Groups stored in `watchlist_groups` table

---

## 11. Asset Types & Constants

### Asset Types
```typescript
type AssetType = 'crypto' | 'stocks' | 'etfs' | 'forex';
type ResultTab = 'home' | 'charts' | 'recs' | 'trade' | 'analysis' | 'indicators' | 'info';
```

### Quick Pick Lists (exact data)

**Crypto** (10):
```typescript
[
  { id: 'bitcoin', sym: 'BTC' }, { id: 'ethereum', sym: 'ETH' },
  { id: 'solana', sym: 'SOL' }, { id: 'binancecoin', sym: 'BNB' },
  { id: 'ripple', sym: 'XRP' }, { id: 'cardano', sym: 'ADA' },
  { id: 'dogecoin', sym: 'DOGE' }, { id: 'avalanche-2', sym: 'AVAX' },
  { id: 'polkadot', sym: 'DOT' }, { id: 'chainlink', sym: 'LINK' },
]
```

**US Stocks** (18 with dividend data):
```typescript
[
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
]
```

**ASX Stocks** (10): CBA.AX, BHP.AX, CSL.AX, WES.AX, NAB.AX, WBC.AX, ANZ.AX, FMG.AX, WOW.AX, TLS.AX

**LSE Stocks** (8): SHEL.L, AZN.L, HSBA.L, ULVR.L, BP.L, GSK.L, RIO.L, DGE.L

**HKSE Stocks** (8): 0700.HK (Tencent), 9988.HK (Alibaba), 0005.HK (HSBC), 1299.HK (AIA), 3690.HK (Meituan), 0941.HK (China Mobile), 2318.HK (Ping An), 1810.HK (Xiaomi)

**JPX Stocks** (8): 7203.T (Toyota), 6758.T (Sony), 6861.T (Keyence), 6902.T (Denso), 9984.T (SoftBank), 8306.T (MUFG), 6501.T (Hitachi), 7741.T (HOYA)

**US ETFs** (10): SPY, QQQ, VTI, VOO, ARKK, VGT, SCHD, VYM, BND, IVV

**ASX ETFs** (10): VGS.AX, VAS.AX, IVV.AX, VDHG.AX, A200.AX, VTS.AX, IOZ.AX, ETHI.AX, NDQ.AX, HACK.AX

**LSE ETFs** (6): VWRL.L, ISF.L, VUSA.L, SGLN.L, EQQQ.L, VMID.L

**Forex Pairs** (8): AUD/USD, EUR/USD, GBP/USD, USD/JPY, AUD/EUR, USD/CAD, NZD/USD, AUD/GBP

### Timeframes

**Crypto**:
```typescript
[
  { label: '1H', days: 0.042 }, { label: '4H', days: 0.167 },
  { label: '24H', days: 1 }, { label: '7D', days: 7 },
  { label: '30D', days: 30 }, { label: '90D', days: 90 },
  { label: '1Y', days: 365 }, { label: 'ALL', days: 99999 },
]
```

**Stocks/ETFs**:
```typescript
[
  { label: '1M', days: 30 }, { label: '3M', days: 90 },
  { label: '6M', days: 180 }, { label: '1Y', days: 365 },
  { label: '2Y', days: 730 }, { label: '5Y', days: 1825 },
]
```

---

## 12. Caching Strategy (`services/cache.ts`)

- **localStorage only** (no in-memory layer)
- **Key format**: `sf_cache_{key}`
- **TTL-based expiration**: checked on read, stale entries deleted
- **Default TTLs** (set by callers):
  - Live prices: 60 seconds
  - Historical data: 5-10 minutes
  - Asset info/metadata: 15 minutes
  - CoinLore tickers: 5 minutes

```typescript
function getCached<T>(key: string, ttlMs: number): T | null
function setCache(key: string, data: unknown): void
function clearAllCache(): void  // removes all sf_cache_ entries
```

### React Query Cache
Used by `useAssetData.ts` hooks:
- Crypto: staleTime 10min, gcTime 30min
- Equity: staleTime 10min, gcTime 30min
- Forex: staleTime 60min, gcTime 120min
- All: retry = false

---

## 13. Design System

### Typography
- **Primary font**: `'DM Sans'` (Google Fonts, weights 300-700, italic)
- **Monospace font**: `'JetBrains Mono'` (Google Fonts, weights 300-600)
- **Font import**: `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@300;400;500;600&display=swap')`

### Color System (HSL values)

**Dark Mode** (`:root, .dark`):
```css
--background: 220 20% 7%;
--foreground: 220 15% 88%;
--card: 220 18% 10%;
--card-foreground: 220 15% 88%;
--popover: 220 20% 12%;
--popover-foreground: 220 15% 88%;
--primary: 173 58% 49%;          /* Teal/Cyan brand color */
--primary-foreground: 220 20% 7%;
--secondary: 220 16% 14%;
--secondary-foreground: 220 15% 88%;
--muted: 220 14% 16%;
--muted-foreground: 220 10% 50%;
--accent: 173 58% 49%;
--accent-foreground: 220 20% 7%;
--destructive: 0 72% 55%;
--destructive-foreground: 0 0% 100%;
--border: 220 14% 16%;
--input: 220 14% 18%;
--ring: 173 58% 49%;
--radius: 0.5rem;
```

**ForecastSimply Brand Tokens (Dark)**:
```css
--fs-bg-primary: 220 20% 7%;
--fs-bg-secondary: 220 18% 10%;
--fs-bg-tertiary: 220 16% 14%;
--fs-bg-surface: 220 16% 17%;
--fs-bg-hover: 220 14% 18%;
--fs-border-subtle: 220 14% 16%;
--fs-border-medium: 220 12% 22%;
--fs-text-primary: 220 15% 88%;
--fs-text-secondary: 220 10% 50%;
--fs-text-tertiary: 220 10% 30%;
--fs-text-disabled: 220 12% 22%;
--fs-cyan: 173 58% 49%;
--fs-green: 152 60% 42%;
--fs-red: 0 72% 55%;
--fs-amber: 36 80% 52%;
--positive: 152 60% 42%;
--negative: 0 72% 55%;
--warning: 36 80% 52%;
```

**Light Mode** (`.light`):
```css
--background: 220 20% 97%;
--foreground: 220 30% 15%;
--card: 0 0% 100%;
--card-foreground: 220 30% 15%;
--popover: 0 0% 100%;
--popover-foreground: 220 30% 15%;
--primary: 173 60% 38%;
--primary-foreground: 0 0% 100%;
--secondary: 220 16% 93%;
--secondary-foreground: 220 30% 15%;
--muted: 220 16% 94%;
--muted-foreground: 220 10% 42%;
--accent: 173 60% 38%;
--accent-foreground: 0 0% 100%;
--destructive: 0 72% 50%;
--destructive-foreground: 0 0% 100%;
--border: 220 16% 88%;
--input: 220 16% 88%;
--ring: 173 60% 38%;
```

**ForecastSimply Brand Tokens (Light)**:
```css
--fs-bg-primary: 220 20% 97%;
--fs-bg-secondary: 0 0% 100%;
--fs-bg-tertiary: 220 16% 95%;
--fs-bg-surface: 220 16% 92%;
--fs-bg-hover: 220 16% 90%;
--fs-border-subtle: 220 16% 88%;
--fs-border-medium: 220 14% 82%;
--fs-text-primary: 220 30% 15%;
--fs-text-secondary: 220 10% 42%;
--fs-text-tertiary: 220 12% 68%;
--fs-text-disabled: 220 16% 88%;
--fs-cyan: 173 60% 38%;
--fs-green: 152 55% 35%;
--fs-red: 0 72% 50%;
--fs-amber: 36 80% 45%;
--positive: 152 55% 35%;
--negative: 0 72% 50%;
--warning: 36 80% 45%;
```

**Sidebar Tokens (Dark)**:
```css
--sidebar-background: 220 18% 10%;
--sidebar-foreground: 220 15% 88%;
--sidebar-primary: 173 58% 49%;
--sidebar-primary-foreground: 220 20% 7%;
--sidebar-accent: 220 16% 14%;
--sidebar-accent-foreground: 220 15% 88%;
--sidebar-border: 220 14% 16%;
--sidebar-ring: 173 58% 49%;
```

### Utility Classes
```css
.text-positive { color: hsl(var(--positive)); }
.text-negative { color: hsl(var(--negative)); }
.text-neutral-signal { color: hsl(var(--warning)); }
.bg-sf-card, .bg-fs-card { background-color: hsl(var(--fs-bg-secondary)); }
.bg-sf-elevated, .bg-fs-elevated { background-color: hsl(var(--fs-bg-tertiary)); }
.bg-sf-inset, .bg-fs-surface { background-color: hsl(var(--fs-bg-primary)); }
.border-sf, .border-fs { border-color: hsl(var(--fs-border-subtle)); }
.glow-positive { box-shadow: 0 0 12px hsl(var(--positive) / 0.12); }
.glow-negative { box-shadow: 0 0 12px hsl(var(--negative) / 0.12); }
```

### Chart Color Conventions
| Element | Color |
|---------|-------|
| SMA20 | `hsl(210 100% 56%)` — Blue |
| SMA50 | `hsl(30 100% 50%)` — Orange |
| Bollinger Bands | Gray fill, low opacity |
| Support line | Green dashed |
| Resistance line | Red dashed |
| Volume Up bars | Green (`hsl(var(--positive))`) |
| Volume Down bars | Red (`hsl(var(--negative))`) |
| RSI Overbought (70) | Red reference |
| RSI Oversold (30) | Green reference |

### Scrollbar Styling
```css
::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: hsl(var(--fs-border-subtle)); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: hsl(var(--muted-foreground)); }
```

### Animations
```css
@keyframes pulse-glow { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
.animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
```

---

## 14. Technical Indicator Formulas

### Simple Moving Average (SMA)
```
SMA(period) = Σ(close[i-period+1..i]) / period
Returns NaN for i < period - 1
```

### Exponential Moving Average (EMA)
```
k = 2 / (period + 1)
EMA[0] = close[0]
EMA[i] = close[i] × k + EMA[i-1] × (1-k)
```

### Relative Strength Index (RSI, period=14)
```
Change = close[i] - close[i-1]
Initial avgGain = sum(gains over first 14 periods) / 14
Initial avgLoss = sum(losses over first 14 periods) / 14
Wilder smoothing: avgGain = (prevAvgGain × 13 + currentGain) / 14
RS = avgGain / avgLoss
RSI = avgLoss === 0 ? 100 : 100 - (100 / (1 + RS))
```

### Bollinger Bands (period=20, mult=2)
```
Middle = SMA(20)
StdDev = √(Σ(close - SMA)² / period)  [population std]
Upper = Middle + 2 × StdDev
Lower = Middle - 2 × StdDev
```

### MACD
```
MACD Line = EMA(12) - EMA(26)
Signal Line = EMA(9) of MACD Line
Histogram = MACD Line - Signal Line
```

### Stochastic Oscillator (kPeriod=14, dPeriod=3)
```
%K = ((Close - LowestLow_14) / (HighestHigh_14 - LowestLow_14)) × 100
If HighestHigh === LowestLow → %K = 50
%D = SMA(3) of %K
Falls back to closes for highs/lows if OHLC not available
```

### Support & Resistance
```
1. Find local minima (close[i] < all 4 neighbors: i-2, i-1, i+1, i+2)
2. Find local maxima (close[i] > all 4 neighbors)
3. Support = avg(local minima) if ≥ 2 found, else sorted[floor(length × 0.1)]
4. Resistance = avg(local maxima) if ≥ 2 found, else sorted[floor(length × 0.9)]
```

### ATR (Average True Range, period=14)
Approximation from close prices only:
```
TR[0] = 0
TR[i] = |close[i] - close[i-1]|
ATR[i] = NaN for i < 14
ATR[i] = avg(TR[i-13..i]) for i ≥ 14
```

### On-Balance Volume (OBV)
```
OBV[0] = 0
If close[i] > close[i-1]: OBV[i] = OBV[i-1] + volume[i]
If close[i] < close[i-1]: OBV[i] = OBV[i-1] - volume[i]
If close[i] === close[i-1]: OBV[i] = OBV[i-1]
```

### Volume Weighted Average Price (VWAP)
```
cumPV += close[i] × volume[i]
cumVol += volume[i]
VWAP[i] = cumVol > 0 ? cumPV / cumVol : close[i]
```

### Ichimoku Cloud (tenkan=9, kijun=26, senkouB=52)
```
highLow(arr, start, end) = (max(arr[start..end]) + min(arr[start..end])) / 2
Tenkan-sen = highLow(closes, i-8, i)  [requires 9 periods]
Kijun-sen = highLow(closes, i-25, i)  [requires 26 periods]
Senkou Span A = (Tenkan + Kijun) / 2
Senkou Span B = highLow(closes, i-51, i)  [requires 52 periods]
```

### Fibonacci Retracement
```
high = max(all closes)
low = min(all closes)
diff = high - low
Levels: 0% = high, 23.6%, 38.2%, 50%, 61.8%, 78.6%, 100% = low
level_X = high - diff × (X/100)
```

### EMA Pair
```
ema12 = EMA(closes, 12)
ema26 = EMA(closes, 26)
```

---

## 15. Type Definitions

### TechnicalData
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
  // Extended (cast via `as TechnicalData & { overlayData: any }`):
  overlayData: {
    vwap?: number[];
    ichimoku: { tenkan: number[]; kijun: number[]; senkouA: number[]; senkouB: number[] };
    fibonacci: { level0: number; level236: number; level382: number; level500: number; level618: number; level786: number; level100: number };
    emaPair: { ema12: number[]; ema26: number[] };
    volumeSma20: number[];
  };
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
  score: number;               // -10 to +10
  label: SignalLabel;           // 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell'
  color: SignalColor;           // 'green' | 'amber' | 'red'
  confidence: number;           // 20-95%
  breakdown?: SignalBreakdown[];
}

interface SignalBreakdown {
  name: string;
  value: string;
  signal: 'bullish' | 'bearish' | 'neutral';
  contribution: number;
  weight: number;
  explanation: string;
}
```

### Recommendation
```typescript
interface Recommendation {
  horizon: 'short' | 'mid' | 'long' | 'dca';
  label: string;
  action: string;
  confidence: number;
  color: SignalColor;
  entry: number;
  target: number;
  stopLoss: number;
  reasoning: string;
}
```

### TradeSetup
```typescript
interface TradeSetup {
  type: 'long' | 'short';
  entry: number;
  stop: number;
  tp1: number;
  tp2: number;
  riskReward: number;
  bias: boolean;
}
```

### ForecastPoint & NamedForecast
```typescript
interface ForecastPoint {
  timestamp: number;
  value: number;
  upper: number;
  lower: number;
}

interface NamedForecast {
  methodId: string;
  label: string;
  points: ForecastPoint[];
  target: number;
  color: string;
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

### WatchlistItem
```typescript
interface WatchlistItem {
  id: string;
  symbol: string;
  name: string;
  assetType: AssetType;
  price: number;
  change24h?: number;
  addedAt: number;        // timestamp when added
  addedPrice: number;     // price when added (for PnL)
  note?: string;
  simulation?: SimulationData;
}
```

### SimulationData
```typescript
interface SimulationData {
  horizon: 'short' | 'mid' | 'long';
  entry: number;
  target: number;
  stopLoss: number;
  signal: string;
  confidence: number;
  startedAt: number;
  snapshots: SimulationSnapshot[];
}
```

---

## 16. Data Fetcher & Fallback Chain

See [Section 3.9](#39-coinGecko-to-yahoo-mapping) for the complete fetcher architecture. Key design patterns:

1. **Multi-source with automatic failover**: Each asset type has 3-4 fallback sources
2. **Cooldown tracking**: Failed sources (especially 429s) get a 45-second cooldown
3. **Synthetic data generation**: When all API sources fail, CoinLore+DIA can generate approximate chart data
4. **Retry logic**: Final retry of CoinPaprika with 3s delay before giving up
5. **Source tracking**: Every result includes `source: string` for display to users

---

## 17. Backend Services (Supabase Edge Functions)

| Function | Purpose | Auth | Method |
|----------|---------|------|--------|
| `yahoo-proxy` | Proxies Yahoo Finance chart requests (CORS bypass) | Public | GET |
| `yahoo-search` | Proxies Yahoo Finance search queries | Public | GET |
| `exchange-screener` | Screens ASX/LSE/TSE exchange tickers via Yahoo | Public | GET |
| `crypto-screener` | Screens crypto tickers | Public | GET |
| `check-price-alerts` | Cron: checks triggered price alerts, sends push/email | Cron (no JWT) | POST |
| `get-vapid-key` | Returns VAPID public key for push subscriptions | Public | GET |
| `curated-digest` | Generates AI-curated market digest content | Authenticated | POST |
| `send-digest` | Sends approved digest emails to subscribers | Cron / Admin | POST |
| `refresh-market-data` | Cron: warms market data cache | Cron (no JWT) | POST |
| `admin-users` | User management (list, ban, unban, role, impersonate, delete) | Admin only | POST |

### Database Tables

| Table | Purpose | RLS Policy | Key Columns |
|-------|---------|-----------|-------------|
| `profiles` | User display names, avatars | Owner read/write | user_id, display_name, avatar_url, banned_at |
| `user_roles` | Role-based access | Owner read, admin manage | user_id, role (enum: admin/moderator/user) |
| `user_preferences` | Theme, risk, timeframe defaults | Owner only | user_id, theme, risk_profile, forecast_percent, default_timeframe_days, secondary_currency |
| `watchlist_groups` | Named watchlist folders | Owner only | user_id, name, color, sort_order |
| `watchlist_items` | Individual watchlist entries | Owner only | user_id, asset_id, asset_type, symbol, name, group_id (FK → watchlist_groups), note |
| `analysis_history` | Saved analysis snapshots | Owner only | user_id, asset_id, asset_type, symbol, name, price, signal_label, signal_score, market_phase, data_source |
| `price_alerts` | User-defined price/pct alerts | Owner only | user_id, asset_id, asset_type, symbol, name, alert_type, target_price, target_pct, reference_price, active, triggered_at |
| `push_subscriptions` | Web push endpoints | Owner only | user_id, endpoint, p256dh, auth |
| `login_history` | Sign-in audit trail | Owner + admin read | user_id, signed_in_at, ip_address, user_agent, city, country |
| `newsletter_subscribers` | Email subscriptions | Owner read, public insert | email, user_id (nullable), preferences (JSON: crypto/stocks/etfs/forex), unsubscribed_at |
| `market_digests` | AI-generated weekly reports | Admin manage, auth read approved | asset_type, status (draft/approved/sent), market_summary, insights, recommendations, greeting, watchlist_alerts |

### Security Functions
```sql
-- Check if user has a specific role (avoids RLS recursion)
CREATE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
```

---

## 18. Price Alerts & Notifications

### Alert Types
- **Price target** (`alert_type: 'price'`): Triggers when asset reaches `target_price`
- **Percentage move** (`alert_type: 'percent'`): Triggers on `target_pct` % change from `reference_price`

### Notification Delivery (Priority Order)
1. **Push notifications** — via Web Push API (VAPID keys)
2. **Email fallback** — via Resend when push unavailable

### Flow
```
check-price-alerts (cron) →
  Fetch active alerts →
  Check current prices (CoinLore for crypto, Yahoo for stocks) →
  For each triggered alert:
    1. Try push notification (if push_subscription exists)
    2. If push fails → send email via Resend
    3. Mark alert: active = false, triggered_at = now()
```

### Browser Push Permission
When blocked, UI detects browser (Chrome, Edge, Firefox, Safari) and shows tailored step-by-step re-enable instructions.

---

## 19. Newsletter & Market Digest

### Subscription Flow
- Anonymous: email-only signup (public insert to `newsletter_subscribers`)
- Authenticated: auto-link `user_id`
- Preferences: `{ crypto: true, stocks: true, etfs: true, forex: true }` (all default true)
- Managed via AccountPanel or footer `NewsletterSignup` component

### Digest Pipeline
```
curated-digest (admin triggers via Admin panel) →
  Generate AI market summary using Lovable AI →
  Save as draft in market_digests (status: 'draft') →
  Admin reviews & approves (status: 'approved') →
send-digest (cron or admin trigger) →
  Fetch latest approved digest →
  Fetch active subscribers (unsubscribed_at IS NULL) →
  Filter by preferences (asset_type match) →
  Send HTML emails via Resend →
  Mark digest as sent (status: 'sent')
```

---

## 20. Authentication & Security

### Auth Methods
- Email/password (with email verification — NOT auto-confirm)
- Phone OTP
- Google OAuth (via Lovable Cloud)

### Security Model
- **Row-Level Security (RLS)** on ALL tables
- **Restrictive policies** scoped to `auth.uid() = user_id`
- **Admin access** via `has_role()` SECURITY DEFINER function
- **Edge function auth**: Admin functions verify caller role server-side
- **Input validation**: UUID, email, password, phone, role, metadata size validation on admin edge function
- **CORS**: `Access-Control-Allow-Origin: *` on all edge functions
- **No anonymous signups**: Always require email/phone verification

### Role System
- Roles stored in dedicated `user_roles` table (NOT in profiles — prevents privilege escalation)
- Enum: `admin | moderator | user`
- Checked via `has_role(_user_id, _role)` function (SECURITY DEFINER, avoids RLS recursion)

---

## 21. Admin Panel (`pages/Admin.tsx`)

### Access Control
- Only users with `admin` role (checked via `useAdminCheck` hook)
- Redirects non-admins to home

### 4 Tabs

**📊 Analytics Tab** (`AdminAnalyticsTab.tsx`):
- KPI cards: Active Users, Logins, Analyses Run, Subscribers, Watchlist Items, Active Alerts
- Date range filter: 24h, 7d, 14d, 30d, 90d
- Charts:
  - Daily Logins (LineChart)
  - Analyses by Asset Type (PieChart)
  - Most Analysed Assets (horizontal BarChart, top 15)
  - Signal Distribution (BarChart)
- Country Breakdown table (from login_history)
- All data sourced from existing tables (no dedicated analytics tables)

**👥 Users Tab** (inline in Admin.tsx):
- User list with profiles, roles, login history
- Actions: ban/unban, assign roles, delete user
- Uses `admin-users` edge function

**📧 Subscribers Tab** (`AdminSubscribersTab.tsx`):
- Summary: Active count, Unsubscribed count, Preference split (crypto/stocks/ETFs/forex), Churn rate
- Searchable subscriber table with status, preferences, date, linked user
- Data from `newsletter_subscribers` table

**📰 Digests Tab** (inline in Admin.tsx):
- Generate new digest (triggers `curated-digest` edge function)
- Review draft digests
- Approve/reject workflow
- Send approved digests (triggers `send-digest` edge function)

---

## 22. Watchlist & PnL Tracking

### Data Model
Each watchlist item stores:
- `addedPrice`: Price at time of addition (for PnL calculation)
- `addedAt`: Timestamp of addition
- `note`: User notes
- `group_id`: Optional folder grouping

### PnL Display
```
PnL % = ((currentPrice - addedPrice) / addedPrice) × 100
```
Displayed with color coding: green for positive, red for negative.

### Forex-Specific
- 4-decimal precision for rates
- No `$` prefix (forex rates are unitless ratios)
- "since {date}" label showing when pair was added

### Persistence
- **Authenticated**: Supabase `watchlist_items` + `watchlist_groups` tables
- **Unauthenticated**: localStorage (synced on login)

---

## 23. Strategy Backtester

### Available Strategies
1. **MA Crossover**: Buy when SMA(20) crosses above SMA(50), sell on opposite
2. **RSI Reversal**: Buy when RSI < 30 (oversold), sell when RSI > 70 (overbought)
3. **MACD Momentum**: Buy on MACD bullish crossover, sell on bearish
4. **Bollinger Bounce**: Buy near lower band, sell near upper band

### Features
- Beginner-friendly descriptions and tooltips for all metrics
- **Current State Indicator**: Shows if asset is currently in Buy/Sell/Neutral zone for selected strategy
- **View on Chart**: Button that toggles relevant chart overlay and auto-scrolls to chart section
- Metrics with tooltips: Win Rate, Max Drawdown, Sharpe Ratio, Total Return
- Simulated equity curve

---

## 24. Breakout Finder

### Scanning Scope
- CoinLore top 300 coins (3 API pages × 100 coins)
- User's watchlist crypto items (merged, deduplicated)

### Scoring Algorithm (unified `preScreenScore`, 0-65 scale)
```
score = 0
if (change24h > 0 && change24h < 8) score += 20   // Positive but not overheated
if (change7d > 0 && change7d < 15) score += 15     // Weekly trend positive
if (volume24h > 50_000_000) score += 10             // High liquidity
// Additional factors from technical analysis...
```

### Analysis Pipeline
For each candidate coin:
1. Fetch 30-day historical data (CoinGecko/CoinPaprika/Yahoo)
2. Run full `processTA()` with `'ensemble'` forecasting
3. Calculate breakout score from signal, S/R proximity, forecast
4. Sort by composite score, display top results

### Consistency Rule
Same `preScreenScore` algorithm used across TopPicks, TopPicksDashboard, and BreakoutFinder to ensure identical Buy/Watch/Avoid signals for the same asset.

---

## 25. Top Picks & Unified Scoring

### TopPicks (`TopPicks.tsx`) & TopPicksDashboard (`TopPicksDashboard.tsx`)

Both components use the **same `preScreenScore`** algorithm as the Breakout Finder for verdict consistency.

### Verdict Mapping
| Score | Verdict | Color |
|-------|---------|-------|
| ≥ 45 | Buy | green |
| ≥ 25 | Watch | amber |
| < 25 | Avoid | red |

### Data Source
- CoinLore `getTopTickers(100)` — fetched every 5 minutes
- Sorted by: score (default), 24h change, 7d change, volume, market cap

---

## 26. Routing & Pages

```typescript
// App.tsx routes
<Routes>
  <Route path="/" element={<Landing />} />           // Redirects auth users → /dashboard
  <Route path="/dashboard" element={<Index />} />     // Main SPA
  <Route path="/about" element={<About />} />
  <Route path="/contact" element={<Contact />} />
  <Route path="/faq" element={<FAQ />} />
  <Route path="/privacy" element={<Privacy />} />
  <Route path="/terms" element={<Terms />} />
  <Route path="/disclaimer" element={<Disclaimer />} />
  <Route path="/admin" element={<Admin />} />         // Admin-only
  <Route path="*" element={<NotFound />} />
</Routes>
```

---

## 27. PWA Configuration

- **Plugin**: `vite-plugin-pwa`
- **Icons**: `public/pwa-192x192.png`, `public/pwa-512x512.png`
- **Favicon**: `public/favicon.svg` (light), `public/favicon-light.svg`
- **Manifest**: Auto-generated by vite-plugin-pwa
- **Service Worker**: Auto-generated

---

## 28. SEO & Meta

- **SEO Component** (`components/SEO.tsx`): Sets title, description, canonical
- **Title format**: `{PageName} | ForecastSimply` (< 60 chars)
- **Meta description**: < 160 chars
- **robots.txt**: `public/robots.txt`
- **sitemap.xml**: `public/sitemap.xml`
- **Single H1 per page**
- **Semantic HTML throughout**
- **Lazy loading on images**
- **Responsive viewport**: `<meta name="viewport" content="width=device-width, initial-scale=1.0">`

---

## Volatility Calculation (in analysis text)

```
Returns[i] = (close[i] - close[i-1]) / close[i-1]
Mean = avg(Returns)
DailyVol = √(Σ(return - mean)² / n) × 100  (percentage)
```

---

*End of Blueprint — ForecastSimply v8.0*
