// app/dashboard/registry/page.tsx
import { Suspense } from "react";
import RegistryContent from "./RegistryContent";

export default function RegistryPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 max-w-7xl mx-auto">
          <div className="h-96 bg-gray-100 rounded-xl animate-pulse" />
        </div>
      }
    >
      <RegistryContent />
    </Suspense>
  );
}

export const dynamic = 'force-dynamic';