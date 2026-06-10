// app/components/sidebar/NetworkSwitcher.tsx
// Location: latise/app/components/sidebar/NetworkSwitcher.tsx
"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { cn } from "@/app/lib/cn";

export function NetworkSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("network") ?? "sepolia";

  const switchTo = (network: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("network", network);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center bg-gray-100 rounded-lg p-0.5 text-xs font-semibold">
      {["sepolia", "mainnet"].map((n) => (
        <button
          key={n}
          onClick={() => switchTo(n)}
          className={cn(
            "px-3 py-1.5 rounded-md capitalize transition-all",
            current === n
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          )}
        >
          {n === "sepolia" ? "Testnet" : "Mainnet"}
        </button>
      ))}
    </div>
  );
}