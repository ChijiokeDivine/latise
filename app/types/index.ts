// app/types/index.ts
// Location: latise/app/types/index.ts

export type Network = "sepolia" | "mainnet";

export interface NetworkConfig {
  chainId: number;
  name: string;
  registryAddress: `0x${string}`;
  rpcUrl: string;
  relayerProxyUrl: string;
  etherscanBaseUrl: string;
  blockTime: number;
  isTestnet: boolean;
}

// ─── Registry ─────────────────────────────────────────────────────────────────

export interface TokenWrapperPair {
  tokenAddress: `0x${string}`;
  confidentialTokenAddress: `0x${string}`;
  isValid: boolean;
}

export interface EnrichedPair {
  tokenAddress: `0x${string}`;
  wrapperAddress: `0x${string}`;
  isValid: boolean;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimals: number;
  wrapperName: string;
  wrapperSymbol: string;
  wrapperDecimals: number;
  rate: bigint;
  isMock: boolean;
  // Optional supply snapshot attached by analytics
  supply?: ShieldedSupplyData;
}

// ─── Shielded Supply ──────────────────────────────────────────────────────────
// Replaces TVSData. We never show USD values — only token amounts.
// nonConfidentialTotalSupply() is public but individual balances are NOT.

export interface ShieldedSupplyData {
  wrapperAddress: `0x${string}`;
  symbol: string;
  /** nonConfidentialTotalSupply in underlying token units */
  underlyingUnits: bigint;
  /** underlyingUnits / rate() = display wrapper units */
  wrapperUnits: bigint;
  /** e.g. "1,234.56 cUSDC" */
  formattedSupply: string;
  /** e.g. "1,234.56 USDC" — the underlying locked amount */
  formattedUnderlying: string;
  lastUpdated: number;
}

export interface AggregatedShieldedSupply {
  byToken: ShieldedSupplyData[];
  lastUpdated: number;
}

// ─── Legacy alias — keep existing imports working ─────────────────────────────
/** @deprecated Use ShieldedSupplyData */
export type TVSData = ShieldedSupplyData & { tvsUSD: null; priceUSD: null };
/** @deprecated Use AggregatedShieldedSupply */
export type AggregatedTVS = AggregatedShieldedSupply & { totalUSD: null };

// ─── Events ───────────────────────────────────────────────────────────────────

export interface WrapEvent {
  wrapperAddress: `0x${string}`;
  to: `0x${string}`;
  roundedAmount: bigint;
  blockNumber: bigint;
  txHash: `0x${string}`;
  timestamp?: number;
}

export interface UnwrapFinalizedEvent {
  wrapperAddress: `0x${string}`;
  receiver: `0x${string}`;
  unwrapRequestId: `0x${string}`;
  cleartextAmount: bigint;
  blockNumber: bigint;
  txHash: `0x${string}`;
  timestamp?: number;
}

export interface DailyVolume {
  date: string;
  wrapVolume: number;
  unwrapVolume: number;
}

// ─── Wrap / Unwrap states ─────────────────────────────────────────────────────

export type WrapState =
  | "idle"
  | "approving"
  | "approved"
  | "wrapping"
  | "done"
  | "error";

export type UnwrapState =
  | "idle"
  | "encrypting"
  | "submitting"
  | "pending_decrypt"
  | "finalizing"
  | "done"
  | "error"
  | "timeout";

export interface WrapResult {
  approveTxHash?: `0x${string}`;
  wrapTxHash: `0x${string}`;
  roundedAmount: bigint;
}

export interface UnwrapResult {
  unwrapTxHash: `0x${string}`;
  unwrapRequestId: `0x${string}`;
  finalizedTxHash?: `0x${string}`;
  cleartextAmount: bigint;
}

export interface PendingUnwrap {
  unwrapRequestId: `0x${string}`;
  wrapperAddress: `0x${string}`;
  userAddress: `0x${string}`;
  chainId: number;
  unwrapTxHash: `0x${string}`;
  submittedAt: number;
  fromBlock: bigint;
}

// ─── Faucet ───────────────────────────────────────────────────────────────────

export type FaucetState = "idle" | "minting" | "done" | "error";

export interface FaucetToken {
  name: string;
  symbol: string;
  wrapperAddress: `0x${string}`;
  underlyingAddress: `0x${string}`;
  underlyingDecimals: number;
  underlyingSymbol: string;
}

// ─── Balances ─────────────────────────────────────────────────────────────────

export interface TokenBalances {
  underlyingBalance: bigint;
  underlyingDecimals: number;
  confidentialBalance: bigint | undefined;
  wrapperDecimals: number;
}

// ─── Errors ───────────────────────────────────────────────────────────────────

export interface ParsedContractError {
  code: string;
  message: string;
  isUserRejection: boolean;
}