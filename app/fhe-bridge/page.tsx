"use client";

import { useEffect, useRef, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RelayerWeb,
  ZamaProvider,
  indexedDBStorage,
  useConfidentialBalance,
  useUnshield,
} from "@zama-fhe/react-sdk";
import { WagmiSigner } from "@zama-fhe/react-sdk/wagmi";
import { sepolia, mainnet } from "viem/chains";
import { createConfig, http, WagmiProvider } from "wagmi";

// --- Recreate minimal providers (no Privy needed for headless bridge) ---
const wagmiConfig = createConfig({
  chains: [sepolia, mainnet],
  transports: {
    [sepolia.id]: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL),
    [mainnet.id]: http(process.env.NEXT_PUBLIC_MAINNET_RPC_URL),
  },
});

// Initialize signer and relayer only on client
let signer: WagmiSigner | null = null;
let relayer: RelayerWeb | null = null;

if (typeof window !== "undefined") {
  signer = new WagmiSigner({ config: wagmiConfig });
  relayer = new RelayerWeb({
    getChainId: () => signer!.getChainId(),
    transports: {
      [sepolia.id]: {
        relayerUrl: "https://relayer.testnet.zama.org",
        network: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL!,
      },
      [mainnet.id]: {
        relayerUrl: "https://relayer.mainnet.zama.org",
        network: process.env.NEXT_PUBLIC_MAINNET_RPC_URL!,
      },
    },
  });
}

// --- Bridge Component ---
function FHEBridge() {
  // Map to store callbacks by request id
  const callbacksRef = useRef<Map<string, (data: any) => void>>(new Map());
  // Simple counter for request ids
  const requestIdCounterRef = useRef(0);

  // --- Handlers for specific request types ---
  // Helper to send a message to parent window
  const sendMessage = (data: any) => {
    window.parent.postMessage(
      data,
      window.location.origin // Only send to same origin parent
    );
  };

  // Handler for getConfidentialBalance requests
  const handleGetConfidentialBalance = async (
    requestId: string,
    tokenAddress: `0x${string}`
  ) => {
    // We need to render useConfidentialBalance in a component, so we'll use a
    // dynamic render approach or a component that mounts/unmounts with props
    // Wait — better to create a dynamic component that uses the hook and reports back!
    // Let's use a state-based approach:

    // Store a pending request state
    const pendingBalanceRequestsRef = useRef<
      Map<string, { tokenAddress: `0x${string}`; requestId: string }>
    >(new Map());

    const BalanceFetcher = ({
      tokenAddress,
      requestId,
      onDone,
    }: {
      tokenAddress: `0x${string}`;
      requestId: string;
      onDone: (data: any) => void;
    }) => {
      const { data, isLoading, error } = useConfidentialBalance({
        tokenAddress,
      });

      useEffect(() => {
        if (!isLoading) {
          onDone({ data, error, requestId });
        }
      }, [data, isLoading, error, requestId, onDone]);

      return null;
    };

    // Alternatively, let's implement this using a registry of active requests and components
    // Wait, perhaps for simplicity, let's create a generic HookRunner component that can run any Zama hook on demand
    // But actually, maybe for now, let's handle useUnshield and useConfidentialBalance specifically
    // Let's start with a simple approach: use useState to track active requests and render components accordingly
  };

  // Wait, let's take a step back: for better control, let's create a generic HookExecutor component that can dynamically use the required hooks based on incoming messages
  const [activeRequests, setActiveRequests] = useState<
    Array<{
      id: string;
      type: "getConfidentialBalance" | "unshield";
      params: any;
    }>
  >([]);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Validate message origin
      if (event.origin !== window.location.origin) return;

      const { type, requestId, params } = event.data;

      // Register the request
      setActiveRequests((prev) => [
        ...prev,
        { id: requestId, type, params },
      ]);
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Handler components that execute the hooks and send responses
  const UnshieldExecutor = ({
    requestId,
    tokenAddress,
    amount,
  }: {
    requestId: string;
    tokenAddress: `0x${string}`;
    amount: bigint;
  }) => {
    const { mutateAsync: unshield } = useUnshield({ tokenAddress });

    useEffect(() => {
      const execute = async () => {
        try {
          let txHash: `0x${string}` | undefined;
          const result = await unshield({
            amount,
            onUnwrapSubmitted: (hash) => {
              txHash = hash as `0x${string}`;
              sendMessage({
                type: "unshield_submitted",
                requestId,
                txHash,
              });
            },
          });
          sendMessage({
            type: "unshield_success",
            requestId,
            result,
          });
        } catch (error) {
          sendMessage({
            type: "unshield_error",
            requestId,
            error:
              error instanceof Error
                ? { message: error.message, name: error.name }
                : String(error),
          });
        } finally {
          // Remove request from active list after completion (delay to make sure parent has time to process)
          setTimeout(() => {
            setActiveRequests((prev) =>
              prev.filter((r) => r.id !== requestId)
            );
          }, 1000);
        }
      };
      execute();
    }, [unshield, requestId, amount]);

    return null;
  };

  const BalanceExecutor = ({
    requestId,
    tokenAddress,
  }: {
    requestId: string;
    tokenAddress: `0x${string}`;
  }) => {
    const { data, isLoading, error } = useConfidentialBalance({
      tokenAddress,
    });

    useEffect(() => {
      if (!isLoading) {
        sendMessage({
          type: "confidential_balance_response",
          requestId,
          data,
          error,
        });
        // Remove request after sending response
        setActiveRequests((prev) =>
          prev.filter((r) => r.id !== requestId)
        );
      }
    }, [data, isLoading, error, requestId]);

    return null;
  };

  return (
    <>
      {activeRequests.map((req) => {
        if (req.type === "unshield") {
          return (
            <UnshieldExecutor
              key={req.id}
              requestId={req.id}
              tokenAddress={req.params.tokenAddress}
              amount={BigInt(req.params.amount)}
            />
          );
        }
        if (req.type === "getConfidentialBalance") {
          return (
            <BalanceExecutor
              key={req.id}
              requestId={req.id}
              tokenAddress={req.params.tokenAddress}
            />
          );
        }
        return null;
      })}
      {/* Empty UI - just a placeholder */}
      <div className="fixed inset-0 pointer-events-none opacity-0" />
    </>
  );
}

export default function FHEBridgePage() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 2,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated || !signer || !relayer) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <ZamaProvider
          relayer={relayer}
          signer={signer}
          storage={indexedDBStorage}
        >
          <FHEBridge />
        </ZamaProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
