// app/fhe-bridge/page.tsx
// Headless iframe that runs the Zama FHE SDK in isolation.
// Communicates with the parent window via postMessage.
//
// SDK: @zama-fhe/relayer-sdk (legacy/original package).
// - Testnet (Sepolia): SepoliaConfig — relayer.testnet.zama.cloud, no API key.
// - Mainnet:  custom config via /api/relayer/1 proxy which injects ZAMA_RELAYER_API_KEY.
"use client";

import { useEffect, useRef, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RelayerWeb,
  ZamaProvider,
  SepoliaConfig,
  indexedDBStorage,
  useConfidentialBalance,
  useUnshield,
  useConfidentialTransfer,
} from "@zama-fhe/react-sdk";
import { WagmiSigner } from "@zama-fhe/react-sdk/wagmi";
import { sepolia, mainnet } from "viem/chains";
import { createConfig, http, WagmiProvider } from "wagmi";

// ─── Wagmi config (minimal — just for the Zama WagmiSigner) ──────────────────

const wagmiConfig = createConfig({
  chains: [sepolia, mainnet],
  transports: {
    [sepolia.id]: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL),
    [mainnet.id]: http(process.env.NEXT_PUBLIC_MAINNET_RPC_URL),
  },
});

// ─── Zama signer + relayer — created once, client-side only ──────────────────

let signer: WagmiSigner | null = null;
let relayer: RelayerWeb | null = null;

function initRelayer() {
  if (typeof window === "undefined" || signer) return;

  signer = new WagmiSigner({ config: wagmiConfig });

  // Mainnet uses our API proxy at /api/relayer/1 which adds Authorization header.
  // Sepolia uses SepoliaConfig directly — public relayer, no key required.
  const mainnetRelayerUrl = `${window.location.origin}/api/relayer/1`;

  relayer = new RelayerWeb({
    getChainId: () => signer!.getChainId(),
    transports: {
      // Testnet: spread SepoliaConfig transport fields, no API key needed
      [sepolia.id]: {
        ...SepoliaConfig,
        network: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL!,
      },
      // Mainnet: proxy that server-injects ZAMA_RELAYER_API_KEY
      [mainnet.id]: {
        relayerUrl: mainnetRelayerUrl,
        network: process.env.NEXT_PUBLIC_MAINNET_RPC_URL!,
      },
    },
  });
}

// ─── Message types ────────────────────────────────────────────────────────────

type RequestType = "getConfidentialBalance" | "unshield" | "confidentialTransfer";

interface ActiveRequest {
  id: string;
  type: RequestType;
  params: Record<string, string>;
}

// ─── Sub-components that use Zama hooks ──────────────────────────────────────

function sendToParent(data: Record<string, unknown>) {
  window.parent.postMessage(data, window.location.origin);
}

function UnshieldExecutor({
  requestId,
  tokenAddress,
  amount,
  onDone,
}: {
  requestId: string;
  tokenAddress: `0x${string}`;
  amount: bigint;
  onDone: () => void;
}) {
  const { mutateAsync: unshield } = useUnshield({ tokenAddress });
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    unshield({
      amount,
      onUnwrapSubmitted: (txHash) => {
        sendToParent({ type: "unshield_submitted", requestId, txHash });
      },
    })
      .then((result) => sendToParent({ type: "unshield_success", requestId, result }))
      .catch((error) =>
        sendToParent({
          type: "unshield_error",
          requestId,
          error: error instanceof Error ? { message: error.message, name: error.name } : String(error),
        })
      )
      .finally(() => setTimeout(onDone, 1000));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

function BalanceExecutor({
  requestId,
  tokenAddress,
  onDone,
}: {
  requestId: string;
  tokenAddress: `0x${string}`;
  onDone: () => void;
}) {
  const { data, isLoading, error } = useConfidentialBalance({ tokenAddress });

  useEffect(() => {
    if (isLoading) return;
    sendToParent({ type: "confidential_balance_response", requestId, data, error: error ?? null });
    onDone();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  return null;
}

function TransferExecutor({
  requestId,
  tokenAddress,
  to,
  amount,
  onDone,
}: {
  requestId: string;
  tokenAddress: `0x${string}`;
  to: `0x${string}`;
  amount: bigint;
  onDone: () => void;
}) {
  const { mutateAsync: confidentialTransfer } = useConfidentialTransfer({ tokenAddress });
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    confidentialTransfer({
      to,
      amount,
      onTransferSubmitted: (txHash) => {
        sendToParent({ type: "confidential_transfer_submitted", requestId, txHash });
      },
    })
      .then((result) => sendToParent({ type: "confidential_transfer_success", requestId, result }))
      .catch((error) =>
        sendToParent({
          type: "confidential_transfer_error",
          requestId,
          error: error instanceof Error ? { message: error.message, name: error.name } : String(error),
        })
      )
      .finally(() => setTimeout(onDone, 1000));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

// ─── Bridge orchestrator ──────────────────────────────────────────────────────

function FHEBridge() {
  const [requests, setRequests] = useState<ActiveRequest[]>([]);

  const removeRequest = (id: string) =>
    setRequests((prev) => prev.filter((r) => r.id !== id));

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const { type, requestId, params } = event.data ?? {};
      if (!type || !requestId) return;
      setRequests((prev) => [...prev, { id: requestId, type, params }]);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <>
      {requests.map((req) => {
        if (req.type === "unshield") {
          return (
            <UnshieldExecutor
              key={req.id}
              requestId={req.id}
              tokenAddress={req.params.tokenAddress as `0x${string}`}
              amount={BigInt(req.params.amount)}
              onDone={() => removeRequest(req.id)}
            />
          );
        }
        if (req.type === "getConfidentialBalance") {
          return (
            <BalanceExecutor
              key={req.id}
              requestId={req.id}
              tokenAddress={req.params.tokenAddress as `0x${string}`}
              onDone={() => removeRequest(req.id)}
            />
          );
        }
        if (req.type === "confidentialTransfer") {
          return (
            <TransferExecutor
              key={req.id}
              requestId={req.id}
              tokenAddress={req.params.tokenAddress as `0x${string}`}
              to={req.params.to as `0x${string}`}
              amount={BigInt(req.params.amount)}
              onDone={() => removeRequest(req.id)}
            />
          );
        }
        return null;
      })}
    </>
  );
}

// ─── Page — full provider tree ────────────────────────────────────────────────

export default function FHEBridgePage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initRelayer();
    setReady(true);
  }, []);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 2, refetchOnWindowFocus: false },
        },
      })
  );

  if (!ready || !signer || !relayer) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <ZamaProvider relayer={relayer} signer={signer} storage={indexedDBStorage}>
          <FHEBridge />
        </ZamaProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
