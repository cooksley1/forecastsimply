import { AlertTriangle } from 'lucide-react';
import { useDataFreshness } from '@/hooks/useDataFreshness';

function formatRunTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Full-width notice across the top of the app, shown whenever the analysis
 * pipeline hasn't run recently or the backend can't be reached.
 */
export default function StaleDataBanner() {
  const { stale, checking, offline, lastUpdated } = useDataFreshness();

  if (checking || !stale) return null;

  const lastRun = lastUpdated ? formatRunTime(lastUpdated) : '';

  return (
    <div role="status" className="w-full border-b border-warning/40 bg-warning/10 px-3 py-1.5">
      <p className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-1 text-center text-[11px] sm:text-xs font-medium text-warning">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        <span>
          {offline
            ? 'Data updates are paused — prices and analysis shown here may be out of date.'
            : `Data updates are paused${lastRun ? ` — last updated ${lastRun}` : ''} and may be out of date.`}
        </span>
      </p>
    </div>
  );
}
