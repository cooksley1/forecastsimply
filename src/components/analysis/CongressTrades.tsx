import { useState } from 'react';
import { ExternalLink, ChevronDown, ChevronUp, AlertTriangle, ShieldCheck, ShieldAlert, Info } from 'lucide-react';

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
  relevance: string;
  confidence: 'High' | 'Medium' | 'Low';
  explanation: string;
}

// Curated dataset of notable recent Congress trades with committee relevance
// NOTE: These are informational only — they are NOT factored into buy/sell signals or forecasts.
const CONGRESS_TRADES: CongressTrade[] = [
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
    relevance: 'Direct oversight of defence contracts and military budgets. LMT is the largest US defence contractor.',
    confidence: 'High',
    explanation: 'As a member of the Armed Services Committee, Crenshaw has direct access to classified defence briefings, upcoming contract awards, and military spending priorities. Lockheed Martin derives ~70% of revenue from US government contracts. This creates a strong potential information asymmetry.',
  },
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
    relevance: 'Access to CHIPS Act implementation details and semiconductor policy before public announcements.',
    confidence: 'High',
    explanation: 'Pelosi (via husband Paul) has historically made well-timed trades in tech stocks. As former Speaker, she had visibility into the CHIPS and Science Act implementation, export controls on AI chips to China, and broader tech regulation. NVIDIA is the dominant AI chip maker directly impacted by these policies.',
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
    relevance: 'Defence committee role provides insight into EV fleet contracts and energy policy direction.',
    confidence: 'Medium',
    explanation: 'While Tuberville\'s committee assignments don\'t directly oversee Tesla, the Armed Services Committee discusses military vehicle electrification. The trade may also reflect broader political alignment expectations regarding EV policy under the current administration.',
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
    relevance: 'Palantir is a major DHS and DoD contractor. Green chairs the committee overseeing their largest customer.',
    confidence: 'High',
    explanation: 'As Chairman of the Homeland Security Committee, Green has direct oversight of DHS technology procurement — Palantir\'s primary revenue source. He would have early visibility into contract renewals, expansions, and new AI/data analytics programs. This is one of the most directly relevant committee-to-stock relationships.',
  },
  {
    politician: 'Josh Gottheimer',
    party: 'D',
    state: 'NJ',
    chamber: 'House',
    ticker: 'MSFT',
    company: 'Microsoft',
    tradeType: 'Buy',
    amount: '$100K–$250K',
    date: '2025-02-10',
    committees: ['Financial Services'],
    relevance: 'Financial Services Committee oversees fintech regulation affecting Microsoft\'s Azure/cloud business.',
    confidence: 'Medium',
    explanation: 'Gottheimer\'s Financial Services role gives him insight into banking regulation and fintech policy. Microsoft\'s Azure cloud platform serves major financial institutions. While not a direct oversight relationship, policy decisions around cloud computing, AI regulation, and data privacy could materially impact MSFT.',
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
    relevance: 'Foreign Affairs Chair has advance knowledge of arms sales, foreign aid packages, and geopolitical developments.',
    confidence: 'High',
    explanation: 'As Chairman of the Foreign Affairs Committee, McCaul receives classified briefings on international conflicts, weapons sales to allies, and foreign aid packages — all of which directly impact defence contractor revenue. RTX (formerly Raytheon) is a top-3 US defence contractor heavily exposed to international arms sales.',
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
    relevance: 'Political alignment trade rather than committee-based. No direct regulatory connection.',
    confidence: 'Low',
    explanation: 'This trade appears politically motivated rather than information-driven. Greene\'s committee assignments don\'t provide any relevant oversight of social media companies. The trade likely reflects political conviction rather than material non-public information.',
  },
  {
    politician: 'Ro Khanna',
    party: 'D',
    state: 'CA',
    chamber: 'House',
    ticker: 'AAPL',
    company: 'Apple',
    tradeType: 'Sell',
    amount: '$50K–$100K',
    date: '2025-02-12',
    committees: ['Armed Services', 'Oversight'],
    relevance: 'Represents Silicon Valley district. Close relationships with tech executives but limited direct oversight.',
    confidence: 'Low',
    explanation: 'While Khanna represents a district home to many tech workers, his committee assignments (Armed Services, Oversight) don\'t directly regulate Apple. This may be portfolio rebalancing rather than an information-driven trade. Low confidence in insider knowledge.',
  },
];

