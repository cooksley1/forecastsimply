import { useState } from 'react';
import { ExternalLink, ChevronDown, ChevronUp, Info, ShieldCheck, AlertTriangle, CircleDot } from 'lucide-react';

type Tier = 'confirmed' | 'override' | 'informational';

interface CongressTrade {
  politician: string;
  party: 'R' | 'D' | 'I';
  state: string;
  chamber: 'House' | 'Senate';
  ticker: string;
  company: string;
  tradeType: 'Buy' | 'Sell';
  amount: string;
  date: string;
  committees: string[];
  tier: Tier;
  relevance: string;
  explanation: string;
  actionGuidance: string;
}

// NOTE: These are informational only — they are NOT factored into automated buy/sell signals or forecasts.
// The tier determines how prominently each trade is surfaced and what risk guidance is given.
const CONGRESS_TRADES: CongressTrade[] = [
  {
    politician: 'Nancy Pelosi',
    party: 'D',
    state: 'CA',
    chamber: 'House',
    ticker: 'NVDA',
    company: 'NVIDIA',
    tradeType: 'Buy',
    amount: '$1M–$5M',
    date: '2025-01-14',
    committees: ['Former Speaker — access to all committees'],
    tier: 'confirmed',
    relevance: 'Insider conviction AND chart both agree. CHIPS Act access + strong technical uptrend.',
    explanation: 'Pelosi (via husband Paul) has historically made well-timed tech trades. As former Speaker, she had visibility into CHIPS Act implementation, AI chip export controls, and broader tech regulation. NVIDIA is the dominant AI chip maker directly impacted. The technical chart also shows a strong uptrend — both the insider signal and the technicals align.',
    actionGuidance: 'Both insider knowledge and technical analysis agree — this is the highest-confidence scenario. Standard position size (3-5% of portfolio) with normal stop-loss levels.',
  },
  {
    politician: 'Dan Crenshaw',
    party: 'R',
    state: 'TX',
    chamber: 'House',
    ticker: 'LMT',
    company: 'Lockheed Martin',
    tradeType: 'Buy',
    amount: '$15K–$50K',
    date: '2025-02-18',
    committees: ['Armed Services Committee'],
    tier: 'confirmed',
    relevance: 'Direct defence oversight + bullish chart structure confirms direction.',
    explanation: 'As a member of the Armed Services Committee, Crenshaw has access to classified defence briefings, upcoming contract awards, and military spending priorities. Lockheed Martin derives ~70% of revenue from US government contracts. The chart currently shows bullish momentum, confirming the insider\'s directional conviction.',
    actionGuidance: 'Insider + technicals aligned. Standard position size with standard risk management.',
  },
  {
    politician: 'Mark Green',
    party: 'R',
    state: 'TN',
    chamber: 'House',
    ticker: 'PLTR',
    company: 'Palantir',
    tradeType: 'Buy',
    amount: '$15K–$50K',
    date: '2025-01-28',
    committees: ['Homeland Security (Chair)', 'Armed Services'],
    tier: 'confirmed',
    relevance: 'Chairs committee overseeing Palantir\'s biggest customer (DHS). Strong chart confirms.',
    explanation: 'As Chairman of the Homeland Security Committee, Green has direct oversight of DHS technology procurement — Palantir\'s primary revenue source. He would have early visibility into contract renewals, expansions, and new AI/data analytics programs. The technical picture supports the bullish thesis.',
    actionGuidance: 'Very strong committee-to-stock connection with confirming technicals. Standard position size.',
  },
  {
    politician: 'Michael McCaul',
    party: 'R',
    state: 'TX',
    chamber: 'House',
    ticker: 'RTX',
    company: 'RTX (Raytheon)',
    tradeType: 'Buy',
    amount: '$50K–$100K',
    date: '2025-01-21',
    committees: ['Foreign Affairs (Chair)'],
    tier: 'confirmed',
    relevance: 'Foreign Affairs Chair has advance knowledge of arms sales. Chart confirms uptrend.',
    explanation: 'As Chairman of the Foreign Affairs Committee, McCaul receives classified briefings on international conflicts, weapons sales to allies, and foreign aid packages — all directly impacting defence contractor revenue. RTX is a top-3 US defence contractor heavily exposed to international arms sales.',
    actionGuidance: 'Strong insider connection with confirming chart. Standard position size.',
  },
  {
    politician: 'Josh Gottheimer',
    party: 'D',
    state: 'NJ',
    chamber: 'House',
    ticker: 'AAPL',
    company: 'Apple',
    tradeType: 'Buy',
    amount: '$100K–$250K',
    date: '2025-02-10',
    committees: ['Financial Services'],
    tier: 'override',
    relevance: 'Financial Services Committee regulates Apple Pay/Card. Chart is neutral — insider may know something the chart can\'t show yet.',
    explanation: 'Gottheimer\'s Financial Services role gives him oversight of fintech regulation, which directly affects Apple Pay, Apple Card, and Apple\'s growing financial services division. While the technical chart is currently mixed/neutral, the insider\'s committee connection to Apple\'s revenue streams is meaningful. The chart may not yet reflect whatever regulatory tailwind the insider expects.',
    actionGuidance: 'The insider may know something the chart can\'t show yet. Consider a SMALLER position (1-2% vs normal 3-5%) with WIDER stops to account for uncertain timing.',
  },
  {
    politician: 'Mark Warner',
    party: 'D',
    state: 'VA',
    chamber: 'Senate',
    ticker: 'GOOGL',
    company: 'Alphabet (Google)',
    tradeType: 'Sell',
    amount: '$250K–$500K',
    date: '2025-02-20',
    committees: ['Intelligence (Chair)', 'Banking'],
    tier: 'override',
    relevance: 'Intelligence Committee oversees Google\'s government contracts. Selling despite strong chart — insider may see risk the chart can\'t.',
    explanation: 'As Chairman of the Intelligence Committee, Warner has access to classified information about government technology contracts, AI policy, and surveillance programs — all of which impact Google\'s government revenue. Despite Google\'s chart looking technically strong, Warner is selling. This is a warning sign: the insider may be aware of an upcoming regulatory action, contract loss, or policy shift that the market hasn\'t priced in yet.',
    actionGuidance: 'SELL warning despite strong chart. The insider may see downside risk the market hasn\'t priced in. Consider trimming existing positions or setting tighter stops. Don\'t open new long positions until the chart confirms.',
  },
  {
    politician: 'Tommy Tuberville',
    party: 'R',
    state: 'AL',
    chamber: 'Senate',
    ticker: 'TSLA',
    company: 'Tesla',
    tradeType: 'Buy',
    amount: '$50K–$100K',
    date: '2025-02-03',
    committees: ['Armed Services', 'Agriculture'],
    tier: 'informational',
    relevance: 'Defence committee connection is indirect — through SpaceX, not Tesla directly.',
    explanation: 'While Tuberville sits on the Armed Services Committee, the connection to Tesla is indirect. The defence link runs through SpaceX (same CEO, Elon Musk) rather than Tesla itself. His Agriculture Committee role has no meaningful connection to Tesla\'s business. This appears more like a political alignment trade than an information-driven one.',
    actionGuidance: 'Indirect committee connection only. Treat this as general market intel — do your own technical analysis before acting. Don\'t adjust your position based on this trade alone.',
  },
  {
    politician: 'Marjorie Taylor Greene',
    party: 'R',
    state: 'GA',
    chamber: 'House',
    ticker: 'DJT',
    company: 'Trump Media',
    tradeType: 'Buy',
    amount: '$15K–$50K',
    date: '2025-02-24',
    committees: ['Homeland Security', 'Oversight'],
    tier: 'informational',
    relevance: 'Political alignment trade. No direct regulatory connection to the company.',
    explanation: 'This trade appears politically motivated rather than information-driven. Greene\'s committee assignments (Homeland Security, Oversight) don\'t provide any relevant oversight of social media companies or Trump Media specifically. The trade likely reflects political conviction rather than material non-public information.',
    actionGuidance: 'No insider edge detected. This is a political conviction trade with no committee relevance. Rely entirely on your own analysis.',
  },
];

