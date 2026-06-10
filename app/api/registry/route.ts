// app/api/registry/route.ts
// Location: latise/app/api/registry/route.ts
// GET /api/registry?network=sepolia|mainnet
// Returns all enriched ERC-20 ↔ ERC-7984 pairs from the registry contract.
// Called by the client useRegistry hook to avoid CORS issues on RPC calls.

import { NextRequest, NextResponse } from "next/server";
import { fetchEnrichedPairs } from "@/app/lib/registry";
import type { Network } from "@/app/types";

export const runtime = "nodejs";
// Revalidate cache every 60 seconds
export const revalidate = 60;

export async function GET(req: NextRequest) {
  const network = (req.nextUrl.searchParams.get("network") ?? "sepolia") as Network;

  if (network !== "sepolia" && network !== "mainnet") {
    return NextResponse.json({ error: "Invalid network" }, { status: 400 });
  }

  try {
    const pairs = await fetchEnrichedPairs(network);
    return NextResponse.json(
      { network, pairs, fetchedAt: Date.now() },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (err) {
    console.error("[/api/registry] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch registry pairs", details: String(err) },
      { status: 500 }
    );
  }
}