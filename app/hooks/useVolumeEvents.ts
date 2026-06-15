// app/hooks/useVolumeEvents.ts
// Location: latise/app/hooks/useVolumeEvents.ts
//
// Key changes:
//   - staleTime raised to 10 minutes (events are cached server-side too)
//   - refetchInterval removed — don't auto-poll events
//   - retry: 1 (not 2) — fewer retries = fewer wasted CUs on failure
//   - Accepts optional `enabled` flag so transactions page can lazy-load
//   - buildDailyVolume is now sync (no extra getBlockNumber call)

"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAllWrapperEvents, buildDailyVolume } from "@/app/lib/events";
import { INTERVALS } from "@/app/lib/constants";
import type { Network, EnrichedPair, DailyVolume } from "@/app/types";

export function useVolumeEvents(
  pairs: EnrichedPair[],
  network: Network,
  options: { enabled?: boolean } = {}
) {
  const enabled = options.enabled !== false && pairs.length > 0;

  return useQuery({
    queryKey: ["events", "all", network, pairs.map((p) => p.wrapperAddress).join(",")],
    queryFn: async () => {
      const { wrapEvents, unwrapEvents } = await fetchAllWrapperEvents(pairs, network);

      const dailyByPair = pairs
        .filter((p) => p.isValid)
        .map((pair) => ({
          pair,
          daily: buildDailyVolume(wrapEvents, unwrapEvents, pair, network),
        }));

      return { wrapEvents, unwrapEvents, dailyByPair };
    },
    enabled,
    staleTime: INTERVALS.VOLUME_CACHE_MS,
    // No refetchInterval — events don't change rapidly, and polling is expensive
    gcTime: INTERVALS.VOLUME_CACHE_MS,
    retry: 1,
    retryDelay: 5_000,
  });
}

export function usePairVolume(
  wrapperAddress: `0x${string}` | undefined,
  pairs: EnrichedPair[],
  network: Network
): DailyVolume[] {
  const { data } = useVolumeEvents(pairs, network);
  if (!data || !wrapperAddress) return [];
  const entry = data.dailyByPair.find(
    (d) => d.pair.wrapperAddress.toLowerCase() === wrapperAddress.toLowerCase()
  );
  return entry?.daily ?? [];
}