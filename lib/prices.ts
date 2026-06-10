// lib/prices.ts
// Location: latise/lib/prices.ts
// Fetches USD prices from CoinGecko's free API.
// Uses a simple in-memory cache (per process) to avoid hammering the API.
// Cache TTL = INTERVALS.PRICE_CACHE_MS (60 seconds).
//
// For tokens not listed on CoinGecko (BRON, ZAMA), returns null.
// Rule: NEVER show $0 for an unknown price — return null and let the UI
// show the token amount only.

import { INTERVALS } from "@/lib/constants";

// ─── In-memory cache ──────────────────────────────────────────────────────────

interface CacheEntry {
  price: number;
  fetchedAt: number;
}

const priceCache = new Map<string, CacheEntry>();

function isCacheValid(entry: CacheEntry): boolean {
  return Date.now() - entry.fetchedAt < INTERVALS.PRICE_CACHE_MS;
}

// ─── CoinGecko fetch ──────────────────────────────────────────────────────────

/**
 * Fetches USD prices for a list of CoinGecko coin IDs.
 * Returns a Record<geckoId, priceUSD | null>.
 * IDs not found in CoinGecko will have null.
 *
 * Uses the free /simple/price endpoint — no auth required for basic usage.
 * If COINGECKO_API_KEY is set, it's added as a query param for higher limits.
 */
export async function fetchTokenPrices(
  geckoIds: string[]
): Promise<Record<string, number | null>> {
  if (geckoIds.length === 0) return {};

  // Separate cached from uncached IDs
  const result: Record<string, number | null> = {};
  const uncachedIds: string[] = [];

  for (const id of geckoIds) {
    const cached = priceCache.get(id);
    if (cached && isCacheValid(cached)) {
      result[id] = cached.price;
    } else {
      uncachedIds.push(id);
    }
  }

  if (uncachedIds.length === 0) return result;

  // Fetch uncached IDs from CoinGecko
  const idsParam = uncachedIds.join(",");
  const apiKey = process.env.COINGECKO_API_KEY;
  const url =
    `https://api.coingecko.com/api/v3/simple/price` +
    `?ids=${idsParam}&vs_currencies=usd` +
    (apiKey ? `&x_cg_demo_api_key=${apiKey}` : "");

  try {
    const res = await fetch(url, {
      // Next.js fetch cache — revalidate every 60 seconds server-side
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      console.error(`[prices] CoinGecko returned ${res.status}`);
      // Return null for all uncached on API error
      for (const id of uncachedIds) result[id] = null;
      return result;
    }

    const data: Record<string, { usd?: number }> = await res.json();

    const now = Date.now();
    for (const id of uncachedIds) {
      const price = data[id]?.usd ?? null;
      result[id] = price;
      if (price !== null) {
        priceCache.set(id, { price, fetchedAt: now });
      }
    }
  } catch (err) {
    console.error("[prices] Failed to fetch from CoinGecko:", err);
    for (const id of uncachedIds) result[id] = null;
  }

  return result;
}

/**
 * Fetches a single token's USD price.
 * Returns null if the token is not listed or the request fails.
 */
export async function fetchTokenPrice(geckoId: string): Promise<number | null> {
  const prices = await fetchTokenPrices([geckoId]);
  return prices[geckoId] ?? null;
}