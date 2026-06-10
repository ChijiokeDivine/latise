// app/api/prices/route.ts
// Location: latise/app/api/prices/route.ts
// GET /api/prices?symbols=USDC,USDT,WETH
// Returns USD prices for given token symbols via CoinGecko.
// Keeps API key server-side.

import { NextRequest, NextResponse } from "next/server";
import { fetchTokenPrices } from "@/app/lib/prices";
import { COINGECKO_IDS } from "@/app/lib/constants";

export const runtime = "nodejs";
export const revalidate = 60;

export async function GET(req: NextRequest) {
  const symbolsParam = req.nextUrl.searchParams.get("symbols") ?? "";
  const symbols = symbolsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (symbols.length === 0) {
    return NextResponse.json({ prices: {} });
  }

  // Map symbols to gecko IDs, skipping unknowns
  const geckoIds = symbols
    .map((s) => COINGECKO_IDS[s])
    .filter((id): id is string => !!id);

  try {
    const rawPrices = await fetchTokenPrices(geckoIds);

    // Map back to symbols
    const prices: Record<string, number | null> = {};
    for (const symbol of symbols) {
      const geckoId = COINGECKO_IDS[symbol];
      prices[symbol] = geckoId ? (rawPrices[geckoId] ?? null) : null;
    }

    return NextResponse.json(
      { prices, fetchedAt: Date.now() },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (err) {
    console.error("[/api/prices] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch prices", details: String(err) },
      { status: 500 }
    );
  }
}