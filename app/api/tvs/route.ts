// app/api/tvs/route.ts
// Location: latise/app/api/tvs/route.ts
// GET /api/tvs?network=sepolia|mainnet
// Returns aggregated Total Value Shielded for all valid pairs.

import { NextRequest, NextResponse } from "next/server";
import { fetchEnrichedPairs } from "@/app/lib/registry";
import { fetchAggregatedTVS } from "@/app/lib/wrapper";
import type { Network } from "@/app/types";

export const runtime = "nodejs";
export const revalidate = 30;

export async function GET(req: NextRequest) {
  const network = (req.nextUrl.searchParams.get("network") ?? "sepolia") as Network;

  if (network !== "sepolia" && network !== "mainnet") {
    return NextResponse.json({ error: "Invalid network" }, { status: 400 });
  }

  try {
    const pairs = await fetchEnrichedPairs(network);
    const tvs = await fetchAggregatedTVS(pairs, network);

    return NextResponse.json(
      { network, data: tvs, fetchedAt: Date.now() },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (err) {
    console.error("[/api/tvs] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch TVS data", details: String(err) },
      { status: 500 }
    );
  }
}