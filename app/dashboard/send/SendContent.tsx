// app/dashboard/send/SendContent.tsx
"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { useRegistry, useRegistryPair } from "@/app/hooks/useRegistry";
import { useConfidentialTransfer } from "@/app/hooks/useConfidentialTransfer";
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
          <><TokenIcon symbol={selected.wrapperSymbol} size={16} /><span className="text-xs font-semibold text-gray-800">{selected.wrapperSymbol}</span></>
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
                  <TokenIcon symbol={p.wrapperSymbol} size={16} />
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{p.wrapperSymbol}</div>
                    <div className="text-[11px] text-gray-400">{p.tokenSymbol} wrapper</div>
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

function isValidAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(addr);
}

export default function SendContent() {
  const searchParams = useSearchParams();
  const network = (searchParams.get("network") ?? "sepolia") as Network;
  const wrapperParam = searchParams.get("wrapper") as `0x${string}` | null;
  const [selectedWrapper, setSelectedWrapper] = useState<`0x${string}` | null>(wrapperParam);
  const [inputValue, setInputValue] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");

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

  return (
    <InnerSendContent
      inputValue={inputValue} network={network} pair={pair} pairs={pairs}
      selectedWrapper={selectedWrapper} setInputValue={setInputValue}
      setSelectedWrapper={setSelectedWrapper} recipientAddress={recipientAddress}
      setRecipientAddress={setRecipientAddress}
    />
  );
}

interface InnerProps {
  inputValue: string; network: Network; pair: EnrichedPair; pairs: EnrichedPair[];
  selectedWrapper: `0x${string}` | null; setInputValue: (v: string) => void;
  setSelectedWrapper: (a: `0x${string}`) => void;
  recipientAddress: string; setRecipientAddress: (v: string) => void;
}

