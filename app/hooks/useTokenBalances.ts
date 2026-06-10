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
import { useConfidentialBalance } from "@zama-fhe/react-sdk";
import { fetchUnderlyingBalanceAndAllowance } from "@/lib/wrapper";
import { INTERVALS } from "@/lib/constants";
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

  // ── Confidential cToken balance via Zama SDK ──────────────────────────────
  // useConfidentialBalance handles EIP-712 signing, decryption, and caching.
  // The first call in a session prompts a wallet signature — this is expected.
  const { data: confidentialBalance, isLoading: isDecrypting, error: decryptError } =
    useConfidentialBalance({
      tokenAddress: (pair?.wrapperAddress as `0x${string}` | undefined)!,
    });

  // ── Combined return ───────────────────────────────────────────────────────
  const balances: TokenBalances | undefined =
    underlyingQuery.data
      ? {
          underlyingBalance: underlyingQuery.data.balance,
          underlyingDecimals: pair?.tokenDecimals ?? 18,
          confidentialBalance:
            confidentialBalance !== undefined
              ? (confidentialBalance as bigint)
              : undefined,
          wrapperDecimals: pair?.wrapperDecimals ?? 6,
        }
      : undefined;

  return {
    balances,
    allowance: underlyingQuery.data?.allowance,
    isLoadingUnderlying: underlyingQuery.isLoading,
    isDecrypting,
    isLoading: underlyingQuery.isLoading,
    underlyingError: underlyingQuery.error,
    decryptError,
    refetch: underlyingQuery.refetch,
  };
}