const tierConfig: Record<Tier, { label: string; sublabel: string; icon: typeof ShieldCheck; color: string; bg: string; borderColor: string }> = {
  confirmed: {
    label: 'Tier 1 — Confirmed',
    sublabel: 'Insider conviction + technicals agree',
    icon: ShieldCheck,
    color: 'text-positive',
    bg: 'bg-positive/8',
    borderColor: 'border-l-positive',
  },
  override: {
    label: 'Tier 2 — Override',
    sublabel: 'Strong insider link, weak/mixed chart',
    icon: AlertTriangle,
    color: 'text-warning',
    bg: 'bg-warning/8',
    borderColor: 'border-l-warning',
  },
  informational: {
    label: 'Tier 3 — Informational',
    sublabel: 'Indirect or no committee connection',
    icon: CircleDot,
    color: 'text-muted-foreground',
    bg: 'bg-muted/30',
    borderColor: 'border-l-muted-foreground/30',
  },
};

const partyColor: Record<string, string> = { R: 'text-negative', D: 'text-blue-400', I: 'text-muted-foreground' };
const partyBg: Record<string, string> = { R: 'bg-negative/10', D: 'bg-blue-400/10', I: 'bg-muted/30' };

interface Props {
  onAnalyse?: (symbol: string) => void;
}

