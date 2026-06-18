// app/dashboard/transactions/TransactionsContent.tsx
// Location: latise/app/dashboard/transactions/TransactionsContent.tsx
//
// Key fixes:
//   - Events are NOT loaded on mount — user must click "Load transactions"
//   - This prevents the CU burst that caused the Alchemy rate limit error
//   - Client-side pagination (25 rows per page)
//   - Amounts formatted with token decimals, not raw bigint strings
"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRegistry } from "@/app/hooks/useRegistry";
import { useVolumeEvents } from "@/app/hooks/useVolumeEvents";
import { truncateAddress, etherscanTx } from "@/app/lib/constants";
import { formatTokenUnits } from "@/app/lib/format";
import type { Network } from "@/app/types";

const PAGE_SIZE = 25;

export default function TransactionsContent() {
  const searchParams = useSearchParams();
  const network = (searchParams.get("network") ?? "sepolia") as Network;
  const [loadEnabled, setLoadEnabled] = useState(false);
  const [page, setPage] = useState(0);
  const [typeFilter, setTypeFilter] = useState<"all" | "shield" | "unshield">("all");

  const { data: pairs = [] } = useRegistry(network);
  const { data: volumeData, isLoading, error, refetch } = useVolumeEvents(pairs, network, {
    enabled: loadEnabled,
  });

  const wrapEvents = volumeData?.wrapEvents ?? [];
  const unwrapEvents = volumeData?.unwrapEvents ?? [];

  type TxRow = {
    type: "Shield" | "Unshield";
    token: string;
    wrapperSymbol: string;
    rawAmount: bigint;
    decimals: number;
    to: string;
    txHash: string;
    block: bigint;
  };

  const allRows: TxRow[] = [
    ...wrapEvents.map((e) => {
      const pair = pairs.find((p) => p.wrapperAddress.toLowerCase() === e.wrapperAddress.toLowerCase());
      return {
        type: "Shield" as const,
        token: pair?.tokenSymbol ?? "—",
        wrapperSymbol: pair?.wrapperSymbol ?? "—",
        rawAmount: e.roundedAmount,
        decimals: pair?.tokenDecimals ?? 18,
        to: e.to,
        txHash: e.txHash,
        block: e.blockNumber,
      };
    }),
    ...unwrapEvents.map((e) => {
      const pair = pairs.find((p) => p.wrapperAddress.toLowerCase() === e.wrapperAddress.toLowerCase());
      return {
        type: "Unshield" as const,
        token: pair?.tokenSymbol ?? "—",
        wrapperSymbol: pair?.wrapperSymbol ?? "—",
        rawAmount: e.cleartextAmount,
        decimals: pair?.tokenDecimals ?? 18,
        to: e.receiver,
        txHash: e.txHash,
        block: e.blockNumber,
      };
    }),
  ].sort((a, b) => (b.block > a.block ? 1 : -1));

  const filtered = allRows.filter((r) =>
    typeFilter === "all" ? true : typeFilter === "shield" ? r.type === "Shield" : r.type === "Unshield"
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Shield and unshield activity on{" "}
            <span className="font-medium capitalize">{network}</span> — last 24 hours
          </p>
        </div>
        <button
          onClick={() => { setLoadEnabled(true); refetch(); }}
          disabled={isLoading}
          className="px-4 py-2 bg-[#156640] hover:bg-[#0f4f30] text-white text-sm font-semibold rounded-lg transition disabled:opacity-50 self-start"
        >
          {isLoading ? "Loading…" : loadEnabled ? "↻ Refresh" : "Load Transactions"}
        </button>
      </div>

      {/* Filters */}
      {loadEnabled && (
        <div className="flex items-center gap-2 mb-4">
          {(["all", "shield", "unshield"] as const).map((f) => (
            <button
              key={f}
              onClick={() => { setTypeFilter(f); setPage(0); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                typeFilter === f
                  ? "bg-[#156640] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f === "shield" ? "🔒 Shield" : f === "unshield" ? "🔓 Unshield" : "All"}
            </button>
          ))}
          {filtered.length > 0 && (
            <span className="ml-2 text-xs text-gray-400">{filtered.length} transactions</span>
          )}
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
          <strong>RPC rate limit hit.</strong> Events are cached — try refreshing in 30 seconds.
          <button onClick={() => refetch()} className="ml-3 underline font-semibold">Retry</button>
        </div>
      )}

      {/* Not yet loaded */}
      {!loadEnabled && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-16 text-center">
          <div className="text-4xl mb-4">📋</div>
          <h2 className="text-base font-semibold text-gray-800 mb-2">Transaction history</h2>
          <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
            Querying event logs uses RPC credits. Click the button above when you're ready to load.
          </p>
          <button
            onClick={() => setLoadEnabled(true)}
            className="px-5 py-2.5 bg-[#156640] hover:bg-[#0f4f30] text-white text-sm font-semibold rounded-lg transition"
          >
            Load Transactions
          </button>
        </div>
      )}

      {/* Desktop Table */}
      {loadEnabled && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden hidden md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Type</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Token</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Amount</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Address</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Block</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Tx</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="py-3 px-4">
                          <div className="h-4 bg-gray-100 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                : pageRows.length === 0
                ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-sm text-gray-400">
                        No transactions found in the last 24 hours on {network}
                      </td>
                    </tr>
                  )
                : pageRows.map((row, i) => (
                    <tr key={`${row.txHash}-${i}`} className="hover:bg-gray-50/50 transition">
                      <td className="py-3 px-4">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          row.type === "Shield"
                            ? "bg-green-50 text-green-700"
                            : "bg-blue-50 text-blue-600"
                        }`}>
                          {row.type === "Shield" ? "🔒 Shield" : "🔓 Unshield"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#d0ede2] flex items-center justify-center text-[#156640] font-bold text-[10px]">
                            {row.token.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-900 text-[13px]">
                            {row.type === "Shield" ? row.token : row.wrapperSymbol}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-gray-700 text-xs">
                        {formatTokenUnits(row.rawAmount, row.decimals, 4)}
                      </td>
                      <td className="py-3 px-4 font-mono text-gray-400 text-xs">
                        {truncateAddress(row.to)}
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-400">
                        #{String(row.block)}
                      </td>
                      <td className="py-3 px-4">
                        {row.txHash && row.txHash !== "0x" && (
                          <a
                            href={etherscanTx(row.txHash, network)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[#156640] hover:underline font-mono"
                          >
                            {row.txHash.slice(0, 8)}…↗
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>

          {/* Pagination */}
          {!isLoading && pageCount > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
              <span className="text-xs text-gray-400">
                Page {page + 1} of {pageCount} · {filtered.length} total
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-40 transition"
                >
                  ← Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                  disabled={page >= pageCount - 1}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-40 transition"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mobile Cards */}
      {loadEnabled && (
        <div className="md:hidden space-y-4">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="h-4 bg-gray-100 rounded animate-pulse" />
                </div>
              ))
            : pageRows.length === 0
            ? (
                <div className="bg-white border border-gray-200 rounded-xl p-6 text-center text-sm text-gray-400">
                  No transactions found in the last 24 hours on {network}
                </div>
              )
            : pageRows.map((row, i) => (
                <div key={`${row.txHash}-${i}`} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        row.type === "Shield"
                          ? "bg-green-50 text-green-700"
                          : "bg-blue-50 text-blue-600"
                      }`}>
                        {row.type === "Shield" ? "🔒 Shield" : "🔓 Unshield"}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-[#d0ede2] flex items-center justify-center text-[#156640] font-bold text-[10px]">
                          {row.token.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900 text-sm">
                          {row.type === "Shield" ? row.token : row.wrapperSymbol}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">#{String(row.block)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <div className="text-xs text-gray-400">Amount</div>
                      <div className="text-sm font-mono text-gray-700">
                        {formatTokenUnits(row.rawAmount, row.decimals, 4)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">To</div>
                      <div className="text-sm font-mono text-gray-400">
                        {truncateAddress(row.to)}
                      </div>
                    </div>
                  </div>
                  {row.txHash && row.txHash !== "0x" && (
                    <a
                      href={etherscanTx(row.txHash, network)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#156640] hover:underline font-mono inline-flex items-center gap-1"
                    >
                      {row.txHash.slice(0, 8)}…↗
                    </a>
                  )}
                </div>
              ))}
        </div>
      )}

      {/* Mobile Pagination */}
      {loadEnabled && !isLoading && pageCount > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50 rounded-b-xl mt-4 md:hidden">
          <span className="text-xs text-gray-400">
            Page {page + 1} of {pageCount}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-40 transition"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={page >= pageCount - 1}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-40 transition"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}