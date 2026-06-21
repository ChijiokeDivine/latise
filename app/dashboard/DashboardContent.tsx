// app/dashboard/DashboardContent.tsx
"use client";

import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { useRegistry } from "@/app/hooks/useRegistry";
import { useTVS } from "@/app/hooks/useTVS";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount } from "wagmi";
import Link from "next/link";
import { truncateAddress } from "@/app/lib/constants";
import type { Network } from "@/app/types";

function getWrapperIconSrc(wrapperSymbol: string): string | null {
  // Handle both "c..." and "c...Mock" versions
  if (wrapperSymbol.includes("USDC")) {
    return "/cUSDCMock.svg";
  }
  if (wrapperSymbol.includes("USDT")) {
    return "/cUSDTMock.svg";
  }
  if (wrapperSymbol.includes("WETH")) {
    return "/cWETHMock.png";
  }
  if (wrapperSymbol.includes("ZAMA")) {
    return "/cZAMAMock.png";
  }
  if (wrapperSymbol.includes("tGBP")) {
    return "/ctGBPMock.png";
  }
  if (wrapperSymbol.includes("XAUt")) {
    return "/cXAUtMock.png";
  }
  if (wrapperSymbol.includes("BRON")) {
    return "/cBRONMock.webp";
  }
  return null;
}

function getTokenIconSrc(wrapperSymbol: string): string | null {
  // Handle both "c..." and "c...Mock" versions
  if (wrapperSymbol.includes("USDC")) {
    return "/cUSDCMock.svg";
  }
  if (wrapperSymbol.includes("USDT")) {
    return "/cUSDTMock.svg";
  }
  if (wrapperSymbol.includes("WETH")) {
    return "/cWETHMock.png";
  }
  if (wrapperSymbol.includes("ZAMA")) {
    return "/cZAMAMock.png";
  }
  if (wrapperSymbol.includes("tGBP")) {
    return "/ctGBPMock.png";
  }
  if (wrapperSymbol.includes("XAUt")) {
    return "/cXAUtMock.png";
  }
  if (wrapperSymbol.includes("BRON")) {
    return "/cBRONMock.webp";
  }
  return null;
}

