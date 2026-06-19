// app/dashboard/unshield/UnshieldContent.tsx
"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { useRegistry, useRegistryPair } from "@/app/hooks/useRegistry";
import { useUnwrap } from "@/app/hooks/useUnwrap";
import { useTokenBalances } from "@/app/hooks/useTokenBalances";
import { parseTokenInput, formatTokenUnits } from "@/app/lib/format";
import { computeExpectedWrapAmount } from "@/app/lib/wrapper";
import { etherscanTx, CHAIN_IDS } from "@/app/lib/constants";
import type { EnrichedPair, Network } from "@/app/types";

function getTokenIconSrc(wrapperSymbol: string): string | null {
  if (wrapperSymbol.includes("USDC")) {
    return "/cUSDCMock.svg";
  }
  if (wrapperSymbol.includes("USDT")) {
    return "/cUSDTMock.svg";
  }
  if (wrapperSymbol.includes("WETH")) {
    return "/cWETHMock.png";
  }
  if (wrapperSymbol.includes("ZAMA")) {
    return "/cZAMAMock.png";
  }
  if (wrapperSymbol.includes("tGBP")) {
    return "/ctGBPMock.png";
  }
  if (wrapperSymbol.includes("XAUt")) {
    return "/cXAUtMock.png";
  }
  if (wrapperSymbol.includes("BRON")) {
    return "/cBRONMock.webp";
  }
  return null;
}

export default function UnshieldContent() {
  const searchParams = useSearchParams();
  const network = (searchParams.get("network") ?? "sepolia") as Network;
  const wrapperParam = searchParams.get("wrapper") as `0x${string}` | null;

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
          <h1 className="text-2xl font-bold text-gray-900">Unshield</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Unshield confidential tokens into ERC-20 tokens
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-sm text-gray-500 shadow-sm">
          {pairs.length > 0
            ? "Loading selected vault pair..."
            : "No vault pairs are available for this network yet."}
        </div>
      </div>
    );
  }

  return (
    <InnerUnshieldContent
      inputValue={inputValue}
      network={network}
      pair={pair}
      pairs={pairs}
      selectedWrapper={selectedWrapper}
      setInputValue={setInputValue}
      setSelectedWrapper={setSelectedWrapper}
    />
  );
}

interface InnerUnshieldContentProps {
  inputValue: string;
  network: Network;
  pair: EnrichedPair;
  pairs: EnrichedPair[];
  selectedWrapper: `0x${string}` | null;
  setInputValue: (value: string) => void;
  setSelectedWrapper: (wrapper: `0x${string}`) => void;
}

