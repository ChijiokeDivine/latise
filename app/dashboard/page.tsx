// app/dashboard/page.tsx
import { Suspense } from "react";
import DashboardContent from "./DashboardContent";

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6">
          <div className="h-screen bg-gray-100 rounded-xl animate-pulse" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}

export const dynamic = 'force-dynamic';