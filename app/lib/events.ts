// app/lib/events.ts
// Location: latise/app/lib/events.ts
//
// Event log fetching — Wrap and UnwrapFinalized events.
//
// Key changes from v1:
//   1. Sequential pagination (not parallel) to avoid Alchemy CU spikes
//   2. Server-side cache (cacheWrap)
//   3. Much shorter lookback for personal txs (fast loading like MetaMask)

import { parseAbiItem, type AbiEvent, type Log } from "viem";
import {
  BLOCKS_PER_1_DAY,
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

const CONFIDENTIAL_TRANSFER_EVENT = parseAbiItem(
  "event ConfidentialTransfer(address indexed from, address indexed to, bytes32 encryptedAmount)"
) as AbiEvent;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Shared latest block per network */
const blockNumberCache = new Map<Network, { value: bigint; fetchedAt: number }>();

async function getLatestBlock(network: Network): Promise<bigint> {
  const cached = blockNumberCache.get(network);
  if (cached && Date.now() - cached.fetchedAt < 12_000) return cached.value;

  const client = getPublicClient(network);
  const value = await client.getBlockNumber();
  blockNumberCache.set(network, { value, fetchedAt: Date.now() });
  return value;
}

// ─── Base Paginated Logs ─────────────────────────────────────────────────────

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

  while (current <= toBlock) {
    const chunkEnd =
      current + ALCHEMY_MAX_BLOCK_RANGE - 1n < toBlock
        ? current + ALCHEMY_MAX_BLOCK_RANGE - 1n
        : toBlock;

    try {
      const logs = await client.getLogs({ address, event, fromBlock: current, toBlock: chunkEnd });
      allLogs.push(...(logs as Log<bigint, number, boolean, AbiEvent, true>[]));
    } catch (err) {
      console.error(`[events] getLogs failed (${current}-${chunkEnd}):`, err);
    }

    current = chunkEnd + 1n;
    if (current <= toBlock) await sleep(200);
  }

  return allLogs;
}

// ─── Optimized Paginated Logs with Topics (for personal txs) ─────────────────

async function getPaginatedLogsWithTopic(
  network: Network,
  address: `0x${string}`,
  event: AbiEvent,
  fromBlock: bigint,
  toBlock: bigint,
  topics?: (string | string[] | null)[]
): Promise<Log<bigint, number, boolean, AbiEvent, true>[]> {
  const client = getPublicClient(network);
  const allLogs: Log<bigint, number, boolean, AbiEvent, true>[] = [];
  let current = fromBlock;

  while (current <= toBlock) {
    const chunkEnd =
      current + ALCHEMY_MAX_BLOCK_RANGE - 1n < toBlock
        ? current + ALCHEMY_MAX_BLOCK_RANGE - 1n
        : toBlock;

    try {
      const logs = await client.getLogs({
        address,
        event,
        fromBlock: current,
        toBlock: chunkEnd,
        ...(topics && { topics }),
      });
      allLogs.push(...(logs as Log<bigint, number, boolean, AbiEvent, true>[]));
    } catch (err) {
      console.error(`[events] getLogsWithTopic failed (${current}-${chunkEnd}):`, err);
    }

    current = chunkEnd + 1n;
    if (current <= toBlock) await sleep(60); // lighter delay
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
      .filter((l) => typeof l.args === "object" && l.args !== null && "to" in l.args)
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
      .filter((l) => typeof l.args === "object" && l.args !== null && "receiver" in l.args)
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

// ─── All wrappers (for charts / global) ───────────────────────────────────────

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

      const wrapLogs = await getPaginatedLogs(network, pair.wrapperAddress, WRAP_EVENT, fromBlock, toBlock);
      await sleep(150);
      const unwrapLogs = await getPaginatedLogs(network, pair.wrapperAddress, UNWRAP_FINALIZED_EVENT, fromBlock, toBlock);

      allWrap.push(...wrapLogs.filter((l) => typeof l.args === "object" && l.args !== null && "to" in l.args)
        .map((l) => ({
          wrapperAddress: pair.wrapperAddress,
          to: (l.args as { to: `0x${string}` }).to,
          roundedAmount: (l.args as { roundedAmount: bigint }).roundedAmount ?? 0n,
          blockNumber: l.blockNumber ?? 0n,
          txHash: l.transactionHash ?? ("0x" as `0x${string}`),
        })));

      allUnwrap.push(...unwrapLogs.filter((l) => typeof l.args === "object" && l.args !== null && "receiver" in l.args)
        .map((l) => ({
          wrapperAddress: pair.wrapperAddress,
          receiver: (l.args as { receiver: `0x${string}` }).receiver,
          unwrapRequestId: (l.args as { unwrapRequestId: `0x${string}` }).unwrapRequestId,
          cleartextAmount: (l.args as { cleartextAmount: bigint }).cleartextAmount ?? 0n,
          blockNumber: l.blockNumber ?? 0n,
          txHash: l.transactionHash ?? ("0x" as `0x${string}`),
        })));

      if (i < validPairs.length - 1) await sleep(300);
    }

    return { wrapEvents: allWrap, unwrapEvents: allUnwrap };
  });
}

// ─── Poll helpers ─────────────────────────────────────────────────────────────

