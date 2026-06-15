// app/dashboard/analytics/page.tsx
import { Suspense } from "react";
import AnalyticsContent from "./AnalyticsContent";

export const dynamic = 'force-dynamic';

export default function AnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 max-w-7xl mx-auto">
          <div className="h-48 bg-gray-100 rounded animate-pulse" />
        </div>
      }
    >
      <AnalyticsContent />
    </Suspense>
  );
}