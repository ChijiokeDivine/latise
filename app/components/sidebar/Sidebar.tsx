// app/components/sidebar/Sidebar.tsx
// Location: latise/app/components/sidebar/Sidebar.tsx
// Left sidebar — mirrors Coinbase's sidebar exactly:
// logo top-left, nav items with icons, bottom items (Advanced toggle).
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/app/lib/cn";

const NAV_ITEMS = [
  {
    label: "Home",
    href: "/dashboard",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]">
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
      </svg>
    ),
  },
  {
    label: "Registry",
    href: "/dashboard/registry",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M3 15h18M9 3v18" />
      </svg>
    ),
  },
  {
    label: "Privacy Vault",
    href: "/dashboard/vault",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]">
        <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7L12 2z" />
      </svg>
    ),
  },
  {
    label: "Analytics",
    href: "/dashboard/analytics",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    label: "Faucet",
    href: "/dashboard/faucet",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
        <path d="M7 9h2v6H7zm8 0h2v6h-2z" strokeLinecap="round" />
        <ellipse cx="12" cy="17" rx="3" ry="2" />
        <path d="M9 8c0-1.5.8-3 3-3s3 1.5 3 3" />
      </svg>
    ),
  },
];

const BOTTOM_ITEMS = [
  {
    label: "Transactions",
    href: "/dashboard/transactions",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20" />
      </svg>
    ),
  },
  {
    label: "More",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]">
        <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
      </svg>
    ),
  },
];

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <aside
      className="flex flex-col bg-white border-r border-gray-200 shrink-0"
      style={{ width: "var(--sidebar-width, 220px)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-[60px] border-b border-gray-100">
        <div className="w-7 h-7 rounded-lg bg-[#156640] flex items-center justify-center">
          <span className="text-white font-bold text-sm">L</span>
        </div>
        <span className="font-semibold text-[15px] text-gray-900 tracking-tight">Latise</span>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-[#f0faf5] text-[#156640]"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <span className={cn(isActive(item.href) ? "text-[#156640]" : "text-gray-400")}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-6 pt-4 border-t border-gray-100">
          <ul className="space-y-0.5">
            {BOTTOM_ITEMS.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                >
                  <span className="text-gray-400">{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Advanced toggle */}
      <div className="px-5 py-4 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-[13px] text-gray-500">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
              <path d="M12 20V10M18 20V4M6 20v-4" />
            </svg>
            Advanced
          </div>
          {/* Toggle */}
          <button className="w-9 h-5 bg-gray-200 rounded-full relative transition-colors hover:bg-gray-300">
            <span className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform" />
          </button>
        </div>
      </div>
    </aside>
  );
}