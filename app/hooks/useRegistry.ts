// app/hooks/useRegistry.ts
// Location: latise/app/hooks/useRegistry.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchEnrichedPairs, fetchPairByWrapper } from "@/app/lib/registry";
import { INTERVALS } from "@/app/lib/constants";
import type { Network, EnrichedPair } from "@/app/types";

export function useRegistry(network: Network) {
  return useQuery<EnrichedPair[], Error>({
    queryKey: ["registry", network],
    queryFn: () => fetchEnrichedPairs(network),
    staleTime: INTERVALS.REGISTRY_REFRESH_MS,      // 5 min
    gcTime: INTERVALS.REGISTRY_REFRESH_MS * 2,     // 10 min
    // No refetchInterval — registry rarely changes; user can manually refresh
    retry: 3,
    retryDelay: (attempt) => Math.min(3_000 * 2 ** attempt, 30_000), // 3s, 6s, 12s
  });
}

export function useRegistryPair(
  wrapperAddress: `0x${string}` | undefined,
  network: Network
) {
  return useQuery<EnrichedPair | null, Error>({
    queryKey: ["registryPair", wrapperAddress, network],
    queryFn: () => fetchPairByWrapper(wrapperAddress as `0x${string}`, network),
    enabled: !!wrapperAddress,
    staleTime: INTERVALS.REGISTRY_REFRESH_MS,
    gcTime: INTERVALS.REGISTRY_REFRESH_MS * 2,
    retry: 3,
    retryDelay: (attempt) => Math.min(3_000 * 2 ** attempt, 30_000),
  });
}

export function useValidPairs(network: Network) {
  const query = useRegistry(network);
  return { ...query, data: query.data?.filter((p) => p.isValid) ?? [] };
}