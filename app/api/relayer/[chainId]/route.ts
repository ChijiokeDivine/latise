// app/api/relayer/[chainId]/route.ts
// Location: latise/app/api/relayer/[chainId]/route.ts
// POST /api/relayer/:chainId/*
// Proxies all relayer requests server-side so ZAMA_RELAYER_API_KEY
// is never exposed in the browser bundle.

import { NextRequest, NextResponse } from "next/server";

const RELAYER_URLS: Record<string, string> = {
  "11155111": "https://relayer.testnet.zama.cloud",
  "1": "https://relayer.mainnet.zama.cloud",
};

export async function POST(
  req: NextRequest,
  { params }: { params: { chainId: string } }
) {
  const relayerBase = RELAYER_URLS[params.chainId];
  if (!relayerBase) {
    return NextResponse.json({ error: "Unsupported chain" }, { status: 400 });
  }

  const body = await req.text();
  // Strip our proxy prefix from the path to get the actual relayer path
  const relayerPath = req.nextUrl.pathname.replace(
    `/api/relayer/${params.chainId}`,
    ""
  );
  const targetUrl = `${relayerBase}${relayerPath || "/"}`;

  try {
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.ZAMA_RELAYER_API_KEY}`,
      },
      body,
    });

    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[/api/relayer] Proxy error:", err);
    return NextResponse.json({ error: "Relayer proxy failed" }, { status: 502 });
  }
}