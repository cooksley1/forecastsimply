import type { TechnicalData, Recommendation } from '@/types/analysis';
import type { AssetInfo } from '@/types/assets';
import { fmtPrice, fmtPercent } from '@/utils/format';

interface ReportParams {
  assetInfo: AssetInfo;
  technicalData: TechnicalData;
  timeframeDays: number;
  riskLevel: number;
  dataSource: string;
}

const RISK_LABELS = ['Conservative', 'Moderately Conservative', 'Moderate', 'Moderately Aggressive', 'Aggressive'];

function riskLabel(level: number): string {
  return RISK_LABELS[level - 1] || 'Moderate';
}

function timeframeLabel(days: number): string {
  if (days <= 1) return '1 Day';
  if (days <= 7) return '7 Days';
  if (days <= 30) return '30 Days';
  if (days <= 90) return '90 Days';
  if (days <= 365) return '1 Year';
  return 'All Time';
}

function last(arr: number[]): number {
  return arr.filter(v => !isNaN(v)).pop() ?? 0;
}

function maRelation(price: number, maVal: number): string {
  if (!maVal) return 'N/A';
  const pct = ((price - maVal) / maVal) * 100;
  if (pct > 2) return `Above (${fmtPrice(maVal)}, +${pct.toFixed(1)}%)`;
  if (pct < -2) return `Below (${fmtPrice(maVal)}, ${pct.toFixed(1)}%)`;
  return `Near (${fmtPrice(maVal)}, ${pct.toFixed(1)}%)`;
}

function rsiInterpretation(rsi: number): string {
  if (rsi < 30) return 'Oversold — potential bounce zone';
  if (rsi < 40) return 'Approaching oversold — weakening momentum';
  if (rsi > 70) return 'Overbought — potential reversal zone';
  if (rsi > 60) return 'Strong momentum — bullish territory';
  return 'Neutral — no extreme readings';
}

function stochInterpretation(k: number): string {
  if (k < 20) return 'Oversold';
  if (k > 80) return 'Overbought';
  return 'Neutral';
}

function volatilityStatus(dailyVol: number): string {
  if (dailyVol < 1) return 'Low — stable price action';
  if (dailyVol < 3) return 'Moderate — normal market conditions';
  return 'High — elevated risk and opportunity';
}

function confidenceLevel(conf: number): string {
  if (conf >= 80) return 'Very High';
  if (conf >= 65) return 'High';
  if (conf >= 50) return 'Moderate';
  if (conf >= 35) return 'Low';
  return 'Very Low';
}

function structurePoints(phase: string, price: number, ind: TechnicalData['indicators']): string[] {
  const sma20 = last(ind.sma20);
  const sma50 = last(ind.sma50);
  const points: string[] = [];

  if (price > sma20 && sma20 > sma50) {
    points.push('Price above short and medium-term moving averages');
    points.push('Short-term MA trending above medium-term MA (golden cross structure)');
  } else if (price < sma20 && sma20 < sma50) {
    points.push('Price below short and medium-term moving averages');
    points.push('Short-term MA trending below medium-term MA (death cross structure)');
  } else {
    points.push('Price oscillating around key moving averages');
    points.push('Mixed MA alignment — transitional market structure');
  }

  if (ind.currentRsi < 30) points.push('RSI in oversold territory — selling pressure may be exhausted');
  else if (ind.currentRsi > 70) points.push('RSI in overbought territory — buying pressure may be waning');
  else points.push(`RSI at ${ind.currentRsi.toFixed(0)} — within normal range`);

  return points.slice(0, 3);
}

function marketControl(phase: string): string {
  const map: Record<string, string> = {
    'Markup / Uptrend': 'buyers are in control and the path of least resistance is higher',
    'Markdown / Downtrend': 'sellers are in control and the path of least resistance is lower',
    'Distribution': 'smart money may be distributing positions — a transition phase',
    'Accumulation': 'smart money may be accumulating positions — potential base forming',
    'Consolidation': 'neither side has conviction — expect a directional breakout soon',
    'Recovery': 'early signs of recovery are emerging — confirm with volume',
    'Decline': 'downside momentum remains — caution warranted',
  };
  return map[phase] || 'the market is in transition';
}

