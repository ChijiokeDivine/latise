// app/dashboard/transactions/TransactionsContent.tsx
"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAccount } from "wagmi";
import { useRegistry } from "@/app/hooks/useRegistry";
import { useVolumeEvents } from "@/app/hooks/useVolumeEvents";
import { useTransactionHistory } from "@/app/hooks/useTransactionHistory";
import { truncateAddress, etherscanTx } from "@/app/lib/constants";
import { formatTokenUnits } from "@/app/lib/format";
import type { Network } from "@/app/types";
import type { PersonalTxEvent } from "@/app/hooks/useTransactionHistory";

const PAGE_SIZE = 25;

type Tab = "personal" | "global";

// ─── Label helpers ─────────────────────────────────────────────────────────────

function txTypeLabel(type: PersonalTxEvent["type"]) {
  switch (type) {
    case "wrap": return { text: "🔒 Shield", bg: "bg-green-50 text-green-700" };
    case "unwrap_requested": return { text: "🔓 Unshield (pending)", bg: "bg-amber-50 text-amber-700" };
    case "unwrap_finalized": return { text: "🔓 Unshield", bg: "bg-blue-50 text-blue-700" };
    case "confidential_transfer_out": return { text: "↑ Sent", bg: "bg-purple-50 text-purple-700" };
    case "confidential_transfer_in": return { text: "↓ Received", bg: "bg-indigo-50 text-indigo-700" };
  }
}

function AmountDisplay({ event }: { event: PersonalTxEvent }) {
  if (event.isAmountHidden) {
    return <span className="text-gray-400 font-mono">•••• <span className="text-[10px]">(encrypted)</span></span>;
  }
  const dec = event.type === "wrap" ? event.tokenDecimals : event.wrapperDecimals;
  return (
    <span className="font-mono text-gray-700 text-xs">
      {formatTokenUnits(event.amount, dec, 4)}{" "}
      <span className="text-gray-400">
        {event.type === "wrap" ? event.tokenSymbol : event.wrapperSymbol}
      </span>
    </span>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ tab, isLoading, onLoad, connected }: { tab: Tab; isLoading: boolean; onLoad: () => void; connected: boolean }) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#156640] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-gray-400">Fetching on-chain events…</p>
      </div>
    );
  }
  return (
    <div className="text-center py-20">
      <div className="text-4xl mb-4">{tab === "personal" ? "🔍" : "📋"}</div>
      <h3 className="text-base font-semibold text-gray-800 mb-2">
        {tab === "personal" && !connected ? "Connect wallet to view your history" : "No transactions found"}
      </h3>
      <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
        {tab === "personal"
          ? connected
            ? "No shield, unshield, or transfer events found for your wallet in the last 24 hours."
            : "Connect your wallet to see your personal transaction history."
          : "No transactions found in the last 24 hours."}
      </p>
      {tab === "global" && !isLoading && (
        <button onClick={onLoad} className="px-5 py-2.5 bg-[#156640] hover:bg-[#0f4f30] text-white text-sm font-semibold rounded-lg transition">
          Load Transactions
        </button>
      )}
    </div>
  );
}

// ─── Personal transactions table ──────────────────────────────────────────────

