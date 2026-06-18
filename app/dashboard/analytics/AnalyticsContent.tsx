// app/dashboard/analytics/AnalyticsContent.tsx
// Location: latise/app/dashboard/analytics/AnalyticsContent.tsx
//
// Key changes:
//   - Removed ALL "Total Value Shielded" USD mentions
//   - Shows "Shielded Supply" in token units only (nonConfidentialTotalSupply / rate)
//   - Events loaded on demand (not on mount) to save RPC credits
//   - Wrapper rankings by token count, not USD

"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useShieldedSupply } from "@/app/hooks/useTVS";
import { useRegistry } from "@/app/hooks/useRegistry";
import { useVolumeEvents } from "@/app/hooks/useVolumeEvents";
import { formatTokenUnits } from "@/app/lib/format";
import { truncateAddress } from "@/app/lib/constants";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid,
} from "recharts";
import type { Network } from "@/app/types";

export default function AnalyticsContent() {
  const searchParams = useSearchParams();
  const network = (searchParams.get("network") ?? "sepolia") as Network;
  const [eventsEnabled, setEventsEnabled] = useState(false);

  const { data: supplyData, isLoading: supplyLoading } = useShieldedSupply(network);
  const { data: pairs = [] } = useRegistry(network);
  const { data: volumeData, isLoading: eventsLoading } = useVolumeEvents(pairs, network, {
    enabled: eventsEnabled,
  });

  const byToken = supplyData?.byToken ?? [];
  // Sort by wrapperUnits descending
  const sorted = [...byToken].sort((a, b) =>
    b.wrapperUnits > a.wrapperUnits ? 1 : -1
  );

  // Bar chart: shielded token amounts
  const barData = sorted.map((t) => ({
    name: t.symbol.replace("Mock", ""),
    amount: Number(t.wrapperUnits) / Math.pow(10, 6), // max 6 decimals on wrappers
    rawUnits: t.wrapperUnits,
  }));

  // Volume chart from events
  const allDaily = volumeData?.dailyByPair?.flatMap((d) => d.daily) ?? [];
  const dateMap = new Map<string, { date: string; wrap: number; unwrap: number }>();
  for (const entry of allDaily) {
    const ex = dateMap.get(entry.date) ?? { date: entry.date, wrap: 0, unwrap: 0 };
    ex.wrap += entry.wrapVolume;
    ex.unwrap += entry.unwrapVolume;
    dateMap.set(entry.date, ex);
  }
  const volumeChartData = Array.from(dateMap.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14);

  const totalWrapTx = volumeData?.wrapEvents.length ?? 0;
  const totalUnwrapTx = volumeData?.unwrapEvents.length ?? 0;
  const activePairs = pairs.filter((p) => p.isValid).length;
  const revokedPairs = pairs.filter((p) => !p.isValid).length;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Terminal</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            On-chain privacy metrics — Zama Protocol · {network === "sepolia" ? "Sepolia Testnet" : "Ethereum Mainnet"}
          </p>
        </div>
       
      </div>

      {/* ── Supply metric cards ─────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Active Wrappers"
          value={supplyLoading ? null : String(activePairs)}
          sub={`${revokedPairs} revoked`}
          icon={<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><title>safe_lock_line</title><g id="safe_lock_line" fill='none'><path d='M24 0v24H0V0zM12.593 23.258l-.011.002-.071.035-.02.004-.014-.004-.071-.035c-.01-.004-.019-.001-.024.005l-.004.01-.017.428.005.02.01.013.104.074.015.004.012-.004.104-.074.012-.016.004-.017-.017-.427c-.002-.01-.009-.017-.017-.018m.265-.113-.013.002-.185.093-.01.01-.003.011.018.43.005.012.008.007.201.093c.012.004.023 0 .029-.008l-.004-.014-.034-.614c-.003-.012-.01-.02-.02-.022m-.715.002a.023.023 0 0 0-.027.006l-.006.014-.034.614c0 .012.007.02.017.024l-.015-.002.201-.093.01-.008.004-.011.017-.43-.003-.012-.01-.01z'/><path fill='#09244BFF' d='m12.702 2.195 7 2.625A2 2 0 0 1 21 6.693v5.363a9 9 0 0 1-4.975 8.05l-3.354 1.677a1.5 1.5 0 0 1-1.342 0l-3.354-1.677A9 9 0 0 1 3 12.056V6.693A2 2 0 0 1 4.298 4.82l7-2.625a2 2 0 0 1 1.404 0M12 4.068 5 6.693v5.363a7 7 0 0 0 3.87 6.26L12 19.883l3.13-1.565A7 7 0 0 0 19 12.056V6.693zM12 8a2 2 0 0 1 1.134 3.648l-.134.085V15a1 1 0 0 1-1.993.117L11 15v-3.267A2 2 0 0 1 12 8'/></g></svg>}
          accent="blue"
        />
        <MetricCard
          label="Top Shielded Token"
          value={supplyLoading ? null : (sorted[0]?.symbol.replace("Mock", "") ?? "—")}
          sub={sorted[0] ? sorted[0].formattedSupply : "—"}
          icon={<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><title>award_line</title><g id="award_line" fill='none' fillRule='evenodd'><path d='M24 0v24H0V0zM12.593 23.258l-.011.002-.071.035-.02.004-.014-.004-.071-.035c-.01-.004-.019-.001-.024.005l-.004.01-.017.428.005.02.01.013.104.074.015.004.012-.004.104-.074.012-.016.004-.017-.017-.427c-.002-.01-.009-.017-.017-.018m.265-.113-.013.002-.185.093-.01.01-.003.011.018.43.005.012.008.007.201.093c.012.004.023 0 .029-.008l-.004-.014-.034-.614c-.003-.012-.01-.02-.02-.022m-.715.002a.023.023 0 0 0-.027.006l-.006.014-.034.614c0 .012.007.02.017.024l-.015-.002.201-.093.01-.008.004-.011.017-.43-.003-.012-.01-.01z'/><path fill='#09244BFF' d='M12 2a8 8 0 0 1 5 14.245v4.61a1.1 1.1 0 0 1-1.486 1.03L12 20.569l-3.514 1.318A1.1 1.1 0 0 1 7 20.856v-4.61A8 8 0 0 1 12 2m3 15.419A7.978 7.978 0 0 1 12 18a7.978 7.978 0 0 1-3-.581v2.138l2.298-.862a2 2 0 0 1 1.404 0l2.298.862zM12 4a6 6 0 1 0 0 12 6 6 0 0 0 0-12m0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8m0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4'/></g></svg>}
          accent="blue"
        />
        <MetricCard
          label="Shield Transactions"
          value={eventsEnabled ? (eventsLoading ? null : String(totalWrapTx)) : "—"}
          sub="Last 24 hours · click Load"
          icon={<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><title>lock_line</title><g id="lock_line" fill='none'><path d='M24 0v24H0V0zM12.593 23.258l-.011.002-.071.035-.02.004-.014-.004-.071-.035c-.01-.004-.019-.001-.024.005l-.004.01-.017.428.005.02.01.013.104.074.015.004.012-.004.104-.074.012-.016.004-.017-.017-.427c-.002-.01-.009-.017-.017-.018m.265-.113-.013.002-.185.093-.01.01-.003.011.018.43.005.012.008.007.201.093c.012.004.023 0 .029-.008l-.004-.014-.034-.614c-.003-.012-.01-.02-.02-.022m-.715.002a.023.023 0 0 0-.027.006l-.006.014-.034.614c0 .012.007.02.017.024l-.015-.002.201-.093.01-.008.004-.011.017-.43-.003-.012-.01-.01z'/><path fill='#09244BFF' d='M12 2a6 6 0 0 1 5.996 5.775L18 8h1a2 2 0 0 1 1.995 1.85L21 10v10a2 2 0 0 1-1.85 1.995L19 22H5a2 2 0 0 1-1.995-1.85L3 20V10a2 2 0 0 1 1.85-1.995L5 8h1a6 6 0 0 1 6-6m7 8H5v10h14zm-7 2a2 2 0 0 1 1.134 3.647l-.134.085V17a1 1 0 0 1-1.993.117L11 17v-1.268A2 2 0 0 1 12 12m0-8a4 4 0 0 0-4 4h8a4 4 0 0 0-4-4'/></g></svg>}
          accent="blue"
        />
        <MetricCard
          label="Unshield Transactions"
          value={eventsEnabled ? (eventsLoading ? null : String(totalUnwrapTx)) : "—"}
          sub="Last 24 hours · click Load"
          icon={<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><title>unlock_line</title><g id="unlock_line" fill='none'><path d='M24 0v24H0V0zM12.593 23.258l-.011.002-.071.035-.02.004-.014-.004-.071-.035c-.01-.004-.019-.001-.024.005l-.004.01-.017.428.005.02.01.013.104.074.015.004.012-.004.104-.074.012-.016.004-.017-.017-.427c-.002-.01-.009-.017-.017-.018m.265-.113-.013.002-.185.093-.01.01-.003.011.018.43.005.012.008.007.201.093c.012.004.023 0 .029-.008l-.004-.014-.034-.614c-.003-.012-.01-.02-.02-.022m-.715.002a.023.023 0 0 0-.027.006l-.006.014-.034.614c0 .012.007.02.017.024l-.015-.002.201-.093.01-.008.004-.011.017-.43-.003-.012-.01-.01z'/><path fill='#09244BFF' d='M12 2c1.091 0 2.117.292 3 .804a1 1 0 0 1 1-1 1.73A4 4 0 0 0 8 8l11 .001a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2h1a6 6 0 0 1 6-6m7 8H5v10h14zm-7 2a2 2 0 0 1 1.134 3.647l-.134.085V17a1 1 0 0 1-1.993.117L11 17v-1.268A2 2 0 0 1 12 12m7.918-6.979.966.26a1 1 0 0 1-.518 1.93l-.966-.258a1 1 0 0 1 .518-1.932M18.633 2.09a1 1 0 0 1 .707 1.225l-.129.482a1 1 0 1 1-1.932-.517l.129-.483a1 1 0 0 1 1.224-.707'/></g></svg>}
          accent="blue"
        />
      </div>

      {/* ── Charts row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Supply bar chart */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Shielded Supply by Wrapper</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                nonConfidentialTotalSupply() / rate() — token units
              </p>
            </div>
            <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded">
              Token Units
            </span>
          </div>
          {supplyLoading ? (
            <div className="h-48 bg-gray-50 rounded-xl animate-pulse" />
          ) : barData.length === 0 ? (
            <EmptyChart message="No supply data yet" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} barSize={22}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) =>
                    v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` :
                    v >= 1_000 ? `${(v / 1_000).toFixed(1)}K` : String(v)
                  }
                />
                <Tooltip
                  formatter={(v: number) => [v.toLocaleString(undefined, { maximumFractionDigits: 4 }), "Shielded"]}
                  contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 12 }}
                />
                <Bar dataKey="amount" fill="#156640" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Volume chart */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Shield / Unshield Volume</h3>
              <p className="text-xs text-gray-400 mt-0.5">Last 14 days · event log data</p>
            </div>
            {!eventsEnabled && (
              <button
                onClick={() => setEventsEnabled(true)}
                className="text-xs font-semibold text-[#156640] border border-[#a3d9c4] px-3 py-1.5 rounded-lg hover:bg-[#f0faf5] transition"
              >
                Load events
              </button>
            )}
          </div>
          {!eventsEnabled ? (
            <div className="h-48 flex items-center justify-center text-sm text-gray-400 bg-gray-50 rounded-xl">
              Click "Load events" — uses RPC credits
            </div>
          ) : eventsLoading ? (
            <div className="h-48 bg-gray-50 rounded-xl animate-pulse" />
          ) : volumeChartData.length === 0 ? (
            <EmptyChart message="No activity in the last 14 days" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={volumeChartData}>
                <defs>
                  <linearGradient id="wrapGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#156640" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#156640" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 12 }} />
                <Area type="monotone" dataKey="wrap" stroke="#156640" strokeWidth={2} fill="url(#wrapGrad)" name="Shield" />
                <Area type="monotone" dataKey="unwrap" stroke="#9ca3af" strokeWidth={2} fill="none" name="Unshield" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Wrapper Rankings ──────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Wrapper Rankings</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Ranked by shielded token supply — amounts in wrapper token units
            </p>
          </div>
         
        </div>
        {/* Desktop Table */}
        <div className="hidden md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="py-2.5 px-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide w-8">#</th>
                <th className="py-2.5 px-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Wrapper</th>
                <th className="py-2.5 px-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Wrapper Address</th>
                <th className="py-2.5 px-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Shielded Supply</th>
                <th className="py-2.5 px-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Underlying Locked</th>
                <th className="py-2.5 px-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {supplyLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="py-3 px-4">
                          <div className="h-4 bg-gray-100 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                : (() => {
                    const totalUnits = sorted.reduce((s, t) => s + t.wrapperUnits, 0n);
                    return sorted.map((t, i) => {
                      const share = totalUnits > 0n
                        ? Number((t.wrapperUnits * 10000n) / totalUnits) / 100
                        : 0;
                      const pair = pairs.find(
                        (p) => p.wrapperAddress.toLowerCase() === t.wrapperAddress.toLowerCase()
                      );
                      return (
                        <tr key={t.wrapperAddress} className="hover:bg-gray-50/50 transition">
                          <td className="py-3 px-4 text-xs text-gray-400 font-semibold">{i + 1}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-[#d0ede2] flex items-center justify-center text-[#156640] font-bold text-xs">
                                {t.symbol.slice(1, 3).toUpperCase()}
                              </div>
                              <span className="font-semibold text-gray-900 text-[13px]">{t.symbol}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-gray-400">
                            {truncateAddress(t.wrapperAddress)}
                          </td>
                          <td className="py-3 px-4 text-right text-[13px] font-semibold text-gray-900">
                            {t.formattedSupply}
                          </td>
                          <td className="py-3 px-4 text-right text-[13px] text-gray-500">
                            {t.formattedUnderlying}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="flex-1 max-w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[#156640] rounded-full"
                                  style={{ width: `${share}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-400 w-10 text-right">
                                {share.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
            </tbody>
          </table>
        </div>
        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-gray-100">
          {supplyLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4">
                  <div className="h-4 bg-gray-100 rounded animate-pulse" />
                </div>
              ))
            : (() => {
                const totalUnits = sorted.reduce((s, t) => s + t.wrapperUnits, 0n);
                return sorted.map((t, i) => {
                  const share = totalUnits > 0n
                    ? Number((t.wrapperUnits * 10000n) / totalUnits) / 100
                    : 0;
                  return (
                    <div key={t.wrapperAddress} className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#d0ede2] flex items-center justify-center text-[#156640] font-bold text-xs">
                            {t.symbol.slice(1, 3).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{t.symbol}</div>
                            <div className="text-xs text-gray-400">#{i + 1}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-gray-900">{t.formattedSupply}</div>
                          <div className="text-xs text-gray-400">{t.formattedUnderlying}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#156640] rounded-full"
                            style={{ width: `${share}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400">{share.toFixed(1)}%</span>
                      </div>
                    </div>
                  );
                });
              })()}
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label, value, sub, icon, accent,
}: {
  label: string; value: string | null; sub: string; icon: React.ReactNode;
  accent: "green" | "blue" | "amber" | "purple";
}) {
  const colors = {
    green: "bg-[#d0ede2] text-[#156640]",
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    purple: "bg-purple-50 text-purple-600",
  };
  return (
    <div className="relative bg-white border border-gray-200 rounded-2xl p-4 md:p-5">
      <div className="absolute right-4 md:right-5 top-4 md:top-1/2 md:-translate-y-1/2">
        <div
          className={`w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center text-base ${colors[accent]}`}
        >
          {icon}
        </div>
      </div>

      <div className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight min-h-[28px]">
        {value === null ? (
          <div className="h-6 w-20 bg-gray-100 rounded animate-pulse" />
        ) : (
          value
        )}
      </div>

      <div className="text-xs font-medium text-gray-600 mt-1">{label}</div>
      <div className="text-[11px] text-gray-400 mt-0.5">{sub}</div>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="h-48 flex items-center justify-center text-sm text-gray-300">
      {message}
    </div>
  );
}