function bullishSignals(ind: TechnicalData['indicators'], price: number): string[] {
  const signals: string[] = [];
  const sma20 = last(ind.sma20);
  const sma50 = last(ind.sma50);

  if (ind.currentRsi < 35) signals.push('RSI approaching/in oversold — potential bounce');
  if (sma20 > sma50) signals.push('Short-term MA above medium-term MA (bullish cross)');
  if (price > ind.resistance * 0.98) signals.push(`Approaching or breaking resistance at ${fmtPrice(ind.resistance)}`);
  
  const macdHist = ind.macdHistogram.filter(v => !isNaN(v));
  if (macdHist.length >= 2 && macdHist[macdHist.length - 1] > macdHist[macdHist.length - 2])
    signals.push('MACD histogram improving — momentum turning positive');

  if (ind.obv && ind.obv.length > 10) {
    const recentObv = ind.obv.slice(-5);
    if (recentObv.every((v, i) => i === 0 || v >= recentObv[i - 1]))
      signals.push('OBV trending upward — accumulation detected');
  }

  return signals.length >= 3 ? signals.slice(0, 3) : [...signals, 'Volume increase on up-moves would confirm bullish thesis'].slice(0, 3);
}

function bearishSignals(ind: TechnicalData['indicators'], price: number): string[] {
  const signals: string[] = [];
  const sma20 = last(ind.sma20);
  const sma50 = last(ind.sma50);

  if (ind.currentRsi > 65) signals.push('RSI approaching/in overbought — potential exhaustion');
  if (sma20 < sma50) signals.push('Short-term MA below medium-term MA (bearish cross)');
  if (price < ind.support * 1.02) signals.push(`Approaching or breaking support at ${fmtPrice(ind.support)}`);
  
  const macdHist = ind.macdHistogram.filter(v => !isNaN(v));
  if (macdHist.length >= 2 && macdHist[macdHist.length - 1] < macdHist[macdHist.length - 2])
    signals.push('MACD histogram declining — momentum weakening');

  if (ind.obv && ind.obv.length > 10) {
    const recentObv = ind.obv.slice(-5);
    if (recentObv.every((v, i) => i === 0 || v <= recentObv[i - 1]))
      signals.push('OBV trending downward — distribution detected');
  }

  return signals.length >= 3 ? signals.slice(0, 3) : [...signals, 'Break below key support would confirm bearish continuation'].slice(0, 3);
}

