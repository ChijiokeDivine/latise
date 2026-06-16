// app/dashboard/registry/RegistryContent.tsx
"use client";

import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { useRegistry } from "@/app/hooks/useRegistry";
import Link from "next/link";
import { truncateAddress, etherscanAddress } from "@/app/lib/constants";
import { formatTokenUnits } from "@/app/lib/format";
import type { Network } from "@/app/types";

function getTokenIconSrc(wrapperSymbol: string): string | null {
  const tokenSymbol = wrapperSymbol.startsWith("c") ? wrapperSymbol.slice(1) : wrapperSymbol;

  if (tokenSymbol === "USDCMock" || tokenSymbol === "USDTMock") {
    return `/c${tokenSymbol}.svg`;
  }
  if (
    tokenSymbol === "WETHMock" ||
    tokenSymbol === "ZAMAMock" ||
    tokenSymbol === "tGBPMock" ||
    tokenSymbol === "XAUtMock"
  ) {
    return `/c${tokenSymbol}.png`;
  }
  if (tokenSymbol === "BRONMock") {
    return `/c${tokenSymbol}.webp`;
  }
  return null;
}

export default function RegistryContent() {
  const searchParams = useSearchParams();
  const network = (searchParams.get("network") ?? "sepolia") as Network;
  const { data: pairs = [], isLoading, error } = useRegistry(network);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Registry Explorer</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            All ERC-20 ↔ ERC-7984 confidential wrapper pairs on{" "}
            <span className="font-medium capitalize">{network}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          {pairs.filter((p) => p.isValid).length} active pairs
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Pairs", value: pairs.length },
          { label: "Active Pairs", value: pairs.filter((p) => p.isValid).length },
          { label: "Revoked Pairs", value: pairs.filter((p) => !p.isValid).length },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Token
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                ERC-20 Address
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Wrapper (ERC-7984)
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Rate
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Status
              </th>
              <th className="py-3 px-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="py-3 px-4">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-500">
                  Failed to load registry. Check your RPC connection.
                </td>
              </tr>
            ) : pairs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-400">
                  No pairs found on {network}.
                </td>
              </tr>
            ) : (
              pairs.map((pair) => (
                <tr key={pair.wrapperAddress} className="hover:bg-gray-50/50 transition group">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#d0ede2] flex items-center justify-center text-[#156640] font-bold text-xs shrink-0 overflow-hidden">
                        {getTokenIconSrc(pair.wrapperSymbol) ? (
                          <Image
                            src={getTokenIconSrc(pair.wrapperSymbol)!}
                            alt={pair.tokenSymbol}
                            width={32}
                            height={32}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          pair.tokenSymbol.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{pair.tokenSymbol}</div>
                        <div className="text-xs text-gray-400">{pair.tokenName}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <a
                      href={etherscanAddress(pair.tokenAddress, network)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono text-gray-500 hover:text-[#156640] transition"
                    >
                      {truncateAddress(pair.tokenAddress)}↗
                    </a>
                  </td>
                  <td className="py-3.5 px-4">
                    <div>
                      <div className="font-medium text-gray-900">{pair.wrapperSymbol}</div>
                      <a
                        href={etherscanAddress(pair.wrapperAddress, network)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-mono text-gray-400 hover:text-[#156640] transition"
                      >
                        {truncateAddress(pair.wrapperAddress)}↗
                      </a>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-gray-600 text-xs font-mono">
                    1 : {Number(pair.rate).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold ${
                        pair.isValid
                          ? "bg-green-50 text-green-700"
                          : "bg-red-50 text-red-600"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${pair.isValid ? "bg-green-500" : "bg-red-500"}`} />
                      {pair.isValid ? "Active" : "Revoked"}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                      <Link
                        href={`/dashboard/vault?wrapper=${pair.wrapperAddress}&tab=shield&network=${network}`}
                        className="text-xs font-semibold text-[#156640] hover:underline whitespace-nowrap"
                      >
                        Shield
                      </Link>
                      <span className="text-gray-200">|</span>
                      <Link
                        href={`/dashboard/vault?wrapper=${pair.wrapperAddress}&tab=unshield&network=${network}`}
                        className="text-xs font-semibold text-gray-500 hover:text-gray-900 hover:underline whitespace-nowrap"
                      >
                        Unshield
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
