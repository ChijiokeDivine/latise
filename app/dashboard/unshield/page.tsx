// app/dashboard/unshield/page.tsx
import { Suspense } from "react";
import UnshieldContent from "./UnshieldContent";

export default function UnshieldPage() {
  return (
    <Suspense
      fallback={
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
          <div className="h-[600px] bg-gray-100 rounded-xl animate-pulse" />
        </div>
      }
    >
      <UnshieldContent />
    </Suspense>
  );
}

export const dynamic = 'force-dynamic';
