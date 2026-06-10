// app/components/sidebar/Topbar.tsx
// Location: latise/app/components/sidebar/Topbar.tsx
// Sticky top bar: search field, bell, help, grid menu, wallet button.
// Mirrors Coinbase's topbar exactly — adapted for Latise.
"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useAccount } from "wagmi";
import { truncateAddress } from "@/app/lib/constants";
import { NetworkSwitcher } from "./NetworkSwitcher";

export function Topbar() {
  const { login, logout, ready, authenticated } = usePrivy();
  const { address } = useAccount();

  return (
    <header
      className="flex items-center gap-4 px-6 bg-white border-b border-gray-200 shrink-0"
      style={{ height: "var(--topbar-height, 60px)" }}
    >
      {/* Page title — injected by child pages via CSS / context */}
      <div className="flex-1" />

      {/* Search */}
      <div className="relative hidden md:flex items-center">
        <svg
          className="absolute left-3 w-4 h-4 text-gray-400"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          placeholder="Search for an asset"
          className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#156640]/20 focus:border-[#156640] w-56 transition"
        />
      </div>

      {/* Network switcher */}
      <NetworkSwitcher />

      {/* Icons */}
      <div className="flex items-center gap-1">
        {/* Bell */}
        <button className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition relative">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        {/* Help */}
        <button className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth={2} strokeLinecap="round" />
          </svg>
        </button>
        {/* Grid */}
        <button className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <rect x="3" y="3" width="4" height="4" rx="1" /><rect x="10" y="3" width="4" height="4" rx="1" /><rect x="17" y="3" width="4" height="4" rx="1" />
            <rect x="3" y="10" width="4" height="4" rx="1" /><rect x="10" y="10" width="4" height="4" rx="1" /><rect x="17" y="10" width="4" height="4" rx="1" />
            <rect x="3" y="17" width="4" height="4" rx="1" /><rect x="10" y="17" width="4" height="4" rx="1" /><rect x="17" y="17" width="4" height="4" rx="1" />
          </svg>
        </button>
      </div>

      {/* Wallet button */}
      {ready && (
        authenticated && address ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => logout()}
              className="flex items-center gap-2 pl-3 pr-1 py-1 rounded-full border border-gray-200 hover:border-gray-300 text-sm font-medium text-gray-700 transition"
            >
              <span className="text-xs text-gray-500">{truncateAddress(address)}</span>
              <span className="w-7 h-7 rounded-full bg-[#156640] flex items-center justify-center text-white text-xs font-bold">
                {address.slice(2, 4).toUpperCase()}
              </span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => login()}
            className="px-4 py-2 bg-[#156640] hover:bg-[#0f4f30] text-white text-sm font-semibold rounded-lg transition"
          >
            Connect Wallet
          </button>
        )
      )}
    </header>
  );
}