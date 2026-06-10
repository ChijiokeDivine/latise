// lib/events.ts
// Location: latise/lib/events.ts
// Fetches Wrap and UnwrapFinalized events for volume analytics.
//
// Rules enforced here (from RULES.md):
//   D-1: Batch event queries across all wrappers in parallel.
//   D-2: Infura block range limit is ~10,000 blocks — paginate if needed.
//   P-4: Parallel fetches with Promise.all, never sequential.
//
// IMPORTANT: euint64 fields in events (encryptedWrappedAmount, encryptedAmount)
// are bytes32 handles — we do NOT try to read them. We only use:
//   Wrap.roundedAmount        (uint256 — underlying units)
//   UnwrapFinalized.cleartextAmount (uint64 — underlying units)

import { parseAbiItem, type AbiEvent, type Log } from "viem";
import {
  BLOCKS_PER_7_DAYS,
  INFURA_MAX_BLOCK_RANGE,
  NETWORK_CONFIGS,
} from "@/lib/constants";
import { getPublicClient } from "@/lib/clients";
import type {
  Network,
  WrapEvent,
  UnwrapFinalizedEvent,
  DailyVolume,
  EnrichedPair,
} from "@/types";

// ─── ABI items for getLogs ────────────────────────────────────────────────────

const WRAP_EVENT = parseAbiItem(
  "event Wrap(address indexed to, uint256 roundedAmount, bytes32 encryptedWrappedAmount)"
) as AbiEvent;

const UNWRAP_FINALIZED_EVENT = parseAbiItem(
  "event UnwrapFinalized(address indexed receiver, bytes32 indexed unwrapRequestId, bytes32 encryptedAmount, uint64 cleartextAmount)"
) as AbiEvent;

const UNWRAP_REQUESTED_EVENT = parseAbiItem(
  "event UnwrapRequested(bytes32 indexed unwrapRequestId, address indexed from, address to, bytes32 encryptedAmount)"
) as AbiEvent;

// ─── Block range helpers ──────────────────────────────────────────────────────

/**
 * Computes the start block for fetching ~7 days of events.
 * Returns 0n if the chain is too new to have that many blocks.
 */
export async function getStartBlock(network: Network): Promise<bigint> {
  const client = getPublicClient(network);
  const latestBlock = await client.getBlockNumber();
  const startBlock =
    latestBlock > BLOCKS_PER_7_DAYS ? latestBlock - BLOCKS_PER_7_DAYS : 0n;
  return startBlock;
}

// ─── Paginated getLogs ────────────────────────────────────────────────────────

/**
 * Fetches logs in INFURA_MAX_BLOCK_RANGE-sized chunks to avoid the provider
 * block range limit. Assembles all chunks into a single flat array.
 */
async function getPaginatedLogs(
  network: Network,
  address: `0x${string}`,
  event: AbiEvent,
  fromBlock: bigint,
  toBlock: bigint
) {
  const client = getPublicClient(network);
  const allLogs: Log<bigint, number, boolean, AbiEvent, true>[] = [];

  let current = fromBlock;

  while (current <= toBlock) {
    const chunkEnd =
      current + INFURA_MAX_BLOCK_RANGE - 1n < toBlock
        ? current + INFURA_MAX_BLOCK_RANGE - 1n
        : toBlock;

    try {
      const logs = await client.getLogs({
        address,
        event,
        fromBlock: current,
        toBlock: chunkEnd,
      });
      allLogs.push(...(logs as Log<bigint, number, boolean, AbiEvent, true>[]));
    } catch (err) {
      // Log the error but continue — a missing chunk is better than no data
      console.error(
        `[events] getLogs failed for blocks ${current}–${chunkEnd}:`,
        err
      );
    }

    current = chunkEnd + 1n;
  }

  return allLogs;
}

// ─── Wrap events ──────────────────────────────────────────────────────────────

/**
 * Fetches Wrap events for a single wrapper over the past ~7 days.
 */
