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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Terminal</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            On-chain privacy metrics — Zama Protocol · {network === "sepolia" ? "Sepolia Testnet" : "Ethereum Mainnet"}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          <span>🔒</span>
          <span className="text-xs text-amber-700 font-medium">
            Individual balances are encrypted — only aggregate supply is visible
          </span>
        </div>
      </div>

      {/* ── Supply metric cards ─────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          label="Active Wrappers"
          value={supplyLoading ? null : String(activePairs)}
          sub={`${revokedPairs} revoked`}
          icon="🔗"
          accent="green"
        />
        <MetricCard
          label="Top Shielded Token"
          value={supplyLoading ? null : (sorted[0]?.symbol.replace("Mock", "") ?? "—")}
          sub={sorted[0] ? sorted[0].formattedSupply : "—"}
          icon="🥇"
          accent="blue"
        />
        <MetricCard
          label="Shield Transactions"
          value={eventsEnabled ? (eventsLoading ? null : String(totalWrapTx)) : "—"}
          sub="Last 24 hours · click Load"
          icon="↑"
          accent="amber"
        />
        <MetricCard
          label="Unshield Transactions"
          value={eventsEnabled ? (eventsLoading ? null : String(totalUnwrapTx)) : "—"}
          sub="Last 24 hours · click Load"
          icon="↓"
          accent="purple"
        />
      </div>

      {/* ── Charts row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-5">
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
          <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200">
            <span>🔒</span>
            <span>Individual holders encrypted</span>
          </div>
        </div>
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
    </div>
  );
}

function MetricCard({
  label, value, sub, icon, accent,
}: {
  label: string; value: string | null; sub: string; icon: string;
  accent: "green" | "blue" | "amber" | "purple";
}) {
  const colors = {
    green: "bg-[#d0ede2] text-[#156640]",
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    purple: "bg-purple-50 text-purple-600",
  };
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base mb-3 ${colors[accent]}`}>
        {icon}
      </div>
      <div className="text-xl font-bold text-gray-900 tracking-tight min-h-[28px]">
        {value === null ? (
          <div className="h-6 w-20 bg-gray-100 rounded animate-pulse" />
        ) : value}
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