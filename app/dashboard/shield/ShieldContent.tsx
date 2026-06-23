// app/dashboard/shield/ShieldContent.tsx
"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { useRegistry, useRegistryPair } from "@/app/hooks/useRegistry";
import { useWrap } from "@/app/hooks/useWrap";
import { useTokenBalances } from "@/app/hooks/useTokenBalances";
import { parseTokenInput, formatTokenUnits } from "@/app/lib/format";
import { computeExpectedWrapAmount } from "@/app/lib/wrapper";
import { etherscanTx, CHAIN_IDS } from "@/app/lib/constants";
import type { EnrichedPair, Network } from "@/app/types";

function getTokenIconSrc(wrapperSymbol: string): string | null {
  if (wrapperSymbol.includes("USDC")) return "/cUSDCMock.svg";
  if (wrapperSymbol.includes("USDT")) return "/cUSDTMock.svg";
  if (wrapperSymbol.includes("WETH")) return "/cWETHMock.png";
  if (wrapperSymbol.includes("ZAMA")) return "/cZAMAMock.png";
  if (wrapperSymbol.includes("tGBP")) return "/ctGBPMock.png";
  if (wrapperSymbol.includes("XAUt")) return "/cXAUtMock.png";
  if (wrapperSymbol.includes("BRON")) return "/cBRONMock.webp";
  return null;
}

function TokenIcon({ symbol, size = 16 }: { symbol: string; size?: number }) {
  const src = getTokenIconSrc(symbol);
  return (
    <div
      className="rounded-full bg-[#d0ede2] flex items-center justify-center shrink-0 overflow-hidden"
      style={{ width: size, height: size }}
    >
      {src ? (
        <Image src={src} alt={symbol} width={size} height={size} className="h-full w-full object-cover" />
      ) : (
        <span style={{ fontSize: size * 0.4 }} className="font-bold text-[#156640]">
          {symbol.slice(0, 2).toUpperCase()}
        </span>
      )}
    </div>
  );
}

