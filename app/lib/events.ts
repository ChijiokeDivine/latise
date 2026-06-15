// app/lib/events.ts
// Location: latise/app/lib/events.ts
//
// Event log fetching — Wrap and UnwrapFinalized events.
//
// Key changes from v1:
//   1. Sequential pagination (not parallel) to avoid Alchemy CU spikes
//   2. Server-side cache (cacheWrap) — won't re-query within 10 min
//   3. Shorter default lookback: 1 day for transactions page, 3 days for charts
//   4. All wrappers fetched sequentially with 200ms delay between each
//      to avoid CU/second bursts
//   5. Single getBlockNumber() call shared across all fetches in a batch

import { parseAbiItem, type AbiEvent, type Log } from "viem";
import {
  BLOCKS_PER_1_DAY,
  BLOCKS_PER_3_DAYS,
  ALCHEMY_MAX_BLOCK_RANGE,
  NETWORK_CONFIGS,
} from "@/app/lib/constants";
import { getPublicClient } from "@/app/lib/clients";
import { cacheWrap, CACHE_TTL } from "@/app/lib/cache";
import type {
  Network,
  WrapEvent,
  UnwrapFinalizedEvent,
  DailyVolume,
  EnrichedPair,
} from "@/app/types";

// ─── ABI items ────────────────────────────────────────────────────────────────

const WRAP_EVENT = parseAbiItem(
  "event Wrap(address indexed to, uint256 roundedAmount, bytes32 encryptedWrappedAmount)"
) as AbiEvent;

const UNWRAP_FINALIZED_EVENT = parseAbiItem(
  "event UnwrapFinalized(address indexed receiver, bytes32 indexed unwrapRequestId, bytes32 encryptedAmount, uint64 cleartextAmount)"
) as AbiEvent;

const UNWRAP_REQUESTED_EVENT = parseAbiItem(
  "event UnwrapRequested(bytes32 indexed unwrapRequestId, address indexed from, address to, bytes32 encryptedAmount)"
) as AbiEvent;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Shared latest block per network — avoids per-function getBlockNumber() calls */
const blockNumberCache = new Map<Network, { value: bigint; fetchedAt: number }>();

async function getLatestBlock(network: Network): Promise<bigint> {
  const cached = blockNumberCache.get(network);
  // Reuse if fetched within last 12 seconds (1 block time)
  if (cached && Date.now() - cached.fetchedAt < 12_000) return cached.value;

  const client = getPublicClient(network);
  const value = await client.getBlockNumber();
  blockNumberCache.set(network, { value, fetchedAt: Date.now() });
  return value;
}

// ─── Paginated getLogs — sequential, not parallel ─────────────────────────────

/**
 * Fetches logs in ALCHEMY_MAX_BLOCK_RANGE chunks, sequentially.
 * Sequential is safer than parallel for rate-limited providers:
 * parallel requests hit the CU/second cap instantly.
 * 200ms delay between pages to stay under burst limits.
 */
async function getPaginatedLogs(
  network: Network,
  address: `0x${string}`,
  event: AbiEvent,
  fromBlock: bigint,
  toBlock: bigint
): Promise<Log<bigint, number, boolean, AbiEvent, true>[]> {
  const client = getPublicClient(network);
  const allLogs: Log<bigint, number, boolean, AbiEvent, true>[] = [];
  let current = fromBlock;
  let pageCount = 0;

  while (current <= toBlock) {
    const chunkEnd =
      current + ALCHEMY_MAX_BLOCK_RANGE - 1n < toBlock
        ? current + ALCHEMY_MAX_BLOCK_RANGE - 1n
        : toBlock;

    try {
      const logs = await client.getLogs({ address, event, fromBlock: current, toBlock: chunkEnd });
      allLogs.push(...(logs as Log<bigint, number, boolean, AbiEvent, true>[]));
    } catch (err) {
      console.error(`[events] getLogs page ${pageCount} failed (${current}-${chunkEnd}):`, err);
      // Don't break — partial data is better than nothing
    }

    current = chunkEnd + 1n;
    pageCount++;

    // Throttle: 200ms between pages to avoid CU/second bursts
    if (current <= toBlock) await sleep(200);
  }

  return allLogs;
}

// ─── Single wrapper events ────────────────────────────────────────────────────

