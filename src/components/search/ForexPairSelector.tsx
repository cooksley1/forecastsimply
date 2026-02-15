import { useState } from 'react';

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', flag: '🇬🇧' },
  { code: 'AUD', name: 'Australian Dollar', flag: '🇦🇺' },
  { code: 'CAD', name: 'Canadian Dollar', flag: '🇨🇦' },
  { code: 'JPY', name: 'Japanese Yen', flag: '🇯🇵' },
  { code: 'CHF', name: 'Swiss Franc', flag: '🇨🇭' },
  { code: 'NZD', name: 'New Zealand Dollar', flag: '🇳🇿' },
  { code: 'CNY', name: 'Chinese Yuan', flag: '🇨🇳' },
  { code: 'SEK', name: 'Swedish Krona', flag: '🇸🇪' },
  { code: 'NOK', name: 'Norwegian Krone', flag: '🇳🇴' },
  { code: 'SGD', name: 'Singapore Dollar', flag: '🇸🇬' },
  { code: 'HKD', name: 'Hong Kong Dollar', flag: '🇭🇰' },
  { code: 'KRW', name: 'South Korean Won', flag: '🇰🇷' },
  { code: 'INR', name: 'Indian Rupee', flag: '🇮🇳' },
  { code: 'MXN', name: 'Mexican Peso', flag: '🇲🇽' },
  { code: 'ZAR', name: 'South African Rand', flag: '🇿🇦' },
  { code: 'BRL', name: 'Brazilian Real', flag: '🇧🇷' },
  { code: 'TRY', name: 'Turkish Lira', flag: '🇹🇷' },
  { code: 'PLN', name: 'Polish Zloty', flag: '🇵🇱' },
  { code: 'THB', name: 'Thai Baht', flag: '🇹🇭' },
  { code: 'IDR', name: 'Indonesian Rupiah', flag: '🇮🇩' },
  { code: 'PHP', name: 'Philippine Peso', flag: '🇵🇭' },
  { code: 'CZK', name: 'Czech Koruna', flag: '🇨🇿' },
  { code: 'DKK', name: 'Danish Krone', flag: '🇩🇰' },
  { code: 'HUF', name: 'Hungarian Forint', flag: '🇭🇺' },
  { code: 'ILS', name: 'Israeli Shekel', flag: '🇮🇱' },
  { code: 'MYR', name: 'Malaysian Ringgit', flag: '🇲🇾' },
];

interface Props {
  onAnalyse: (pairId: string) => void;
  loading?: boolean;
}

export default function ForexPairSelector({ onAnalyse, loading }: Props) {
  const [base, setBase] = useState('AUD');
  const [quote, setQuote] = useState('USD');
  const [baseOpen, setBaseOpen] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);

  const swap = () => {
    setBase(quote);
    setQuote(base);
  };

  const handleAnalyse = () => {
    if (base !== quote) {
      onAnalyse(`${base}${quote}`);
    }
  };

  const getCurrency = (code: string) => CURRENCIES.find(c => c.code === code);

  const renderDropdown = (
    selected: string,
    setSelected: (code: string) => void,
    isOpen: boolean,
    setOpen: (open: boolean) => void,
    excludeCode: string,
    label: string
  ) => {
    const cur = getCurrency(selected);
    return (
      <div className="relative flex-1">
        <label className="text-[9px] text-muted-foreground font-mono uppercase mb-1 block">{label}</label>
        <button
          onClick={() => { setOpen(!isOpen); }}
          className="w-full flex items-center gap-2 px-3 py-2 bg-sf-inset border border-border rounded-lg text-sm font-mono text-foreground hover:border-primary/40 transition-all"
        >
          <span className="text-base">{cur?.flag}</span>
          <span className="font-semibold">{selected}</span>
          <span className="text-muted-foreground text-xs truncate hidden sm:inline">{cur?.name}</span>
          <svg className={`w-3 h-3 ml-auto text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 10 6">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 4 4 4-4"/>
          </svg>
        </button>
        {isOpen && (
          <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto bg-card border border-border rounded-lg shadow-xl">
            {CURRENCIES.filter(c => c.code !== excludeCode).map(c => (
              <button
                key={c.code}
                onClick={() => { setSelected(c.code); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-mono hover:bg-muted/50 transition-colors ${
                  c.code === selected ? 'bg-primary/10 text-primary' : 'text-foreground'
                }`}
              >
                <span>{c.flag}</span>
                <span className="font-semibold">{c.code}</span>
                <span className="text-muted-foreground truncate">{c.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-sf-card border border-border rounded-xl p-3 space-y-2">
      <span className="text-[10px] text-muted-foreground font-mono uppercase">Build Forex Pair</span>
      <div className="flex items-end gap-2">
        {renderDropdown(base, setBase, baseOpen, setBaseOpen, quote, 'Base')}
        <button
          onClick={swap}
          className="px-2 py-2 mb-0.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all text-sm"
          title="Swap currencies"
        >
          ⇄
        </button>
        {renderDropdown(quote, setQuote, quoteOpen, setQuoteOpen, base, 'Quote')}
        <button
          onClick={handleAnalyse}
          disabled={loading || base === quote}
          className="px-4 py-2 mb-0.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 transition-all whitespace-nowrap"
        >
          Analyse
        </button>
      </div>
    </div>
  );
}
