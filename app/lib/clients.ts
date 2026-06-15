// app/lib/clients.ts
// Location: latise/app/lib/clients.ts
//
// Singleton viem PublicClients — created once per process, reused everywhere.
// Singletons mean one persistent HTTP connection pool instead of a new one
// per request, which is critical for Alchemy's compute unit budget.
//
// Retry strategy: exponential backoff starting at 2s, max 5 attempts.
// This handles Alchemy's "exceeded compute units per second" 429s gracefully.

import { createPublicClient, http, fallback } from "viem";
import { sepolia, mainnet } from "viem/chains";
import type { Network } from "@/app/types";

// ── Retry transport with exponential backoff ──────────────────────────────────
// Alchemy rate-limits at the CU/second level.
// We space retries out: 2s, 4s, 8s, 16s, 30s (capped).

function makeTransport(rpcUrl: string) {
  if (!rpcUrl) {
    throw new Error("Missing RPC URL for transport");
  }

  return http(rpcUrl, {
    retryCount: 5,

    // viem expects a NUMBER, not a function
    retryDelay: 2000, // base delay (viem handles retries internally)

    timeout: 30_000,

    batch: {
      batchSize: 20,
      wait: 16,
    },
  });
}

// Singletons — one per network per process
let _sepoliaClient: ReturnType<typeof createPublicClient> | null = null;
let _mainnetClient: ReturnType<typeof createPublicClient> | null = null;

export function getPublicClient(network: Network) {
  if (network === "sepolia") {
    if (!_sepoliaClient) {
      _sepoliaClient = createPublicClient({
        chain: sepolia,
        transport: makeTransport(
          process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL!
        ),
      });
    }
    return _sepoliaClient;
  }

  if (!_mainnetClient) {
    _mainnetClient = createPublicClient({
      chain: mainnet,
      transport: makeTransport(
        process.env.NEXT_PUBLIC_MAINNET_RPC_URL!
      ),
    });
  }
  return _mainnetClient;
}

export function getPublicClientByChainId(chainId: number) {
  if (chainId === 11155111) return getPublicClient("sepolia");
  if (chainId === 1) return getPublicClient("mainnet");
  throw new Error(`Unsupported chainId: ${chainId}`);
}