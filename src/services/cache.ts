interface CacheEntry {
  data: unknown;
  timestamp: number;
}

export function getCached<T>(key: string, ttlMs: number): T | null {
  try {
    const raw = localStorage.getItem(`sf_cache_${key}`);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > ttlMs) {
      localStorage.removeItem(`sf_cache_${key}`);
      return null;
    }
    return entry.data as T;
  } catch {
    return null;
  }
}

export function setCache(key: string, data: unknown): void {
  try {
    const entry: CacheEntry = { data, timestamp: Date.now() };
    localStorage.setItem(`sf_cache_${key}`, JSON.stringify(entry));
  } catch {
    // localStorage full — ignore
  }
}

/** Clear all sf_cache_ entries from localStorage */
export function clearAllCache(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('sf_cache_')) keysToRemove.push(key);
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
}
