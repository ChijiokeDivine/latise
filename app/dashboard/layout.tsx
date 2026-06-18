// app/dashboard/layout.tsx
// Location: latise/app/dashboard/layout.tsx
// Coinbase-style shell: fixed left sidebar + sticky topbar + scrollable content.
// All dashboard views (registry, vault, analytics, faucet) live inside this layout.

"use client";

import { Providers } from "@/app/providers";
import { Sidebar } from "@/app/components/sidebar/Sidebar";
import { Topbar } from "@/app/components/sidebar/Topbar";
import { useState } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <Providers>
      <div className="flex h-screen bg-white overflow-hidden">
        {/* ── Fixed left sidebar ─────────────────────────────── */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* ── Right: topbar + scrollable content ─────────────── */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Topbar
            onMenuClick={() => setSidebarOpen(true)}
          />
          <main className="flex-1 overflow-y-auto bg-[#f9fafb]">
            {children}
          </main>
        </div>
      </div>
    </Providers>
  );
}
