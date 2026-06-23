// app/hooks/useTransactionHistory.ts
// Personal transaction history — fetches on-chain events filtered by connected wallet.
"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchPersonalEvents } from "@/app/lib/events";
import type { Network, EnrichedPair } from "@/app/types";
import type { PersonalTxEvent } from "@/app/lib/events";

export { type PersonalTxEvent };

export function useTransactionHistory(
  pairs: EnrichedPair[],
  userAddress: `0x${string}` | undefined,
  network: Network,
  options: { enabled?: boolean } = {}
) {
  const enabled = (options.enabled !== false) && pairs.length > 0 && !!userAddress;

  return useQuery({
    queryKey: ["txHistory", network, userAddress, pairs.map((p) => p.wrapperAddress).join(",")],
    queryFn: async () => {
      if (!userAddress) return [];
      return fetchPersonalEvents(pairs, userAddress, network);
    },
    enabled,
    staleTime: 60_000,       // 1 min
    gcTime: 5 * 60 * 1000,   // 5 min
    retry: 2,
    retryDelay: 3_000,
  });
}