export async function fetchWrapEvents(
  wrapperAddress: `0x${string}`,
  network: Network,
  fromBlock?: bigint
): Promise<WrapEvent[]> {
  const toBlock = await getLatestBlock(network);
  const startBlock = fromBlock ?? (toBlock > BLOCKS_PER_1_DAY ? toBlock - BLOCKS_PER_1_DAY : 0n);

  const cacheKey = `wrapEvents:${network}:${wrapperAddress}:${startBlock}`;
  return cacheWrap(cacheKey, CACHE_TTL.EVENTS, async () => {
    const logs = await getPaginatedLogs(network, wrapperAddress, WRAP_EVENT, startBlock, toBlock);

    return logs
      .filter((l) => typeof l.args === "object" && l.args !== null && "to" in l.args && l.args.roundedAmount !== undefined)
      .map((l) => ({
        wrapperAddress,
        to: (l.args as { to: `0x${string}` }).to,
        roundedAmount: (l.args as { roundedAmount: bigint }).roundedAmount,
        blockNumber: l.blockNumber ?? 0n,
        txHash: l.transactionHash ?? ("0x" as `0x${string}`),
      }));
  });
}

export async function fetchUnwrapEvents(
  wrapperAddress: `0x${string}`,
  network: Network,
  fromBlock?: bigint
): Promise<UnwrapFinalizedEvent[]> {
  const toBlock = await getLatestBlock(network);
  const startBlock = fromBlock ?? (toBlock > BLOCKS_PER_1_DAY ? toBlock - BLOCKS_PER_1_DAY : 0n);

  const cacheKey = `unwrapEvents:${network}:${wrapperAddress}:${startBlock}`;
  return cacheWrap(cacheKey, CACHE_TTL.EVENTS, async () => {
    const logs = await getPaginatedLogs(network, wrapperAddress, UNWRAP_FINALIZED_EVENT, startBlock, toBlock);

    return logs
      .filter((l) => typeof l.args === "object" && l.args !== null && "receiver" in l.args && l.args.cleartextAmount !== undefined)
      .map((l) => ({
        wrapperAddress,
        receiver: (l.args as { receiver: `0x${string}` }).receiver,
        unwrapRequestId: (l.args as { unwrapRequestId: `0x${string}` }).unwrapRequestId,
        cleartextAmount: (l.args as { cleartextAmount: bigint }).cleartextAmount,
        blockNumber: l.blockNumber ?? 0n,
        txHash: l.transactionHash ?? ("0x" as `0x${string}`),
      }));
  });
}

// ─── All wrappers — SEQUENTIAL with throttle ──────────────────────────────────
//
// Previous version used Promise.all — that fires 7 wrappers × 2 event types
// = 14 concurrent getLogs requests, each paginated, instantly blowing the
// Alchemy CU/second budget.
//
// New approach: sequential, 300ms delay between wrappers.

export async function fetchAllWrapperEvents(
  pairs: EnrichedPair[],
  network: Network,
  lookbackBlocks?: bigint
): Promise<{ wrapEvents: WrapEvent[]; unwrapEvents: UnwrapFinalizedEvent[] }> {
  const validPairs = pairs.filter((p) => p.isValid);
  if (validPairs.length === 0) return { wrapEvents: [], unwrapEvents: [] };

  const toBlock = await getLatestBlock(network);
  const lb = lookbackBlocks ?? BLOCKS_PER_1_DAY;
  const fromBlock = toBlock > lb ? toBlock - lb : 0n;

  const cacheKey = `allEvents:${network}:${fromBlock}:${validPairs.map((p) => p.wrapperAddress).join(",")}`;
  return cacheWrap(cacheKey, CACHE_TTL.EVENTS, async () => {
    const allWrap: WrapEvent[] = [];
    const allUnwrap: UnwrapFinalizedEvent[] = [];

    for (let i = 0; i < validPairs.length; i++) {
      const pair = validPairs[i];

      // Fetch both event types sequentially per wrapper to avoid bursts
      const wrapLogs = await getPaginatedLogs(network, pair.wrapperAddress, WRAP_EVENT, fromBlock, toBlock);
      await sleep(150);
      const unwrapLogs = await getPaginatedLogs(network, pair.wrapperAddress, UNWRAP_FINALIZED_EVENT, fromBlock, toBlock);

      allWrap.push(
        ...wrapLogs
          .filter((l) => typeof l.args === "object" && l.args !== null && "to" in l.args)
          .map((l) => ({
            wrapperAddress: pair.wrapperAddress,
            to: (l.args as { to: `0x${string}` }).to,
            roundedAmount: (l.args as { roundedAmount: bigint }).roundedAmount ?? 0n,
            blockNumber: l.blockNumber ?? 0n,
            txHash: l.transactionHash ?? ("0x" as `0x${string}`),
          }))
      );

      allUnwrap.push(
        ...unwrapLogs
          .filter((l) => typeof l.args === "object" && l.args !== null && "receiver" in l.args)
          .map((l) => ({
            wrapperAddress: pair.wrapperAddress,
            receiver: (l.args as { receiver: `0x${string}` }).receiver,
            unwrapRequestId: (l.args as { unwrapRequestId: `0x${string}` }).unwrapRequestId,
            cleartextAmount: (l.args as { cleartextAmount: bigint }).cleartextAmount ?? 0n,
            blockNumber: l.blockNumber ?? 0n,
            txHash: l.transactionHash ?? ("0x" as `0x${string}`),
          }))
      );

      // 300ms between wrappers to avoid CU/second bursts
      if (i < validPairs.length - 1) await sleep(300);
    }

    return { wrapEvents: allWrap, unwrapEvents: allUnwrap };
  });
}

