// app/dashboard/vault/VaultContent.tsx
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

export default function VaultContent() {
  const searchParams = useSearchParams();
  const network = (searchParams.get("network") ?? "sepolia") as Network;
  const wrapperParam = searchParams.get("wrapper") as `0x${string}` | null;
  const tabParam = (searchParams.get("tab") ?? "shield") as Tab;

  const [tab, setTab] = useState<Tab>(tabParam);
  const [selectedWrapper, setSelectedWrapper] = useState<`0x${string}` | null>(wrapperParam);
  const [inputValue, setInputValue] = useState("");

  const { data: pairs = [] } = useRegistry(network);
  const { data: pair } = useRegistryPair(selectedWrapper ?? undefined, network);

  // Reset selected wrapper when network changes
  useEffect(() => {
    setSelectedWrapper(null);
  }, [network]);

  // Auto-select first pair
  useEffect(() => {
    if (!selectedWrapper && pairs.length > 0) {
      setSelectedWrapper(pairs[0].wrapperAddress);
    }
  }, [pairs, selectedWrapper]);

  if (!pair) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
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
    <InnerVaultContent
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

/* ====================== Inner Client Component ====================== */

interface InnerVaultContentProps {
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

function InnerVaultContent({
  inputValue,
  network,
  pair,
  pairs,
  selectedWrapper,
  setInputValue,
  setSelectedWrapper,
  setTab,
  tab,
}: InnerVaultContentProps) {
  const { login, authenticated } = usePrivy();
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { balances, allowance, refetch: refetchBalances, isDecrypting } = useTokenBalances(pair, network);
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
    setInputValue(formatTokenUnits(maxBalance, maxDecimals, maxDecimals, { useLocale: false }));
  }

  async function handleAction() {
    if (!authenticated) {
      login();
      return;
    }
    if (isWrongChain) {
      switchChain?.({ chainId: correctChainId });
      return;
    }
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
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Privacy Vault</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Shield ERC-20 tokens into encrypted confidential wrappers
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Left: swap card */}
        <div className="flex-[2] max-w-full md:max-w-lg">
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            {/* Tabs */}
            <div className="flex border-b border-gray-100">
              {(["shield", "unshield"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTab(t);
                    wrap.reset();
                    unwrap.reset();
                    setInputValue("");
                  }}
                  className={`flex-1 py-3.5 text-sm font-semibold capitalize transition ${
                    tab === t
                      ? "text-[#156640] border-b-2 border-[#156640]"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {t === "shield" ? (
                    <span className="inline-flex items-center gap-1">
                      <svg xmlns='http://www.w3.org/2000/svg'  width='16' height='16' viewBox='0 0 24 24'><title>lock_line</title><g id="lock_line" fill='none'><path d='M24 0v24H0V0zM12.593 23.258l-.011.002-.071.035-.02.004-.014-.004-.071-.035c-.01-.004-.019-.001-.024.005l-.004.01-.017.428.005.02.01.013.104.074.015.004.012-.004.104-.074.012-.016.004-.017-.017-.427c-.002-.01-.009-.017-.017-.018m.265-.113-.013.002-.185.093-.01.01-.003.011.018.43.005.012.008.007.201.093c-.012.004.023 0 .029-.008l-.004-.014-.034-.614c-.003-.012-.01-.02-.02-.022m-.715.002a.023.023 0 0 0-.027.006l-.006.014-.034.614c0 .012.007.02.017.024l-.015-.002.201-.093.01-.008.004-.011.017-.43-.003-.012-.01-.01z'/><path fill='#0a3420ff' d='M12 2a6 6 0 0 1 5.996 5.775L18 8h1a2 2 0 0 1 1.995 1.85L21 10v10a2 2 0 0 1-1.85 1.995L19 22H5a2 2 0 0 1-1.995-1.85L3 20V10a2 2 0 0 1 1.85-1.995L5 8h1a6 6 0 0 1 6-6m7 8H5v10h14zm-7 2a2 2 0 0 1 1.134 3.647l-.134.085V17a1 1 0 0 1-1.993.117L11 17v-1.268A2 2 0 0 1 12 12m0-8a4 4 0 0 0-4 4h8a4 4 0 0 0-4-4'/></g></svg>
                      Shield
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24'><title>unlock_line</title><g id="unlock_line" fill='none'><path style={{color:"#156640"}} d='M24 0v24H0V0zM12.593 23.258l-.011.002-.071.035-.02.004-.014-.004-.071-.035c-.01-.004-.019-.001-.024.005l-.004.01-.017.428.005.02.01.013.104.074.015.004.012-.004.104-.074.012-.016.004-.017-.017-.427c-.002-.01-.009-.017-.017-.018m.265-.113-.013.002-.185.093-.01.01-.003.011.018.43.005.012.008.007.201.093c-.012.004.023 0 .029-.008l-.004-.014-.034-.614c-.003-.012-.01-.02-.02-.022m-.715.002a.023.023 0 0 0-.027.006l-.006.014-.034.614c0 .012.007.02.017.024l-.015-.002.201-.093.01-.008.004-.011.017-.43-.003-.012-.01-.01z'/><path fill='#0a3420ff' d='M12 2c1.091 0 2.117.292 3 .804a1 1 0 1 1-1 1.73A4 4 0 0 0 8 8l11 .001a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2h1a6 6 0 0 1 6-6m7 8H5v10h14zm-7 2a2 2 0 0 1 1.134 3.647l-.134.085V17a1 1 0 0 1-1.993.117L11 17v-1.268A2 2 0 0 1 12 12m7.918-6.979.966.26a1 1 0 0 1-.518 1.93l-.965-.258a1 1 0 0 1 .517-1.932M18.633 2.09a1 1 0 0 1 .707 1.225l-.129.482a1 1 0 1 1-1.932-.517l.13-.483a1 1 0 0 1 1.224-.707'/></g></svg>
                      Unshield
                    </span>
                  )}
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
                  onChange={(e) => {
                    setSelectedWrapper(e.target.value as `0x${string}`);
                    setInputValue("");
                  }}
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
                    onClick={() => refetchBalances()}
                    disabled={isDecrypting}
                    className="flex items-center gap-1.5 text-xs font-semibold text-[#156640] hover:text-[#0f4f30] transition disabled:opacity-50"
                    title="Click to decrypt your balance (requires wallet signature)"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                      {confidentialBalance !== undefined ? (
                        <>
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </>
                      ) : (
                        <>
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </>
                      )}
                    </svg>
                    {isDecrypting ? "Decrypting..." : confidentialBalance !== undefined ? "Visible" : "Decrypt"}
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

        {/* Right: pair details + step guide */}
        <div className="flex-1 space-y-4 hidden md:block">
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
              <Steps
                steps={[
                  { n: 1, title: "Approve", desc: "Authorize the wrapper contract to spend your ERC-20 tokens." },
                  { n: 2, title: "Shield (Wrap)", desc: "Your tokens are locked in the wrapper and confidential tokens are minted to your address." },
                  { n: 3, title: "Decrypt balance", desc: "Sign once in your wallet to reveal your encrypted balance — no gas required." },
                ]}
                active={wrap.state === "approving" ? 0 : wrap.state === "wrapping" ? 1 : wrap.state === "done" ? 2 : -1}
              />
            ) : (
              <Steps
                steps={[
                  { n: 1, title: "Submit unwrap", desc: "Your encrypted amount is submitted to the smart contract." },
                  { n: 2, title: "FHE decryption", desc: "The Zama relayer decrypts the amount off-chain (10–60s)." },
                  { n: 3, title: "Receive tokens", desc: "Your ERC-20 tokens are released back to your wallet." },
                ]}
                active={unwrap.state === "submitting" ? 0 : unwrap.state === "pending_decrypt" ? 1 : unwrap.state === "done" ? 2 : -1}
              />
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
        <div
          key={s.n}
          className={`flex gap-3 p-3 rounded-xl transition ${active === i ? "bg-[#f0faf5]" : ""}`}
        >
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
              active === i
                ? "bg-[#156640] text-white"
                : active > i
                ? "bg-green-100 text-green-600"
                : "bg-gray-100 text-gray-400"
            }`}
          >
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