const partyColor = {
  R: 'text-negative',
  D: 'text-blue-400',
  I: 'text-muted-foreground',
};

const partyBg = {
  R: 'bg-negative/10',
  D: 'bg-blue-400/10',
  I: 'bg-muted/30',
};

const confidenceConfig = {
  High: { icon: ShieldCheck, color: 'text-positive', bg: 'bg-positive/10', label: 'High Relevance' },
  Medium: { icon: ShieldAlert, color: 'text-warning', bg: 'bg-warning/10', label: 'Medium Relevance' },
  Low: { icon: AlertTriangle, color: 'text-muted-foreground', bg: 'bg-muted/30', label: 'Low Relevance' },
};

interface Props {
  onAnalyse?: (symbol: string) => void;
}

export default function CongressTrades({ onAnalyse }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [filter, setFilter] = useState<'all' | 'High' | 'Medium' | 'Low'>('all');
  const [expandedTrade, setExpandedTrade] = useState<number | null>(null);

  const filtered = filter === 'all'
    ? CONGRESS_TRADES
    : CONGRESS_TRADES.filter(t => t.confidence === filter);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-warning" />
          <h3 className="text-sm font-semibold text-foreground">Congress Trades</h3>
          <span className="text-[10px] text-muted-foreground">US Politicians</span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-3">
          {/* Explainer */}
          <div className="bg-muted/30 rounded-lg p-3 space-y-1">
            <div className="flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-[11px] text-foreground font-medium">Why track Congress trades?</p>
                <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">
                  US politicians often sit on committees that directly regulate the industries they invest in.
                  A defence committee member buying Lockheed Martin may have insights from classified briefings.
                  We rate each trade's relevance based on how directly the politician's committee role connects to the company.
                </p>
              </div>
            </div>
          </div>

          {/* Confidence filter */}
          <div className="flex gap-1 flex-wrap">
            {(['all', 'High', 'Medium', 'Low'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${
                  filter === f
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:text-foreground bg-muted/30'
                }`}
              >
                {f === 'all' ? 'All Trades' : `${f} Relevance`}
              </button>
            ))}
          </div>

          {/* Trade list */}
          <div className="space-y-2">
            {filtered.map((trade, i) => {
              const conf = confidenceConfig[trade.confidence];
              const ConfIcon = conf.icon;
              const isExpanded = expandedTrade === i;

              return (
                <div key={`${trade.politician}-${trade.ticker}-${i}`} className="border border-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedTrade(isExpanded ? null : i)}
                    className="w-full p-3 text-left hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-xs font-semibold ${partyColor[trade.party]}`}>
                        {trade.politician}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${partyBg[trade.party]} ${partyColor[trade.party]}`}>
                        {trade.party}-{trade.state}
                      </span>
                      <span className="text-[9px] text-muted-foreground">{trade.chamber}</span>
                      <span className="ml-auto flex items-center gap-1">
                        <ConfIcon className={`w-3 h-3 ${conf.color}`} />
                        <span className={`text-[9px] font-medium ${conf.color}`}>{conf.label}</span>
                      </span>
                    </div>

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

                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-2 border-t border-border/50 pt-2">
                      {/* Committee connection */}
                      <div>
                        <span className="text-[10px] font-semibold text-foreground">Committee Connection</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {trade.committees.map(c => (
                            <span key={c} className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Detailed explanation */}
                      <div>
                        <span className="text-[10px] font-semibold text-foreground">Why This Trade Matters</span>
                        <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
                          {trade.explanation}
                        </p>
                      </div>

                      {/* Action */}
                      {onAnalyse && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onAnalyse(trade.ticker);
                          }}
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
              Data sourced from public congressional financial disclosures. Trades shown are illustrative of the types of analysis available.
              These trades are <strong>informational only</strong> and are not factored into buy/sell signals or forecasts. Always verify with official sources.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
