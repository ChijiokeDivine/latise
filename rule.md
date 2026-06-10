# RULES.md — Zama Confidential Wrapper Registry
## Project command reference, architecture rules, and gotcha guide

> Read this file completely before writing a single line of code.
> Keep it open in a split pane the entire time you are building.

---

## Table of Contents

1. [Project Identity](#1-project-identity)
2. [Tech Stack — Exact Versions](#2-tech-stack--exact-versions)
3. [Bootstrap Commands](#3-bootstrap-commands)
4. [Environment Variables](#4-environment-variables)
5. [Folder Structure](#5-folder-structure)
6. [Contract Addresses — All Networks](#6-contract-addresses--all-networks)
7. [Registry Contract — ABI & Read Rules](#7-registry-contract--abi--read-rules)
8. [Wrapper Contract — ABI & Critical Rules](#8-wrapper-contract--abi--critical-rules)
9. [Zama SDK — Setup & Usage Rules](#9-zama-sdk--setup--usage-rules)
10. [Wrap Flow — Step by Step](#10-wrap-flow--step-by-step)
11. [Unwrap Flow — Step by Step (Two-Step Async)](#11-unwrap-flow--step-by-step-two-step-async)
12. [Balance Decryption Rules](#12-balance-decryption-rules)
13. [Faucet Rules](#13-faucet-rules)
14. [TVS Dashboard — Data Rules](#14-tvs-dashboard--data-rules)
15. [Network Switching Rules](#15-network-switching-rules)
16. [State Management Rules](#16-state-management-rules)
17. [Error Handling Rules](#17-error-handling-rules)
18. [UI/UX Rules](#18-uiux-rules)
19. [Performance Rules](#19-performance-rules)
20. [Submission Checklist](#20-submission-checklist)

---

## 1. Project Identity

**What you are building:**
A production-quality web app that is the definitive explorer for all ERC-20 ↔ ERC-7984 confidential token wrapper pairs on the Zama Protocol. It surfaces every pair on both Sepolia and Ethereum mainnet, lets users wrap and unwrap, decrypt their encrypted balances, mint test tokens via a Sepolia faucet, and view live TVS (Total Value Shielded) analytics.

**Bounty track:** Zama Developer Program Mainnet Season 3 — Bounty Track
**Prize pool:** 3,000 cUSDT (up to 3 winners; exceptional single submission may take the full pool)
**Deadline:** July 7, 2026, 23:59 AOE (= UTC+12). That is July 7 at 11:59 PM Lagos time (UTC+1).
**Deployment target:** Vercel (frontend), Sepolia testnet + Ethereum mainnet (on-chain)

---

## 2. Tech Stack — Exact Versions

Use these exact packages. Do not substitute.

```
Framework:        Next.js 14 (App Router)
Language:         TypeScript 5.x (strict mode)
Styling:          Tailwind CSS 3.x
Wallet:           wagmi 2.x + viem 2.x
React Query:      @tanstack/react-query 5.x
Zama SDK:         @zama-fhe/react-sdk (latest)
Charts:           recharts 2.x
Package manager:  pnpm (do NOT use npm or yarn)
Node version:     18.x (check .nvmrc from Zama SDK repo)
```

---

## 3. Bootstrap Commands

Run these in order, exactly as written.

### Step 1 — Scaffold Next.js

```bash
npx create-next-app@14 zama-registry \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir \
  --import-alias "@/*"
cd zama-registry
```

### Step 2 — Install all dependencies

```bash
pnpm add \
  @zama-fhe/react-sdk \
  @tanstack/react-query \
  wagmi \
  viem \
  recharts \
  @radix-ui/react-tooltip \
  @radix-ui/react-select \
  clsx
```

### Step 3 — Install dev dependencies

```bash
pnpm add -D \
  @types/node \
  @types/react \
  @types/react-dom \
  prettier \
  eslint-config-prettier
```

### Step 4 — Verify the install

```bash
pnpm run dev
# Should open on http://localhost:3000 with no errors
```

### Step 5 — Set up environment variables

```bash
cp .env.example .env.local
# Then fill in values — see Section 4
```

### Step 6 — Add .env.example to the repo

```bash
touch .env.example
# Add all keys with empty values — see Section 4
```

### Daily dev command

```bash
pnpm dev
```

### Build for production (run before every deploy)

```bash
pnpm build
pnpm start
```

### Deploy to Vercel

```bash
# One-time setup
pnpm add -g vercel
vercel login

# Deploy
vercel --prod
```

---

## 4. Environment Variables

Create `.env.local` with these values. Never commit `.env.local` to git.
Add all keys (empty) to `.env.example` and commit that.

```bash
# ── RPC endpoints ─────────────────────────────────────────────
# Get a free key from Infura (infura.io) or Alchemy (alchemy.com)
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
NEXT_PUBLIC_MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_KEY

# ── Zama Relayer ───────────────────────────────────────────────
# The relayer API key must NEVER be exposed client-side in production.
# Proxy all relayer requests through /api/relayer/[chainId]/route.ts
# For local dev only, you can put it here and use a local proxy.
ZAMA_RELAYER_API_KEY=your_relayer_api_key_here

# Public relayer proxy URLs (your Next.js API routes — see Section 9)
NEXT_PUBLIC_RELAYER_URL_SEPOLIA=http://localhost:3000/api/relayer/11155111
NEXT_PUBLIC_RELAYER_URL_MAINNET=http://localhost:3000/api/relayer/1

# ── Price API ──────────────────────────────────────────────────
# CoinGecko free API (no key needed for basic calls, but add one for rate limits)
COINGECKO_API_KEY=

# ── App ───────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Rules for env vars:**
- Any variable prefixed `NEXT_PUBLIC_` is exposed to the browser bundle. Never put secrets there.
- `ZAMA_RELAYER_API_KEY` has NO `NEXT_PUBLIC_` prefix — it is server-side only.
- All relayer calls in the frontend go to `/api/relayer/[chainId]` — your own Next.js route which proxies to Zama's relayer with the API key attached server-side.

---

## 5. Folder Structure

```
latise/
├── app/
│   ├── layout.tsx                  # Root layout, providers go here
│   ├── page.tsx                    # Homepage — registry explorer
│   ├── wrap/
│   │   └── [wrapperAddress]/
│   │       └── page.tsx            # Wrap/unwrap UI for a specific pair
│   ├── faucet/
│   │   └── page.tsx                # Sepolia faucet
│   ├── dashboard/
│   │   └── page.tsx                # TVS analytics dashboard
│   └── api/
│       └── relayer/
│           └── [chainId]/
│               └── route.ts        # Relayer proxy — server-side only
│
├── components/
│   ├── providers/
│   │   ├── AppProviders.tsx        # Wraps WagmiProvider + QueryClient + ZamaProvider
│   │   └── ZamaSDKProvider.tsx     # Network-aware ZamaProvider
│   ├── registry/
│   │   ├── RegistryTable.tsx       # Main pairs table
│   │   ├── PairRow.tsx             # Single row in the table
│   │   ├── NetworkSwitcher.tsx     # Sepolia / Mainnet toggle
│   │   └── StatusBadge.tsx         # Valid / Revoked badge
│   ├── wrap/
│   │   ├── WrapForm.tsx            # Wrap UI
│   │   ├── UnwrapForm.tsx          # Unwrap UI (two-step)
│   │   ├── BalanceDisplay.tsx      # Shows encrypted + underlying balance
│   │   ├── TxStepper.tsx           # Step-by-step tx state display
│   │   └── UnwrapPending.tsx       # Pending unwrap state watcher
│   ├── faucet/
│   │   └── FaucetCard.tsx          # Per-token mint card
│   ├── dashboard/
│   │   ├── TVSCard.tsx             # Per-token TVS metric card
│   │   ├── TVSBarChart.tsx         # Total ranking bar chart
│   │   └── VolumeChart.tsx         # Wrap/unwrap event volume chart
│   └── ui/
│       ├── AddressBadge.tsx        # Truncated address + copy + etherscan link
│       ├── TokenLogo.tsx           # Token icon with fallback
│       ├── LoadingSpinner.tsx
│       └── ErrorBanner.tsx
│
├── lib/
│   ├── constants.ts                # All contract addresses, chain IDs
│   ├── abis/
│   │   ├── registry.abi.ts         # ConfidentialTokenWrappersRegistry ABI
│   │   ├── wrapper.abi.ts          # ConfidentialWrapper ABI
│   │   └── erc20.abi.ts            # Standard ERC-20 ABI
│   ├── chains.ts                   # wagmi chain configs
│   ├── clients.ts                  # viem publicClient factory
│   ├── registry.ts                 # All registry read functions
│   ├── wrapper.ts                  # Wrap/unwrap/balance read functions
│   ├── events.ts                   # getLogs helpers for volume data
│   └── prices.ts                   # CoinGecko price fetcher
│
├── hooks/
│   ├── useRegistry.ts              # TanStack Query hook: fetch all pairs
│   ├── useWrapperInfo.ts           # Fetch decimals, rate, TVS for one wrapper
│   ├── useTokenBalances.ts         # ERC-20 + cToken balance for connected wallet
│   ├── useWrap.ts                  # Wrap transaction hook
│   ├── useUnwrap.ts                # Unwrap + finalize hook
│   ├── useFaucet.ts                # Faucet mint hook
│   ├── useTVS.ts                   # Aggregate TVS across all wrappers
│   └── useVolumeEvents.ts          # Wrap/Unwrap event log hook
│
├── types/
│   └── index.ts                    # Shared TypeScript interfaces
│
├── .env.example
├── .env.local                      # Never commit
├── RULES.md                        # This file
└── package.json
```

---

## 6. Contract Addresses — All Networks

Store these in `lib/constants.ts`. Never hardcode them anywhere else.

```typescript
// lib/constants.ts

export const REGISTRY_ADDRESS = {
  sepolia: "0x2f0750Bbb0A246059d80e94c454586a7F27a128e",
  mainnet: "0xeb5015fF021DB115aCe010f23F55C2591059bBA0",
} as const;

// Sepolia mock wrappers — these have public mint() on their underlying ERC-20
export const SEPOLIA_WRAPPERS = [
  {
    name: "Confidential USDC (Mock)",
    symbol: "cUSDCMock",
    wrapperAddress: "0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639",
    underlyingAddress: "0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF",
    isMock: true,
  },
  {
    name: "Confidential USDT (Mock)",
    symbol: "cUSDTMock",
    wrapperAddress: "0x4E7B06D78965594eB5EF5414c357ca21E1554491",
    underlyingAddress: "0xa7dA08FafDC9097Cc0E7D4f113A61e31d7e8e9b0",
    isMock: true,
  },
  {
    name: "Confidential WETH (Mock)",
    symbol: "cWETHMock",
    wrapperAddress: "0x46208622DA27d91db4f0393733C8BA082ed83158",
    underlyingAddress: "0xff54739b16576FA5402F211D0b938469Ab9A5f3F",
    isMock: true,
  },
  {
    name: "Confidential BRON (Mock)",
    symbol: "cBRONMock",
    wrapperAddress: "0xaa5612FA27c927a0c7961f5AEFEE5ba3A0F9C891",
    underlyingAddress: "0xFf021fB13cA64e5354c62c954b949a88cfDEb25E",
    isMock: true,
  },
  {
    name: "Confidential ZAMA (Mock)",
    symbol: "cZAMAMock",
    wrapperAddress: "0xf2D628d2598aF4eAF94CB76a437Ff86CA78FfbFB",
    underlyingAddress: "0x75355a85c6FB9df5f0C80FF54e8747EEe9a0BF57",
    isMock: true,
  },
  {
    name: "Confidential tGBP (Mock)",
    symbol: "ctGBPMock",
    wrapperAddress: "0xfCE5c7069c5525eF6c8C2b2E35A745bA20a2F7CC",
    underlyingAddress: "0x93c931278A2aad1916783F952f94276eA5111442",
    isMock: true,
  },
  {
    name: "Confidential XAUt (Mock)",
    symbol: "cXAUtMock",
    wrapperAddress: "0xe4FcF848739845BC81Dee1d5352cf3844F0a60C7",
    underlyingAddress: "0x24377AE4AA0C45ecEe71225007f17c5D423dd940",
    isMock: true,
  },
] as const;

// Mainnet wrappers — no public mint, real tokens
export const MAINNET_WRAPPERS = [
  {
    name: "Confidential USDC",
    symbol: "cUSDC",
    wrapperAddress: "0xe978F22157048E5DB8E5d07971376e86671672B2",
    underlyingAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // real USDC
    isMock: false,
  },
  {
    name: "Confidential USDT",
    symbol: "cUSDT",
    wrapperAddress: "0xAe0207C757Aa2B4019Ad96edD0092ddc63EF0c50",
    underlyingAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7", // real USDT
    isMock: false,
  },
  {
    name: "Confidential WETH",
    symbol: "cWETH",
    wrapperAddress: "0xda9396b82634Ea99243cE51258B6A5Ae512D4893",
    underlyingAddress: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // real WETH
    isMock: false,
  },
  {
    name: "Confidential BRON",
    symbol: "cBRON",
    wrapperAddress: "0x85dE671c3bec1aDeD752c3Cea943521181C826bc",
    underlyingAddress: "", // fetch from registry
    isMock: false,
  },
  {
    name: "Confidential ZAMA",
    symbol: "cZAMA",
    wrapperAddress: "0x80CB147Fd86dC6dEe3Eee7e4Cee33d1397d98071",
    underlyingAddress: "0xA12CC123ba206d4031D1c7f6223D1C2Ec249f4f3", // Zama Token mainnet
    isMock: false,
  },
  {
    name: "Confidential tGBP",
    symbol: "ctGBP",
    wrapperAddress: "0xa873750ccBafD5ec7Dd13bfD5237d7129832eDD9",
    underlyingAddress: "",
    isMock: false,
  },
  {
    name: "Confidential XAUt",
    symbol: "cXAUt",
    wrapperAddress: "0x73cc9aF9d6BEFdb3c3fAf8a5E8c05Cb95FdaEEf1",
    underlyingAddress: "",
    isMock: false,
  },
] as const;

export const CHAIN_IDS = {
  sepolia: 11155111,
  mainnet: 1,
} as const;

// Faucet limit per call (from Zama docs)
export const FAUCET_MINT_AMOUNT = 1_000_000n; // in token units (multiply by 10^decimals when calling)

// Auto-refresh intervals
export const REGISTRY_REFRESH_MS = 60_000;      // 1 minute
export const TVS_REFRESH_MS = 30_000;           // 30 seconds
export const BALANCE_REFRESH_MS = 15_000;       // 15 seconds
export const UNWRAP_POLL_MS = 3_000;            // poll for UnwrapRequested event every 3s
export const UNWRAP_POLL_TIMEOUT_MS = 120_000;  // give up after 2 minutes
```

---

## 7. Registry Contract — ABI & Read Rules

Store the ABI in `lib/abis/registry.abi.ts`.

### Key functions to use

```typescript
// Returns ALL pairs including revoked ones
getTokenConfidentialTokenPairs() → TokenWrapperPair[]

// Returns a single pair by index
getTokenConfidentialTokenPair(index: uint256) → TokenWrapperPair

// Returns total pair count
getTokenConfidentialTokenPairsLength() → uint256

// Lookup wrapper by underlying ERC-20 address
getConfidentialTokenAddress(erc20: address) → (isValid: bool, wrapper: address)

// Lookup underlying ERC-20 by wrapper address
getTokenAddress(wrapper: address) → (isValid: bool, token: address)

// Check if a wrapper is still valid
isConfidentialTokenValid(wrapper: address) → bool
```

### TokenWrapperPair struct

```typescript
interface TokenWrapperPair {
  tokenAddress: `0x${string}`;            // ERC-20
  confidentialTokenAddress: `0x${string}`; // ERC-7984 wrapper
  isValid: boolean;                        // false = revoked
}
```

### Rules for reading the registry

**Rule R-1:** Always call `getTokenConfidentialTokenPairs()` to get all pairs in one call. Do not paginate with `getTokenConfidentialTokenPair(index)` unless the list exceeds 50 items (it won't in the near term).

**Rule R-2:** Always check `isValid` before showing a pair as usable. Revoked pairs (`isValid: false`) must be shown with a "Revoked" badge and all action buttons (Wrap, Unwrap) must be disabled for them.

**Rule R-3:** After fetching pairs, do a batch `multicall` to get `name()`, `symbol()`, and `decimals()` for both the ERC-20 and the wrapper. Do not make individual RPC calls per pair — that is O(n) calls and will get rate-limited.

**Rule R-4:** The registry is read-only from the frontend. You cannot register or revoke pairs — only the Protocol DAO can. Do not show any admin UI.

**Rule R-5:** Cache the registry data with TanStack Query. Set `staleTime: 60_000` (1 minute). The registry changes rarely.

---

## 8. Wrapper Contract — ABI & Critical Rules

### Key functions

```typescript
// Read
rate() → uint256                          // conversion factor (underlying units per wrapper unit)
decimals() → uint8                        // wrapper decimals (max 6)
nonConfidentialTotalSupply() → uint256    // TVS approximation in underlying units
confidentialTotalSupply() → euint64       // encrypted total supply
balanceOf(address) → euint64             // encrypted balance (NOT readable without SDK)

// Write — Wrap
wrap(to: address, amount: uint256) → void
// IMPORTANT: caller must first approve the wrapper contract on the underlying ERC-20

// Write — Unwrap (two-step)
unwrap(from, to, encryptedAmount, inputProof) → void  // Step 1
finalizeUnwrap(unwrapRequestId, clearAmount, decryptionProof) → void  // Step 2

// Write — Transfer
confidentialTransfer(to, encryptedAmount, inputProof) → void
confidentialTransferFrom(from, to, encryptedAmount, inputProof) → void
```

### Critical wrapper rules

**Rule W-1: Decimal conversion.** The wrapper enforces a maximum of 6 decimals. When the underlying ERC-20 has 18 decimals (like WETH), `rate() = 10^12`. This means 1 cWETH = 10^12 underlying wei. When the user inputs "1.5 WETH to wrap", you must convert: `wrapAmount = 1.5 * 10^18` (as underlying units). The wrapper itself rounds down and refunds excess. Always show the user what they will actually receive after rounding.

**Rule W-2: Approve before wrap.** Wrapping requires the user to first call `approve(wrapperAddress, amount)` on the underlying ERC-20. This is a separate transaction. Your UI must handle this as a two-transaction flow: (1) Approve → (2) Wrap. Never attempt to wrap without a prior approval.

**Rule W-3: Unwrap is async.** The unwrap flow is NOT a single transaction. It is:
1. User calls `unwrap()` → emits `UnwrapRequested` event
2. Zama's relayer processes the decryption (off-chain, takes 10–60 seconds)
3. Anyone calls `finalizeUnwrap(requestId, clearAmount, proof)` to release funds

You must poll for the `UnwrapRequested` event, then watch for the decryption proof, then call `finalizeUnwrap`. The SDK handles proof generation. See Section 11 for the full flow.

**Rule W-4: Unsupported accounts.** Accounts that have never held any cToken (zero balance, never received any) cannot be the `from` in unwrap or transfer calls. The contract will revert with "unsupported from". Do not expose unwrap UI to a wallet that has never wrapped anything.

**Rule W-5: nonConfidentialTotalSupply for TVS.** This returns the underlying ERC-20 balance held by the wrapper contract. It is NOT encrypted and can be read with a normal `readContract`. Divide by `rate()` to get wrapper units. Multiply by token price for USD value. This is your TVS number.

**Rule W-6: Never try to read `balanceOf()` with viem.** The return type is `euint64` (encrypted). Reading it directly gives you a `bytes32` handle, not a number. You must use the Zama SDK to decrypt it. See Section 12.

---

## 9. Zama SDK — Setup & Usage Rules

### Provider setup in `app/layout.tsx`

```typescript
// app/layout.tsx
import { AppProviders } from "@/components/providers/AppProviders";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
```

```typescript
// components/providers/AppProviders.tsx
"use client";

import { WagmiProvider, createConfig, http } from "wagmi";
import { sepolia, mainnet } from "wagmi/chains";
import { injected, metaMask } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ZamaProvider, RelayerWeb, indexedDBStorage } from "@zama-fhe/react-sdk";
import { WagmiSigner } from "@zama-fhe/react-sdk/wagmi";

const wagmiConfig = createConfig({
  chains: [sepolia, mainnet],
  connectors: [injected(), metaMask()],
  transports: {
    [sepolia.id]: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL),
    [mainnet.id]: http(process.env.NEXT_PUBLIC_MAINNET_RPC_URL),
  },
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
    },
  },
});

const signer = new WagmiSigner({ config: wagmiConfig });

const relayer = new RelayerWeb({
  getChainId: () => signer.getChainId(),
  transports: {
    [sepolia.id]: {
      relayerUrl: process.env.NEXT_PUBLIC_RELAYER_URL_SEPOLIA!,
      network: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL!,
    },
    [mainnet.id]: {
      relayerUrl: process.env.NEXT_PUBLIC_RELAYER_URL_MAINNET!,
      network: process.env.NEXT_PUBLIC_MAINNET_RPC_URL!,
    },
  },
});

export function AppProviders({ children }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ZamaProvider relayer={relayer} signer={signer} storage={indexedDBStorage}>
          {children}
        </ZamaProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

### Relayer proxy — `app/api/relayer/[chainId]/route.ts`

```typescript
// app/api/relayer/[chainId]/route.ts
// This keeps the API key server-side
import { NextRequest } from "next/server";

const RELAYER_URLS: Record<string, string> = {
  "11155111": "https://relayer.testnet.zama.cloud",
  "1": "https://relayer.mainnet.zama.cloud",
};

export async function POST(
  req: NextRequest,
  { params }: { params: { chainId: string } }
) {
  const relayerBaseUrl = RELAYER_URLS[params.chainId];
  if (!relayerBaseUrl) {
    return new Response("Unsupported chain", { status: 400 });
  }

  const body = await req.text();
  const targetUrl = `${relayerBaseUrl}${req.nextUrl.pathname.replace(
    `/api/relayer/${params.chainId}`,
    ""
  )}`;

  const response = await fetch(targetUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.ZAMA_RELAYER_API_KEY}`,
    },
    body,
  });

  const responseBody = await response.text();
  return new Response(responseBody, {
    status: response.status,
    headers: { "Content-Type": "application/json" },
  });
}
```

### SDK rules

**Rule S-1:** The SDK downloads multi-MB FHE artifacts on first load. This takes 2–10 seconds. Show a loading state ("Initializing FHE engine…") until the ZamaProvider is ready. Use the `useZamaStatus()` hook to check.

**Rule S-2:** Never instantiate `ZamaSDK` or `RelayerWeb` inside a component. They must be created once at module level and passed into `ZamaProvider`. Recreating them causes the FHE artifacts to re-download.

**Rule S-3:** The `relayerUrl` must point to your own Next.js API route, not directly to Zama's relayer. Direct calls would expose your API key in the browser.

**Rule S-4:** `indexedDBStorage` is for browsers (persists across reloads). Never use `memoryStorage` in a browser context — keys are lost on reload and users will need to re-sign every time.

**Rule S-5:** The first `token.balanceOf()` call in a session prompts an EIP-712 wallet signature. This is expected — it's how the SDK gets permission to decrypt ciphertext for the user's address. Do NOT show an error to the user when this signature appears. Show a "Please sign in your wallet to decrypt your balance" message instead.

---

## 10. Wrap Flow — Step by Step

This is the implementation spec for `WrapForm.tsx`.

### States

```typescript
type WrapState =
  | "idle"
  | "approving"      // waiting for approve tx
  | "approved"       // approve confirmed
  | "wrapping"       // waiting for wrap tx
  | "done"           // wrap confirmed
  | "error";
```

### Implementation steps

**Step 1 — Input validation**
- Parse user input as a float
- Multiply by `10^underlyingDecimals` to get underlying units as `BigInt`
- Check: amount > 0
- Check: amount <= user's underlying ERC-20 balance
- Check: wrapper `isValid === true`
- Show expected cToken received after rate rounding: `Math.floor(amount / rate())`

**Step 2 — Check existing allowance**
```typescript
const allowance = await publicClient.readContract({
  address: underlyingTokenAddress,
  abi: erc20Abi,
  functionName: "allowance",
  args: [userAddress, wrapperAddress],
});

if (allowance >= wrapAmount) {
  // Skip approval step, go straight to wrap
}
```

**Step 3 — Approve (if needed)**
```typescript
// Set state = "approving"
const approveTxHash = await walletClient.writeContract({
  address: underlyingTokenAddress,
  abi: erc20Abi,
  functionName: "approve",
  args: [wrapperAddress, wrapAmount],
});
await publicClient.waitForTransactionReceipt({ hash: approveTxHash });
// Set state = "approved"
```

**Step 4 — Wrap**
```typescript
// Set state = "wrapping"
const wrapTxHash = await walletClient.writeContract({
  address: wrapperAddress,
  abi: wrapperAbi,
  functionName: "wrap",
  args: [userAddress, wrapAmount],
});
const receipt = await publicClient.waitForTransactionReceipt({ hash: wrapTxHash });
// Set state = "done"
// Parse Wrap event from receipt to confirm actual amount wrapped
// Invalidate balance query
```

**Step 5 — Show result**
- Parse the `Wrap(address indexed to, uint256 roundedAmount, euint64 encryptedWrappedAmount)` event from the receipt
- Show `roundedAmount` to the user as "You wrapped X underlying tokens"
- Trigger balance refresh

---

## 11. Unwrap Flow — Step by Step (Two-Step Async)

This is the most complex part. Read it twice.

### States

```typescript
type UnwrapState =
  | "idle"
  | "encrypting"       // SDK encrypting the amount client-side
  | "submitting"       // calling unwrap() on-chain
  | "pending_decrypt"  // waiting for Zama relayer to decrypt (10–60s)
  | "finalizing"       // calling finalizeUnwrap()
  | "done"
  | "error"
  | "timeout";         // relayer took too long
```

### Implementation steps

**Step 1 — Input validation**
- Get user's encrypted cToken balance via SDK (see Section 12)
- Parse user input as cToken units
- Check amount > 0 and <= balance
- Check wrapper isValid

**Step 2 — Encrypt the amount client-side via SDK**
```typescript
// Set state = "encrypting"
// Use the Zama SDK react hook for this
const { mutateAsync: unshield } = useUnshield({ tokenAddress: wrapperAddress });
// The SDK hook handles encryption, unwrap call, and finalization internally
// See SDK docs for useUnshield hook API
```

> **Important:** If using `sdk.createToken(wrapperAddress).unshield(amount)` directly (vanilla SDK), you need to:
> 1. Create `encryptedInput` via the SDK
> 2. Call `wrapper.unwrap(userAddress, recipientAddress, encryptedInput.handle, encryptedInput.inputProof)`
> 3. Parse the `UnwrapRequested` event from the receipt to get `unwrapRequestId`
> 4. Poll until the relayer posts a public decryption result
> 5. Call `wrapper.finalizeUnwrap(unwrapRequestId, cleartextAmount, decryptionProof)`

**Step 3 — Submit the unwrap transaction**
```typescript
// Set state = "submitting"
const unwrapTxHash = await walletClient.writeContract({
  address: wrapperAddress,
  abi: wrapperAbi,
  functionName: "unwrap",
  args: [userAddress, recipientAddress, encryptedAmount, inputProof],
});
const receipt = await publicClient.waitForTransactionReceipt({ hash: unwrapTxHash });
// Extract unwrapRequestId from UnwrapRequested event
const event = parseEventLogs({ abi: wrapperAbi, logs: receipt.logs })
  .find(e => e.eventName === "UnwrapRequested");
const { unwrapRequestId } = event.args;
```

**Step 4 — Poll for finalization**
```typescript
// Set state = "pending_decrypt"
// Poll every UNWRAP_POLL_MS (3000ms) for up to UNWRAP_POLL_TIMEOUT_MS (120000ms)
// Watch for UnwrapFinalized event with matching unwrapRequestId
const startTime = Date.now();
while (Date.now() - startTime < UNWRAP_POLL_TIMEOUT_MS) {
  await sleep(UNWRAP_POLL_MS);
  const logs = await publicClient.getLogs({
    address: wrapperAddress,
    event: parseAbiItem("event UnwrapFinalized(address indexed receiver, bytes32 indexed unwrapRequestId, euint64 encryptedAmount, uint64 cleartextAmount)"),
    fromBlock: receipt.blockNumber,
  });
  const finalized = logs.find(l => l.args.unwrapRequestId === unwrapRequestId);
  if (finalized) {
    // Set state = "done"
    return finalized.args.cleartextAmount;
  }
}
// Set state = "timeout"
```

**Rule U-1:** Always show the user what is happening during `pending_decrypt`. This is the longest waiting period. Show a spinner with copy like "Zama's FHE network is decrypting your balance — this takes 10–60 seconds."

**Rule U-2:** Never assume `finalizeUnwrap` needs to be called by the user. The Zama relayer infrastructure typically calls it automatically. Your app should just poll for the `UnwrapFinalized` event. Only call `finalizeUnwrap` yourself if the relayer has not done so within the timeout window.

**Rule U-3:** Store the pending `unwrapRequestId` in `localStorage` so the user can come back if they close the tab during the `pending_decrypt` phase. Key: `pendingUnwrap:{wrapperAddress}:{userAddress}`.

---

## 12. Balance Decryption Rules

**Rule B-1:** Use the Zama React SDK hooks, not raw contract reads.

```typescript
import { useConfidentialBalance } from "@zama-fhe/react-sdk";

const { data: balance, isLoading, error } = useConfidentialBalance({
  tokenAddress: wrapperAddress,
});
// balance is a BigInt or undefined
// First call will prompt an EIP-712 signature from the user
```

**Rule B-2:** The first `useConfidentialBalance` call per session requires a wallet signature (EIP-712). Display clear pre-emptive copy: "Click 'Decrypt Balance' to sign a message — no gas required." Do not silently trigger the signature prompt; that confuses users.

**Rule B-3:** Cache the decrypted balance. TanStack Query handles this automatically via the SDK's `useConfidentialBalance` hook. The cache TTL is set by the SDK internally.

**Rule B-4:** Always show both balances side by side:
- Underlying ERC-20 balance (readable directly via `balanceOf(address)` on the ERC-20)
- Confidential cToken balance (decrypted via SDK)

**Rule B-5:** Convert BigInt balances to human-readable strings using the token's `decimals`:
```typescript
const humanReadable = (balance / 10n ** BigInt(decimals)).toString();
// Include fractional part for better UX
const fractional = balance % 10n ** BigInt(decimals);
```

---

## 13. Faucet Rules

The faucet page is Sepolia-only. It must:

1. **Detect the network.** If the user is on mainnet, show a warning: "Faucet is only available on Sepolia testnet" and a button to switch networks.

2. **Only show Mock tokens.** Only tokens with `isMock: true` from `SEPOLIA_WRAPPERS` have public `mint()`. Do not show real tokens.

3. **Mint the underlying ERC-20, not the wrapper.** The faucet calls `mint(address, amount)` on the underlying ERC-20 address, not the wrapper.

4. **Mint amount.** From the docs: the public mint function is limited to 1,000,000 tokens per call. Adjust for decimals:
```typescript
const mintAmount = FAUCET_MINT_AMOUNT * 10n ** BigInt(underlyingDecimals);
// e.g. for USDC (6 decimals): 1_000_000n * 10n**6n = 1_000_000_000_000n
```

5. **Per-token state.** Each token has its own mint button with its own loading/success/error state. They are independent.

6. **Show the result.** After mint confirms, show the new underlying balance.

7. **Suggest wrapping.** After a successful mint, show a "Now wrap this into cToken →" button that navigates to the wrap page for that token.

---

## 14. TVS Dashboard — Data Rules

### TVS calculation

```typescript
// For each wrapper:
const underlyingBalance = await publicClient.readContract({
  address: wrapperAddress,
  abi: wrapperAbi,
  functionName: "nonConfidentialTotalSupply",
}); // returns uint256 in underlying token units

const rate = await publicClient.readContract({
  address: wrapperAddress,
  abi: wrapperAbi,
  functionName: "rate",
}); // returns uint256

const wrapperUnits = underlyingBalance / rate; // cToken units (max 6 decimals)
const tokenPrice = await getTokenPrice(underlyingSymbol); // USD per token
const tvsUSD = Number(wrapperUnits) / 1e6 * tokenPrice;
```

**Use multicall** for all TVS reads. Never do individual calls per wrapper.

```typescript
import { multicall } from "viem";

const results = await publicClient.multicall({
  contracts: wrappers.flatMap((w) => [
    { address: w.wrapperAddress, abi: wrapperAbi, functionName: "nonConfidentialTotalSupply" },
    { address: w.wrapperAddress, abi: wrapperAbi, functionName: "rate" },
  ]),
});
```

### Token prices

Use CoinGecko's free API. Map token symbols to CoinGecko IDs:

```typescript
const COINGECKO_IDS: Record<string, string> = {
  USDC: "usd-coin",
  USDT: "tether",
  WETH: "weth",
  ZAMA: "zama",        // check if listed
  tGBP: "tether-gbp",  // check if listed
  XAUt: "tether-gold", // check if listed
  BRON: "",            // may not be on CoinGecko — handle gracefully
};
```

If a token is not on CoinGecko (BRON, ZAMA), show TVS in token units only, not USD. Do not show "$0" — that is misleading.

### Volume from events

```typescript
// Fetch Wrap events for volume chart
const wrapLogs = await publicClient.getLogs({
  address: wrapperAddress,
  event: parseAbiItem(
    "event Wrap(address indexed to, uint256 roundedAmount, euint64 encryptedWrappedAmount)"
  ),
  fromBlock: BigInt(startBlock), // go back ~7 days of blocks
  toBlock: "latest",
});

// Fetch UnwrapFinalized events
const unwrapLogs = await publicClient.getLogs({
  address: wrapperAddress,
  event: parseAbiItem(
    "event UnwrapFinalized(address indexed receiver, bytes32 indexed unwrapRequestId, euint64 encryptedAmount, uint64 cleartextAmount)"
  ),
  fromBlock: BigInt(startBlock),
  toBlock: "latest",
});
```

**Rule D-1:** Batch event queries across all wrappers. Do not loop sequentially.

**Rule D-2:** `getLogs` on Sepolia from Infura has a block range limit (typically 10,000 blocks). If you need more, paginate.

**Rule D-3:** Cache event data aggressively. Stale time: 5 minutes for volume data.

**Rule D-4:** On mainnet, be aware there may be very few wrap events if the protocol is new. Handle the empty state gracefully with copy like "No activity yet — be the first to wrap."

---

## 15. Network Switching Rules

The app supports both Sepolia (testnet) and Ethereum mainnet.

**Rule N-1:** Store the selected network in URL params, not just component state. Use `?network=sepolia` or `?network=mainnet`. This makes URLs shareable and bookmarkable.

**Rule N-2:** The registry table, TVS dashboard, and wrap/unwrap flows all read from the selected network. When the user switches networks, re-fetch all data.

**Rule N-3:** The Faucet page is Sepolia-only. If `network=mainnet`, show a redirect prompt.

**Rule N-4:** The user's wallet may be on a different chain than the selected network. Always check `useChainId()` against the selected network before sending transactions. If they mismatch, show a "Switch to Sepolia/Mainnet" button using wagmi's `useSwitchChain`.

**Rule N-5:** Read operations (registry, TVS, event logs) do NOT require the wallet to be on the matching network. You can read Sepolia data while connected to mainnet. Only writes (wrap, unwrap, approve, mint) require the correct chain.

---

## 16. State Management Rules

**Rule ST-1:** Use TanStack Query for ALL server/blockchain data fetching. No useState + useEffect for async data.

**Rule ST-2:** Use this key convention for query keys:
```typescript
["registry", network]
["wrapperInfo", wrapperAddress, network]
["balances", userAddress, wrapperAddress, network]
["tvs", network]
["events", "wrap", wrapperAddress, network, fromBlock]
["events", "unwrap", wrapperAddress, network, fromBlock]
["price", symbol]
```

**Rule ST-3:** Wallet/connection state lives in wagmi hooks (`useAccount`, `useChainId`, etc.). Never replicate this in custom state.

**Rule ST-4:** Transaction pending state lives in the mutation hooks (`useWrap`, `useUnwrap`, etc.). Keep it co-located with the action, not in a global store.

**Rule ST-5:** The pending unwrap `requestId` must survive page refreshes. Store it in `localStorage`. Key format: `pendingUnwrap:${chainId}:${wrapperAddress}:${userAddress}`.

---

## 17. Error Handling Rules

**Rule E-1:** Wrap ALL contract reads in try/catch. RPC failures, rate limits, and bad responses are common on testnets.

**Rule E-2:** Wrap ALL wallet transactions in try/catch. The user can reject transactions. A rejection is NOT an error — do not show an error banner. Reset state to "idle" silently.

```typescript
try {
  const hash = await walletClient.writeContract({ ... });
} catch (err) {
  if (err.message?.includes("User rejected") || err.code === 4001) {
    setState("idle"); // silent reset
    return;
  }
  setState("error");
  setErrorMessage(parseContractError(err));
}
```

**Rule E-3:** Parse contract revert reasons and show human-readable messages:
```typescript
// Map contract error names to user messages
const ERROR_MESSAGES: Record<string, string> = {
  "TokenZeroAddress": "Invalid token address.",
  "ConfidentialTokenZeroAddress": "Invalid wrapper address.",
  "RevokedConfidentialToken": "This wrapper has been revoked and cannot be used.",
  // Add more as you encounter them
};
```

**Rule E-4:** Network errors (Infura rate limit, RPC timeout) should show a retry button. Do not show a dead error state.

**Rule E-5:** If the relayer is down or the unwrap times out, show copy like: "The decryption is taking longer than expected. Your funds are safe — check back in a few minutes or contact Zama support." Include a link to `https://community.zama.ai`.

---

## 18. UI/UX Rules

**Rule UX-1:** Show transaction hashes as links to Etherscan immediately after a tx is submitted (before confirmation). Format:
- Sepolia: `https://sepolia.etherscan.io/tx/{hash}`
- Mainnet: `https://etherscan.io/tx/{hash}`

**Rule UX-2:** Show contract addresses as links to Etherscan too. Always truncate addresses: `0x1234...5678`.

**Rule UX-3:** Always show what the user will pay before they sign (estimated gas). Use `estimateGas` from viem.

**Rule UX-4:** After any successful transaction, trigger a toast notification (use a simple custom toast, no heavy library needed).

**Rule UX-5:** The "Decrypt Balance" button must only appear if the wallet is connected AND on the correct network.

**Rule UX-6:** Every form must disable the submit button while a transaction is pending. Never let the user double-submit.

**Rule UX-7:** On mobile, all tables must be horizontally scrollable. Do not clip content.

**Rule UX-8:** Add a "What is FHE?" tooltip or expandable section near the balance display. One sentence: "Fully Homomorphic Encryption lets your balance stay encrypted on-chain — only you can decrypt it." This is important for judges who may not know FHE.

**Rule UX-9:** The app must work without a wallet connected. Show the registry table and TVS dashboard in read-only mode. Disable wrap/unwrap/faucet buttons and show "Connect wallet to continue."

---

## 19. Performance Rules

**Rule P-1:** Use `multicall` for every batch of reads. A multicall of 20 items is 1 RPC call, not 20.

**Rule P-2:** The FHE artifacts downloaded by the Zama SDK are large (multi-MB). Warn users on slow connections. The `ZamaProvider` loads them in the background — show a global loading indicator in the navbar until ready.

**Rule P-3:** Images/token logos: use `next/image` with explicit width and height. Provide a fallback for unknown tokens (show initials in a colored circle).

**Rule P-4:** Event log fetches (`getLogs`) can be slow. Run them in parallel with `Promise.all`, not sequentially.

**Rule P-5:** Recharts is heavy. Import only the components you use:
```typescript
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
// Not: import * as Recharts from "recharts"
```

**Rule P-6:** Set aggressive caching headers on the relayer proxy route to avoid redundant requests.

---

## 20. Submission Checklist

Complete every item before submitting.

### Functionality
- [ ] Registry table loads all pairs on both Sepolia and Mainnet
- [ ] Valid/Revoked status shown correctly
- [ ] Network switcher works (Sepolia ↔ Mainnet)
- [ ] Wrap flow works end-to-end (approve + wrap)
- [ ] Unwrap flow works end-to-end (unwrap + poll + finalize)
- [ ] Encrypted balance decryption works (EIP-712 sign + display)
- [ ] Faucet mints all 7 mock tokens on Sepolia
- [ ] TVS dashboard shows nonConfidentialTotalSupply for all wrappers
- [ ] TVS bar chart ranks wrappers correctly
- [ ] Volume chart shows Wrap/UnwrapFinalized events
- [ ] Both mainnet and Sepolia registries show correct data

### Technical
- [ ] No secrets in the browser bundle (relayer key is server-side only)
- [ ] All errors handled gracefully with user-readable messages
- [ ] Wallet rejection does not show an error
- [ ] Pending unwrap state survives page reload (localStorage)
- [ ] `pnpm build` passes with zero errors
- [ ] Mobile layout works on 375px viewport

### Deployment
- [ ] Deployed to Vercel (or equivalent) with a public URL
- [ ] Environment variables set in Vercel dashboard
- [ ] App loads in < 5 seconds on a standard connection
- [ ] Etherscan links point to correct network (Sepolia vs Mainnet)

### Submission materials
- [ ] 3-minute demo video recorded (real person on camera, no AI voice)
- [ ] X thread published introducing the project with demo link
- [ ] Submission form filled out with: GitHub repo URL, live demo URL, video URL, X thread URL

### Video script outline (3 minutes)
1. (0:00–0:30) Who you are, what the app does in one sentence
2. (0:30–1:00) Show the registry table — explain ERC-20 ↔ ERC-7984 pairs, valid/revoked
3. (1:00–1:30) Show the faucet — mint a mock token live on Sepolia
4. (1:30–2:15) Wrap the token — show the two-tx flow, show the encrypted balance decrypt
5. (2:15–2:45) TVS dashboard — explain Total Value Shielded, show the chart
6. (2:45–3:00) Close — why this matters for the Zama ecosystem

---

*Last updated: June 2026. Cross-reference with https://docs.zama.org/protocol for any protocol changes.*