// ─── Poll helpers for unwrap flow ─────────────────────────────────────────────

export async function pollForUnwrapRequestId(
  wrapperAddress: `0x${string}`,
  fromBlock: bigint,
  txHash: `0x${string}`,
  network: Network
): Promise<`0x${string}` | null> {
  const client = getPublicClient(network);
  const toBlock = await getLatestBlock(network);

  const logs = await client.getLogs({
    address: wrapperAddress,
    event: UNWRAP_REQUESTED_EVENT,
    fromBlock,
    toBlock,
  });

  const match = logs.find((l) => l.transactionHash === txHash);
  if (!match || typeof match.args !== "object" || !match.args || !("unwrapRequestId" in match.args)) return null;
  return (match.args as { unwrapRequestId: `0x${string}` }).unwrapRequestId;
}

export async function pollForUnwrapFinalized(
  wrapperAddress: `0x${string}`,
  unwrapRequestId: `0x${string}`,
  fromBlock: bigint,
  network: Network
): Promise<{ cleartextAmount: bigint; txHash: `0x${string}` } | null> {
  const client = getPublicClient(network);
  const toBlock = await getLatestBlock(network);

  const logs = await client.getLogs({
    address: wrapperAddress,
    event: UNWRAP_FINALIZED_EVENT,
    fromBlock,
    toBlock,
  });

  const match = logs.find(
    (l) =>
      typeof l.args === "object" &&
      l.args !== null &&
      "unwrapRequestId" in l.args &&
      (l.args as { unwrapRequestId: string }).unwrapRequestId?.toLowerCase() ===
        unwrapRequestId.toLowerCase()
  );

  if (!match || typeof match.args !== "object" || !match.args || !("cleartextAmount" in match.args)) return null;

  return {
    cleartextAmount: (match.args as { cleartextAmount: bigint }).cleartextAmount,
    txHash: match.transactionHash ?? ("0x" as `0x${string}`),
  };
}

// ─── Daily volume aggregation ─────────────────────────────────────────────────

export function buildDailyVolume(
  wrapEvents: WrapEvent[],
  unwrapEvents: UnwrapFinalizedEvent[],
  pair: EnrichedPair,
  network: Network
): DailyVolume[] {
  const blockTime = NETWORK_CONFIGS[network].blockTime;
  const latestTimestamp = Math.floor(Date.now() / 1000);

  // Use a fixed reference block (approximate — avoids extra RPC call)
  // We'll use "now" as the reference and work backwards
  function estimateDate(blockNumber: bigint): string {
    // Approximate: each block is ~12s ago relative to current time
    const blockAgeSeconds = Number(blockNumber) > 0
      ? Math.max(0, (Date.now() / 1000 - latestTimestamp) + blockTime)
      : 0;
    const ts = latestTimestamp - blockAgeSeconds;
    return new Date(ts * 1000).toISOString().slice(0, 10);
  }

  const map = new Map<string, { wrap: number; unwrap: number }>();

  for (const e of wrapEvents) {
    if (e.wrapperAddress.toLowerCase() !== pair.wrapperAddress.toLowerCase()) continue;
    const date = estimateDate(e.blockNumber);
    const display = pair.rate > 0n
      ? Number(e.roundedAmount / pair.rate) / Math.pow(10, pair.wrapperDecimals)
      : 0;
    const entry = map.get(date) ?? { wrap: 0, unwrap: 0 };
    entry.wrap += display;
    map.set(date, entry);
  }

  for (const e of unwrapEvents) {
    if (e.wrapperAddress.toLowerCase() !== pair.wrapperAddress.toLowerCase()) continue;
    const date = estimateDate(e.blockNumber);
    const displayWrapper =
      pair.rate > 0n
        ? Number(e.cleartextAmount) / Number(pair.rate) / Math.pow(10, pair.wrapperDecimals)
        : 0;
    const entry = map.get(date) ?? { wrap: 0, unwrap: 0 };
    entry.unwrap += displayWrapper;
    map.set(date, entry);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { wrap, unwrap }]) => ({ date, wrapVolume: wrap, unwrapVolume: unwrap }));
}