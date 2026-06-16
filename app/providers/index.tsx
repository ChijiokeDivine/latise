// app/providers/index.tsx
// Location: latise/app/providers/index.tsx
// Wraps the app with:
//   - PrivyProvider (wallet + social auth)
//   - WagmiProvider (via Privy's built-in wagmi config)
//   - QueryClientProvider (TanStack Query)
"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RelayerWeb,
  ZamaProvider,
  indexedDBStorage,
} from "@zama-fhe/react-sdk";
import { WagmiSigner } from "@zama-fhe/react-sdk/wagmi";
import { sepolia, mainnet } from "viem/chains";
import { http } from "wagmi";
import { createConfig } from "@privy-io/wagmi";
import { useState } from "react";

const wagmiConfig = createConfig({
  chains: [sepolia, mainnet],
  transports: {
    [sepolia.id]: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL),
    [mainnet.id]: http(process.env.NEXT_PUBLIC_MAINNET_RPC_URL),
  },
});

const signer = new WagmiSigner({ config: wagmiConfig });

const relayer = new RelayerWeb({
  getChainId: () => signer.getChainId(),
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

export function Providers({ children }: { children: React.ReactNode }) {
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

  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        loginMethods: ["wallet", "email"],
        appearance: {
          theme: "light",
          accentColor: "#156640",
          logo: "/file.svg",
          walletChainType: "ethereum-only",
        },
        defaultChain: sepolia,
        supportedChains: [sepolia, mainnet],
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <ZamaProvider relayer={relayer} signer={signer} storage={indexedDBStorage}>
            {children}
          </ZamaProvider>
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
