"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useSwitchChain, useChainId } from "wagmi";
import { cn } from "@/app/lib/cn";

// Mapping of chainId to network name
const CHAIN_ID_TO_NETWORK: Record<number, string> = {
  1: "mainnet",
  11155111: "sepolia",
};

// Mapping of network name to chainId
const NETWORK_TO_CHAIN_ID: Record<string, number> = {
  mainnet: 1,
  sepolia: 11155111,
};

export function NetworkSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const walletChainId = useChainId();
  
  // Get current network from URL or default
  const urlNetwork = searchParams.get("network") ?? "sepolia";
  // Get current network from wallet if connected
  const walletNetwork = walletChainId ? CHAIN_ID_TO_NETWORK[walletChainId] : null;
  
  // Use URL network first (source of truth), then wallet
  const current = urlNetwork;

  const { switchChainAsync, isPending } = useSwitchChain();

  // Sync wallet chain to match URL
  useEffect(() => {
    const targetChainId = NETWORK_TO_CHAIN_ID[urlNetwork];
    if (walletChainId && walletChainId !== targetChainId) {
      switchChainAsync({ chainId: targetChainId }).catch(() => {
        // Ignore errors (user might cancel)
      });
    }
  }, [urlNetwork, walletChainId, switchChainAsync]);

  const switchTo = async (network: string) => {
    try {
      const chainId = NETWORK_TO_CHAIN_ID[network];
      
      // First switch wallet chain, then update URL
      await switchChainAsync({ chainId });

      const params = new URLSearchParams(searchParams.toString());
      params.set("network", network);

      router.push(`${pathname}?${params.toString()}`);
    } catch (error) {
      // Even if wallet switch fails, still update URL
      const params = new URLSearchParams(searchParams.toString());
      params.set("network", network);
      router.push(`${pathname}?${params.toString()}`);
      console.error("Failed to switch network:", error);
    }
  };

  return (
    <div className="flex items-center bg-gray-100 rounded-lg p-0.5 text-xs font-semibold">
      {["sepolia", "mainnet"].map((n) => (
        <button
          key={n}
          disabled={isPending}
          onClick={() => switchTo(n)}
          className={cn(
            "px-3 py-1.5 rounded-md capitalize transition-all disabled:opacity-50",
            current === n
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          )}
        >
          {n === "sepolia" ? "Testnet" : "Mainnet"}
        </button>
      ))}
    </div>
  );
}
