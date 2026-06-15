// app/dashboard/transactions/page.tsx
import { Suspense } from "react";
import TransactionsContent from "./TransactionsContent";

export default function TransactionsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 max-w-5xl mx-auto">
          <div className="h-96 bg-gray-100 rounded-xl animate-pulse" />
        </div>
      }
    >
      <TransactionsContent />
    </Suspense>
  );
}

export const dynamic = 'force-dynamic';