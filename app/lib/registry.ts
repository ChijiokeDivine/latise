// lib/registry.ts
// Location: latise/lib/registry.ts
// All functions for reading from the ConfidentialTokenWrappersRegistry contract.
//
// Rules enforced here (from RULES.md):
//   R-1: Call getTokenConfidentialTokenPairs() to get all pairs in one call.
//   R-2: Always include isValid in the returned data — UI uses it for badges.
//   R-3: Batch metadata (name, symbol, decimals) via multicall — not individual calls.
//   R-5: This data is cached by TanStack Query at the hook layer (staleTime: 60s).

import { REGISTRY_ABI } from "@/app/lib/abis/registry.abi";
import { ERC20_ABI } from "@/app/lib/abis/erc20.abi";
import { WRAPPER_ABI } from "@/app/lib/abis/wrapper.abi";
import { REGISTRY_ADDRESS, SEPOLIA_MOCK_TOKENS } from "@/app/lib/constants";
import { getPublicClient } from "@/app/lib/clients";
import type { Network, TokenWrapperPair, EnrichedPair } from "@/app/types";

// ─── Raw registry fetch ───────────────────────────────────────────────────────

/**
 * Fetches the raw list of token pairs from the registry contract.
 * Returns both valid and revoked pairs — the UI decides how to display them.
 */
export async function fetchRawPairs(
  network: Network
): Promise<TokenWrapperPair[]> {
  const client = getPublicClient(network);

  const pairs = await client.readContract({
    address: REGISTRY_ADDRESS[network],
    abi: REGISTRY_ABI,
    functionName: "getTokenConfidentialTokenPairs",
  });

  // Cast to our typed interface
  return (pairs as Array<{
    tokenAddress: `0x${string}`;
    confidentialTokenAddress: `0x${string}`;
    isValid: boolean;
  }>).map((p) => ({
    tokenAddress: p.tokenAddress,
    confidentialTokenAddress: p.confidentialTokenAddress,
    isValid: p.isValid,
  }));
}

// ─── Enriched pairs fetch ─────────────────────────────────────────────────────

/**
 * Fetches all pairs from the registry and enriches each one with:
 *   - ERC-20 name, symbol, decimals (from the underlying token)
 *   - Wrapper name, symbol, decimals, rate (from the wrapper contract)
 *   - isMock flag (Sepolia mock tokens have a public mint)
 *
 * Uses multicall to batch all contract reads into as few RPC calls as possible.
 * Rule P-1: All batched reads go through multicall.
 */
export async function fetchEnrichedPairs(
  network: Network
): Promise<EnrichedPair[]> {
  const client = getPublicClient(network);

  // Step 1: Get raw pairs
  const rawPairs = await fetchRawPairs(network);

  if (rawPairs.length === 0) return [];

  // Step 2: Build a flat multicall contract list.
  // For each pair we need 7 reads:
  //   [0] underlying.name()
  //   [1] underlying.symbol()
  //   [2] underlying.decimals()
  //   [3] wrapper.name()
  //   [4] wrapper.symbol()
  //   [5] wrapper.decimals()
  //   [6] wrapper.rate()
  const contracts = rawPairs.flatMap((pair) => [
    {
      address: pair.tokenAddress,
      abi: ERC20_ABI,
      functionName: "name" as const,
    },
    {
      address: pair.tokenAddress,
      abi: ERC20_ABI,
      functionName: "symbol" as const,
    },
    {
      address: pair.tokenAddress,
      abi: ERC20_ABI,
      functionName: "decimals" as const,
    },
    {
      address: pair.confidentialTokenAddress,
      abi: WRAPPER_ABI,
      functionName: "name" as const,
    },
    {
      address: pair.confidentialTokenAddress,
      abi: WRAPPER_ABI,
      functionName: "symbol" as const,
    },
    {
      address: pair.confidentialTokenAddress,
      abi: WRAPPER_ABI,
      functionName: "decimals" as const,
    },
    {
      address: pair.confidentialTokenAddress,
      abi: WRAPPER_ABI,
      functionName: "rate" as const,
    },
  ]);

  // Step 3: Execute the multicall. allowFailure:true means a bad pair
  // won't blow up the whole request — we'll skip failed pairs.
  const results = await client.multicall({
    contracts,
    allowFailure: true,
  });

  // Step 4: Resolve the set of mock wrapper addresses for this network
  const mockAddressSet =
    network === "sepolia"
      ? new Set(
          SEPOLIA_MOCK_TOKENS.map((t) => t.wrapperAddress.toLowerCase())
        )
      : new Set<string>();

  // Step 5: Zip multicall results back onto pairs
  const enriched: EnrichedPair[] = [];

  for (let i = 0; i < rawPairs.length; i++) {
    const pair = rawPairs[i];
    const base = i * 7;

    const tokenName = results[base].status === "success"
      ? (results[base].result as string)
      : "Unknown";
    const tokenSymbol = results[base + 1].status === "success"
      ? (results[base + 1].result as string)
      : "???";
    const tokenDecimals = results[base + 2].status === "success"
      ? (results[base + 2].result as number)
      : 18;
    const wrapperName = results[base + 3].status === "success"
      ? (results[base + 3].result as string)
      : "Unknown";
    const wrapperSymbol = results[base + 4].status === "success"
      ? (results[base + 4].result as string)
      : "???";
    const wrapperDecimals = results[base + 5].status === "success"
      ? (results[base + 5].result as number)
      : 6;
    const rate = results[base + 6].status === "success"
      ? (results[base + 6].result as bigint)
      : 1n;

    enriched.push({
      tokenAddress: pair.tokenAddress,
      wrapperAddress: pair.confidentialTokenAddress,
      isValid: pair.isValid,
      tokenName,
      tokenSymbol,
      tokenDecimals,
      wrapperName,
      wrapperSymbol,
      wrapperDecimals,
      rate,
      isMock: mockAddressSet.has(
        pair.confidentialTokenAddress.toLowerCase()
      ),
    });
  }

  return enriched;
}

// ─── Single pair lookup ───────────────────────────────────────────────────────

/**
 * Looks up a single enriched pair by wrapper address.
 * Used by the wrap/unwrap page which receives the wrapperAddress from the URL.
 */
export async function fetchPairByWrapper(
  wrapperAddress: `0x${string}`,
  network: Network
): Promise<EnrichedPair | null> {
  const pairs = await fetchEnrichedPairs(network);
  return (
    pairs.find(
      (p) => p.wrapperAddress.toLowerCase() === wrapperAddress.toLowerCase()
    ) ?? null
  );
}

/**
 * Looks up a single enriched pair by underlying ERC-20 address.
 */
export async function fetchPairByToken(
  tokenAddress: `0x${string}`,
  network: Network
): Promise<EnrichedPair | null> {
  const pairs = await fetchEnrichedPairs(network);
  return (
    pairs.find(
      (p) => p.tokenAddress.toLowerCase() === tokenAddress.toLowerCase()
    ) ?? null
  );
}