export async function pollForUnwrapRequestId(
  wrapperAddress: `0x${string}`,
  fromBlock: bigint,
  txHash: `0x${string}`,
  network: Network
): Promise<`0x${string}` | null> {
  const logs = await getPaginatedLogs(network, wrapperAddress, UNWRAP_REQUESTED_EVENT, fromBlock, fromBlock + 100n);
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
  const logs = await getPaginatedLogs(network, wrapperAddress, UNWRAP_FINALIZED_EVENT, fromBlock, fromBlock + 100n);
  const match = logs.find(
    (l) =>
      typeof l.args === "object" &&
      l.args !== null &&
      "unwrapRequestId" in l.args &&
      (l.args as { unwrapRequestId: string }).unwrapRequestId?.toLowerCase() === unwrapRequestId.toLowerCase()
  );

  if (!match || typeof match.args !== "object" || !match.args || !("cleartextAmount" in match.args)) return null;

  return {
    cleartextAmount: (match.args as { cleartextAmount: bigint }).cleartextAmount,
    txHash: match.transactionHash ?? ("0x" as `0x${string}`),
  };
}

// ─── Daily volume ─────────────────────────────────────────────────────────────

export function buildDailyVolume(
  wrapEvents: WrapEvent[],
  unwrapEvents: UnwrapFinalizedEvent[],
  pair: EnrichedPair,
  network: Network
): DailyVolume[] {
  const blockTime = NETWORK_CONFIGS[network].blockTime;
  const latestTimestamp = Math.floor(Date.now() / 1000);

  function estimateDate(blockNumber: bigint): string {
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
    const displayWrapper = pair.rate > 0n
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

// ─── PERSONAL TRANSACTIONS (Optimized for speed) ──────────────────────────────

export type PersonalTxType =
  | "wrap"
  | "unwrap_requested"
  | "unwrap_finalized"
  | "confidential_transfer_out"
  | "confidential_transfer_in";

export interface PersonalTxEvent {
  type: PersonalTxType;
  wrapperAddress: `0x${string}`;
  wrapperSymbol: string;
  tokenSymbol: string;
  tokenDecimals: number;
  wrapperDecimals: number;
  txHash: `0x${string}`;
  blockNumber: bigint;
  amount: bigint;
  isAmountHidden: boolean;
  requestId?: `0x${string}`;
  counterparty?: `0x${string}`;
}

function baseEventFields(pair: EnrichedPair, log: Log) {
  return {
    wrapperAddress: pair.wrapperAddress,
    wrapperSymbol: pair.wrapperSymbol,
    tokenSymbol: pair.tokenSymbol,
    tokenDecimals: pair.tokenDecimals,
    wrapperDecimals: pair.wrapperDecimals,
    txHash: log.transactionHash ?? ("0x" as `0x${string}`),
    blockNumber: log.blockNumber ?? 0n,
  };
}

export async function fetchPersonalEvents(
  pairs: EnrichedPair[],
  userAddress: `0x${string}`,
  network: Network,
  lookbackBlocks = 2000n   // ~6-8 hours — MetaMask style
): Promise<PersonalTxEvent[]> {
  const validPairs = pairs.filter((p) => p.isValid);
  if (validPairs.length === 0 || !userAddress) return [];

  const toBlock = await getLatestBlock(network);
  const fromBlock = toBlock > lookbackBlocks ? toBlock - lookbackBlocks : 0n;

  const cacheKey = `personalTx:${network}:${userAddress.toLowerCase()}:${fromBlock}`;

  return cacheWrap(cacheKey, 25_000, async () => {
    const results: PersonalTxEvent[] = [];
    const userAddrLower = userAddress.toLowerCase();

    for (const pair of validPairs) {
      const addr = pair.wrapperAddress;

      // Wrap
      const wrapLogs = await getPaginatedLogsWithTopic(network, addr, WRAP_EVENT, fromBlock, toBlock, [null, userAddrLower]);
      wrapLogs.forEach((l) => {
        const args = l.args as any;
        results.push({
          type: "wrap",
          ...baseEventFields(pair, l),
          amount: args?.roundedAmount ?? 0n,
          isAmountHidden: false,
        });
      });

      // Unwrap Requested
      const reqLogs = await getPaginatedLogsWithTopic(network, addr, UNWRAP_REQUESTED_EVENT, fromBlock, toBlock, [null, null, userAddrLower]);
      reqLogs.forEach((l) => {
        const args = l.args as any;
        results.push({
          type: "unwrap_requested",
          ...baseEventFields(pair, l),
          amount: 0n,
          isAmountHidden: true,
          requestId: args?.unwrapRequestId,
        });
      });

      // Unwrap Finalized
      const finLogs = await getPaginatedLogsWithTopic(network, addr, UNWRAP_FINALIZED_EVENT, fromBlock, toBlock, [userAddrLower]);
      finLogs.forEach((l) => {
        const args = l.args as any;
        results.push({
          type: "unwrap_finalized",
          ...baseEventFields(pair, l),
          amount: args?.cleartextAmount ?? 0n,
          isAmountHidden: false,
          requestId: args?.unwrapRequestId,
        });
      });

      // Confidential Transfers
      const ctLogs = await getPaginatedLogsWithTopic(network, addr, CONFIDENTIAL_TRANSFER_EVENT, fromBlock, toBlock);
      ctLogs.forEach((l) => {
        const args = l.args as any;
        if (args?.from?.toLowerCase() === userAddrLower) {
          results.push({
            type: "confidential_transfer_out",
            ...baseEventFields(pair, l),
            amount: 0n,
            isAmountHidden: true,
            counterparty: args.to,
          });
        }
        if (args?.to?.toLowerCase() === userAddrLower) {
          results.push({
            type: "confidential_transfer_in",
            ...baseEventFields(pair, l),
            amount: 0n,
            isAmountHidden: true,
            counterparty: args.from,
          });
        }
      });

      await sleep(80);
    }

    results.sort((a, b) => (b.blockNumber > a.blockNumber ? 1 : -1));
    return results;
  });
}