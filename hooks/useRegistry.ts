// hooks/useRegistry.ts
// Location: latise/hooks/useRegistry.ts
// TanStack Query hook for fetching all enriched registry pairs.
// Cached for INTERVALS.REGISTRY_REFRESH_MS (60s) — registry changes rarely.
//
// Rule ST-1: Use TanStack Query for ALL blockchain data fetching.
// Rule R-1: getTokenConfidentialTokenPairs() gets all pairs in one call.

"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchEnrichedPairs, fetchPairByWrapper } from "@/lib/registry";
import { INTERVALS } from "@/lib/constants";
import type { Network, EnrichedPair } from "@/types";

// ─── All pairs ────────────────────────────────────────────────────────────────

/**
 * Fetches and caches all enriched token pairs from the registry.
 * Re-fetches every 60 seconds.
 */
export function useRegistry(network: Network) {
  return useQuery<EnrichedPair[], Error>({
    queryKey: ["registry", network],
    queryFn: () => fetchEnrichedPairs(network),
    staleTime: INTERVALS.REGISTRY_REFRESH_MS,
    refetchInterval: INTERVALS.REGISTRY_REFRESH_MS,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
  });
}

// ─── Single pair by wrapper address ──────────────────────────────────────────

/**
 * Fetches a single enriched pair by wrapper address.
 * Used by the wrap/[wrapperAddress] page.
 */
export function useRegistryPair(
  wrapperAddress: `0x${string}` | undefined,
  network: Network
) {
  return useQuery<EnrichedPair | null, Error>({
    queryKey: ["registryPair", wrapperAddress, network],
    queryFn: () =>
      fetchPairByWrapper(wrapperAddress as `0x${string}`, network),
    enabled: !!wrapperAddress,
    staleTime: INTERVALS.REGISTRY_REFRESH_MS,
    retry: 3,
  });
}

// ─── Derived selectors ────────────────────────────────────────────────────────

/**
 * Returns only valid (non-revoked) pairs from the registry.
 */
export function useValidPairs(network: Network) {
  const query = useRegistry(network);
  return {
    ...query,
    data: query.data?.filter((p) => p.isValid) ?? [],
  };
}

/**
 * Returns only revoked pairs.
 */
export function useRevokedPairs(network: Network) {
  const query = useRegistry(network);
  return {
    ...query,
    data: query.data?.filter((p) => !p.isValid) ?? [],
  };
}