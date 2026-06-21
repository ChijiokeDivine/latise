// app/dashboard/send/page.tsx
import { Suspense } from "react";
import SendContent from "./SendContent";

export default function SendPage() {
  return (
    <Suspense
      fallback={
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
          <div className="h-[600px] bg-gray-100 rounded-xl animate-pulse" />
        </div>
      }
    >
      <SendContent />
    </Suspense>
  );
}

export const dynamic = 'force-dynamic';