function InnerSendContent({ inputValue, network, pair, pairs, selectedWrapper, setInputValue, setSelectedWrapper, recipientAddress, setRecipientAddress }: InnerProps) {
  const { login, authenticated } = usePrivy();
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { balances, refetch: refetchBalances, isDecrypting } = useTokenBalances(pair, network);

  const correctChainId = CHAIN_IDS[network];
  const isWrongChain = authenticated && chainId !== correctChainId;

  const transfer = useConfidentialTransfer({
    pair, network,
    onSuccess: () => { setInputValue(""); refetchBalances(); },
  });

  const parsedAmount = parseTokenInput(inputValue, pair.wrapperDecimals);
  const confidentialBalance = balances?.confidentialBalance;
  const maxBalance = confidentialBalance ?? 0n;
  const isBusy = transfer.state !== "idle";
  const insufficientBalance = authenticated && parsedAmount > 0n && parsedAmount > maxBalance;
  const validRecipient = isValidAddress(recipientAddress);
  const canSend = authenticated && parsedAmount > 0n && validRecipient && !insufficientBalance;

  function handleMax() {
    setInputValue(formatTokenUnits(maxBalance, pair.wrapperDecimals, pair.wrapperDecimals, { useLocale: false }));
  }

  async function handleAction() {
    if (!authenticated) { login(); return; }
    if (isWrongChain) { switchChain?.({ chainId: correctChainId }); return; }
    if (!address || parsedAmount === 0n || !validRecipient) return;
    await transfer.execute({ to: recipientAddress as `0x${string}`, amount: parsedAmount });
  }

  function getButtonLabel() {
    if (!authenticated) return "Connect Wallet";
    if (isWrongChain) return `Switch to ${network === "sepolia" ? "Sepolia" : "Mainnet"}`;
    if (transfer.state === "encrypting") return "Encrypting…";
    if (transfer.state === "submitting") return "Sending…";
    if (transfer.state === "done") return "✓ Sent!";
    if (transfer.state === "error") return "Try Again";
    if (!validRecipient && recipientAddress.length > 0) return "Invalid address";
    return "Send Confidentially";
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Send</h1>
        <p className="text-sm text-gray-500 mt-0.5">Transfer encrypted tokens privately — amounts are never revealed on-chain</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="w-full max-w-md lg:max-w-[460px]">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-visible">
            {/* Amount section */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Amount</span>
                {authenticated && (
                  <button onClick={() => refetchBalances()} disabled={isDecrypting}
                    className="text-xs text-[#156640] font-semibold hover:underline disabled:opacity-50 flex items-center gap-1">
                    {isDecrypting ? (
                      <><span className="w-3 h-3 border border-[#156640] border-t-transparent rounded-full animate-spin" />Decrypting…</>
                    ) : confidentialBalance !== undefined ? (
                      `Balance: ${formatTokenUnits(confidentialBalance, pair.wrapperDecimals, 2)}`
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
                    label="Select token to send" disabled={isBusy} />
                </div>
                {insufficientBalance && <p className="text-xs text-red-500 mt-2 font-medium">Insufficient balance</p>}
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
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            {/* Recipient */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Recipient</span>
                {validRecipient && (
                  <span className="text-xs text-[#156640] font-semibold flex items-center gap-1">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Valid address
                  </span>
                )}
              </div>
              <div className={`bg-gray-50 rounded-xl px-4 py-3.5 border transition focus-within:border-gray-300 ${recipientAddress.length > 0 && !validRecipient ? "border-red-300" : "border-transparent"}`}>
                <input
                  type="text"
                  placeholder="0x..."
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  disabled={isBusy}
                  className="w-full bg-transparent text-sm font-mono text-gray-900 outline-none disabled:opacity-50 placeholder-gray-400"
                  spellCheck={false}
                  autoComplete="off"
                />
              </div>
              {recipientAddress.length > 0 && !validRecipient && (
                <p className="text-xs text-red-500 mt-1.5 font-medium">Enter a valid 0x Ethereum address</p>
              )}
            </div>

            {/* Progress */}
            {(transfer.state === "encrypting" || transfer.state === "submitting") && (
              <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-2 text-sm text-gray-600">
                <span className="w-4 h-4 border-2 border-[#156640] border-t-transparent rounded-full animate-spin shrink-0" />
                {transfer.state === "encrypting" ? "Encrypting transfer…" : "Broadcasting transaction…"}
              </div>
            )}

            {/* Error */}
            {transfer.errorMessage && (
              <div className="px-4 py-3 border-t border-red-100 bg-red-50 text-sm text-red-600">{transfer.errorMessage}</div>
            )}

            {/* Tx link */}
            {transfer.transferTxHash && (
              <div className="px-4 py-2.5 border-t border-gray-100">
                <a href={etherscanTx(transfer.transferTxHash, network)} target="_blank" rel="noopener noreferrer"
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
                disabled={(isBusy && transfer.state !== "error") || (authenticated && !canSend)}
                className={`w-full py-4 rounded-xl font-semibold text-base transition ${
                  isBusy && transfer.state !== "error" ? "bg-[#171717]/40 text-white cursor-wait"
                  : authenticated && !canSend ? "bg-gray-100 text-gray-400 cursor-not-allowed"
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
            <h3 className="text-sm font-semibold text-gray-700 mb-4">How private transfer works</h3>
            <div className="space-y-3">
              {[
                { n: 1, title: "Encrypt locally", desc: "Your amount is encrypted using FHE before leaving your device.", active: transfer.state === "encrypting" },
                { n: 2, title: "Submit transfer", desc: "The encrypted amount is submitted — observers see no value.", active: transfer.state === "submitting" },
                { n: 3, title: "Private receipt", desc: "The recipient receives the encrypted tokens in their wallet.", active: transfer.state === "done" },
              ].map((s, i) => (
                <div key={s.n} className={`flex gap-3 p-3 rounded-xl transition ${s.active ? "bg-[#f0faf5]" : ""}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${s.active ? "bg-[#156640] text-white" : transfer.state === "done" && i < 2 ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                    {transfer.state === "done" && i < 2 ? "✓" : s.n}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-800">{s.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Token Info</h3>
            <div className="space-y-0">
              {[
                { label: "Token", value: pair.wrapperSymbol },
                { label: "Underlying", value: pair.tokenSymbol },
                { label: "Network", value: network === "sepolia" ? "Sepolia Testnet" : "Ethereum Mainnet" },
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
