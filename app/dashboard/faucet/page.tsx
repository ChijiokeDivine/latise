// app/dashboard/faucet/page.tsx
import { Suspense } from "react";
import FaucetContent from "./FaucetContent";

export default function FaucetPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 max-w-5xl mx-auto">
          <div className="h-96 bg-gray-100 rounded-xl animate-pulse" />
        </div>
      }
    >
      <FaucetContent />
    </Suspense>
  );
}

export const dynamic = 'force-dynamic';