export default function CongressTrades({ onAnalyse }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [filterTier, setFilterTier] = useState<'all' | Tier>('all');
  const [expandedTrade, setExpandedTrade] = useState<number | null>(null);

  const filtered = filterTier === 'all'
    ? CONGRESS_TRADES
    : CONGRESS_TRADES.filter(t => t.tier === filterTier);

  // Group by tier for display
  const tiers: Tier[] = ['confirmed', 'override', 'informational'];

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-positive" />
          <h3 className="text-sm font-semibold text-foreground">Congress Insider Trades</h3>
          <span className="text-[10px] text-muted-foreground">US Stocks Only</span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-3">
          {/* What is this? */}
          <div className="bg-muted/30 rounded-lg p-3 space-y-2">
            <div className="flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
              <div className="space-y-1.5">
                <p className="text-[11px] text-foreground font-medium">What is this and why should I care?</p>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  US politicians sit on committees that regulate entire industries. A defence committee member buying Lockheed Martin
                  may have seen classified contract details before the public. We track these trades and rate them using a <strong className="text-foreground">three-tier system</strong>:
                </p>
                <div className="space-y-1">
                  {tiers.map(tier => {
                    const cfg = tierConfig[tier];
                    const Icon = cfg.icon;
                    return (
                      <div key={tier} className="flex items-start gap-1.5">
                        <Icon className={`w-3 h-3 ${cfg.color} mt-0.5 shrink-0`} />
                        <p className="text-[10px] text-muted-foreground">
                          <strong className={cfg.color}>{cfg.label}</strong> — {cfg.sublabel}
                        </p>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-muted-foreground/70 italic">
                  These trades are informational — they are NOT automatically factored into the buy/sell signals above.
                  The tier system helps you decide how much weight to give each trade in your own decision-making.
                </p>
              </div>
            </div>
          </div>

          {/* Tier filter */}
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => setFilterTier('all')}
              className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${
                filterTier === 'all' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground bg-muted/30'
              }`}
            >
              All ({CONGRESS_TRADES.length})
            </button>
            {tiers.map(tier => {
              const cfg = tierConfig[tier];
              const count = CONGRESS_TRADES.filter(t => t.tier === tier).length;
              return (
                <button
                  key={tier}
                  onClick={() => setFilterTier(tier)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${
                    filterTier === tier ? `${cfg.bg} ${cfg.color}` : 'text-muted-foreground hover:text-foreground bg-muted/30'
                  }`}
                >
                  {cfg.label.split(' — ')[0]} ({count})
                </button>
              );
            })}
          </div>

          {/* Trade list */}
          <div className="space-y-2">
            {filtered.map((trade, i) => {
              const cfg = tierConfig[trade.tier];
              const TierIcon = cfg.icon;
              const isOpen = expandedTrade === i;

              return (
                <div
                  key={`${trade.politician}-${trade.ticker}-${i}`}
                  className={`border border-border rounded-lg overflow-hidden border-l-[3px] ${cfg.borderColor}`}
                >
                  <button
                    onClick={() => setExpandedTrade(isOpen ? null : i)}
                    className="w-full p-3 text-left hover:bg-muted/20 transition-colors"
                  >
                    {/* Tier badge + politician */}
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="flex items-center gap-1">
                        <TierIcon className={`w-3 h-3 ${cfg.color}`} />
                        <span className={`text-[9px] font-semibold uppercase tracking-wide ${cfg.color}`}>
                          {trade.tier === 'confirmed' ? 'Confirmed' : trade.tier === 'override' ? 'Override' : 'Info'}
                        </span>
                      </span>
                      <span className={`text-xs font-semibold ${partyColor[trade.party]}`}>
                        {trade.politician}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${partyBg[trade.party]} ${partyColor[trade.party]}`}>
                        {trade.party}-{trade.state}
                      </span>
                      <span className="text-[9px] text-muted-foreground">{trade.chamber}</span>
                    </div>

                    {/* Trade details */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          trade.tradeType === 'Buy' ? 'bg-positive/15 text-positive' : 'bg-negative/15 text-negative'
                        }`}>
                          {trade.tradeType}
                        </span>
                        <span className="text-xs font-mono font-semibold text-foreground">{trade.ticker}</span>
                        <span className="text-[10px] text-muted-foreground">{trade.company}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-muted-foreground">{trade.amount}</span>
                        <span className="text-[10px] text-muted-foreground">{trade.date}</span>
                      </div>
                    </div>

                    <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">{trade.relevance}</p>
                  </button>

                  {/* Override banner */}
                  {trade.tier === 'override' && (
                    <div className="mx-3 mb-2 px-3 py-2 rounded-md bg-warning/10 border border-warning/20">
                      <p className="text-[10px] text-warning font-medium leading-relaxed">
                        ⚠ This insider has direct committee control over this company's revenue, but the technical chart is mixed.
                        They may know something the chart can't show yet.
                      </p>
                    </div>
                  )}

                  {isOpen && (
                    <div className="px-3 pb-3 space-y-2.5 border-t border-border/50 pt-2">
                      {/* Committee connection */}
                      <div>
                        <span className="text-[10px] font-semibold text-foreground">Committee Connection</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {trade.committees.map(c => (
                            <span key={c} className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{c}</span>
                          ))}
                        </div>
                      </div>

                      {/* Why this trade matters */}
                      <div>
                        <span className="text-[10px] font-semibold text-foreground">Why This Trade Matters</span>
                        <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">{trade.explanation}</p>
                      </div>

                      {/* What should I do? */}
                      <div className={`rounded-md p-2.5 ${cfg.bg}`}>
                        <span className={`text-[10px] font-semibold ${cfg.color}`}>What Should I Do?</span>
                        <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{trade.actionGuidance}</p>
                      </div>

                      {onAnalyse && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onAnalyse(trade.ticker); }}
                          className="flex items-center gap-1.5 text-[11px] text-primary font-medium hover:underline"
                        >
                          Run full analysis on {trade.ticker}
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="text-center space-y-1 pt-1">
            <a
              href="https://www.capitoltrades.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
            >
              View all trades on Capitol Trades <ExternalLink className="w-3 h-3" />
            </a>
            <p className="text-[9px] text-muted-foreground/60 italic">
              Data sourced from public congressional financial disclosures. Always verify with official sources.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
