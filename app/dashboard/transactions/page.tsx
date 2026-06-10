// app/dashboard/transactions/page.tsx
// Location: latise/app/dashboard/transactions/page.tsx
"use client";

import { useSearchParams } from "next/navigation";
import { useRegistry } from "@/app/hooks/useRegistry";
import { useVolumeEvents } from "@/app/hooks/useVolumeEvents";
import { truncateAddress, etherscanTx } from "@/app/lib/constants";
import type { Network } from "@/app/types";

export default function TransactionsPage() {
  const searchParams = useSearchParams();
  const network = (searchParams.get("network") ?? "sepolia") as Network;
  const { data: pairs = [] } = useRegistry(network);
  const { data: volumeData, isLoading } = useVolumeEvents(pairs, network);

  const wrapEvents = volumeData?.wrapEvents ?? [];
  const unwrapEvents = volumeData?.unwrapEvents ?? [];

  // Merge and sort by block desc
  type TxRow = { type: "Wrap" | "Unwrap"; token: string; amount: string; to: string; txHash: string; block: bigint };
  const rows: TxRow[] = [
    ...wrapEvents.map((e: typeof wrapEvents[number]) => {
      const pair = pairs.find((p) => p.wrapperAddress.toLowerCase() === e.wrapperAddress.toLowerCase());
      return {
        type: "Wrap" as const,
        token: pair?.wrapperSymbol ?? "—",
        amount: String(e.roundedAmount),
        to: e.to,
        txHash: e.txHash,
        block: e.blockNumber,
      };
    }),
    ...unwrapEvents.map((e: typeof unwrapEvents[number]) => {
      const pair = pairs.find((p) => p.wrapperAddress.toLowerCase() === e.wrapperAddress.toLowerCase());
      return {
        type: "Unwrap" as const,
        token: pair?.wrapperSymbol ?? "—",
        amount: String(e.cleartextAmount),
        to: e.receiver,
        txHash: e.txHash,
        block: e.blockNumber,
      };
    }),
  ].sort((a, b) => (b.block > a.block ? 1 : -1));

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <p className="text-sm text-gray-500 mt-0.5">Recent wrap and unwrap activity on {network}</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Type</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Token</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Amount</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">To / Receiver</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Tx</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="py-3 px-4">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              : rows.length === 0
              ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-sm text-gray-400">
                      No transactions found in the last 7 days
                    </td>
                  </tr>
                )
              : rows.map((row, i) => (
                  <tr key={`${row.txHash}-${i}`} className="hover:bg-gray-50/50 transition">
                    <td className="py-3 px-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        row.type === "Wrap"
                          ? "bg-green-50 text-green-700"
                          : "bg-blue-50 text-blue-600"
                      }`}>
                        {row.type === "Wrap" ? "🔒 Shield" : "🔓 Unshield"}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-900 text-[13px]">{row.token}</td>
                    <td className="py-3 px-4 font-mono text-gray-600 text-xs">{row.amount}</td>
                    <td className="py-3 px-4 font-mono text-gray-400 text-xs">{truncateAddress(row.to)}</td>
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
      </div>
    </div>
  );
}