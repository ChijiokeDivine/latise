// app/lib/registry.ts
// Location: latise/app/lib/registry.ts
// Registry reads with server-side caching to avoid repeated RPC calls.

import { REGISTRY_ABI } from "@/app/lib/abis/registry.abi";
import { ERC20_ABI } from "@/app/lib/abis/erc20.abi";
import { WRAPPER_ABI } from "@/app/lib/abis/wrapper.abi";
import { REGISTRY_ADDRESS, SEPOLIA_MOCK_TOKENS } from "@/app/lib/constants";
import { getPublicClient } from "@/app/lib/clients";
import { cacheWrap, CACHE_TTL } from "@/app/lib/cache";
import type { Network, TokenWrapperPair, EnrichedPair } from "@/app/types";

export async function fetchRawPairs(network: Network): Promise<TokenWrapperPair[]> {
  return cacheWrap(`rawPairs:${network}`, CACHE_TTL.REGISTRY, async () => {
    const client = getPublicClient(network);
    const pairs = await client.readContract({
      address: REGISTRY_ADDRESS[network],
      abi: REGISTRY_ABI,
      functionName: "getTokenConfidentialTokenPairs",
    });

    return (
      pairs as Array<{
        tokenAddress: `0x${string}`;
        confidentialTokenAddress: `0x${string}`;
        isValid: boolean;
      }>
    ).map((p) => ({
      tokenAddress: p.tokenAddress,
      confidentialTokenAddress: p.confidentialTokenAddress,
      isValid: p.isValid,
    }));
  });
}

export async function fetchEnrichedPairs(network: Network): Promise<EnrichedPair[]> {
  return cacheWrap(`enrichedPairs:${network}`, CACHE_TTL.REGISTRY, async () => {
    const client = getPublicClient(network);
    const rawPairs = await fetchRawPairs(network);
    if (rawPairs.length === 0) return [];

    // Single multicall: 7 reads per pair
    const contracts = rawPairs.flatMap((pair) => [
      { address: pair.tokenAddress, abi: ERC20_ABI, functionName: "name" as const },
      { address: pair.tokenAddress, abi: ERC20_ABI, functionName: "symbol" as const },
      { address: pair.tokenAddress, abi: ERC20_ABI, functionName: "decimals" as const },
      { address: pair.confidentialTokenAddress, abi: WRAPPER_ABI, functionName: "name" as const },
      { address: pair.confidentialTokenAddress, abi: WRAPPER_ABI, functionName: "symbol" as const },
      { address: pair.confidentialTokenAddress, abi: WRAPPER_ABI, functionName: "decimals" as const },
      { address: pair.confidentialTokenAddress, abi: WRAPPER_ABI, functionName: "rate" as const },
    ]);

    const results = await client.multicall({ contracts, allowFailure: true });

    const mockAddressSet =
      network === "sepolia"
        ? new Set(SEPOLIA_MOCK_TOKENS.map((t) => t.wrapperAddress.toLowerCase()))
        : new Set<string>();

    return rawPairs.map((pair, i) => {
      const base = i * 7;
      const get = (idx: number, fallback: unknown) =>
        results[base + idx].status === "success" ? results[base + idx].result : fallback;

      return {
        tokenAddress: pair.tokenAddress,
        wrapperAddress: pair.confidentialTokenAddress,
        isValid: pair.isValid,
        tokenName: get(0, "Unknown") as string,
        tokenSymbol: get(1, "???") as string,
        tokenDecimals: get(2, 18) as number,
        wrapperName: get(3, "Unknown") as string,
        wrapperSymbol: get(4, "???") as string,
        wrapperDecimals: get(5, 6) as number,
        rate: get(6, 1n) as bigint,
        isMock: mockAddressSet.has(pair.confidentialTokenAddress.toLowerCase()),
      };
    });
  });
}

export async function fetchPairByWrapper(
  wrapperAddress: `0x${string}`,
  network: Network
): Promise<EnrichedPair | null> {
  const pairs = await fetchEnrichedPairs(network);
  return (
    pairs.find((p) => p.wrapperAddress.toLowerCase() === wrapperAddress.toLowerCase()) ?? null
  );
}

export async function fetchPairByToken(
  tokenAddress: `0x${string}`,
  network: Network
): Promise<EnrichedPair | null> {
  const pairs = await fetchEnrichedPairs(network);
  return (
    pairs.find((p) => p.tokenAddress.toLowerCase() === tokenAddress.toLowerCase()) ?? null
  );
}