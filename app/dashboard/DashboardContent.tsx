// app/dashboard/DashboardContent.tsx
"use client";

import { useSearchParams } from "next/navigation";
import { useRegistry } from "@/app/hooks/useRegistry";
import { useTVS } from "@/app/hooks/useTVS";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount } from "wagmi";
import Link from "next/link";
import { formatUSD, formatTokenUnits, truncateAddress as fmt } from "@/app/lib/format";
import { truncateAddress } from "@/app/lib/constants";
import type { Network } from "@/app/types";

export default function DashboardContent() {
  const searchParams = useSearchParams();
  const network = (searchParams.get("network") ?? "sepolia") as Network;
  const { data: pairs = [], isLoading: pairsLoading } = useRegistry(network);
  const { data: tvsData, isLoading: tvsLoading } = useTVS(network);
  const { login, authenticated } = usePrivy();
  const { address } = useAccount();

  const totalTVS = tvsData?.totalUSD;
  const topPairs = pairs.filter((p) => p.isValid).slice(0, 6);

  return (
    <div className="flex h-full">
      {/* ── LEFT / MAIN ───────────────────────────────────────── */}
      <div className="flex-1 min-w-0 overflow-y-auto border-r border-gray-200">
        <div className="p-6">
          {/* Page header */}
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Home</h1>

          {/* TVS Hero number */}
          <div className="mb-2 flex items-end gap-4">
            <div>
              <div className="text-4xl font-bold text-gray-900 tracking-tight">
                {tvsLoading ? (
                  <div className="h-10 w-40 bg-gray-100 rounded-lg animate-pulse" />
                ) : (
                  formatUSD(totalTVS ?? null)
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">Total Value Shielded</p>
            </div>
            {/* Mini sparkline placeholder */}
            <div className="flex-1 h-14 flex items-end justify-end pb-1 pr-2 opacity-60">
              <svg viewBox="0 0 120 40" className="w-32 h-10">
                <polyline
                  fill="none"
                  stroke="#156640"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points="0,35 20,30 40,28 60,20 80,15 100,10 120,4"
                />
              </svg>
            </div>
          </div>

          {/* Asset rows */}
          <div className="mt-6 bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
            {pairsLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4">
                    <div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 w-24 bg-gray-100 rounded animate-pulse" />
                      <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
                    </div>
                  </div>
                ))
              : topPairs.map((pair) => (
                  <Link
                    key={pair.wrapperAddress}
                    href={`/dashboard/vault?wrapper=${pair.wrapperAddress}&network=${network}`}
                    className="flex items-center gap-4 p-4 hover:bg-gray-50 transition group"
                  >
                    <div className="w-9 h-9 rounded-full bg-[#d0ede2] flex items-center justify-center text-[#156640] font-bold text-sm shrink-0">
                      {pair.tokenSymbol.slice(0, 2).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">
                          {pair.wrapperSymbol}
                        </span>
                        {!pair.isValid && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-600 rounded font-medium">
                            Revoked
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5 truncate">
                        {truncateAddress(pair.wrapperAddress)}
                      </div>
                    </div>

                    {pair.tvs && (
                      <div className="text-right">
                        <div className="text-sm font-semibold text-gray-900">
                          {formatUSD(pair.tvs.tvsUSD)}
                        </div>
                        <div className="text-xs text-gray-400">
                          {pair.tvs.formattedAmount} {pair.wrapperSymbol}
                        </div>
                      </div>
                    )}

                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      className="w-4 h-4 text-gray-300 group-hover:text-gray-500 shrink-0"
                    >
                      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                ))}
          </div>

          {/* "For you" cards */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">For you</h2>
              <div className="flex gap-2">
                <button className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                    <path d="M15 18l-6-6 6-6" strokeLinecap="round" />
                  </svg>
                </button>
                <button className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                    <path d="M9 18l6-6-6-6" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <PromoCard
                icon="🔒"
                title="Shield assets now"
                desc="Encrypt your ERC-20 tokens with a single transaction."
                href={`/dashboard/vault?network=${network}`}
              />
              <PromoCard
                icon="🚰"
                title="Get test tokens"
                desc="Claim free cTokenMock assets on Sepolia instantly."
                href={`/dashboard/faucet?network=${network}`}
              />
            </div>
          </div>

          {/* Pairs table */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">All Pairs</h2>
              <Link
                href={`/dashboard/registry?network=${network}`}
                className="text-xs text-[#156640] font-semibold hover:underline"
              >
                View registry →
              </Link>
            </div>
            <PairsTable pairs={topPairs} network={network} loading={pairsLoading} />
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ───────────────────────────────────────── */}
      <RightPanel network={network} authenticated={authenticated} login={login} address={address} />
    </div>
  );
}

/* ── Subcomponents ──────────────────────────────────────────────── */

function PromoCard({
  icon,
  title,
  desc,
  href,
}: {
  icon: string;
  title: string;
  desc: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl hover:bg-white hover:shadow-sm transition group"
    >
      <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-xl shrink-0 shadow-sm">
        {icon}
      </div>
      <div>
        <div className="text-sm font-semibold text-gray-900">{title}</div>
        <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</div>
      </div>
    </Link>
  );
}

function PairsTable({
  pairs,
  network,
  loading,
}: {
  pairs: any[];
  network: Network;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 bg-white rounded-lg border border-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Token</th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Wrapper</th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Rate</th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
            <th className="py-3 px-4" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {pairs.map((pair) => (
            <tr key={pair.wrapperAddress} className="hover:bg-gray-50 transition">
              <td className="py-3 px-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-[#d0ede2] flex items-center justify-center text-[#156640] font-bold text-[11px]">
                    {pair.tokenSymbol.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-[13px]">{pair.tokenSymbol}</div>
                    <div className="text-[11px] text-gray-400">{truncateAddress(pair.tokenAddress)}</div>
                  </div>
                </div>
              </td>
              <td className="py-3 px-4 text-[13px] font-medium text-gray-700">
                {pair.wrapperSymbol}
                <div className="text-[11px] text-gray-400 font-normal">{truncateAddress(pair.wrapperAddress)}</div>
              </td>
              <td className="py-3 px-4 text-[13px] text-gray-600">
                1 : {Number(pair.rate).toLocaleString()}
              </td>
              <td className="py-3 px-4">
                <span
                  className={`text-[11px] px-2 py-1 rounded-full font-semibold ${
                    pair.isValid ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
                  }`}
                >
                  {pair.isValid ? "Active" : "Revoked"}
                </span>
              </td>
              <td className="py-3 px-4">
                <Link
                  href={`/dashboard/vault?wrapper=${pair.wrapperAddress}&network=${network}`}
                  className="text-[12px] font-semibold text-[#156640] hover:text-[#0f4f30]"
                >
                  Shield →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RightPanel({
  network,
  authenticated,
  login,
  address,
}: {
  network: Network;
  authenticated: boolean;
  login: () => void;
  address?: string;
}) {
  return (
    <div className="shrink-0 overflow-y-auto border-l border-gray-200 bg-white px-5 py-6 space-y-5" style={{ width: 300 }}>
      {/* Shield / Unshield tabs */}
      <div>
        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl mb-4">
          {["Shield", "Unshield", "Explore"].map((t, i) => (
            <Link
              key={t}
              href={`/dashboard/vault?tab=${t.toLowerCase()}&network=${network}`}
              className={`flex-1 text-center py-2 rounded-lg text-sm font-semibold transition ${
                i === 0 ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t}
            </Link>
          ))}
        </div>

        {/* Order type dropdown */}
        <button className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 mb-4">
          <span>One-time shield</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <path d="M6 9l6 6 6-6" strokeLinecap="round" />
          </svg>
        </button>

        {/* Amount input */}
        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-2">
          <input
            type="number"
            placeholder="0"
            className="flex-1 bg-transparent text-3xl font-light text-gray-300 outline-none w-16"
          />
          <span className="text-2xl font-light text-gray-300 ml-1">USDC</span>
          <button className="ml-2 text-xs font-bold text-gray-400 border border-gray-200 px-2 py-1 rounded hover:bg-white transition">
            Max
          </button>
        </div>

        {/* Pay with */}
        <div className="flex items-center justify-between py-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#d0ede2] flex items-center justify-center text-[#156640] font-bold text-xs">UC</div>
            <div>
              <div className="text-sm font-semibold text-gray-900">Pay with</div>
              <div className="text-xs text-gray-400">ERC-20 token</div>
            </div>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-gray-300">
            <path d="M9 18l6-6-6-6" strokeLinecap="round" />
          </svg>
        </div>

        {/* Receive */}
        <div className="flex items-center justify-between py-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#156640] flex items-center justify-center text-white font-bold text-xs">cU</div>
            <div>
              <div className="text-sm font-semibold text-gray-900">Receive</div>
              <div className="text-xs text-gray-400">Confidential token</div>
            </div>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-gray-300">
            <path d="M9 18l6-6-6-6" strokeLinecap="round" />
          </svg>
        </div>

        {/* CTA */}
        {authenticated && address ? (
          <Link
            href={`/dashboard/vault?network=${network}`}
            className="mt-4 block w-full text-center py-3 bg-[#156640] hover:bg-[#0f4f30] text-white font-semibold rounded-xl transition"
          >
            Go to Privacy Vault →
          </Link>
        ) : (
          <button
            onClick={() => login()}
            className="mt-4 w-full py-3 bg-[#156640] hover:bg-[#0f4f30] text-white font-semibold rounded-xl transition"
          >
            Connect Wallet
          </button>
        )}
      </div>

      {/* Quick actions */}
      <div className="space-y-1 pt-2 border-t border-gray-100">
        <QuickAction icon="↑" label="Shield assets" href={`/dashboard/vault?tab=shield&network=${network}`} color="bg-[#d0ede2] text-[#156640]" />
        <QuickAction icon="↓" label="Unshield assets" href={`/dashboard/vault?tab=unshield&network=${network}`} color="bg-[#d0ede2] text-[#156640]" />
        <QuickAction icon="🔍" label="View registry" href={`/dashboard/registry?network=${network}`} color="bg-blue-50 text-blue-600" />
        <QuickAction icon="🚰" label="Claim test tokens" href={`/dashboard/faucet?network=${network}`} color="bg-purple-50 text-purple-600" />
      </div>
    </div>
  );
}

function QuickAction({
  icon,
  label,
  href,
  color,
}: {
  icon: string;
  label: string;
  href: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition group"
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${color}`}>
        {icon}
      </div>
      <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{label}</span>
    </Link>
  );
}