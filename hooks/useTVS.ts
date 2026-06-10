// hooks/useTVS.ts
// Location: latise/hooks/useTVS.ts
// TanStack Query hook for Total Value Shielded data.
// Refreshes every 30 seconds (INTERVALS.TVS_REFRESH_MS).
//
// TVS data flow:
//   1. useRegistry fetches all enriched pairs
//   2. useTVS reads nonConfidentialTotalSupply() + rate() via multicall
//   3. fetchTokenPrices() fetches USD prices from CoinGecko
//   4. Result is a ranked list + total USD TVS

"use client";

import { useQuery } from "@tanstack/react-query";
import { useRegistry } from "@/hooks/useRegistry";
import { fetchAggregatedTVS } from "@/lib/wrapper";
import { INTERVALS } from "@/lib/constants";
import type { Network, AggregatedTVS } from "@/types";

/**
 * Fetches and caches TVS data for all valid pairs on the given network.
 * Depends on the registry query — waits for pairs before fetching TVS.
 */
export function useTVS(network: Network) {
  const { data: pairs, isSuccess: pairsReady } = useRegistry(network);

  return useQuery<AggregatedTVS, Error>({
    queryKey: ["tvs", network],
    queryFn: () => fetchAggregatedTVS(pairs ?? [], network),
    // Only run when pairs are loaded — no point fetching TVS without addresses
    enabled: pairsReady && (pairs?.length ?? 0) > 0,
    staleTime: INTERVALS.TVS_REFRESH_MS,
    refetchInterval: INTERVALS.TVS_REFRESH_MS,
    retry: 2,
  });
}