function InnerUnshieldContent({
  inputValue,
  network,
  pair,
  pairs,
  selectedWrapper,
  setInputValue,
  setSelectedWrapper,
}: InnerUnshieldContentProps) {
  const { login, authenticated } = usePrivy();
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { balances, refetch: refetchBalances } = useTokenBalances(pair, network);
  const safeUserAddress =
    (address ?? "0x0000000000000000000000000000000000000000") as `0x${string}`;

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const correctChainId = CHAIN_IDS[network];
  const isWrongChain = authenticated && chainId !== correctChainId;

  const unwrap = useUnwrap({
    pair,
    network,
    userAddress: safeUserAddress,
    onSuccess: () => {
      setInputValue("");
      refetchBalances();
    },
  });

  const parsedAmount = parseTokenInput(inputValue, pair.wrapperDecimals);
  // For unshielding: wrapperAmount * rate = underlyingAmount
  const expectedReceiveAmount = parsedAmount > 0n ? parsedAmount * pair.rate : null;

  const confidentialBalance = balances?.confidentialBalance;

  const maxBalance = confidentialBalance ?? 0n;
  const maxDecimals = pair.wrapperDecimals;

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

    await unwrap.execute(parsedAmount);
  }

  const isUnshielding = unwrap.state !== "idle";
  const isBusy = isUnshielding;

  function getButtonLabel() {
    if (!authenticated) return "Connect Wallet";
    if (isWrongChain) return `Switch to ${network === "sepolia" ? "Sepolia" : "Mainnet"}`;
    if (unwrap.state === "encrypting") return "Encrypting…";
    if (unwrap.state === "submitting") return "Submitting…";
    if (unwrap.state === "pending_decrypt") return "Decrypting…";
    if (unwrap.state === "done") return "✓ Unshielded!";
    if (unwrap.state === "error") return "Try Again";
    return "Unshield Capital";
  }

  const activeError = unwrap.errorMessage;
  const activeTxHash = unwrap.unwrapTxHash ?? unwrap.finalizedTxHash;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Unshield</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Unshield confidential tokens into ERC-20 tokens
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Left: unshield card */}
        <div className="flex-2 max-w-full md:max-w-lg">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-5 space-y-4">
              {/* You unshield section */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    You unshield
                  </label>
                  {authenticated && (
                    <button
                      onClick={handleMax}
                      className="text-xs text-[#171717]/60 font-semibold hover:underline"
                    >
                      Max: {formatTokenUnits(maxBalance, maxDecimals, 4)}
                    </button>
                  )}
                </div>
                <div ref={dropdownRef} className="relative">
                  <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 cursor-pointer hover:border-gray-300" onClick={() => setDropdownOpen(!dropdownOpen)}>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      disabled={isBusy}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 bg-transparent text-xl font-light text-gray-900 outline-none disabled:opacity-50"
                    />
                    <div className="flex items-center gap-2 ml-2">
                      <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center shrink-0 overflow-hidden">
                        {getTokenIconSrc(pair.wrapperSymbol) ? (
                          <Image
                            src={getTokenIconSrc(pair.wrapperSymbol)!}
                            alt={pair.wrapperSymbol}
                            width={16}
                            height={16}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          pair.wrapperSymbol.slice(1, 3).toUpperCase()
                        )}
                      </div>
                      <span className="text-xs font-semibold text-gray-500">
                        {pair.wrapperSymbol}
                      </span>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`w-4 h-4 text-gray-400 hidden md:block transition-transform ${dropdownOpen ? "rotate-180" : ""}`}>
                        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>

                  {/* Dropdown menu */}
                  {dropdownOpen && (
                    <div className="absolute top-full right-0 mt-1 w-fit min-w-[200px] bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50">
                      {pairs.filter((p) => p.isValid).map((p) => (
                        <button
                          key={p.wrapperAddress}
                          onClick={() => {
                            setSelectedWrapper(p.wrapperAddress);
                            setInputValue("");
                            setDropdownOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition ${selectedWrapper === p.wrapperAddress ? "bg-[#f0faf5]" : ""}`}
                        >
                          <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center shrink-0 overflow-hidden">
                            {getTokenIconSrc(p.wrapperSymbol) ? (
                              <Image
                                src={getTokenIconSrc(p.wrapperSymbol)!}
                                alt={p.wrapperSymbol}
                                width={16}
                                height={16}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              p.wrapperSymbol.slice(1, 3).toUpperCase()
                            )}
                          </div>
                          <span className="text-xs font-semibold text-gray-900">
                            {p.wrapperSymbol}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Insufficient balance error */}
                {authenticated && parsedAmount > maxBalance && (
                  <div className="mt-1 text-xs text-red-600">
                    Insufficient balance
                  </div>
                )}
              </div>

              {/* You receive section */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    You receive
                  </label>
                </div>
                <div className="flex items-center justify-between  border border-gray-200 rounded-lg px-4 py-3">
                  <span className="text-xl font-light text-gray-700">
                    {expectedReceiveAmount !== null ? formatTokenUnits(expectedReceiveAmount, pair.tokenDecimals, 4) : "0.00"}
                  </span>
                  <div className="flex items-center gap-2 ml-2 relative">
                    <div className="w-4 h-4 rounded-full bg-[#d0ede2] flex items-center justify-center shrink-0 overflow-hidden">
                      {getTokenIconSrc(pair.wrapperSymbol) ? (
                        <Image
                          src={getTokenIconSrc(pair.wrapperSymbol)!}
                          alt={pair.tokenSymbol}
                          width={16}
                          height={16}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        pair.tokenSymbol.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <span className="text-xs font-semibold text-[#171717]/60">
                      {pair.tokenSymbol}
                    </span>
                    {/* Checkmark */}
                    {/* <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#156640] rounded-full flex items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} className="w-3 h-3">
                        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div> */}
                  </div>
                </div>
              </div>

              {/* Balance decrypt widget */}
              {authenticated && (
                <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-100">
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
                    {confidentialBalance !== undefined ? "Visible" : "Decrypt"}
                  </button>
                </div>
              )}

              {/* Error */}
              {activeError && (
                <div className="px-3 py-2.5 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
                  {activeError}
                </div>
              )}

              {/* Pending decrypt message */}
              {unwrap.state === "pending_decrypt" && (
                <div className="px-3 py-2.5 bg-amber-50 border border-amber-100 rounded-lg">
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
                disabled={isBusy && unwrap.state !== "error"}
                className={`w-full py-3.5 rounded-lg font-semibold text-sm cursor-pointer transition ${
                  isBusy && unwrap.state !== "error"
                    ? "bg-[#171717]/50 text-white cursor-wait"
                    : "bg-[#171717]/80 hover:bg-[#171717] text-white"
                }`}
              >
                {getButtonLabel()}
              </button>
            </div>
          </div>
        </div>

        {/* Right: pair details + step guide (desktop only) */}
        <div className="flex-1 space-y-4 hidden md:block">
          {pair && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
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
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
              How unshielding works
            </h3>
            <Steps
              steps={[
                { n: 1, title: "Submit unwrap", desc: "Your encrypted amount is submitted to the smart contract." },
                { n: 2, title: "FHE decryption", desc: "The Zama relayer decrypts the amount off-chain (10–60s)." },
                { n: 3, title: "Receive tokens", desc: "Your ERC-20 tokens are released back to your wallet." },
              ]}
              active={unwrap.state === "submitting" ? 0 : unwrap.state === "pending_decrypt" ? 1 : unwrap.state === "done" ? 2 : -1}
            />
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
          className={`flex gap-3 p-3 rounded-lg transition ${active === i ? "bg-[#f0faf5]" : ""}`}
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
