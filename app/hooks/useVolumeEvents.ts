// hooks/useVolumeEvents.ts
// Location: latise/hooks/useVolumeEvents.ts
// TanStack Query hook for fetching wrap and unwrap volume event data.
// Used by the TVS dashboard volume chart.
//
// Rules enforced (from RULES.md):
//   D-1: Batch queries across all wrappers (via fetchAllWrapperEvents).
//   D-3: Cache event data for 5 minutes (INTERVALS.VOLUME_CACHE_MS).
//   P-4: Parallel fetches inside fetchAllWrapperEvents.

"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAllWrapperEvents, buildDailyVolume } from "@/lib/events";
import { INTERVALS } from "@/lib/constants";
import type { Network, EnrichedPair, DailyVolume } from "@/app/types";

/**
 * Fetches wrap + unwrap events for all valid pairs and returns
 * daily volume data per pair (for the volume chart).
 */
export function useVolumeEvents(pairs: EnrichedPair[], network: Network) {
  return useQuery({
    queryKey: ["events", "all", network, pairs.map((p) => p.wrapperAddress)],
    queryFn: async () => {
      const { wrapEvents, unwrapEvents } = await fetchAllWrapperEvents(
        pairs,
        network
      );

      // Build daily volume per pair
      const dailyByPair = await Promise.all(
        pairs
          .filter((p) => p.isValid)
          .map(async (pair) => ({
            pair,
            daily: await buildDailyVolume(wrapEvents, unwrapEvents, pair, network),
          }))
      );

      return {
        wrapEvents,
        unwrapEvents,
        dailyByPair,
      };
    },
    enabled: pairs.length > 0,
    staleTime: INTERVALS.VOLUME_CACHE_MS,
    refetchInterval: INTERVALS.VOLUME_CACHE_MS,
    retry: 2,
  });
}

/**
 * Returns daily volume for a single wrapper address.
 * Derived from the full useVolumeEvents query — no extra fetch.
 */
export function usePairVolume(
  wrapperAddress: `0x${string}` | undefined,
  pairs: EnrichedPair[],
  network: Network
): DailyVolume[] {
  const { data } = useVolumeEvents(pairs, network);

  if (!data || !wrapperAddress) return [];

  const entry = data.dailyByPair.find(
    (d) =>
      d.pair.wrapperAddress.toLowerCase() === wrapperAddress.toLowerCase()
  );

  return entry?.daily ?? [];
}