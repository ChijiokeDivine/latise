// app/dashboard/layout.tsx
// Location: latise/app/dashboard/layout.tsx
// Coinbase-style shell: fixed left sidebar + sticky topbar + scrollable content.
// All dashboard views (registry, vault, analytics, faucet) live inside this layout.

import { Providers } from "@/app/providers";
import { Sidebar } from "../components/sidebar/Sidebar";
import { Topbar } from "../components/sidebar/Topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <div className="flex h-screen bg-white overflow-hidden">
        {/* ── Fixed left sidebar ─────────────────────────────── */}
        <Sidebar />

        {/* ── Right: topbar + scrollable content ─────────────── */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto bg-[#f9fafb]">
            {children}
          </main>
        </div>
      </div>
    </Providers>
  );
}