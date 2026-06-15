// app/lib/cache.ts
// Location: latise/app/lib/cache.ts
//
// Lightweight server-side in-memory cache for RPC data.
// Lives in the Node.js process — survives across requests in the same instance.
// Avoids hammering Alchemy on every page visit.
//
// TTLs:
//   registry pairs    → 5 minutes  (changes rarely)
//   wrapper metadata  → 5 minutes
//   event logs        → 10 minutes (expensive queries)
//   prices            → 60 seconds
//
// The cache is keyed by a string — typically `${fn}:${network}` or similar.

interface CacheEntry<T> {
  value: T;
  expiresAt: number; // unix ms
}

const store = new Map<string, CacheEntry<unknown>>();

export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value as T;
}

export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

/** Fetch-or-compute: returns cached value or runs fn() and caches result. */
export async function cacheWrap<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>
): Promise<T> {
  const cached = cacheGet<T>(key);
  if (cached !== null) return cached;
  const value = await fn();
  cacheSet(key, value, ttlMs);
  return value;
}

export const CACHE_TTL = {
  REGISTRY:  5 * 60 * 1000,   // 5 min
  EVENTS:    10 * 60 * 1000,  // 10 min
  PRICES:    60 * 1000,        // 60 sec
  METADATA:  5 * 60 * 1000,   // 5 min
  TVS:       2 * 60 * 1000,   // 2 min
} as const;