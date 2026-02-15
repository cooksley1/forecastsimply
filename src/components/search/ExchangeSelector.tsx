import { useState, useRef, useEffect } from 'react';

export interface Exchange {
  id: string;
  label: string;
  flag: string;
}

export const STOCK_EXCHANGES: Exchange[] = [
  { id: 'ALL', label: 'All', flag: '🌐' },
  { id: 'US', label: 'US', flag: '🇺🇸' },
  { id: 'ASX', label: 'ASX', flag: '🇦🇺' },
  { id: 'LSE', label: 'London', flag: '🇬🇧' },
  { id: 'TSE', label: 'Toronto', flag: '🇨🇦' },
  { id: 'XETRA', label: 'Frankfurt', flag: '🇩🇪' },
  { id: 'HKSE', label: 'Hong Kong', flag: '🇭🇰' },
  { id: 'JPX', label: 'Tokyo', flag: '🇯🇵' },
];

export const ETF_EXCHANGES: Exchange[] = [
  { id: 'ALL', label: 'All', flag: '🌐' },
  { id: 'US', label: 'US', flag: '🇺🇸' },
  { id: 'ASX', label: 'ASX', flag: '🇦🇺' },
  { id: 'LSE', label: 'London', flag: '🇬🇧' },
];

interface Props {
  exchanges: Exchange[];
  selected: string;
  onSelect: (id: string) => void;
}

export default function ExchangeSelector({ exchanges, selected, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = exchanges.find(e => e.id === selected) || exchanges[0];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sf-elevated border border-border text-xs font-medium text-foreground hover:border-primary/40 transition-all"
      >
        <span>{current.flag}</span>
        <span>{current.label}</span>
        <svg className="w-3 h-3 text-muted-foreground" fill="none" viewBox="0 0 10 6">
          <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 4 4 4-4" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 mt-1 z-50 min-w-[10rem] bg-card border border-border rounded-xl shadow-xl overflow-hidden">
          {exchanges.map(ex => (
            <button
              key={ex.id}
              onClick={() => { onSelect(ex.id); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors ${
                selected === ex.id
                  ? 'bg-primary/15 text-primary'
                  : 'text-foreground hover:bg-secondary'
              }`}
            >
              <span>{ex.flag}</span>
              <span>{ex.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