function PersonalTxRow({ event, network }: { event: PersonalTxEvent; network: Network }) {
  const lbl = txTypeLabel(event.type);
  return (
    <tr className="hover:bg-gray-50/50 transition">
      <td className="py-3 px-4">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${lbl.bg}`}>{lbl.text}</span>
      </td>
      <td className="py-3 px-4 text-xs font-semibold text-gray-700">{event.wrapperSymbol}</td>
      <td className="py-3 px-4"><AmountDisplay event={event} /></td>
      <td className="py-3 px-4 font-mono text-gray-400 text-xs">
        {event.counterparty ? truncateAddress(event.counterparty) : "—"}
      </td>
      <td className="py-3 px-4 text-xs text-gray-400">#{String(event.blockNumber)}</td>
      <td className="py-3 px-4">
        {event.txHash && event.txHash !== "0x" && (
          <a href={etherscanTx(event.txHash, network)} target="_blank" rel="noopener noreferrer"
            className="text-xs text-[#156640] hover:underline font-mono">
            {event.txHash.slice(0, 8)}…↗
          </a>
        )}
      </td>
    </tr>
  );
}

function PersonalTxCard({ event, network }: { event: PersonalTxEvent; network: Network }) {
  const lbl = txTypeLabel(event.type);
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${lbl.bg}`}>{lbl.text}</span>
          <span className="text-sm font-semibold text-gray-800">{event.wrapperSymbol}</span>
        </div>
        <span className="text-xs text-gray-400">#{String(event.blockNumber)}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <div className="text-xs text-gray-400 mb-0.5">Amount</div>
          <AmountDisplay event={event} />
        </div>
        {event.counterparty && (
          <div>
            <div className="text-xs text-gray-400 mb-0.5">
              {event.type === "confidential_transfer_out" ? "To" : "From"}
            </div>
            <span className="text-xs font-mono text-gray-600">{truncateAddress(event.counterparty)}</span>
          </div>
        )}
        {event.requestId && (
          <div>
            <div className="text-xs text-gray-400 mb-0.5">Request ID</div>
            <span className="text-xs font-mono text-gray-400">{event.requestId.slice(0, 10)}…</span>
          </div>
        )}
      </div>
      {event.txHash && event.txHash !== "0x" && (
        <a href={etherscanTx(event.txHash, network)} target="_blank" rel="noopener noreferrer"
          className="text-xs text-[#156640] hover:underline font-mono inline-flex items-center gap-1">
          {event.txHash.slice(0, 10)}…↗
        </a>
      )}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function TransactionsContent() {
  const searchParams = useSearchParams();
  const network = (searchParams.get("network") ?? "sepolia") as Network;
  const { address } = useAccount();

  const [activeTab, setActiveTab] = useState<Tab>("personal");
  const [globalLoadEnabled, setGlobalLoadEnabled] = useState(false);
  const [page, setPage] = useState(0);
  const [typeFilter, setTypeFilter] = useState<"all" | "shield" | "unshield">("all");
  const [personalTypeFilter, setPersonalTypeFilter] = useState<"all" | "wrap" | "unwrap" | "transfer">("all");

  const { data: pairs = [] } = useRegistry(network);

  // ── Personal history ──────────────────────────────────────────────────────
  const [personalLoadEnabled, setPersonalLoadEnabled] = useState(false);

  const {
    data: personalEvents = [],
    isLoading: personalLoading,
    error: personalError,
    refetch: refetchPersonal,
  } = useTransactionHistory(pairs, address, network, { enabled: personalLoadEnabled && !!address });

  const filteredPersonal = personalEvents.filter((e) => {
    if (personalTypeFilter === "all") return true;
    if (personalTypeFilter === "wrap") return e.type === "wrap";
    if (personalTypeFilter === "unwrap") return e.type === "unwrap_requested" || e.type === "unwrap_finalized";
    if (personalTypeFilter === "transfer") return e.type === "confidential_transfer_in" || e.type === "confidential_transfer_out";
    return true;
  });

  // ── Global history ────────────────────────────────────────────────────────
  const { data: volumeData, isLoading: globalLoading, error: globalError, refetch: refetchGlobal } = useVolumeEvents(pairs, network, { enabled: globalLoadEnabled });

  type GlobalRow = {
    type: "Shield" | "Unshield";
    token: string; wrapperSymbol: string;
    rawAmount: bigint; decimals: number;
    to: string; txHash: string; block: bigint;
  };

  const wrapEvents = volumeData?.wrapEvents ?? [];
  const unwrapEvents = volumeData?.unwrapEvents ?? [];

  const globalRows: GlobalRow[] = [
    ...wrapEvents.map((e) => {
      const p = pairs.find((p) => p.wrapperAddress.toLowerCase() === e.wrapperAddress.toLowerCase());
      return { type: "Shield" as const, token: p?.tokenSymbol ?? "—", wrapperSymbol: p?.wrapperSymbol ?? "—", rawAmount: e.roundedAmount, decimals: p?.tokenDecimals ?? 18, to: e.to, txHash: e.txHash, block: e.blockNumber };
    }),
    ...unwrapEvents.map((e) => {
      const p = pairs.find((p) => p.wrapperAddress.toLowerCase() === e.wrapperAddress.toLowerCase());
      return { type: "Unshield" as const, token: p?.tokenSymbol ?? "—", wrapperSymbol: p?.wrapperSymbol ?? "—", rawAmount: e.cleartextAmount, decimals: p?.tokenDecimals ?? 18, to: e.receiver, txHash: e.txHash, block: e.blockNumber };
    }),
  ].sort((a, b) => (b.block > a.block ? 1 : -1));

  const filteredGlobal = globalRows.filter((r) =>
    typeFilter === "all" ? true : typeFilter === "shield" ? r.type === "Shield" : r.type === "Unshield"
  );
  const pageCount = Math.max(1, Math.ceil(filteredGlobal.length / PAGE_SIZE));
  const pageRows = filteredGlobal.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // ── Pagination for personal ───────────────────────────────────────────────
  const [personalPage, setPersonalPage] = useState(0);
  const personalPageCount = Math.max(1, Math.ceil(filteredPersonal.length / PAGE_SIZE));
  const personalPageRows = filteredPersonal.slice(personalPage * PAGE_SIZE, (personalPage + 1) * PAGE_SIZE);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="text-sm text-gray-500 mt-0.5">On-chain event history · <span className="font-medium capitalize">{network}</span></p>
        </div>
        <button
          onClick={() => { if (activeTab === "personal") { setPersonalLoadEnabled(true); refetchPersonal(); } else { setGlobalLoadEnabled(true); refetchGlobal(); } }}
          disabled={activeTab === "personal" ? personalLoading : globalLoading}
          className="px-4 py-2 bg-[#156640] hover:bg-[#0f4f30] text-white text-sm font-semibold rounded-lg transition disabled:opacity-50 self-start"
        >
          {(activeTab === "personal" ? personalLoading : globalLoading) ? "Loading…" : (activeTab === "personal" ? personalLoadEnabled : globalLoadEnabled) ? "↻ Refresh" : "Load Transactions"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 bg-gray-100 rounded-xl p-1 w-fit">
        {(["personal", "global"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition capitalize ${activeTab === tab ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            {tab === "personal" ? "My Transactions" : "Global Activity"}
          </button>
        ))}
      </div>

      {/* ── PERSONAL TAB ──────────────────────────────────────────────────── */}
      {activeTab === "personal" && (
        <>
          {/* Filters */}
          {personalLoadEnabled && address && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {([
                { key: "all", label: "All" },
                { key: "wrap", label: "🔒 Shield" },
                { key: "unwrap", label: "🔓 Unshield" },
                { key: "transfer", label: "⇄ Transfers" },
              ] as const).map((f) => (
                <button key={f.key} onClick={() => { setPersonalTypeFilter(f.key); setPersonalPage(0); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${personalTypeFilter === f.key ? "bg-[#156640] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                  {f.label}
                </button>
              ))}
              {filteredPersonal.length > 0 && (
                <span className="ml-1 text-xs text-gray-400">{filteredPersonal.length} events</span>
              )}
            </div>
          )}

          {personalError && (
            <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
              Error fetching events — RPC may be rate-limited.
              <button onClick={() => refetchPersonal()} className="ml-3 underline font-semibold">Retry</button>
            </div>
          )}

          {(!personalLoadEnabled || !address || (personalLoadEnabled && !personalLoading && filteredPersonal.length === 0)) ? (
            <div className="bg-white border border-gray-200 rounded-2xl">
              <EmptyState tab="personal" isLoading={personalLoading} onLoad={() => setPersonalLoadEnabled(true)} connected={!!address} />
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden hidden md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {["Type", "Token", "Amount", "Counterparty", "Block", "Tx"].map((h) => (
                        <th key={h} className="py-3 px-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {personalLoading
                      ? Array.from({ length: 6 }).map((_, i) => (
                          <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (
                            <td key={j} className="py-3 px-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                          ))}</tr>
                        ))
                      : personalPageRows.map((e, i) => (
                          <PersonalTxRow key={`${e.txHash}-${i}`} event={e} network={network} />
                        ))
                    }
                  </tbody>
                </table>
                {!personalLoading && personalPageCount > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
                    <span className="text-xs text-gray-400">Page {personalPage + 1} of {personalPageCount} · {filteredPersonal.length} total</span>
                    <div className="flex gap-2">
                      <button onClick={() => setPersonalPage((p) => Math.max(0, p - 1))} disabled={personalPage === 0}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-40 transition">← Prev</button>
                      <button onClick={() => setPersonalPage((p) => Math.min(personalPageCount - 1, p + 1))} disabled={personalPage >= personalPageCount - 1}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-40 transition">Next →</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {personalLoading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse h-24" />
                    ))
                  : personalPageRows.map((e, i) => (
                      <PersonalTxCard key={`${e.txHash}-${i}`} event={e} network={network} />
                    ))
                }
                {!personalLoading && personalPageCount > 1 && (
                  <div className="flex items-center justify-between px-2 py-3">
                    <span className="text-xs text-gray-400">Page {personalPage + 1} of {personalPageCount}</span>
                    <div className="flex gap-2">
                      <button onClick={() => setPersonalPage((p) => Math.max(0, p - 1))} disabled={personalPage === 0}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40 transition">← Prev</button>
                      <button onClick={() => setPersonalPage((p) => Math.min(personalPageCount - 1, p + 1))} disabled={personalPage >= personalPageCount - 1}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40 transition">Next →</button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* ── GLOBAL TAB ────────────────────────────────────────────────────── */}
      {activeTab === "global" && (
        <>
          {globalLoadEnabled && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {([["all", "All"], ["shield", "🔒 Shield"], ["unshield", "🔓 Unshield"]] as const).map(([f, lbl]) => (
                <button key={f} onClick={() => { setTypeFilter(f); setPage(0); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${typeFilter === f ? "bg-[#156640] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                  {lbl}
                </button>
              ))}
              {filteredGlobal.length > 0 && <span className="ml-1 text-xs text-gray-400">{filteredGlobal.length} transactions</span>}
            </div>
          )}

          {globalError && (
            <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
              RPC rate limit hit. Events are cached — try again in 30s.
              <button onClick={() => refetchGlobal()} className="ml-3 underline font-semibold">Retry</button>
            </div>
          )}

          {!globalLoadEnabled ? (
            <div className="bg-white border border-gray-200 rounded-2xl">
              <EmptyState tab="global" isLoading={false} onLoad={() => setGlobalLoadEnabled(true)} connected={!!address} />
            </div>
          ) : (
            <>
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden hidden md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {["Type", "Token", "Amount", "Address", "Block", "Tx"].map((h) => (
                        <th key={h} className="py-3 px-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {globalLoading
                      ? Array.from({ length: 8 }).map((_, i) => (
                          <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (
                            <td key={j} className="py-3 px-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                          ))}</tr>
                        ))
                      : pageRows.length === 0
                      ? <tr><td colSpan={6} className="py-16 text-center text-sm text-gray-400">No transactions found in the last 24 hours on {network}</td></tr>
                      : pageRows.map((row, i) => (
                          <tr key={`${row.txHash}-${i}`} className="hover:bg-gray-50/50 transition">
                            <td className="py-3 px-4">
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${row.type === "Shield" ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"}`}>
                                {row.type === "Shield" ? "🔒 Shield" : "🔓 Unshield"}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-xs font-semibold text-gray-700">{row.type === "Shield" ? row.token : row.wrapperSymbol}</td>
                            <td className="py-3 px-4 font-mono text-gray-700 text-xs">{formatTokenUnits(row.rawAmount, row.decimals, 4)}</td>
                            <td className="py-3 px-4 font-mono text-gray-400 text-xs">{truncateAddress(row.to)}</td>
                            <td className="py-3 px-4 text-xs text-gray-400">#{String(row.block)}</td>
                            <td className="py-3 px-4">
                              {row.txHash && row.txHash !== "0x" && (
                                <a href={etherscanTx(row.txHash, network)} target="_blank" rel="noopener noreferrer"
                                  className="text-xs text-[#156640] hover:underline font-mono">{row.txHash.slice(0, 8)}…↗</a>
                              )}
                            </td>
                          </tr>
                        ))
                    }
                  </tbody>
                </table>
                {!globalLoading && pageCount > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
                    <span className="text-xs text-gray-400">Page {page + 1} of {pageCount} · {filteredGlobal.length} total</span>
                    <div className="flex gap-2">
                      <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-40 transition">← Prev</button>
                      <button onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={page >= pageCount - 1}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-40 transition">Next →</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile */}
              <div className="md:hidden space-y-3">
                {globalLoading
                  ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse h-24" />)
                  : pageRows.length === 0
                  ? <div className="bg-white border border-gray-200 rounded-xl p-6 text-center text-sm text-gray-400">No transactions found on {network}</div>
                  : pageRows.map((row, i) => (
                      <div key={`${row.txHash}-${i}`} className="bg-white border border-gray-200 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${row.type === "Shield" ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"}`}>
                              {row.type === "Shield" ? "🔒 Shield" : "🔓 Unshield"}
                            </span>
                            <span className="font-semibold text-gray-900 text-sm">{row.type === "Shield" ? row.token : row.wrapperSymbol}</span>
                          </div>
                          <span className="text-xs text-gray-400">#{String(row.block)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div><div className="text-xs text-gray-400">Amount</div><div className="text-sm font-mono text-gray-700">{formatTokenUnits(row.rawAmount, row.decimals, 4)}</div></div>
                          <div><div className="text-xs text-gray-400">Address</div><div className="text-sm font-mono text-gray-400">{truncateAddress(row.to)}</div></div>
                        </div>
                        {row.txHash && row.txHash !== "0x" && (
                          <a href={etherscanTx(row.txHash, network)} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-[#156640] hover:underline font-mono">{row.txHash.slice(0, 10)}…↗</a>
                        )}
                      </div>
                    ))
                }
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
