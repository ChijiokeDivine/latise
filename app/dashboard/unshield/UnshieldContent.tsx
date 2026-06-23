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
import { etherscanTx, CHAIN_IDS } from "@/app/lib/constants";
import type { EnrichedPair, Network } from "@/app/types";

function getTokenIconSrc(sym: string): string | null {
  if (sym.includes("USDC")) return "/cUSDCMock.svg";
  if (sym.includes("USDT")) return "/cUSDTMock.svg";
  if (sym.includes("WETH")) return "/cWETHMock.png";
  if (sym.includes("ZAMA")) return "/cZAMAMock.png";
  if (sym.includes("tGBP")) return "/ctGBPMock.png";
  if (sym.includes("XAUt")) return "/cXAUtMock.png";
  if (sym.includes("BRON")) return "/cBRONMock.webp";
  return null;
}

function TokenIcon({ symbol, size = 24 }: { symbol: string; size?: number }) {
  const src = getTokenIconSrc(symbol);
  return (
    <div className="rounded-full bg-[#d0ede2] flex items-center justify-center shrink-0 overflow-hidden" style={{ width: size, height: size }}>
      {src ? (
        <Image src={src} alt={symbol} width={size} height={size} className="h-full w-full object-cover" />
      ) : (
        <span style={{ fontSize: size * 0.4 }} className="font-bold text-[#156640]">{symbol.slice(0, 2).toUpperCase()}</span>
      )}
    </div>
  );
}

