// app/components/sidebar/Topbar.tsx
// Location: latise/app/components/sidebar/Topbar.tsx
// Sticky top bar: search field, bell, help, grid menu, wallet button.
// Mirrors Coinbase's topbar exactly — adapted for Latise.
"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useAccount } from "wagmi";
import { truncateAddress } from "@/app/lib/constants";
import { NetworkSwitcher } from "./NetworkSwitcher";
import { useState, useRef, useEffect } from "react";

interface TopbarProps {
  onMenuClick?: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { login, logout, ready, authenticated } = usePrivy();
  const { address } = useAccount();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleCopy = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!helpModalOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setHelpModalOpen(false);
      }
    }

    document.addEventListener("keydown", handleEscape);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = originalOverflow;
    };
  }, [helpModalOpen]);

  return (
    <header
      className="flex items-center gap-4 px-4 md:px-6 bg-white border-b border-gray-200 shrink-0"
      style={{ height: "var(--topbar-height, 60px)" }}
    >
      {/* Mobile menu button */}
      <button
        className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600"
        onClick={onMenuClick}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
          <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

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
          placeholder="Search"
          className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#156640]/20 focus:border-[#156640] w-56 transition"
        />
      </div>

      {/* Network switcher */}
      <NetworkSwitcher />

      {/* Icons */}
      <div className="flex items-center gap-1 hidden md:flex">
       
        {/* Help */}
        <button
          type="button"
          aria-label="Open application overview"
          onClick={() => setHelpModalOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition"
        >
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
        <div className="flex items-center gap-2">
          {authenticated && address ? (
            <>
              {/* Desktop version (hover) */}
              <div
                ref={dropdownRef}
                className="relative hidden md:block"
                onMouseEnter={() => setDropdownOpen(true)}
                onMouseLeave={() => setDropdownOpen(false)}
              >
                <button className="flex items-center gap-2 pl-3 pr-1 py-1 rounded-full border border-gray-200 hover:border-gray-300 text-sm font-medium text-gray-700 transition">
                  <span className="text-xs text-gray-500">{truncateAddress(address)}</span>
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    <img
                      src={`https://api.dicebear.com/10.x/identicon/svg?seed=${address}`}
                      alt="Latise"
                      className="w-4 h-4"
                    />
                  </span>
                </button>

                {/* Dropdown */}
                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl border border-gray-200 shadow-lg py-1 z-50">
                    {/* Actions */}
                    <button
                      onClick={handleCopy}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      {copied ? (
                        <>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4 text-[#156640]">
                            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <span className="text-[#156640] font-medium">Copied!</span>
                        </>
                      ) : (
                        <>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
                            <rect x="9" y="9" width="13" height="13" rx="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                          {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''}
                        </>
                      )}
                    </button>

                    <div className="border-t border-gray-100 my-1" />

                    <button
                      onClick={() => logout()}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      Disconnect
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile version (click) */}
              <div
                ref={dropdownRef}
                className="relative md:hidden"
              >
                <button 
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full border border-gray-200 hover:border-gray-300 text-sm font-medium text-gray-700 transition"
                >
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    <img
                      src={`https://api.dicebear.com/10.x/identicon/svg?seed=${address}`}
                      alt="Latise"
                      className="w-4 h-4"
                    />
                  </span>
                </button>

                {/* Dropdown */}
                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl border border-gray-200 shadow-lg py-1 z-50">
                    {/* Actions */}
                    <button
                      onClick={() => {
                        handleCopy();
                        setDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      {copied ? (
                        <>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4 text-[#156640]">
                            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <span className="text-[#156640] font-medium">Copied!</span>
                        </>
                      ) : (
                        <>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
                            <rect x="9" y="9" width="13" height="13" rx="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                          {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''}
                        </>
                      )}
                    </button>

                    <div className="border-t border-gray-100 my-1" />

                    <button
                      onClick={() => {
                        logout();
                        setDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      Disconnect
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button
              onClick={() => login()}
              className="px-3 md:px-4 py-2 bg-[#156640] hover:bg-[#0f4f30] text-white text-sm font-semibold rounded-lg transition"
            >
              Connect
            </button>
          )}
        </div>
      )}

      {helpModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/45 px-4"
          onClick={() => setHelpModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="latise-overview-title"
            className="w-full max-w-2xl rounded-3xl border border-gray-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
              <div>
                
                <h2 id="latise-overview-title" className="mt-1 text-2xl font-semibold text-gray-900">
                  What Latise does
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-gray-600">
                  Latise lets users shield ERC-20 tokens into confidential wrapper assets powered by FHE,
                  monitor shielded supply across supported pairs, and manage wrap or unwrap flows from one
                  dashboard.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close application overview"
                onClick={() => setHelpModalOpen(false)}
                className="ml-4 inline-flex h-10 w-10 items-center justify-center rounded-xl text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="grid gap-4 px-6 py-6 md:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <h3 className="text-sm font-semibold text-gray-900">Shield Assets</h3>
                <p className="mt-2 text-xs leading-6 text-gray-600">
                  Deposit supported ERC-20 tokens and mint confidential wrappers through a guided shield flow.
                </p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <h3 className="text-sm font-semibold text-gray-900">Reveal Data Safely</h3>
                <p className="mt-2 text-xs leading-6 text-gray-600">
                  Decrypt balances client-side with your wallet so plaintext stays under your control.
                </p>
              </div>
             
            </div>

            <div className="border-t border-gray-100 px-6 py-5">
              

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setHelpModalOpen(false)}
                  className="rounded-xl bg-[#156640] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0f4f30]"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
