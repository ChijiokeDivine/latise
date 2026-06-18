// app/dashboard/shield/page.tsx
import { Suspense } from "react";
import ShieldContent from "./ShieldContent";

export default function ShieldPage() {
  return (
    <Suspense
      fallback={
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
          <div className="h-[600px] bg-gray-100 rounded-xl animate-pulse" />
        </div>
      }
    >
      <ShieldContent />
    </Suspense>
  );
}

export const dynamic = 'force-dynamic';
