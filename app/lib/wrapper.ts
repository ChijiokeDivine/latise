// lib/wrapper.ts
// Location: latise/lib/wrapper.ts
// Read functions for individual ConfidentialWrapper contracts.
// Covers TVS computation, allowance checks, and gas estimation helpers.
//
// Rules enforced here (from RULES.md):
//   W-5: nonConfidentialTotalSupply() / rate() = TVS in wrapper units.
//   W-6: confidentialBalance is fetched via Zama SDK (see hooks/useTokenBalances.ts),
//        NOT via raw readContract — this file only reads non-encrypted state.
//   P-1: All multi-wrapper reads use multicall.

import { WRAPPER_ABI } from "@/app/lib/abis/wrapper.abi";
import { ERC20_ABI } from "@/app/lib/abis/erc20.abi";
import { COINGECKO_IDS } from "@/app/lib/constants";
import { getPublicClient } from "@/app/lib/clients";
import { fetchTokenPrices } from "@/app/lib/prices";
import { formatTokenUnits } from "@/app/lib/format";
import type { Network, TVSData, AggregatedTVS, EnrichedPair } from "@/app/types";

// ─── TVS for a single wrapper ─────────────────────────────────────────────────

/**
 * Fetches TVS data for a single wrapper.
 * TVS = nonConfidentialTotalSupply() / rate() (in wrapper token units)
 * USD TVS = wrapper units × token price (if available)
 */
export async function fetchWrapperTVS(
  pair: EnrichedPair,
  network: Network
): Promise<TVSData> {
  const client = getPublicClient(network);

  const [underlyingUnits, rate] = await client.multicall({
    contracts: [
      {
        address: pair.wrapperAddress,
        abi: WRAPPER_ABI,
        functionName: "nonConfidentialTotalSupply",
      },
      {
        address: pair.wrapperAddress,
        abi: WRAPPER_ABI,
        functionName: "rate",
      },
    ],
    allowFailure: false,
  });

  const underlying = underlyingUnits as bigint;
  const rateVal = rate as bigint;

  // Wrapper units = underlying units / rate
  // Both are integers, so integer division is correct here
  const wrapperUnits = rateVal > 0n ? underlying / rateVal : 0n;

  // Fetch USD price — may be null for unlisted tokens
  const geckoId = COINGECKO_IDS[pair.tokenSymbol] ?? null;
  let priceUSD: number | null = null;

  if (geckoId) {
    const prices = await fetchTokenPrices([geckoId]);
    priceUSD = prices[geckoId] ?? null;
  }

  // USD TVS = wrapper units (in display units) × price
  // wrapperDecimals is max 6, so dividing by 10^wrapperDecimals is safe as Number
  const displayAmount =
    Number(wrapperUnits) / Math.pow(10, pair.wrapperDecimals);
  const tvsUSD = priceUSD !== null ? displayAmount * priceUSD : null;

  return {
    wrapperAddress: pair.wrapperAddress,
    symbol: pair.wrapperSymbol,
    underlyingUnits: underlying,
    wrapperUnits,
    priceUSD,
    tvsUSD,
    formattedAmount: formatTokenUnits(wrapperUnits, pair.wrapperDecimals),
    lastUpdated: Date.now(),
  };
}

// ─── TVS for all wrappers ─────────────────────────────────────────────────────

/**
 * Fetches TVS for all pairs in parallel using Promise.all.
 * Rule P-4: Event/data fetches run in parallel, not sequentially.
 */
