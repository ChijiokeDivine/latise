// hooks/useTokenBalances.ts
// Location: latise/hooks/useTokenBalances.ts
// Fetches both the underlying ERC-20 balance and the confidential cToken balance.
//
// Rules enforced here:
//   B-1: Use Zama React SDK hooks for confidential balance — never raw readContract.
//   B-2: The first call prompts an EIP-712 wallet signature. This is expected.
//   B-4: Always return both balances side by side.
//   W-6: balanceOf() on the wrapper returns euint64 — only SDK can decrypt it.

"use client";

import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { fetchUnderlyingBalanceAndAllowance } from "../lib/wrapper";
import { INTERVALS } from "../lib/constants";
import { useFHEBridgeContext } from "../providers/FHEBridgeProvider";
import type { Network, EnrichedPair, TokenBalances } from "@/app/types";

/**
 * Fetches both balances for the connected wallet on a specific pair.
 *
 * - underlyingBalance: standard ERC-20 balanceOf (readable directly)
 * - confidentialBalance: decrypted via Zama SDK (requires EIP-712 signature)
 *
 * confidentialBalance is undefined until the user has signed the decrypt request.
 */
export function useTokenBalances(
  pair: EnrichedPair | null | undefined,
  network: Network
) {
  const { address: userAddress } = useAccount();
  const { getConfidentialBalance, isReady } = useFHEBridgeContext();

  // ── Underlying ERC-20 balance ─────────────────────────────────────────────
  const underlyingQuery = useQuery<
    { balance: bigint; allowance: bigint },
    Error
  >({
    queryKey: [
      "balances",
      "underlying",
      userAddress,
      pair?.tokenAddress,
      network,
    ],
    queryFn: () =>
      fetchUnderlyingBalanceAndAllowance(
        pair!.tokenAddress,
        userAddress!,
        pair!.wrapperAddress,
        network
      ),
    enabled: !!pair && !!userAddress,
    staleTime: INTERVALS.BALANCE_REFRESH_MS,
    refetchInterval: INTERVALS.BALANCE_REFRESH_MS,
    retry: 2,
  });

  // ── Confidential cToken balance via FHE Bridge ──────────────────────────────
  const confidentialQuery = useQuery({
    queryKey: [
      "balances",
      "confidential",
      userAddress,
      pair?.wrapperAddress,
      network,
    ],
    queryFn: async () => {
      if (!pair?.wrapperAddress) throw new Error("No wrapper address");
      const result = await getConfidentialBalance(pair.wrapperAddress as `0x${string}`);
      return result.data !== undefined ? BigInt(result.data) : undefined;
    },
    enabled: !!pair && !!userAddress && isReady,
    staleTime: INTERVALS.BALANCE_REFRESH_MS,
    refetchInterval: INTERVALS.BALANCE_REFRESH_MS,
    retry: 2,
  });

  // ── Combined return ───────────────────────────────────────────────────────
  const balances: TokenBalances | undefined =
    underlyingQuery.data
      ? {
          underlyingBalance: underlyingQuery.data.balance,
          underlyingDecimals: pair?.tokenDecimals ?? 18,
          confidentialBalance: confidentialQuery.data,
          wrapperDecimals: pair?.wrapperDecimals ?? 6,
        }
      : undefined;

  return {
    balances,
    allowance: underlyingQuery.data?.allowance,
    isLoadingUnderlying: underlyingQuery.isLoading,
    isDecrypting: confidentialQuery.isLoading,
    isLoading: underlyingQuery.isLoading || confidentialQuery.isLoading,
    underlyingError: underlyingQuery.error,
    decryptError: confidentialQuery.error,
    refetch: () => {
      underlyingQuery.refetch();
      confidentialQuery.refetch();
    },
  };
}