export function generateReport({ assetInfo, technicalData, timeframeDays, riskLevel, dataSource }: ReportParams): string {
  const { indicators: ind, signal, recommendations, forecasts, marketPhase, forecastTarget } = technicalData;
  const price = assetInfo.price;
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  // Computed values
  const sma20Val = last(ind.sma20);
  const sma50Val = last(ind.sma50);
  const sma200Val = ind.sma200 ? last(ind.sma200) : 0;

  const lastStochK = last(ind.stochasticK);

  const macdLine = ind.macdLine.filter(v => !isNaN(v));
  const macdSig = ind.macdSignal.filter(v => !isNaN(v));
  const macdHist = ind.macdHistogram.filter(v => !isNaN(v));
  const lastMacdLine = macdLine[macdLine.length - 1] ?? 0;
  const lastMacdSig = macdSig[macdSig.length - 1] ?? 0;
  const lastMacdHist = macdHist[macdHist.length - 1] ?? 0;
  const prevMacdHist = macdHist[macdHist.length - 2] ?? 0;

  const macdPosition = lastMacdLine > lastMacdSig ? 'Above signal line (bullish)' : lastMacdLine < lastMacdSig ? 'Below signal line (bearish)' : 'At signal line (neutral)';
  const macdMomentum = lastMacdHist > prevMacdHist ? 'Increasing — momentum building' : lastMacdHist < prevMacdHist ? 'Decreasing — momentum fading' : 'Flat';
  const macdBias = lastMacdLine > lastMacdSig && lastMacdHist > prevMacdHist ? 'Bullish' : lastMacdLine < lastMacdSig && lastMacdHist < prevMacdHist ? 'Bearish' : 'Neutral';

  // OBV
  let obvTrend = 'Data limited';
  if (ind.obv && ind.obv.length > 20) {
    const half = Math.floor(ind.obv.length / 2);
    const first = ind.obv.slice(Math.max(0, half - 10), half).reduce((a, b) => a + b, 0) / 10;
    const second = ind.obv.slice(-10).reduce((a, b) => a + b, 0) / 10;
    obvTrend = second > first ? 'Trending upward — buying pressure dominant' : 'Trending downward — selling pressure dominant';
  }
  const volumeBias = obvTrend.includes('upward') ? 'Bullish' : obvTrend.includes('downward') ? 'Bearish' : 'Neutral';

  // Volatility
  const prices = technicalData.prices;
  const closes = prices.map(p => p.close);
  const rets: number[] = [];
  for (let i = 1; i < closes.length; i++) rets.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const dailyVol = Math.sqrt(rets.reduce((a, b) => a + (b - mean) ** 2, 0) / rets.length) * 100;

  const lastBBU = last(ind.bbUpper);
  const lastBBL = last(ind.bbLower);
  const bbWidth = price > 0 ? ((lastBBU - lastBBL) / price * 100) : 0;

  // Trend bias
  const trendBias = sma20Val > sma50Val && price > sma20Val ? 'Bullish' : sma20Val < sma50Val && price < sma20Val ? 'Bearish' : 'Neutral';

  // Momentum status
  const momentumStatus = ind.currentRsi > 60 && lastStochK > 60 ? 'Bullish' : ind.currentRsi < 40 && lastStochK < 40 ? 'Bearish' : 'Neutral';

  // Forecast aggregation
  const forecastReturn = price > 0 ? ((forecastTarget - price) / price * 100) : 0;
  const regime = forecastReturn > 15 ? 'Bullish' : forecastReturn < -15 ? 'Bearish' : 'Neutral';
  const probBias = forecastReturn > 5 ? 'Upside favoured' : forecastReturn < -5 ? 'Downside favoured' : 'Balanced';
  const medianDir = forecastReturn > 0 ? 'Upward' : forecastReturn < 0 ? 'Downward' : 'Flat';

  // Forecast ranges from named forecasts
  let lowRange = forecastTarget;
  let highRange = forecastTarget;
  if (forecasts && forecasts.length > 0) {
    const targets = forecasts.map(f => f.target);
    lowRange = Math.min(...targets);
    highRange = Math.max(...targets);
  }

  // Primary recommendation (mid-term)
  const primaryRec = recommendations.find(r => r.horizon === 'mid') || recommendations[0];
  const shortRec = recommendations.find(r => r.horizon === 'short');
  const longRec = recommendations.find(r => r.horizon === 'long');

  // Strategy type
  const strategyType = regime === 'Bullish' ? 'trend-following bullish'
    : regime === 'Bearish' ? 'risk-reduction bearish'
    : 'range-bound neutral';

  // Level commentary
  const supportDist = ((price - ind.support) / price * 100);
  const resistDist = ((ind.resistance - price) / price * 100);
  const levelCommentary = supportDist < 3
    ? 'Price is near support — watch for a bounce or breakdown.'
    : resistDist < 3
    ? 'Price is near resistance — watch for a breakout or rejection.'
    : 'Price is between key levels — monitoring for directional catalyst.';

  // Risk-reward
  const rrRatio = primaryRec ? Math.abs(primaryRec.target - primaryRec.entry) / Math.max(0.01, Math.abs(primaryRec.entry - primaryRec.stopLoss)) : 0;

  // Confidence components
  const sigValues = [ind.currentRsi < 30 ? 1 : ind.currentRsi > 70 ? -1 : 0];
  const alignmentScore = signal.confidence >= 70 ? 'High' : signal.confidence >= 50 ? 'Moderate' : 'Low';
  const projScore = Math.abs(forecastReturn) > 5 && ((forecastReturn > 0 && signal.score > 0) || (forecastReturn < 0 && signal.score < 0)) ? 'High' : 'Moderate';

  const sPoints = structurePoints(marketPhase, price, ind);
  const bullSigs = bullishSignals(ind, price);
  const bearSigs = bearishSignals(ind, price);

  // Recommendation explanation
  const recExplanation = primaryRec
    ? `Based on ${regime.toLowerCase()} market regime with ${confidenceLevel(primaryRec.confidence).toLowerCase()} confidence. ${primaryRec.reasoning}`
    : 'Insufficient data for recommendation.';

  // Outlook
  const outlookMap: Record<string, string> = {
    Bullish: `${assetInfo.name} shows constructive technical positioning with positive momentum and favourable forecast alignment. The bias remains to the upside as long as price holds above key support at ${fmtPrice(ind.support)}. Watch for a break above ${fmtPrice(ind.resistance)} to confirm continuation.`,
    Bearish: `${assetInfo.name} is under technical pressure with negative momentum and unfavourable forecast alignment. The bias remains to the downside unless price reclaims key resistance at ${fmtPrice(ind.resistance)}. A break below ${fmtPrice(ind.support)} would confirm further weakness.`,
    Neutral: `${assetInfo.name} is in a consolidation phase with mixed signals across indicators. No strong directional bias is present. Wait for a decisive break above ${fmtPrice(ind.resistance)} (bullish) or below ${fmtPrice(ind.support)} (bearish) before taking a directional position.`,
  };

  const entryMethod = primaryRec
    ? `${fmtPrice(primaryRec.entry)} (current market price)`
    : 'N/A';
  const targetDesc = primaryRec
    ? `${fmtPrice(primaryRec.target)} (${fmtPercent((primaryRec.target - primaryRec.entry) / primaryRec.entry * 100)} from entry)`
    : 'N/A';
  const stopDesc = primaryRec
    ? `${fmtPrice(primaryRec.stopLoss)} (${fmtPercent((primaryRec.stopLoss - primaryRec.entry) / primaryRec.entry * 100)} from entry)`
    : 'N/A';

  const confSummary = `indicator alignment (${alignmentScore.toLowerCase()}), forecast agreement (${projScore.toLowerCase()}), and current volatility conditions`;

  const report = `
📊 ${assetInfo.name} (${assetInfo.symbol}) — Technical & Market Intelligence Report
${'═'.repeat(70)}
Date: ${date}
Timeframe: ${timeframeLabel(timeframeDays)}
Risk Level: ${riskLabel(riskLevel)}
Data Source: ${dataSource}
Signal: ${signal.label} (Score: ${signal.score}/10, Confidence: ${signal.confidence}%)


📈 MARKET STRUCTURE
${'─'.repeat(40)}
${assetInfo.name} is currently trading in a ${marketPhase} phase, characterised by:

  • ${sPoints[0]}
  • ${sPoints[1]}
  • ${sPoints[2]}

This indicates that ${marketControl(marketPhase)}.


🔍 INDICATOR ANALYSIS
${'─'.repeat(40)}

TREND
  Short-Term MA (20):  ${maRelation(price, sma20Val)}
  Medium-Term MA (50): ${maRelation(price, sma50Val)}
  Long-Term MA (200):  ${sma200Val ? maRelation(price, sma200Val) : 'Insufficient data'}
  Trend Bias:          ${trendBias}

MOMENTUM
  RSI:               ${ind.currentRsi.toFixed(1)} → ${rsiInterpretation(ind.currentRsi)}
  Stochastic %K:     ${lastStochK.toFixed(1)} → ${stochInterpretation(lastStochK)}
  Momentum Status:   ${momentumStatus}

MACD
  MACD Line:         ${macdPosition}
  Histogram:         ${macdMomentum}
  MACD Bias:         ${macdBias}

VOLUME
  OBV:               ${obvTrend}
  Volume Bias:       ${volumeBias}

VOLATILITY
  Daily Volatility:  ${dailyVol.toFixed(2)}%
  Bollinger Width:   ${bbWidth.toFixed(2)}%
  Volatility Status: ${volatilityStatus(dailyVol)}


🎯 KEY PRICE LEVELS
${'─'.repeat(40)}
  Level          Price              Significance
  ────────────   ────────────────   ─────────────────
  Resistance     ${fmtPrice(ind.resistance).padEnd(17)}Overhead supply
  Support        ${fmtPrice(ind.support).padEnd(17)}Demand zone
  Current        ${fmtPrice(price).padEnd(17)}Last traded price

${levelCommentary}


🔮 PRICE PROJECTION ANALYSIS
${'─'.repeat(40)}
Projection models used:
  1. Trend Smoothing (Holt Method)
  2. EMA Momentum Projection
  3. Probabilistic Simulation (Monte Carlo)

Aggregated Outlook:
  Median Projection:   ${medianDir}
  Range Estimate:      ${fmtPrice(lowRange)} to ${fmtPrice(highRange)}
  Probability Bias:    ${probBias}
  Market Regime:       ${regime}
  Expected Movement:   ${forecastReturn >= 0 ? '+' : ''}${forecastReturn.toFixed(1)}% over ${timeframeLabel(timeframeDays)}


📌 STRATEGY ALIGNMENT
${'─'.repeat(40)}
Based on:
  • Market structure (${marketPhase})
  • Indicator alignment (${trendBias} trend, ${momentumStatus} momentum)
  • Volume and volatility profile (${volumeBias} volume, ${volatilityStatus(dailyVol).split(' —')[0]} volatility)
  • Projection regime (${regime})

The system aligns to a ${strategyType} approach.


✅ RECOMMENDATIONS
${'─'.repeat(40)}
${recommendations.filter(r => r.horizon !== 'dca').map(r => {
  const horizonLabel = r.horizon === 'short' ? 'Short-Term (1–7 days)' : r.horizon === 'mid' ? 'Mid-Term (1–3 months)' : 'Long-Term (6–24 months)';
  const rr = Math.abs(r.target - r.entry) / Math.max(0.01, Math.abs(r.entry - r.stopLoss));
  return `  ${horizonLabel}
    Signal:      ${r.label}
    Confidence:  ${r.confidence}% (${confidenceLevel(r.confidence)})
    Entry:       ${fmtPrice(r.entry)}
    Target:      ${fmtPrice(r.target)} (${fmtPercent((r.target - r.entry) / r.entry * 100)})
    Stop-Loss:   ${fmtPrice(r.stopLoss)} (${fmtPercent((r.stopLoss - r.entry) / r.entry * 100)})
    Risk–Reward: ${rr.toFixed(2)}:1
    ${r.reasoning}`;
}).join('\n\n')}

${recommendations.find(r => r.horizon === 'dca') ? `
  DCA Timing
    Signal:      ${recommendations.find(r => r.horizon === 'dca')!.label}
    Confidence:  ${recommendations.find(r => r.horizon === 'dca')!.confidence}%
    ${recommendations.find(r => r.horizon === 'dca')!.reasoning}
` : ''}

🧠 CONFIDENCE ASSESSMENT
${'─'.repeat(40)}
  Component              Rating
  ─────────────────────  ───────
  Indicator Alignment    ${alignmentScore}
  Projection Agreement   ${projScore}
  Volatility Impact      ${dailyVol < 2 ? 'Low impact' : dailyVol < 4 ? 'Moderate impact' : 'High impact'}

Overall Confidence reflects ${confSummary}.


📋 OUTLOOK SUMMARY
${'─'.repeat(40)}
${outlookMap[regime] || outlookMap.Neutral}


📍 KEY MONITORING SIGNALS
${'─'.repeat(40)}

Bullish Signals:
  • ${bullSigs[0]}
  • ${bullSigs[1]}
  • ${bullSigs[2]}

Bearish Signals:
  • ${bearSigs[0]}
  • ${bearSigs[1]}
  • ${bearSigs[2]}


⚠️ RISK DISCLOSURE
${'─'.repeat(40)}
This report is generated using algorithmic analysis based on technical
indicators and statistical projection models. It does not constitute
financial advice. Market conditions may change rapidly. Past performance
does not guarantee future results. Always do your own research.

${'═'.repeat(70)}
Generated by Forecast Simply — ${date}
`.trim();

  return report;
}

export function downloadReport(report: string, assetSymbol: string): void {
  const date = new Date().toISOString().slice(0, 10);
  const filename = `${assetSymbol}_Analysis_Report_${date}.txt`;
  const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function openReportInNewTab(report: string, assetName: string): void {
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><title>${assetName} — Analysis Report</title><style>
    body { background: #0a0a0f; color: #e0e0e0; font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace; font-size: 13px; line-height: 1.7; padding: 2rem 3rem; white-space: pre-wrap; max-width: 900px; margin: 0 auto; }
    @media print { body { background: #fff; color: #111; } }
  </style></head><body>${report.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</body></html>`);
  win.document.close();
}