function TokenSelector({
  pairs,
  selectedWrapper,
  onSelect,
  label,
  disabled,
}: {
  pairs: EnrichedPair[];
  selectedWrapper: `0x${string}` | null;
  onSelect: (addr: `0x${string}`) => void;
  label: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = pairs.find((p) => p.wrapperAddress === selectedWrapper);

  useEffect(() => {
    function outside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-gray-200 hover:border-gray-300 transition shadow-sm disabled:opacity-60 disabled:cursor-not-allowed min-w-[110px]"
      >
        {selected ? (
          <>
            <TokenIcon symbol={selected.wrapperSymbol} size={14} />
            <span className="text-xs font-semibold text-gray-800">{selected.tokenSymbol}</span>
          </>
        ) : (
          <span className="text-sm font-semibold text-gray-400">Select</span>
        )}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className={`w-3.5 h-3.5 text-gray-400 ml-auto transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <>
          {/* Mobile backdrop */}
          <div className="fixed inset-0 bg-black/20 z-40 md:hidden" onClick={() => setOpen(false)} />
          {/* Dropdown — bottom sheet on mobile, popover on desktop */}
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[60vh] overflow-y-auto md:absolute md:bottom-auto md:left-auto md:right-0 md:top-full md:mt-1 md:rounded-xl md:shadow-lg md:w-56 md:max-h-none">
            <div className="p-2 border-b border-gray-100 md:hidden">
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto" />
            </div>
            <div className="p-2">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 pb-1">{label}</p>
              {pairs.filter((p) => p.isValid).map((p) => (
                <button
                  key={p.wrapperAddress}
                  type="button"
                  onClick={() => { onSelect(p.wrapperAddress); setOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-gray-50 transition ${selectedWrapper === p.wrapperAddress ? "bg-[#f0faf5]" : ""}`}
                >
                  <TokenIcon symbol={p.wrapperSymbol} size={16} />
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{p.tokenSymbol}</div>
                    <div className="text-[11px] text-gray-400">{p.tokenName}</div>
                  </div>
                  {selectedWrapper === p.wrapperAddress && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4 text-[#156640] ml-auto">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function ShieldContent() {
  const searchParams = useSearchParams();
  const network = (searchParams.get("network") ?? "sepolia") as Network;
  const wrapperParam = searchParams.get("wrapper") as `0x${string}` | null;

  const [selectedWrapper, setSelectedWrapper] = useState<`0x${string}` | null>(wrapperParam);
  const [inputValue, setInputValue] = useState("");

  const { data: pairs = [] } = useRegistry(network);
  const { data: pair } = useRegistryPair(selectedWrapper ?? undefined, network);

  useEffect(() => { setSelectedWrapper(null); }, [network]);
  useEffect(() => {
    if (!selectedWrapper && pairs.length > 0) setSelectedWrapper(pairs[0].wrapperAddress);
  }, [pairs, selectedWrapper]);

  if (!pair) {
    return (
      <div className="p-4 md:p-8 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-[#156640] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-gray-400">
          {pairs.length > 0 ? "Loading pair…" : "No pairs available for this network."}
        </p>
      </div>
    );
  }

  return <InnerShieldContent inputValue={inputValue} network={network} pair={pair} pairs={pairs} selectedWrapper={selectedWrapper} setInputValue={setInputValue} setSelectedWrapper={setSelectedWrapper} />;
}

interface InnerProps {
  inputValue: string;
  network: Network;
  pair: EnrichedPair;
  pairs: EnrichedPair[];
  selectedWrapper: `0x${string}` | null;
  setInputValue: (v: string) => void;
  setSelectedWrapper: (addr: `0x${string}`) => void;
}

function InnerShieldContent({ inputValue, network, pair, pairs, selectedWrapper, setInputValue, setSelectedWrapper }: InnerProps) {
  const { login, authenticated } = usePrivy();
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { balances, allowance, refetch: refetchBalances, isDecrypting } = useTokenBalances(pair, network);

  const correctChainId = CHAIN_IDS[network];
  const isWrongChain = authenticated && chainId !== correctChainId;

  const wrap = useWrap({
    pair, network,
    onSuccess: () => { setInputValue(""); refetchBalances(); },
  });

  const parsedAmount = parseTokenInput(inputValue, pair.tokenDecimals);
  const expectedOut = parsedAmount > 0n ? computeExpectedWrapAmount(parsedAmount, pair.rate).wrapperUnits : null;
  const underlyingBalance = balances?.underlyingBalance ?? 0n;
  const isBusy = wrap.state !== "idle";

  function handleMax() {
    setInputValue(formatTokenUnits(underlyingBalance, pair.tokenDecimals, pair.tokenDecimals, { useLocale: false }));
  }

  async function handleAction() {
    if (!authenticated) { login(); return; }
    if (isWrongChain) { switchChain?.({ chainId: correctChainId }); return; }
    if (!address || parsedAmount === 0n) return;
    await wrap.execute({ underlyingAmount: parsedAmount, toAddress: address });
  }

  function getButtonLabel() {
    if (!authenticated) return "Connect Wallet";
    if (isWrongChain) return `Switch to ${network === "sepolia" ? "Sepolia" : "Mainnet"}`;
    if (wrap.state === "approving") return "Approving…";
    if (wrap.state === "wrapping") return "Shielding…";
    if (wrap.state === "done") return "✓ Shielded!";
    if (wrap.state === "error") return "Try Again";
    if (allowance !== undefined && parsedAmount > 0n && allowance < parsedAmount) return "Approve & Shield";
    return "Shield Capital";
  }

  const needsApprove = allowance !== undefined && parsedAmount > 0n && allowance < parsedAmount;
  const insufficientBalance = authenticated && parsedAmount > 0n && parsedAmount > underlyingBalance;
  const activeTxHash = wrap.wrapTxHash ?? wrap.approveTxHash;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Shield</h1>
        <p className="text-sm text-gray-500 mt-0.5">Convert ERC-20 tokens into encrypted confidential tokens</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Swap Card */}
        <div className="w-full max-w-md lg:max-w-[460px]">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-visible">
            {/* From box */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">You Shield</span>
                {authenticated && (
                  <button onClick={handleMax} className="text-xs text-[#156640] font-semibold hover:underline">
                    Balance: {formatTokenUnits(underlyingBalance, pair.tokenDecimals, 2)} 
                  </button>
                )}
              </div>
              <div className={`bg-gray-50 rounded-xl p-4 border transition ${insufficientBalance ? "border-red-300" : "border-transparent"} focus-within:border-gray-300`}>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    placeholder="0"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    disabled={isBusy}
                    className="flex-1 bg-transparent text-xl font-light text-gray-900 outline-none disabled:opacity-50 min-w-0"
                  />
                  <TokenSelector
                    pairs={pairs}
                    selectedWrapper={selectedWrapper}
                    onSelect={(addr) => { setSelectedWrapper(addr); setInputValue(""); }}
                    label=""
                    disabled={isBusy}
                  />
                </div>
                {insufficientBalance && (
                  <p className="text-xs text-red-500 mt-2 font-medium">Insufficient balance</p>
                )}
              </div>
            </div>

            {/* Arrow divider */}
            <div className="relative flex items-center justify-center -my-1 z-10">
              <div className="absolute inset-x-0 h-px bg-gray-100" />
              <div className="relative bg-white border-2 border-gray-200 rounded-xl p-2 shadow-sm">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4 text-[#156640]">
                  <path d="M12 5v14M5 12l7 7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            {/* To box */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">You Receive</span>
                {authenticated && (
                  <button
                    onClick={() => refetchBalances()}
                    disabled={isDecrypting}
                    className="text-xs text-[#156640] font-semibold hover:underline disabled:opacity-50 flex items-center gap-1"
                  >
                    {isDecrypting ? (
                      <><span className="w-3 h-3 border border-[#156640] border-t-transparent rounded-full animate-spin" />Decrypting…</>
                    ) : balances?.confidentialBalance !== undefined ? (
                      `Balance: ${formatTokenUnits(balances.confidentialBalance, pair.wrapperDecimals, 2)}`
                    ) : (
                      "Decrypt balance"
                    )}
                  </button>
                )}
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-transparent">
                <div className="flex items-center gap-3">
                  <span className="flex-1 text-xl font-light text-gray-500">
                    {expectedOut !== null ? formatTokenUnits(expectedOut, pair.wrapperDecimals, 4) : "0"}
                  </span>
                  <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-gray-200 shadow-sm min-w-[110px]">
                    <div className="w-[16px] h-[16px] rounded-full bg-white border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
                      {getTokenIconSrc(pair.wrapperSymbol) ? (
                        <Image src={getTokenIconSrc(pair.wrapperSymbol)!} alt={pair.wrapperSymbol} width={16} height={16} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-[9px] font-bold text-[#156640]">{pair.wrapperSymbol.slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-gray-800">{pair.wrapperSymbol}</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3 text-[#156640] ml-auto">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

           

            

            {/* Progress states */}
            {(wrap.state === "approving" || wrap.state === "wrapping") && (
              <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-2 text-sm text-gray-600">
                <span className="w-4 h-4 border-2 border-[#156640] border-t-transparent rounded-full animate-spin shrink-0" />
                {wrap.state === "approving" ? "Approving token spend…" : "Shielding tokens…"}
              </div>
            )}

            {/* Error */}
            {wrap.errorMessage && (
              <div className="px-4 py-3 border-t border-red-100 bg-red-50 text-sm text-red-600">
                {wrap.errorMessage}
              </div>
            )}

            {/* Tx link */}
            {activeTxHash && (
              <div className="px-4 py-2.5 border-t border-gray-100 flex items-center gap-2">
                <a
                  href={etherscanTx(activeTxHash, network)}
                  target="_blank" rel="noopener noreferrer"
                  className="text-xs text-[#156640] hover:underline flex items-center gap-1.5 font-medium"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  View transaction
                </a>
              </div>
            )}

            {/* Action button */}
            <div className="p-4 pt-2">
              <button
                onClick={handleAction}
                disabled={(isBusy && wrap.state !== "error") || (authenticated && parsedAmount === 0n)}
                className={`w-full py-4 rounded-xl font-semibold text-base transition ${ 
                  isBusy && wrap.state !== "error"
                    ? "bg-[#171717]/40 text-white cursor-wait"
                    : authenticated && parsedAmount === 0n
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-[#171717] hover:bg-[#333] text-white cursor-pointer"
                }`}
              >
                {getButtonLabel()}
              </button>
            </div>
          </div>
        </div>

        {/* Right panel — How it works + Pair details */}
        <div className="flex-1 space-y-4 w-full lg:w-auto">
          {/* Progress steps */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">How shielding works</h3>
            <Steps
              steps={[
                { n: 1, title: "Approve", desc: "Authorize the wrapper contract to spend your ERC-20 tokens." },
                { n: 2, title: "Shield (Wrap)", desc: "Your tokens are locked and encrypted cTokens are minted to you." },
                { n: 3, title: "Private balance", desc: "Sign once to decrypt your balance — no gas required." },
              ]}
              active={wrap.state === "approving" ? 0 : wrap.state === "wrapping" ? 1 : wrap.state === "done" ? 2 : -1}
            />
          </div>

          {/* Pair details */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Pair Details</h3>
            <div className="space-y-0">
              {[
                { label: "Token", value: `${pair.tokenSymbol} (${pair.tokenName})` },
                { label: "Wrapper", value: `${pair.wrapperSymbol}` },
                { label: "Decimals", value: `${pair.tokenDecimals} → ${pair.wrapperDecimals}` },
                { label: "Rate", value: `1 ${pair.wrapperSymbol} = ${Number(pair.rate).toLocaleString()} ${pair.tokenSymbol}` },
                { label: "Status", value: pair.isValid ? "Active ✓" : "Revoked ✗" },
              ].map((row) => (
                <div key={row.label} className="flex justify-between items-center py-2.5 border-b border-gray-50 last:border-0">
                  <span className="text-xs text-gray-400 font-medium">{row.label}</span>
                  <span className="text-xs font-semibold text-gray-700">{row.value}</span>
                </div>
              ))}
            </div>
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
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${active === i ? "bg-[#156640] text-white" : active > i ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}>
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
