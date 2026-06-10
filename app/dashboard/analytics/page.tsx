// app/dashboard/analytics/page.tsx
// Location: latise/app/dashboard/analytics/page.tsx
// TVS analytics: metric cards, top wrapper leaderboard, volume chart via Recharts.
"use client";

import { useSearchParams } from "next/navigation";
import { useTVS } from "@/app/hooks/useTVS";
import { useRegistry } from "@/app/hooks/useRegistry";
import { useVolumeEvents } from "@/app/hooks/useVolumeEvents";
import { formatUSD, formatTokenUnits } from "@/app/lib/format";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid,
} from "recharts";
import type { Network } from "@/app/types";

export default function AnalyticsPage() {
  const searchParams = useSearchParams();
  const network = (searchParams.get("network") ?? "sepolia") as Network;

  const { data: tvsData, isLoading: tvsLoading } = useTVS(network);
  const { data: pairs = [] } = useRegistry(network);
  const { data: volumeData } = useVolumeEvents(pairs, network);

  const byToken = tvsData?.byToken ?? [];
  const sorted = [...byToken].sort((a, b) => (b.tvsUSD ?? 0) - (a.tvsUSD ?? 0));

  // Build recharts data
  const barData = sorted.map((t) => ({
    name: t.symbol.replace("Mock", ""),
    tvs: t.tvsUSD ?? 0,
    amount: Number(t.wrapperUnits) / 1e6,
  }));

  // Use real daily volume if available, else flat placeholder
  const allDaily = volumeData?.dailyByPair?.flatMap((d) => d.daily) ?? [];
  // Aggregate by date
  const dateMap = new Map<string, { date: string; wrap: number; unwrap: number }>();
  for (const entry of allDaily) {
    const existing = dateMap.get(entry.date) ?? { date: entry.date, wrap: 0, unwrap: 0 };
    existing.wrap += entry.wrapVolume;
    existing.unwrap += entry.unwrapVolume;
    dateMap.set(entry.date, existing);
  }
  const volumeChartData = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date)).slice(-14);

  // Stats
  const totalTVS = tvsData?.totalUSD;
  const totalWrapVolume = volumeData?.wrapEvents.length ?? 0;
  const totalUnwrapVolume = volumeData?.unwrapEvents.length ?? 0;
  const privacyRatio = pairs.length > 0
    ? Math.round((pairs.filter((p) => p.isValid).length / pairs.length) * 100)
    : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics Terminal</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Real-time privacy metrics — sourced directly from on-chain data
        </p>
      </div>

      {/* ── Metric cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          label="Total Value Shielded"
          value={tvsLoading ? null : formatUSD(totalTVS ?? null)}
          sub="Across all active wrappers"
          icon="🔒"
          accent="green"
        />
        <MetricCard
          label="Wrap Transactions"
          value={String(totalWrapVolume)}
          sub="Last 7 days"
          icon="↑"
          accent="blue"
        />
        <MetricCard
          label="Unwrap Transactions"
          value={String(totalUnwrapVolume)}
          sub="Last 7 days"
          icon="↓"
          accent="amber"
        />
        <MetricCard
          label="Active Pairs"
          value={`${pairs.filter((p) => p.isValid).length} / ${pairs.length}`}
          sub={`${privacyRatio}% active`}
          icon="⚡"
          accent="purple"
        />
      </div>

      {/* ── Charts row ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-5">
        {/* TVS bar chart */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">TVS by Wrapper</h3>
              <p className="text-xs text-gray-400">Total Value Shielded per token</p>
            </div>
            <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded">USD</span>
          </div>
          {tvsLoading ? (
            <div className="h-48 bg-gray-50 rounded-xl animate-pulse" />
          ) : barData.length === 0 ? (
            <EmptyChart message="No TVS data yet" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                <Tooltip
                  formatter={(v: number) => [`$${v.toFixed(2)}`, "TVS"]}
                  contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 12 }}
                />
                <Bar dataKey="tvs" fill="#156640" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Volume area chart */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Wrap / Unwrap Volume</h3>
              <p className="text-xs text-gray-400">Last 14 days</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#156640]" />Wrap</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#9ca3af]" />Unwrap</span>
            </div>
          </div>
          {volumeChartData.length === 0 ? (
            <EmptyChart message="No volume data yet on this network" />
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
                <Area type="monotone" dataKey="wrap" stroke="#156640" strokeWidth={2} fill="url(#wrapGrad)" name="Wrap" />
                <Area type="monotone" dataKey="unwrap" stroke="#9ca3af" strokeWidth={2} fill="none" name="Unwrap" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Top Wrapper Leaderboard ───────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Top Wrapper Rankings</h3>
            <p className="text-xs text-gray-400 mt-0.5">Ranked by Total Value Shielded</p>
          </div>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
            {network === "sepolia" ? "Testnet" : "Mainnet"}
          </span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="py-2.5 px-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide w-8">#</th>
              <th className="py-2.5 px-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Token</th>
              <th className="py-2.5 px-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Shielded Amount</th>
              <th className="py-2.5 px-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">TVS (USD)</th>
              <th className="py-2.5 px-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Price</th>
              <th className="py-2.5 px-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Share</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {tvsLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="py-3 px-4">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              : sorted.map((t, i) => {
                  const share = totalTVS && t.tvsUSD
                    ? ((t.tvsUSD / totalTVS) * 100).toFixed(1)
                    : null;
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
                      <td className="py-3 px-4 text-right text-[13px] text-gray-700">
                        {t.formattedAmount}
                      </td>
                      <td className="py-3 px-4 text-right text-[13px] font-semibold text-gray-900">
                        {formatUSD(t.tvsUSD)}
                      </td>
                      <td className="py-3 px-4 text-right text-[13px] text-gray-500">
                        {t.priceUSD !== null ? `$${t.priceUSD.toFixed(4)}` : "—"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="flex-1 max-w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#156640] rounded-full"
                              style={{ width: `${share ?? 0}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-400 w-9 text-right">
                            {share ? `${share}%` : "—"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MetricCard({
  label, value, sub, icon, accent,
}: {
  label: string; value: string | null; sub: string; icon: string; accent: "green" | "blue" | "amber" | "purple";
}) {
  const colors = {
    green:  "bg-[#d0ede2] text-[#156640]",
    blue:   "bg-blue-50 text-blue-600",
    amber:  "bg-amber-50 text-amber-600",
    purple: "bg-purple-50 text-purple-600",
  };
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base mb-3 ${colors[accent]}`}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-gray-900 tracking-tight">
        {value === null ? (
          <div className="h-7 w-24 bg-gray-100 rounded animate-pulse" />
        ) : value}
      </div>
      <div className="text-xs text-gray-400 mt-1">{label}</div>
      <div className="text-xs text-gray-300 mt-0.5">{sub}</div>
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