export async function fetchWrapEvents(
  wrapperAddress: `0x${string}`,
  network: Network,
  fromBlock?: bigint
): Promise<WrapEvent[]> {
  const client = getPublicClient(network);
  const toBlock = await client.getBlockNumber();
  const startBlock = fromBlock ?? (await getStartBlock(network));

  const logs = await getPaginatedLogs(
    network,
    wrapperAddress,
    WRAP_EVENT,
    startBlock,
    toBlock
  );

  return logs
    .filter(
      (log): log is Log<bigint, number, boolean, AbiEvent, true> => 
        typeof log.args === 'object' && 
        log.args !== null && 
        'to' in log.args && 
        'roundedAmount' in log.args && 
        log.args.roundedAmount !== undefined
    )
    .map((log) => ({
      wrapperAddress,
      to: (log.args as Record<string, unknown>).to as `0x${string}`,
      roundedAmount: (log.args as Record<string, unknown>).roundedAmount as bigint,
      blockNumber: log.blockNumber ?? 0n,
      txHash: log.transactionHash ?? ("0x" as `0x${string}`),
    }));
}

/**
 * Fetches UnwrapFinalized events for a single wrapper over the past ~7 days.
 */
export async function fetchUnwrapEvents(
  wrapperAddress: `0x${string}`,
  network: Network,
  fromBlock?: bigint
): Promise<UnwrapFinalizedEvent[]> {
  const client = getPublicClient(network);
  const toBlock = await client.getBlockNumber();
  const startBlock = fromBlock ?? (await getStartBlock(network));

  const logs = await getPaginatedLogs(
    network,
    wrapperAddress,
    UNWRAP_FINALIZED_EVENT,
    startBlock,
    toBlock
  );

  return logs
    .filter(
      (log) =>
        typeof log.args === 'object' && log.args !== null && 'receiver' in log.args && log.args.receiver &&
        log.args.unwrapRequestId &&
        log.args.cleartextAmount !== undefined
    )
    .map((log) => ({
      wrapperAddress,
      receiver: (log.args as Record<string, unknown>).receiver as `0x${string}`,
      unwrapRequestId: (log.args as Record<string, unknown>).unwrapRequestId as `0x${string}`,
      cleartextAmount: (log.args as Record<string, unknown>).cleartextAmount as bigint,
      blockNumber: log.blockNumber ?? 0n,
      txHash: log.transactionHash ?? ("0x" as `0x${string}`),
    }));
}

// ─── Poll for UnwrapRequested / UnwrapFinalized ───────────────────────────────

/**
 * Polls for an UnwrapRequested event matching a known transaction hash.
 * Used immediately after submitting the unwrap tx to extract the requestId.
 */
export async function pollForUnwrapRequestId(
  wrapperAddress: `0x${string}`,
  fromBlock: bigint,
  txHash: `0x${string}`,
  network: Network
): Promise<`0x${string}` | null> {
  const client = getPublicClient(network);
  const toBlock = await client.getBlockNumber();

  const logs = await client.getLogs({
    address: wrapperAddress,
    event: UNWRAP_REQUESTED_EVENT,
    fromBlock,
    toBlock,
  });

  // Find the log from this specific transaction
  const match = logs.find((l) => l.transactionHash === txHash);
  if (!match || !(typeof match.args === 'object' && match.args !== null && 'unwrapRequestId' in match.args) || !match.args.unwrapRequestId) return null;

  return match.args.unwrapRequestId as `0x${string}`;
}

/**
 * Polls for an UnwrapFinalized event matching a known unwrapRequestId.
 * Returns the cleartext amount if found, null if not yet finalized.
 * Called repeatedly in the useUnwrap hook until resolved or timed out.
 */
export async function pollForUnwrapFinalized(
  wrapperAddress: `0x${string}`,
  unwrapRequestId: `0x${string}`,
  fromBlock: bigint,
  network: Network
): Promise<{ cleartextAmount: bigint; txHash: `0x${string}` } | null> {
  const client = getPublicClient(network);
  const toBlock = await client.getBlockNumber();

  const logs = await client.getLogs({
    address: wrapperAddress,
    event: UNWRAP_FINALIZED_EVENT,
    fromBlock,
    toBlock,
  });

  const match = logs.find(
    (l) =>
      (typeof l.args === 'object' && l.args !== null && 'unwrapRequestId' in l.args ? (l.args.unwrapRequestId as string)?.toLowerCase() : undefined) ===
      unwrapRequestId.toLowerCase()
  );

  if (!match || typeof match.args !== 'object' || match.args === null || !('cleartextAmount' in match.args) || match.args.cleartextAmount === undefined) return null;

  return {
    cleartextAmount: match.args.cleartextAmount as bigint,
    txHash: match.transactionHash ?? ("0x" as `0x${string}`),
  };
}

