import { useState, type KeyboardEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { clearAllCache } from '@/services/cache';

interface Props {
  onSearch: (query: string) => void;
  placeholder?: string;
  loading?: boolean;
}

export default function SearchBar({ onSearch, placeholder = 'Search...', loading }: Props) {
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const handleSearch = () => {
    if (query.trim()) onSearch(query.trim());
  };

  const handleKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    clearAllCache();
    await queryClient.invalidateQueries();
    setTimeout(() => setRefreshing(false), 1200);
  };

  return (
    <div className="flex gap-1.5 sm:gap-2">
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={handleKey}
        placeholder={placeholder}
        className="flex-1 min-w-0 bg-sf-inset border border-border rounded-lg px-3 py-2.5 text-foreground text-xs sm:text-sm font-mono placeholder:text-muted-foreground placeholder:text-[10px] sm:placeholder:text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all"
      />
      <button
        onClick={handleSearch}
        disabled={loading || !query.trim()}
        className="px-3 sm:px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs sm:text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0"
      >
        {loading ? (
          <span className="animate-pulse-glow">Analysing…</span>
        ) : (
          '🔍 Analyse'
        )}
      </button>
      <button
        onClick={handleRefresh}
        disabled={refreshing}
        className={`p-2.5 rounded-lg border transition-all text-sm shrink-0 ${
          refreshing
            ? 'border-primary/30 bg-primary/10 text-primary'
            : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/50'
        }`}
        title="Refresh all data"
      >
        <span className={refreshing ? 'inline-block animate-spin' : ''}>🔄</span>
      </button>
    </div>
  );
}
