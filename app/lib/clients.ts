// lib/clients.ts
// Location: latise/lib/clients.ts
// Factory functions for viem public clients.
// Public clients are READ-ONLY — used for readContract, multicall, getLogs.
// Write operations (transactions) go through wagmi's useWriteContract hook.
//
// These clients are created fresh per call (not singletons) so they always
// pick up the latest env vars. At the volume of calls in this app that's fine.

import { createPublicClient, http } from "viem";
import { sepolia, mainnet } from "viem/chains";
import { NETWORK_CONFIGS } from "@/app/lib/constants";
import type { Network } from "@/app/types";

/**
 * Returns a viem PublicClient for the given network.
 * Used server-side (API routes) and in lib/* helper functions.
 *
 * For client-side reads inside React components, use wagmi's
 * usePublicClient() hook instead — it stays in sync with the
 * connected wallet's chain.
 */
export function getPublicClient(network: Network) {
  const config = NETWORK_CONFIGS[network];

  if (network === "sepolia") {
    return createPublicClient({
      chain: sepolia,
      transport: http(config.rpcUrl, {
        // Retry up to 3 times on transient RPC errors (rate limits, timeouts)
        retryCount: 3,
        retryDelay: 1000,
      }),
    });
  }

  return createPublicClient({
    chain: mainnet,
    transport: http(config.rpcUrl, {
      retryCount: 3,
      retryDelay: 1000,
    }),
  });
}

/**
 * Returns a viem PublicClient keyed by chain ID.
 * Useful when you have the chainId from wagmi and need a public client.
 */
export function getPublicClientByChainId(chainId: number) {
  if (chainId === 11155111) return getPublicClient("sepolia");
  if (chainId === 1) return getPublicClient("mainnet");
  throw new Error(`Unsupported chainId: ${chainId}`);
}