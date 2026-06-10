// app/dashboard/vault/page.tsx
// Location: latise/app/dashboard/vault/page.tsx
// The Privacy Vault: Shield (wrap) + Unshield (unwrap) flows.
// Integrates useWrap and useUnwrap hooks with Privy wallet connection.
"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { useRegistry, useRegistryPair } from "@/app/hooks/useRegistry";
import { useWrap } from "@/app/hooks/useWrap";
import { useUnwrap } from "@/app/hooks/useUnwrap";
import { useTokenBalances } from "@/app/hooks/useTokenBalances";
import { parseTokenInput, formatTokenUnits } from "@/app/lib/format";
import { computeExpectedWrapAmount } from "@/app/lib/wrapper";
import { etherscanTx, CHAIN_IDS } from "@/app/lib/constants";
import type { EnrichedPair, Network } from "@/app/types";

type Tab = "shield" | "unshield";

export default function VaultPage() {
  const searchParams = useSearchParams();
  const network = (searchParams.get("network") ?? "sepolia") as Network;
  const wrapperParam = searchParams.get("wrapper") as `0x${string}` | null;
  const tabParam = (searchParams.get("tab") ?? "shield") as Tab;

  const [tab, setTab] = useState<Tab>(tabParam);
  const [selectedWrapper, setSelectedWrapper] = useState<`0x${string}` | null>(wrapperParam);
  const [inputValue, setInputValue] = useState("");

  const { data: pairs = [] } = useRegistry(network);
  const { data: pair } = useRegistryPair(selectedWrapper ?? undefined, network);

  // Auto-select first pair
  useEffect(() => {
    if (!selectedWrapper && pairs.length > 0) {
      setSelectedWrapper(pairs[0].wrapperAddress);
    }
  }, [pairs, selectedWrapper]);

  if (!pair) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Privacy Vault</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Shield ERC-20 tokens into encrypted confidential wrappers
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-6 text-sm text-gray-500 shadow-sm">
          {pairs.length > 0
            ? "Loading selected vault pair..."
            : "No vault pairs are available for this network yet."}
        </div>
      </div>
    );
  }

  return (
    <VaultContent
      inputValue={inputValue}
      network={network}
      pair={pair}
      pairs={pairs}
      selectedWrapper={selectedWrapper}
      setInputValue={setInputValue}
      setSelectedWrapper={setSelectedWrapper}
      setTab={setTab}
      tab={tab}
    />
  );
}

interface VaultContentProps {
  inputValue: string;
  network: Network;
  pair: EnrichedPair;
  pairs: EnrichedPair[];
  selectedWrapper: `0x${string}` | null;
  setInputValue: (value: string) => void;
  setSelectedWrapper: (wrapper: `0x${string}`) => void;
  setTab: (tab: Tab) => void;
  tab: Tab;
}

