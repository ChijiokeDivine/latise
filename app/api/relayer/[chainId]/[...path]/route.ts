import { NextRequest, NextResponse } from "next/server";

const RELAYER_URLS: Record<string, string> = {
  "11155111": "https://relayer.testnet.zama.org",
  "1": "https://relayer.mainnet.zama.org",
};
async function proxyRelayerRequest(
  req: NextRequest,
  { params }: { params: Promise<{ chainId: string; path: string[] }> }
) {
  const { chainId, path } = await params;
  const baseUrl = RELAYER_URLS[chainId];
  if (!baseUrl) {
    return NextResponse.json({ error: "Unsupported chain" }, { status: 400 });
  }

  const apiKey = process.env.ZAMA_RELAYER_API_KEY;
  if (!apiKey || apiKey === "your_relayer_api_key_here") {
    return NextResponse.json(
      { error: "ZAMA_RELAYER_API_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  const relayerPath = path?.join("/") || "";
  const targetUrl = new URL(relayerPath, `${baseUrl}/`);
  targetUrl.search = req.nextUrl.search;

  const contentType = req.headers.get("content-type");
  const accept = req.headers.get("accept");
  const response = await fetch(targetUrl, {
    method: req.method,
    headers: {
      ...(contentType ? { "Content-Type": contentType } : {}),
      ...(accept ? { Accept: accept } : {}),
      Authorization: `Bearer ${apiKey}`,
    },
    body: req.method === "GET" || req.method === "HEAD" ? undefined : await req.text(),
  });

  const text = await response.text();
  return new NextResponse(text, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/json",
    },
  });
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ chainId: string; path: string[] }> }
) {
  return proxyRelayerRequest(req, context);
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ chainId: string; path: string[] }> }
) {
  return proxyRelayerRequest(req, context);
}
