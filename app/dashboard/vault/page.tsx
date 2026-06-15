// app/dashboard/vault/page.tsx
import { Suspense } from "react";
import VaultContent from "./VaultContent";

export default function VaultPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 max-w-7xl mx-auto">
          <div className="h-[600px] bg-gray-100 rounded-xl animate-pulse" />
        </div>
      }
    >
      <VaultContent />
    </Suspense>
  );
}

export const dynamic = 'force-dynamic';