function VaultContent({
  inputValue,
  network,
  pair,
  pairs,
  selectedWrapper,
  setInputValue,
  setSelectedWrapper,
  setTab,
  tab,
}: VaultContentProps) {
  const { login, authenticated } = usePrivy();
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { balances, allowance, refetch: refetchBalances } = useTokenBalances(pair, network);
  const safeUserAddress =
    (address ?? "0x0000000000000000000000000000000000000000") as `0x${string}`;

  const correctChainId = CHAIN_IDS[network];
  const isWrongChain = authenticated && chainId !== correctChainId;

  const wrap = useWrap({
    pair,
    network,
    onSuccess: () => {
      setInputValue("");
      refetchBalances();
    },
  });

  const unwrap = useUnwrap({
    pair,
    network,
    userAddress: safeUserAddress,
    onSuccess: () => {
      setInputValue("");
      refetchBalances();
    },
  });

  const parsedAmount = parseTokenInput(inputValue, pair.tokenDecimals);
  const expectedOut =
    parsedAmount > 0n
      ? computeExpectedWrapAmount(parsedAmount, pair.rate).wrapperUnits
      : null;

  const underlyingBalance = balances?.underlyingBalance ?? 0n;
  const confidentialBalance = balances?.confidentialBalance;

  const maxBalance = tab === "shield" ? underlyingBalance : (confidentialBalance ?? 0n);
  const maxDecimals = tab === "shield" ? pair.tokenDecimals : pair.wrapperDecimals;

  function handleMax() {
    setInputValue(formatTokenUnits(maxBalance, maxDecimals, maxDecimals));
  }

  async function handleAction() {
    if (!authenticated) { login(); return; }
    if (isWrongChain) { switchChain?.({ chainId: correctChainId }); return; }
    if (!address || parsedAmount === 0n) return;

    if (tab === "shield") {
      await wrap.execute({ underlyingAmount: parsedAmount, toAddress: address });
    } else {
      await unwrap.execute(parsedAmount);
    }
  }

  const isShielding = wrap.state !== "idle" && tab === "shield";
  const isUnshielding = unwrap.state !== "idle" && tab === "unshield";
  const isBusy = isShielding || isUnshielding;

  function getButtonLabel() {
    if (!authenticated) return "Connect Wallet";
    if (isWrongChain) return `Switch to ${network === "sepolia" ? "Sepolia" : "Mainnet"}`;
    if (tab === "shield") {
      if (wrap.state === "approving") return "Approving…";
      if (wrap.state === "wrapping") return "Shielding…";
      if (wrap.state === "done") return "✓ Shielded!";
      if (wrap.state === "error") return "Try Again";
      if (allowance !== undefined && parsedAmount > 0n && allowance < parsedAmount) return "Approve & Shield";
      return "Shield Capital";
    } else {
      if (unwrap.state === "encrypting") return "Encrypting…";
      if (unwrap.state === "submitting") return "Submitting…";
      if (unwrap.state === "pending_decrypt") return "Decrypting…";
      if (unwrap.state === "done") return "✓ Unshielded!";
      if (unwrap.state === "error") return "Try Again";
      return "Unshield Capital";
    }
  }

  const activeError = tab === "shield" ? wrap.errorMessage : unwrap.errorMessage;
  const activeTxHash = tab === "shield"
    ? (wrap.wrapTxHash ?? wrap.approveTxHash)
    : (unwrap.unwrapTxHash ?? unwrap.finalizedTxHash);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Privacy Vault</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Shield ERC-20 tokens into encrypted confidential wrappers
        </p>
      </div>

      <div className="flex gap-6">
        {/* ── Left: swap card ──────────────────────────────── */}
        <div className="flex-1 max-w-md">
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            {/* Tabs */}
            <div className="flex border-b border-gray-100">
              {(["shield", "unshield"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => { setTab(t); wrap.reset(); unwrap.reset(); setInputValue(""); }}
                  className={`flex-1 py-3.5 text-sm font-semibold capitalize transition ${
                    tab === t
                      ? "text-[#156640] border-b-2 border-[#156640]"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {t === "shield" ? "🔒 Shield" : "🔓 Unshield"}
                </button>
              ))}
            </div>

            <div className="p-5 space-y-4">
              {/* Token selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                  Select Token
                </label>
                <select
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#156640]/20 focus:border-[#156640]"
                  value={selectedWrapper ?? ""}
                  onChange={(e) => { setSelectedWrapper(e.target.value as `0x${string}`); setInputValue(""); }}
                >
                  {pairs.filter((p) => p.isValid).map((p) => (
                    <option key={p.wrapperAddress} value={p.wrapperAddress}>
                      {p.tokenSymbol} → {p.wrapperSymbol}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Amount
                  </label>
                  {authenticated && (
                    <button
                      onClick={handleMax}
                      className="text-xs text-[#156640] font-semibold hover:underline"
                    >
                      Max: {formatTokenUnits(maxBalance, maxDecimals, 4)}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-[#156640]/20 focus-within:border-[#156640]">
                  <input
                    type="number"
                    placeholder="0.00"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    disabled={isBusy}
                    className="flex-1 bg-transparent text-2xl font-light text-gray-900 outline-none disabled:opacity-50"
                  />
                  <span className="text-sm font-semibold text-gray-500">
                    {tab === "shield" ? pair?.tokenSymbol : pair?.wrapperSymbol}
                  </span>
                </div>
              </div>

              {/* Expected output */}
              {expectedOut !== null && pair && tab === "shield" && (
                <div className="flex items-center justify-between px-3 py-2.5 bg-[#f0faf5] rounded-xl">
                  <span className="text-sm text-gray-600">You receive</span>
                  <span className="text-sm font-semibold text-[#156640]">
                    {formatTokenUnits(expectedOut, pair.wrapperDecimals, 4)} {pair.wrapperSymbol}
                  </span>
                </div>
              )}

              {/* Balance decrypt widget */}
              {authenticated && pair && (
                <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-100">
                  <div>
                    <div className="text-xs text-gray-400 font-medium">Encrypted Balance</div>
                    <div className="text-sm font-semibold text-gray-900 mt-0.5">
                      {confidentialBalance !== undefined
                        ? `${formatTokenUnits(confidentialBalance, pair.wrapperDecimals, 4)} ${pair.wrapperSymbol}`
                        : "••••••"}
                    </div>
                  </div>
                  <button
                    className="flex items-center gap-1.5 text-xs font-semibold text-[#156640] hover:text-[#0f4f30] transition"
                    title="Click to decrypt your balance (requires wallet signature)"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                      {confidentialBalance !== undefined
                        ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>
                        : <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></>
                      }
                    </svg>
                    {confidentialBalance !== undefined ? "Visible" : "Decrypt"}
                  </button>
                </div>
              )}

              {/* Error */}
              {activeError && (
                <div className="px-3 py-2.5 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                  {activeError}
                </div>
              )}

              {/* Pending decrypt message */}
              {unwrap.state === "pending_decrypt" && (
                <div className="px-3 py-2.5 bg-amber-50 border border-amber-100 rounded-xl">
                  <div className="flex items-center gap-2 text-sm text-amber-700 font-medium">
                    <span className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                    Zama FHE network is decrypting…
                  </div>
                  <div className="text-xs text-amber-600 mt-1">
                    This takes 10–60 seconds. Your funds are safe.
                    {unwrap.elapsedMs > 0 && ` (${Math.floor(unwrap.elapsedMs / 1000)}s elapsed)`}
                  </div>
                </div>
              )}

              {/* Tx hash */}
              {activeTxHash && (
                <a
                  href={etherscanTx(activeTxHash, network)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-[#156640] hover:underline"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  View on Etherscan
                </a>
              )}

              {/* Action button */}
              <button
                onClick={handleAction}
                disabled={isBusy && wrap.state !== "error" && unwrap.state !== "error"}
                className={`w-full py-3.5 rounded-xl font-semibold text-sm transition ${
                  isBusy && wrap.state !== "error" && unwrap.state !== "error"
                    ? "bg-[#156640]/50 text-white cursor-wait"
                    : "bg-[#156640] hover:bg-[#0f4f30] text-white"
                }`}
              >
                {getButtonLabel()}
              </button>
            </div>
          </div>
        </div>

        {/* ── Right: pair details + step guide ─────────────── */}
        <div className="flex-1 space-y-4">
          {pair && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Pair Details</h3>
              <div className="space-y-3">
                {[
                  { label: "Underlying token", value: `${pair.tokenSymbol} (${pair.tokenName})` },
                  { label: "Wrapper token", value: `${pair.wrapperSymbol} (${pair.wrapperName})` },
                  { label: "Decimals", value: `${pair.tokenDecimals} → ${pair.wrapperDecimals}` },
                  { label: "Rate", value: `1 ${pair.wrapperSymbol} = ${Number(pair.rate).toLocaleString()} ${pair.tokenSymbol}` },
                  { label: "Status", value: pair.isValid ? "Active ✓" : "Revoked ✗" },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                    <span className="text-xs text-gray-400 font-medium">{row.label}</span>
                    <span className="text-xs font-semibold text-gray-700">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step guide */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
              {tab === "shield" ? "How shielding works" : "How unshielding works"}
            </h3>
            {tab === "shield" ? (
              <Steps steps={[
                { n: 1, title: "Approve", desc: "Authorize the wrapper contract to spend your ERC-20 tokens." },
                { n: 2, title: "Shield (Wrap)", desc: "Your tokens are locked in the wrapper and confidential tokens are minted to your address." },
                { n: 3, title: "Decrypt balance", desc: "Sign once in your wallet to reveal your encrypted balance — no gas required." },
              ]} active={wrap.state === "approving" ? 0 : wrap.state === "wrapping" ? 1 : wrap.state === "done" ? 2 : -1} />
            ) : (
              <Steps steps={[
                { n: 1, title: "Submit unwrap", desc: "Your encrypted amount is submitted to the smart contract." },
                { n: 2, title: "FHE decryption", desc: "The Zama relayer decrypts the amount off-chain (10–60s)." },
                { n: 3, title: "Receive tokens", desc: "Your ERC-20 tokens are released back to your wallet." },
              ]} active={unwrap.state === "submitting" ? 0 : unwrap.state === "pending_decrypt" ? 1 : unwrap.state === "done" ? 2 : -1} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Steps({ steps, active }: { steps: { n: number; title: string; desc: string }[]; active: number }) {
  return (
    <div className="space-y-3">
      {steps.map((s, i) => (
        <div key={s.n} className={`flex gap-3 p-3 rounded-xl transition ${active === i ? "bg-[#f0faf5]" : ""}`}>
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
            active === i ? "bg-[#156640] text-white" : active > i ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
          }`}>
            {active > i ? "✓" : s.n}
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-800">{s.title}</div>
            <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">{s.desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