function TokenSelector({ pairs, selectedWrapper, onSelect, label, disabled }: {
  pairs: EnrichedPair[]; selectedWrapper: `0x${string}` | null;
  onSelect: (a: `0x${string}`) => void; label: string; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = pairs.find((p) => p.wrapperAddress === selectedWrapper);

  useEffect(() => {
    function outside(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button type="button" disabled={disabled} onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-gray-200 hover:border-gray-300 transition shadow-sm disabled:opacity-60 min-w-[120px]">
        {selected ? (
          <>
            <TokenIcon symbol={selected.wrapperSymbol} size={16} />
            <span className="text-xs font-semibold text-gray-800">{selected.wrapperSymbol}</span>
          </>
        ) : <span className="text-sm font-semibold text-gray-400">Select</span>}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className={`w-3.5 h-3.5 text-gray-400 ml-auto transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40 md:hidden" onClick={() => setOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[60vh] overflow-y-auto md:absolute md:bottom-auto md:left-auto md:right-0 md:top-full md:mt-1 md:rounded-xl md:shadow-lg md:w-60 md:max-h-none">
            <div className="p-2 border-b border-gray-100 md:hidden"><div className="w-10 h-1 bg-gray-200 rounded-full mx-auto" /></div>
            <div className="p-2">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 pb-1">{label}</p>
              {pairs.filter((p) => p.isValid).map((p) => (
                <button key={p.wrapperAddress} type="button" onClick={() => { onSelect(p.wrapperAddress); setOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-gray-50 transition ${selectedWrapper === p.wrapperAddress ? "bg-[#f0faf5]" : ""}`}>
                  <TokenIcon symbol={p.wrapperSymbol} size={28} />
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{p.wrapperSymbol}</div>
                    <div className="text-[11px] text-gray-400">{p.tokenSymbol}</div>
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

export default function UnshieldContent() {
  const searchParams = useSearchParams();
  const network = (searchParams.get("network") ?? "sepolia") as Network;
  const wrapperParam = searchParams.get("wrapper") as `0x${string}` | null;
  const [selectedWrapper, setSelectedWrapper] = useState<`0x${string}` | null>(wrapperParam);
  const [inputValue, setInputValue] = useState("");
  const { data: pairs = [] } = useRegistry(network);
  const { data: pair } = useRegistryPair(selectedWrapper ?? undefined, network);

  useEffect(() => { setSelectedWrapper(null); }, [network]);
  useEffect(() => { if (!selectedWrapper && pairs.length > 0) setSelectedWrapper(pairs[0].wrapperAddress); }, [pairs, selectedWrapper]);

  if (!pair) {
    return (
      <div className="p-4 md:p-8 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-[#156640] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-gray-400">{pairs.length > 0 ? "Loading pair…" : "No pairs available."}</p>
      </div>
    );
  }

  return <InnerUnshieldContent inputValue={inputValue} network={network} pair={pair} pairs={pairs} selectedWrapper={selectedWrapper} setInputValue={setInputValue} setSelectedWrapper={setSelectedWrapper} />;
}

interface InnerProps {
  inputValue: string; network: Network; pair: EnrichedPair; pairs: EnrichedPair[];
  selectedWrapper: `0x${string}` | null; setInputValue: (v: string) => void;
  setSelectedWrapper: (a: `0x${string}`) => void;
}

function InnerUnshieldContent({ inputValue, network, pair, pairs, selectedWrapper, setInputValue, setSelectedWrapper }: InnerProps) {
  const { login, authenticated } = usePrivy();
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { balances, refetch: refetchBalances, isDecrypting } = useTokenBalances(pair, network);
  const safeAddress = (address ?? "0x0000000000000000000000000000000000000000") as `0x${string}`;

  const correctChainId = CHAIN_IDS[network];
  const isWrongChain = authenticated && chainId !== correctChainId;

  const unwrap = useUnwrap({
    pair, network, userAddress: safeAddress,
    onSuccess: () => { setInputValue(""); refetchBalances(); },
  });

  const parsedAmount = parseTokenInput(inputValue, pair.wrapperDecimals);
  const expectedOut = parsedAmount > 0n ? parsedAmount * pair.rate : null;
  const confidentialBalance = balances?.confidentialBalance;
  const maxBalance = confidentialBalance ?? 0n;
  const isBusy = unwrap.state !== "idle";
  const insufficientBalance = authenticated && parsedAmount > 0n && parsedAmount > maxBalance;

  function handleMax() {
    setInputValue(formatTokenUnits(maxBalance, pair.wrapperDecimals, pair.wrapperDecimals, { useLocale: false }));
  }

  async function handleAction() {
    if (!authenticated) { login(); return; }
    if (isWrongChain) { switchChain?.({ chainId: correctChainId }); return; }
    if (!address || parsedAmount === 0n) return;
    await unwrap.execute(parsedAmount);
  }

  function getButtonLabel() {
    if (!authenticated) return "Connect Wallet";
    if (isWrongChain) return `Switch to ${network === "sepolia" ? "Sepolia" : "Mainnet"}`;
    if (unwrap.state === "encrypting" || unwrap.state === "decrypting") return "Encrypting…";
    if (unwrap.state === "submitting") return "Submitting…";
    if (unwrap.state === "pending_decrypt") return "Awaiting FHE Decryption…";
    if (unwrap.state === "done") return "✓ Unshielded!";
    if (unwrap.state === "error") return "Try Again";
    return "Unshield Capital";
  }

  const activeTxHash = unwrap.unwrapTxHash ?? unwrap.finalizedTxHash;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Unshield</h1>
        <p className="text-sm text-gray-500 mt-0.5">Convert encrypted tokens back into standard ERC-20 tokens</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="w-full max-w-md lg:max-w-[460px]">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-visible">
            {/* From (cToken) */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">You Unshield</span>
                {authenticated && (
                  <button onClick={() => refetchBalances()} disabled={isDecrypting}
                    className="text-xs text-[#156640] font-semibold hover:underline disabled:opacity-50 flex items-center gap-1">
                    {isDecrypting ? (
                      <><span className="w-3 h-3 border border-[#156640] border-t-transparent rounded-full animate-spin" />Decrypting…</>
                    ) : confidentialBalance !== undefined ? (
                      `Balance: ${formatTokenUnits(confidentialBalance, pair.wrapperDecimals, 2)} `
                    ) : "Decrypt balance"}
                  </button>
                )}
              </div>
              <div className={`bg-gray-50 rounded-xl p-4 border transition ${insufficientBalance ? "border-red-300" : "border-transparent"} focus-within:border-gray-300`}>
                <div className="flex items-center gap-3">
                  <input
                    type="number" placeholder="0" value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)} disabled={isBusy}
                    className="flex-1 bg-transparent text-xl font-light text-gray-900 outline-none disabled:opacity-50 min-w-0"
                  />
                  <TokenSelector pairs={pairs} selectedWrapper={selectedWrapper}
                    onSelect={(a) => { setSelectedWrapper(a); setInputValue(""); }}
                    label="Select token to unshield" disabled={isBusy} />
                </div>
                {insufficientBalance && <p className="text-xs text-red-500 mt-2 font-medium">Insufficient balance</p>}
                {authenticated && confidentialBalance === undefined && !isDecrypting && (
                  <p className="text-xs text-amber-600 mt-2">Decrypt your balance to see available amount</p>
                )}
              </div>
              {authenticated && confidentialBalance !== undefined && (
                <button onClick={handleMax} className="mt-2 text-xs text-[#156640] font-semibold hover:underline">
                  Max: {formatTokenUnits(maxBalance, pair.wrapperDecimals, 2)}
                </button>
              )}
            </div>

            {/* Arrow */}
            <div className="relative flex items-center justify-center -my-1 z-10">
              <div className="absolute inset-x-0 h-px bg-gray-100" />
              <div className="relative bg-white border-2 border-gray-200 rounded-xl p-2 shadow-sm">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4 text-[#156640]">
                  <path d="M12 5v14M5 12l7 7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            {/* To (ERC-20) */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">You Receive</span>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-transparent">
                <div className="flex items-center gap-3">
                  <span className="flex-1 text-xl font-light text-gray-500">
                    {expectedOut !== null ? formatTokenUnits(expectedOut, pair.tokenDecimals, 2) : "0"}
                  </span>
                  <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-gray-200 shadow-sm min-w-[110px]">
                    <TokenIcon symbol={pair.wrapperSymbol} size={16} />
                    <span className="text-xs font-semibold text-gray-800">{pair.tokenSymbol}</span>
                  </div>
                </div>
              </div>
            </div>

            

            {/* Pending decrypt banner */}
            {unwrap.state === "pending_decrypt" && (
              <div className="px-4 py-3 border-t border-amber-100 bg-amber-50">
                <div className="flex items-center gap-2 text-sm text-amber-700 font-medium">
                  <span className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin shrink-0" />
                  Zama FHE network decrypting…
                </div>
                <p className="text-xs text-amber-600 mt-1">
                  This takes 10–60s. Your funds are safe.
                  {unwrap.elapsedMs > 0 && ` (${Math.floor(unwrap.elapsedMs / 1000)}s)`}
                </p>
              </div>
            )}

            {/* Progress */}
            {(unwrap.state === "encrypting" || unwrap.state === "decrypting" || unwrap.state === "submitting") && (
              <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-2 text-sm text-gray-600">
                <span className="w-4 h-4 border-2 border-[#156640] border-t-transparent rounded-full animate-spin shrink-0" />
                {unwrap.state === "submitting" ? "Submitting to blockchain…" : "Encrypting amount…"}
              </div>
            )}

            {/* Error */}
            {unwrap.errorMessage && (
              <div className="px-4 py-3 border-t border-red-100 bg-red-50 text-sm text-red-600">{unwrap.errorMessage}</div>
            )}

            {/* Tx link */}
            {activeTxHash && (
              <div className="px-4 py-2.5 border-t border-gray-100">
                <a href={etherscanTx(activeTxHash, network)} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-[#156640] hover:underline flex items-center gap-1.5 font-medium">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  View transaction
                </a>
              </div>
            )}

            <div className="p-4 pt-2">
              <button onClick={handleAction}
                disabled={(isBusy && unwrap.state !== "error") || (authenticated && parsedAmount === 0n)}
                className={`w-full py-4 rounded-xl font-semibold text-base transition ${
                  isBusy && unwrap.state !== "error" ? "bg-[#171717]/40 text-white cursor-wait"
                  : authenticated && parsedAmount === 0n ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-[#171717] hover:bg-[#333] text-white cursor-pointer"
                }`}
              >
                {getButtonLabel()}
              </button>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 space-y-4 w-full lg:w-auto hidden md:block">
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">How unshielding works</h3>
            <Steps
              steps={[
                { n: 1, title: "Encrypt amount", desc: "The SDK encrypts your amount locally before sending." },
                { n: 2, title: "FHE Decryption", desc: "The Zama relayer decrypts the amount off-chain (10–60s)." },
                { n: 3, title: "Receive tokens", desc: "ERC-20 tokens are released to your wallet." },
              ]}
              active={
                unwrap.state === "encrypting" || unwrap.state === "decrypting" ? 0
                : unwrap.state === "submitting" || unwrap.state === "pending_decrypt" ? 1
                : unwrap.state === "done" ? 2 : -1
              }
            />
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Pair Details</h3>
            <div className="space-y-0">
              {[
                { label: "Wrapper", value: pair.wrapperSymbol },
                { label: "Underlying", value: pair.tokenSymbol },
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
