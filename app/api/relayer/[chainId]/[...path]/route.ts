import { NextRequest, NextResponse } from "next/server";

const RELAYER_URLS: Record<string, string> = {
  "11155111": "https://relayer.testnet.zama.cloud",
  "1": "https://relayer.mainnet.zama.cloud",
};
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ chainId: string; path: string[] }> }
) {
  const { chainId, path } = await params;

  const baseUrl = RELAYER_URLS[chainId];
  if (!baseUrl) {
    return NextResponse.json({ error: "Unsupported chain" }, { status: 400 });
  }

  const relayerPath = path?.join("/") || "";
  const targetUrl = `${baseUrl}/${relayerPath}`;

  const body = await req.text();

  const response = await fetch(targetUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
  });

  const text = await response.text();

  return new NextResponse(text, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/json",
    },
  });
}