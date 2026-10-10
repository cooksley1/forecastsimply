/**
 * Data freshness rule.
 *
 * The analysis pipeline runs once per day per asset class. 36 hours gives a
 * daily run a comfortable overrun before we start warning people that what
 * they're looking at is no longer current.
 */
export const STALE_AFTER_MS = 36 * 60 * 60 * 1000;

/**
 * Should the app warn the user that the data on screen may be out of date?
 *
 * - Backend unreachable (paused or offline) -> stale, we can't refresh anything.
 * - No recorded analysis run -> stale, there is nothing current to trust.
 * - Last run older than STALE_AFTER_MS -> stale.
 */
export function isDataStale(
  lastUpdated: string | null,
  offline: boolean,
  now: number = Date.now(),
): boolean {
  if (offline) return true;
  if (!lastUpdated) return true;

  const ts = new Date(lastUpdated).getTime();
  if (Number.isNaN(ts)) return true;

  return now - ts > STALE_AFTER_MS;
}