export async function fetchAggregatedTVS(
  pairs: EnrichedPair[],
  network: Network
): Promise<AggregatedTVS> {
  const validPairs = pairs.filter((p) => p.isValid);

  if (validPairs.length === 0) {
    return {
      totalUSD: 0,
      byToken: [],
      lastUpdated: Date.now(),
    };
  }

  // Batch all nonConfidentialTotalSupply + rate reads in a single multicall
  const contracts = validPairs.flatMap((pair) => [
    {
      address: pair.wrapperAddress,
      abi: WRAPPER_ABI,
      functionName: "nonConfidentialTotalSupply" as const,
    },
    {
      address: pair.wrapperAddress,
      abi: WRAPPER_ABI,
      functionName: "rate" as const,
    },
  ]);

  const client = getPublicClient(network);
  const results = await client.multicall({ contracts, allowFailure: true });

  // Collect all CoinGecko IDs we need and fetch prices in one batch
  const geckoIds = validPairs
    .map((p) => COINGECKO_IDS[p.tokenSymbol])
    .filter((id): id is string => !!id);
  const prices = geckoIds.length > 0 ? await fetchTokenPrices(geckoIds) : {};

  const byToken: TVSData[] = validPairs.map((pair, i) => {
    const base = i * 2;
    const underlyingUnits =
      results[base].status === "success"
        ? (results[base].result as bigint)
        : 0n;
    const rateVal =
      results[base + 1].status === "success"
        ? (results[base + 1].result as bigint)
        : 1n;

    const wrapperUnits = rateVal > 0n ? underlyingUnits / rateVal : 0n;
    const geckoId = COINGECKO_IDS[pair.tokenSymbol] ?? null;
    const priceUSD = geckoId ? (prices[geckoId] ?? null) : null;
    const displayAmount =
      Number(wrapperUnits) / Math.pow(10, pair.wrapperDecimals);
    const tvsUSD = priceUSD !== null ? displayAmount * priceUSD : null;

    return {
      wrapperAddress: pair.wrapperAddress,
      symbol: pair.wrapperSymbol,
      underlyingUnits,
      wrapperUnits,
      priceUSD,
      tvsUSD,
      formattedAmount: formatTokenUnits(wrapperUnits, pair.wrapperDecimals),
      lastUpdated: Date.now(),
    };
  });

  // Total USD — null if ANY token is missing a price (to avoid misleading sums)
  const allHavePrice = byToken.every((t) => t.tvsUSD !== null);
  const totalUSD = allHavePrice
    ? byToken.reduce((sum, t) => sum + (t.tvsUSD ?? 0), 0)
    : null;

  return { totalUSD, byToken, lastUpdated: Date.now() };
}

// ─── Allowance helpers ────────────────────────────────────────────────────────

/**
 * Checks current ERC-20 allowance for the wrapper contract.
 * Used by the wrap flow to decide whether to skip the approve step.
 */
export async function fetchAllowance(
  tokenAddress: `0x${string}`,
  ownerAddress: `0x${string}`,
  wrapperAddress: `0x${string}`,
  network: Network
): Promise<bigint> {
  const client = getPublicClient(network);

  const allowance = await client.readContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [ownerAddress, wrapperAddress],
  });

  return allowance as bigint;
}

/**
 * Fetches both underlying ERC-20 balance and current allowance for the wrapper.
 * Batched in a single multicall.
 */
export async function fetchUnderlyingBalanceAndAllowance(
  tokenAddress: `0x${string}`,
  ownerAddress: `0x${string}`,
  wrapperAddress: `0x${string}`,
  network: Network
): Promise<{ balance: bigint; allowance: bigint }> {
  const client = getPublicClient(network);

  const [balance, allowance] = await client.multicall({
    contracts: [
      {
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [ownerAddress],
      },
      {
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [ownerAddress, wrapperAddress],
      },
    ],
    allowFailure: false,
  });

  return {
    balance: balance as bigint,
    allowance: allowance as bigint,
  };
}

// ─── Amount conversion helpers ────────────────────────────────────────────────

/**
 * Computes the expected wrapper token amount from an underlying input.
 * Accounts for rate rounding (integer division, same as the contract).
 *
 * Example: WETH has 18 decimals, wrapper has 6, rate = 10^12.
 * Input 1.5 WETH = 1_500_000_000_000_000_000 underlying units.
 * wrapperUnits = floor(1.5e18 / 1e12) = 1_500_000 (1.5 cWETH with 6 decimals).
 */
export function computeExpectedWrapAmount(
  underlyingAmount: bigint,
  rate: bigint
): { wrapperUnits: bigint; roundedUnderlyingAmount: bigint } {
  if (rate === 0n) throw new Error("rate cannot be zero");

  const wrapperUnits = underlyingAmount / rate;
  // The contract rounds DOWN — refunds the remainder to the user
  const roundedUnderlyingAmount = wrapperUnits * rate;

  return { wrapperUnits, roundedUnderlyingAmount };
}

/**
 * Parses a human-readable amount string into BigInt underlying units.
 * e.g. "1.5" with decimals=18 => 1_500_000_000_000_000_000n
 * Handles up to `decimals` decimal places and truncates the rest.
 */
export function parseTokenInput(
  value: string,
  decimals: number
): bigint {
  if (!value || value.trim() === "") return 0n;

  const [intPart, fracPart = ""] = value.split(".");
  const truncatedFrac = fracPart.slice(0, decimals).padEnd(decimals, "0");
  const combined = `${intPart}${truncatedFrac}`;

  try {
    return BigInt(combined.replace(/^0+(?=\d)/, "") || "0");
  } catch {
    return 0n;
  }
}