// ─── All wrappers — parallel fetch ───────────────────────────────────────────

/**
 * Fetches wrap + unwrap events for ALL valid pairs in parallel.
 * Rule D-1: Batch across all wrappers.
 * Rule P-4: Parallel with Promise.all.
 */
export async function fetchAllWrapperEvents(
  pairs: EnrichedPair[],
  network: Network
): Promise<{
  wrapEvents: WrapEvent[];
  unwrapEvents: UnwrapFinalizedEvent[];
}> {
  const validPairs = pairs.filter((p) => p.isValid);

  const [wrapResults, unwrapResults] = await Promise.all([
    Promise.all(
      validPairs.map((p) => fetchWrapEvents(p.wrapperAddress, network))
    ),
    Promise.all(
      validPairs.map((p) => fetchUnwrapEvents(p.wrapperAddress, network))
    ),
  ]);

  return {
    wrapEvents: wrapResults.flat(),
    unwrapEvents: unwrapResults.flat(),
  };
}

// ─── Aggregate into daily volume ──────────────────────────────────────────────

/**
 * Converts raw event arrays into daily volume data suitable for Recharts.
 * Timestamps are estimated from block numbers using the network's block time.
 * This avoids fetching block data for every event (too many RPC calls).
 */
export async function buildDailyVolume(
  wrapEvents: WrapEvent[],
  unwrapEvents: UnwrapFinalizedEvent[],
  pair: EnrichedPair,
  network: Network
): Promise<DailyVolume[]> {
  const blockTime = NETWORK_CONFIGS[network].blockTime; // seconds per block
  const client = getPublicClient(network);
  const latestBlock = await client.getBlockNumber();
  const latestTimestamp = Math.floor(Date.now() / 1000);

  /**
   * Estimates a UNIX timestamp for a given block number.
   * Avoids fetching block headers for each event.
   */
  function estimateTimestamp(blockNumber: bigint): number {
    const blockDiff = Number(latestBlock - blockNumber);
    return latestTimestamp - blockDiff * blockTime;
  }

  function blockToDateStr(blockNumber: bigint): string {
    const ts = estimateTimestamp(blockNumber);
    return new Date(ts * 1000).toISOString().slice(0, 10); // "YYYY-MM-DD"
  }

  // Accumulate by date
  const map = new Map<string, { wrap: number; unwrap: number }>();

  for (const e of wrapEvents) {
    if (e.wrapperAddress.toLowerCase() !== pair.wrapperAddress.toLowerCase())
      continue;
    const date = blockToDateStr(e.blockNumber);
    const display =
      Number(e.roundedAmount / pair.rate) /
      Math.pow(10, pair.wrapperDecimals);
    const entry = map.get(date) ?? { wrap: 0, unwrap: 0 };
    entry.wrap += display;
    map.set(date, entry);
  }

  for (const e of unwrapEvents) {
    if (e.wrapperAddress.toLowerCase() !== pair.wrapperAddress.toLowerCase())
      continue;
    const date = blockToDateStr(e.blockNumber);
    const display =
      Number(e.cleartextAmount) / Math.pow(10, pair.tokenDecimals ?? 18);
    // Wait — cleartextAmount is already in underlying units, not wrapper units.
    // Convert to wrapper display units using rate:
    const displayWrapper =
      Number(e.cleartextAmount) /
      Number(pair.rate) /
      Math.pow(10, pair.wrapperDecimals);
    const entry = map.get(date) ?? { wrap: 0, unwrap: 0 };
    entry.unwrap += displayWrapper;
    map.set(date, entry);
  }

  // Sort by date and return
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { wrap, unwrap }]) => ({ date, wrapVolume: wrap, unwrapVolume: unwrap }));
}