// app/dashboard/faucet/page.tsx
// Location: latise/app/dashboard/faucet/page.tsx
// Sepolia faucet — each card mints 1,000,000 of the underlying mock ERC-20.
"use client";

import { useSearchParams } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { useFaucet } from "@/app/hooks/useFaucet";
import { SEPOLIA_MOCK_TOKENS, etherscanTx, etherscanAddress, CHAIN_IDS } from "@/app/lib/constants";
import type { FaucetToken } from "@/app/types";

export default function FaucetPage() {
  const searchParams = useSearchParams();
  const network = searchParams.get("network") ?? "sepolia";
  const { login, authenticated } = usePrivy();
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const isWrongNetwork = network !== "sepolia";
  const isWrongChain = authenticated && chainId !== CHAIN_IDS.sepolia;

  if (isWrongNetwork) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Testnet only</h2>
          <p className="text-sm text-gray-500">
            The faucet only works on Sepolia testnet. Switch to testnet using the network switcher above.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Developer Faucet</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Mint free mock ERC-20 tokens on Sepolia to test the shield/unshield flows
        </p>
      </div>

      {/* Wrong chain banner */}
      {isWrongChain && (
        <div className="mb-5 flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-amber-700 font-medium">
            <span>⚠️</span> You're connected to the wrong network
          </div>
          <button
            onClick={() => switchChain?.({ chainId: CHAIN_IDS.sepolia })}
            className="text-xs font-semibold text-amber-700 border border-amber-300 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition"
          >
            Switch to Sepolia
          </button>
        </div>
      )}

      {/* Info card */}
      <div className="mb-6 bg-[#f0faf5] border border-[#a3d9c4] rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#156640] text-white flex items-center justify-center text-base shrink-0">
            🚰
          </div>
          <div>
            <div className="text-sm font-semibold text-[#0a3622]">How the faucet works</div>
            <div className="text-xs text-[#156640] mt-1 leading-relaxed">
              Each token gives you <strong>1,000,000</strong> units of the underlying mock ERC-20.
              After minting, head to the Privacy Vault to shield them into confidential tokens.
              No gas? Get Sepolia ETH from{" "}
              <a href="https://sepoliafaucet.com" target="_blank" rel="noopener noreferrer" className="underline">
                sepoliafaucet.com
              </a>.
            </div>
          </div>
        </div>
      </div>

      {/* Token cards */}
      {!authenticated ? (
        <div className="grid grid-cols-3 gap-4">
          {SEPOLIA_MOCK_TOKENS.map((token) => (
            <LockedCard key={token.symbol} token={token} onConnect={login} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {SEPOLIA_MOCK_TOKENS.map((token) => (
            <FaucetCard
              key={token.symbol}
              token={token}
              userAddress={address!}
              disabled={isWrongChain}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FaucetCard({
  token, userAddress, disabled,
}: {
  token: FaucetToken; userAddress: string; disabled: boolean;
}) {
  const faucet = useFaucet();
  const isDone = faucet.state === "done";
  const isMinting = faucet.state === "minting";

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col gap-4 hover:border-[#a3d9c4] transition">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#d0ede2] flex items-center justify-center text-[#156640] font-bold text-sm shrink-0">
          {token.underlyingSymbol.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-900">{token.underlyingSymbol}</div>
          <div className="text-xs text-gray-400">{token.name}</div>
        </div>
      </div>

      {/* Info */}
      <div className="space-y-1.5">
        <div className="flex justify-between">
          <span className="text-xs text-gray-400">Mint amount</span>
          <span className="text-xs font-semibold text-gray-700">1,000,000</span>
        </div>
        <div className="flex justify-between">
          <span className="text-xs text-gray-400">Decimals</span>
          <span className="text-xs font-semibold text-gray-700">{token.underlyingDecimals}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-xs text-gray-400">Contract</span>
          <a
            href={etherscanAddress(token.underlyingAddress, "sepolia")}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-mono text-[#156640] hover:underline"
          >
            {token.underlyingAddress.slice(0, 6)}…{token.underlyingAddress.slice(-4)}↗
          </a>
        </div>
      </div>

      {/* Error */}
      {faucet.errorMessage && (
        <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
          {faucet.errorMessage}
        </div>
      )}

      {/* Tx link */}
      {faucet.txHash && (
        <a
          href={etherscanTx(faucet.txHash, "sepolia")}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[#156640] hover:underline flex items-center gap-1"
        >
          View on Etherscan ↗
        </a>
      )}

      {/* Button */}
      <button
        onClick={() => {
          if (isDone || faucet.state === "error") faucet.reset();
          else faucet.execute(token);
        }}
        disabled={isMinting || disabled}
        className={`w-full py-2.5 rounded-xl text-sm font-semibold transition ${
          isDone
            ? "bg-green-50 text-green-700 border border-green-200"
            : isMinting
            ? "bg-[#156640]/40 text-white cursor-wait"
            : disabled
            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
            : "bg-[#156640] hover:bg-[#0f4f30] text-white"
        }`}
      >
        {isDone ? "✓ Minted!" : isMinting ? "Minting…" : faucet.state === "error" ? "Retry" : "Mint Tokens"}
      </button>
    </div>
  );
}

function LockedCard({ token, onConnect }: { token: FaucetToken; onConnect: () => void }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 font-bold text-sm shrink-0">
          {token.underlyingSymbol.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-900">{token.underlyingSymbol}</div>
          <div className="text-xs text-gray-400">{token.name}</div>
        </div>
      </div>
      <button
        onClick={onConnect}
        className="w-full py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-500 hover:bg-gray-200 transition"
      >
        Connect to Mint
      </button>
    </div>
  );
}