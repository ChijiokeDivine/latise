// app/hooks/useTVS.ts
// Location: latise/app/hooks/useTVS.ts
//
// Fetches nonConfidentialTotalSupply() for all wrappers.
// Returns token amounts only — never USD (individual balances are private on Zama).

"use client";

import { useQuery } from "@tanstack/react-query";
import { useRegistry } from "@/app/hooks/useRegistry";
import { fetchAggregatedShieldedSupply } from "@/app/lib/wrapper";
import { INTERVALS } from "@/app/lib/constants";
import type { Network, AggregatedShieldedSupply } from "@/app/types";

export function useShieldedSupply(network: Network) {
  const { data: pairs, isSuccess: pairsReady } = useRegistry(network);

  return useQuery<AggregatedShieldedSupply, Error>({
    queryKey: ["shieldedSupply", network],
    queryFn: () => fetchAggregatedShieldedSupply(pairs ?? [], network),
    enabled: pairsReady && (pairs?.length ?? 0) > 0,
    staleTime: INTERVALS.VOLUME_CACHE_MS, // 10 min — supply changes slowly
    // No refetchInterval — reduces RPC calls
    retry: 2,
    retryDelay: (attempt) => Math.min(3_000 * 2 ** attempt, 30_000),
  });
}

// Legacy alias so existing imports don't break
export const useTVS = useShieldedSupply;