export default function DashboardContent() {
  const searchParams = useSearchParams();
  const network = (searchParams.get("network") ?? "sepolia") as Network;
  const { data: pairs = [], isLoading: pairsLoading } = useRegistry(network);
  const { data: tvsData, isLoading: tvsLoading } = useTVS(network);
  const { login, authenticated } = usePrivy();
  const { address } = useAccount();


  const topPairs = pairs.filter((p) => p.isValid).slice(0, 6);

  return (
    <div className="flex flex-col md:flex-row h-full">
      {/* ── LEFT / MAIN ───────────────────────────────────────── */}
      <div className="flex-1 min-w-0 overflow-y-auto border-r border-gray-200">
        <div className="p-4 md:p-6">
          {/* Page header */}
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Home</h1>

          {/* TVS Hero number */}
          <div className="mb-2 flex items-end gap-4">
            <div>
              <div className="text-4xl font-bold text-gray-900 tracking-tight">
                {tvsLoading ? (
                  <div className="h-10 w-40 bg-gray-100 rounded-lg animate-pulse" />
                ) : (
                  "Shielded Assets"
                )}
              </div>
             
            </div>
            {/* Mini sparkline placeholder */}
            <div className="flex-1 h-14 flex items-end justify-end pb-1 pr-2 opacity-60 hidden md:flex">
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
                    <div className="w-6 h-6 rounded-full bg-[#d0ede2] flex items-center justify-center text-[#156640] font-bold text-sm shrink-0 overflow-hidden">
                      {getWrapperIconSrc(pair.wrapperSymbol) ? (
                        <Image
                          src={getWrapperIconSrc(pair.wrapperSymbol)!}
                          alt={pair.wrapperSymbol}
                          width={24}
                          height={24}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        pair.tokenSymbol.slice(0, 2).toUpperCase()
                      )}
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
                      <div className="text-xs text-gray-400 mt-0.5 truncate hidden md:block">
                        {truncateAddress(pair.wrapperAddress)}
                      </div>
                    </div>

                    {(() => {
                      const supply = tvsData?.byToken.find(
                        (s) => s.wrapperAddress === pair.wrapperAddress
                      );
                      if (!supply) return null;
                      return (
                        <div className="text-right">
                          <div className="text-sm font-semibold text-gray-900">
                            {supply.formattedSupply}
                          </div>
                          <div className="text-xs text-gray-400 hidden md:block">
                            {supply.formattedUnderlying}
                          </div>
                        </div>
                      );
                    })()}

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
              <div className="flex gap-2 hidden md:flex">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <PromoCard
                icon={
                  <svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><title>safe_shield_line</title><g id="safe_shield_line" fill='none' fillRule='evenodd'><path d='M24 0v24H0V0zM12.593 23.258l-.011.002-.071.035-.02.004-.014-.004-.071-.035c-.01-.004-.019-.001-.024.005l-.004.01-.017.428.005.02.01.013.104.074.015.004.012-.004.104-.074.012-.016.004-.017-.017-.427c-.002-.01-.009-.017-.017-.018m.265-.113-.013.002-.185.093-.01.01-.003.011.018.43.005.012.008.007.201.093c-.012.004.023 0 .029-.008l-.004-.014-.034-.614c-.003-.012-.01-.02-.02-.022m-.715.002a.023.023 0 0 0-.027.006l-.006.014-.034.614c0 .012.007.02.017.024l-.015-.002.201-.093.01-.008.004-.011.017-.43-.003-.012-.01-.01z'/><path fill='#09244BFF' d='M11.298 2.195a2 2 0 0 1 1.232-.055l.172.055 7 2.625a2 2 0 0 1 1.291 1.708l.007.165v5.363a9 9 0 0 1-4.709 7.911l-.266.139-3.354 1.677a1.5 1.5 0 0 1-1.198.062l-.144-.062-3.354-1.677a9 9 0 0 1-4.97-7.75l-.005-.3V6.693a2 2 0 0 1 1.145-1.808l.153-.065zM12 4.068 5 6.693v5.363a7 7 0 0 0 3.635 6.138l.235.123L12 19.882l3.13-1.565a7 7 0 0 0 3.865-5.997l.005-.264V6.693zm-.492 3.448a1.4 1.4 0 0 1 .846-.043l.138.043 2.8 1.05a1.4 1.4 0 0 1 .902 1.178l.006.133v2.145a4.2 4.2 0 0 1-2.131 3.655l-.19.102-1.342.67a1.2 1.2 0 0 1-.944.056l-.13-.055-1.341-.671a4.2 4.2 0 0 1-2.316-3.54l-.006-.217V9.877a1.4 1.4 0 0 1 .786-1.258l.122-.053zM12 9.468l-2.2.825v1.73a2.2 2.2 0 0 0 1.07 1.887l.146.08.984.492.984-.492a2.2 2.2 0 0 0 1.21-1.802l.006-.166v-1.729z'/></g></svg>
                }
                title="Shield assets now"
                desc="Encrypt your ERC-20 tokens with a single transaction."
                href={`/dashboard/vault?network=${network}`}
              />
              <PromoCard
                icon={<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><title>drop_line</title><g id="drop_line" fill='none' fillRule='evenodd'><path d='M24 0v24H0V0zM12.593 23.258l-.011.002-.071.035-.02.004-.014-.004-.071-.035c-.01-.004-.019-.001-.024.005l-.004.01-.017.428.005.02.01.013.104.074.015.004.012-.004.104-.074.012-.016.004-.017-.017-.427c-.002-.01-.009-.017-.017-.018m.265-.113-.013.002-.185.093-.01.01-.003.011.018.43.005.012.008.007.201.093c-.012.004.023 0 .029-.008l-.004-.014-.034-.614c-.003-.012-.01-.02-.02-.022m-.715.002a.023.023 0 0 0-.027.006l-.006.014-.034.614c0 .012.007.02.017.024l-.015-.002.201-.093.01-.008.004-.011.017-.43-.003-.012-.01-.01z'/><path fill='#09244BFF' d='M12 4.307a26.826 26.826 0 0 0-3.124 3.245C7.305 9.507 6 11.817 6 14a6 6 0 0 0 12 0c0-2.183-1.305-4.493-2.876-6.448A26.824 26.824 0 0 0 12 4.307m-.751-1.986a1.18 1.18 0 0 1 1.502 0A28.635 28.635 0 0 1 16.682 6.3C18.322 8.339 20 11.106 20 14a8 8 0 0 1-16 0c0-2.894 1.678-5.661 3.318-7.701a28.636 28.636 0 0 1 3.93-3.978Z'/></g></svg>}
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
  icon: React.ReactNode;
  title: string;
  desc: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl hover:bg-white transition group"
    >
      <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-xl shrink-0">
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
      <div className="hidden md:block">
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
                    <div className="w-7 h-7 rounded-full bg-[#d0ede2] flex items-center justify-center text-[#156640] font-bold text-[11px] overflow-hidden">
                      {getTokenIconSrc(pair.wrapperSymbol) ? (
                        <Image
                          src={getTokenIconSrc(pair.wrapperSymbol)!}
                          alt={pair.tokenSymbol}
                          width={28}
                          height={28}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        pair.tokenSymbol.slice(0, 2).toUpperCase()
                      )}
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
      {/* Mobile friendly cards */}
      <div className="md:hidden">
        {pairs.map((pair) => (
          <Link
            key={pair.wrapperAddress}
            href={`/dashboard/vault?wrapper=${pair.wrapperAddress}&network=${network}`}
            className="block p-4 border-b border-gray-100 hover:bg-gray-50 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#d0ede2] flex items-center justify-center text-[#156640] font-bold text-xs overflow-hidden">
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
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">{pair.tokenSymbol} → {pair.wrapperSymbol}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      pair.isValid ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
                    }`}
                  >
                    {pair.isValid ? "Active" : "Revoked"}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Rate: 1 : {Number(pair.rate).toLocaleString()}
                </div>
              </div>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="w-4 h-4 text-gray-300"
              >
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </Link>
        ))}
      </div>
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
    <div className="hidden md:block shrink-0 overflow-y-auto border-l border-gray-200 bg-white px-5 py-6 space-y-5" style={{ width: 300 }}>
      {/* Shield / Unshield tabs */}
      <div>
        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl mb-4">
          {["Shield", "Unshield"].map((t, i) => (
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
        {/* Pay with */}
        <div className="flex items-center justify-between py-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full overflow-hidden">
              <Image 
                src="/cBRONMock.webp" 
                alt="ETH" 
                width={32} 
                height={32} 
                className="w-full h-full object-cover"
              />
            </div>
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
            <div className="w-8 h-8 rounded-full overflow-hidden">
              <Image 
                src="/secure.jpeg" 
                alt="Confidential Token" 
                width={32} 
                height={32} 
                className="w-full h-full object-cover"
              />
            </div>
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
        <QuickAction icon={<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24'><title>arrow_up_line</title><g id="arrow_up_line" fill='none' fillRule='nonzero'><path d='M24 0v24H0V0h24zM12.593 23.258l-.011.002-.071.035-.02.004-.014-.004-.071-.035c-.01-.004-.019-.001-.024.005l-.004.01-.017.428.005.02.01.013.104.074.015.004.012-.004.104-.074.012-.016.004-.017-.017-.427c-.002-.01-.009-.017-.017-.018Zm.265-.113-.013.002-.185.093-.01.01-.003.011.018.43.005.012.008.007.201.093c-.012.004.023 0 .029-.008l-.004-.014-.034-.614c-.003-.012-.01-.02-.02-.022Zm-.715.002a.023.023 0 0 0-.027.006l-.006.014-.034.614c0 .012.007.02.017.024l-.015-.002.201-.093.01-.008.004-.011.017-.43-.003-.012-.01-.01-.184-.092Z'/><path fill='#09244BFF' d='M12.707 3.636a1 1 0 0 0-1.414 0L5.636 9.293a1 1 0 1 0 1.414 1.414L11 6.757V20a1 1 0 1 0 2 0V6.757l3.95 3.95a1 1 0 0 0 1.414-1.414l-5.657-5.657Z'/></g></svg>} label="Shield assets" href={`/dashboard/vault?tab=shield&network=${network}`} color="bg-blue-50 text-blue-600" />
        <QuickAction icon={<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24'><title>arrow_down_line</title><g id="arrow_down_line" fill='none' fillRule='nonzero'><path d='M24 0v24H0V0h24zM12.593 23.258l-.011.002-.071.035-.02.004-.014-.004-.071-.035c-.01-.004-.019-.001-.024.005l-.004.01-.017.428.005.02.01.013.104.074.015.004.012-.004.104-.074.012-.016.004-.017-.017-.427c-.002-.01-.009-.017-.017-.018Zm.265-.113-.013.002-.185.093-.01.01-.003.011.018.43.005.012.008.007.201.093c-.012.004.023 0 .029-.008l-.004-.014-.034-.614c-.003-.012-.01-.02-.02-.022Zm-.715.002a.023.023 0 0 0-.027.006l-.006.014-.034.614c0 .012.007.02.017.024l-.015-.002.201-.093.01-.008.004-.011.017-.43-.003-.012-.01-.01-.184-.092Z'/><path fill='#09244BFF' d='m11 17.243-3.95-3.95a1 1 0 1 0-1.414 1.414l5.657 5.657a1 1 0 0 0 1.414 0l5.657-5.657a1 1 0 0 0-1.414-1.414L13 17.243V4a1 1 0 1 0-2 0v13.243Z'/></g></svg>} label="Unshield assets" href={`/dashboard/vault?tab=unshield&network=${network}`} color="bg-blue-50 text-blue-600" />
        <QuickAction icon={<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24'><title>search_line</title><g id="search_line" fill='none' fillRule='evenodd'><path d='M24 0v24H0V0zM12.593 23.258l-.011.002-.071.035-.02.004-.014-.004-.071-.035c-.01-.004-.019-.001-.024.005l-.004.01-.017.428.005.02.01.013.104.074.015.004.012-.004.104-.074.012-.016.004-.017-.017-.427c-.002-.01-.009-.017-.017-.018m.265-.113-.013.002-.185.093-.01.01-.003.011.018.43.005.012.008.007.201.093c-.012.004.023 0 .029-.008l-.004-.014-.034-.614c-.003-.012-.01-.02-.02-.022m-.715.002a.023.023 0 0 0-.027.006l-.006.014-.034.614c0 .012.007.02.017.024l-.015-.002.201-.093.01-.008.004-.011.017-.43-.003-.012-.01-.01z'/><path fill='#09244BFF' d='M10.5 2a8.5 8.5 0 1 0 5.262 15.176l3.652 3.652a1 1 0 0 0 1.414-1.414l-3.652-3.652A8.5 8.5 0 0 0 10.5 2M4 10.5a6.5 6.5 0 1 1 13 0 6.5 6.5 0 0 1-13 0'/></g></svg>} label="View registry" href={`/dashboard/registry?network=${network}`} color="bg-blue-50 text-blue-600" />
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
  icon: React.ReactNode;
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
