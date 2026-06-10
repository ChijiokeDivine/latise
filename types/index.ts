// types/index.ts
// Location: latise/types/index.ts
// Central type definitions for the Zama Confidential Wrapper Registry app.
// All shared interfaces, enums, and type aliases live here.

// ─── Network ─────────────────────────────────────────────────────────────────

export type Network = "sepolia" | "mainnet";

export interface NetworkConfig {
  chainId: number;
  name: string;
  registryAddress: `0x${string}`;
  rpcUrl: string;
  relayerProxyUrl: string;
  etherscanBaseUrl: string;
  blockTime: number;       // average seconds per block
  isTestnet: boolean;
}

// ─── Registry ─────────────────────────────────────────────────────────────────

/**
 * Raw pair as returned by the ConfidentialTokenWrappersRegistry contract.
 * getTokenConfidentialTokenPairs() returns TokenWrapperPair[]
 */
export interface TokenWrapperPair {
  tokenAddress: `0x${string}`;             // underlying ERC-20
  confidentialTokenAddress: `0x${string}`; // ERC-7984 wrapper
  isValid: boolean;                         // false = revoked
}

/**
 * Enriched pair — TokenWrapperPair + metadata fetched via multicall.
 * This is what the UI works with everywhere.
 */
export interface EnrichedPair {
  // From registry
  tokenAddress: `0x${string}`;
  wrapperAddress: `0x${string}`;
  isValid: boolean;

  // From ERC-20 multicall
  tokenName: string;
  tokenSymbol: string;
  tokenDecimals: number;

  // From wrapper multicall
  wrapperName: string;
  wrapperSymbol: string;
  wrapperDecimals: number; // max 6 per protocol
  rate: bigint;            // underlying units per wrapper unit

  // Whether this token has a public mint() (Sepolia mock tokens only)
  isMock: boolean;

  // Computed TVS data (fetched separately, may be undefined initially)
  tvs?: TVSData;
}

// ─── TVS ──────────────────────────────────────────────────────────────────────

export interface TVSData {
  wrapperAddress: `0x${string}`;
  symbol: string;
  /** nonConfidentialTotalSupply in underlying token units (BigInt) */
  underlyingUnits: bigint;
  /** nonConfidentialTotalSupply divided by rate() = wrapper units */
  wrapperUnits: bigint;
  /** USD price of the underlying token, null if not available */
  priceUSD: number | null;
  /** USD value of TVS, null if price unavailable */
  tvsUSD: number | null;
  /** Human-readable wrapper unit amount (e.g. "1,234.56") */
  formattedAmount: string;
  lastUpdated: number; // unix timestamp ms
}

export interface AggregatedTVS {
  totalUSD: number | null;        // null if any token has no price
  byToken: TVSData[];
  lastUpdated: number;
}

// ─── Volume Events ────────────────────────────────────────────────────────────

export interface WrapEvent {
  wrapperAddress: `0x${string}`;
  to: `0x${string}`;
  roundedAmount: bigint;   // underlying token units
  blockNumber: bigint;
  txHash: `0x${string}`;
  timestamp?: number;      // populated if block data is fetched
}

export interface UnwrapFinalizedEvent {
  wrapperAddress: `0x${string}`;
  receiver: `0x${string}`;
  unwrapRequestId: `0x${string}`;
  cleartextAmount: bigint; // underlying token units
  blockNumber: bigint;
  txHash: `0x${string}`;
  timestamp?: number;
}

export interface DailyVolume {
  date: string;            // "YYYY-MM-DD"
  wrapVolume: number;      // in wrapper token units
  unwrapVolume: number;
}

// ─── Wrap / Unwrap Flows ──────────────────────────────────────────────────────

/**
 * All possible states for the wrap transaction flow.
 * Used by useWrap hook and WrapForm component.
 */
export type WrapState =
  | "idle"
  | "approving"    // waiting for ERC-20 approve tx to confirm
  | "approved"     // approve confirmed, ready to wrap
  | "wrapping"     // waiting for wrap tx to confirm
  | "done"         // wrap confirmed successfully
  | "error";

/**
 * All possible states for the two-step async unwrap flow.
 * Used by useUnwrap hook and UnwrapForm component.
 */
export type UnwrapState =
  | "idle"
  | "encrypting"      // SDK encrypting the amount client-side
  | "submitting"      // calling unwrap() on-chain
  | "pending_decrypt" // waiting for Zama relayer to decrypt (10–60s)
  | "finalizing"      // calling finalizeUnwrap() if relayer hasn't
  | "done"
  | "error"
  | "timeout";        // relayer took too long (>2 minutes)

export interface WrapResult {
  approveTxHash?: `0x${string}`;
  wrapTxHash: `0x${string}`;
  /** Actual amount wrapped after rate rounding, in underlying units */
  roundedAmount: bigint;
}

export interface UnwrapResult {
  unwrapTxHash: `0x${string}`;
  unwrapRequestId: `0x${string}`;
  finalizedTxHash?: `0x${string}`;
  /** Amount returned to user in underlying units */
  cleartextAmount: bigint;
}

/** Stored in localStorage to survive page reloads during pending_decrypt */
export interface PendingUnwrap {
  unwrapRequestId: `0x${string}`;
  wrapperAddress: `0x${string}`;
  userAddress: `0x${string}`;
  chainId: number;
  unwrapTxHash: `0x${string}`;
  submittedAt: number;    // unix timestamp ms
  fromBlock: bigint;      // block to start polling from
}

// ─── Faucet ───────────────────────────────────────────────────────────────────

export type FaucetState =
  | "idle"
  | "minting"
  | "done"
  | "error";

export interface FaucetToken {
  name: string;
  symbol: string;
  wrapperAddress: `0x${string}`;
  underlyingAddress: `0x${string}`;
  underlyingDecimals: number;
  /** Display name for the underlying mock ERC-20 */
  underlyingSymbol: string;
}

// ─── Balances ─────────────────────────────────────────────────────────────────

export interface TokenBalances {
  /** ERC-20 underlying balance in token units (BigInt) */
  underlyingBalance: bigint;
  underlyingDecimals: number;
  /** Decrypted cToken balance — undefined until decrypted via SDK */
  confidentialBalance: bigint | undefined;
  wrapperDecimals: number;
}

// ─── Errors ───────────────────────────────────────────────────────────────────

export interface ParsedContractError {
  code: string;
  message: string;
  isUserRejection: boolean;
}

// ─── Price API ────────────────────────────────────────────────────────────────

export interface TokenPrice {
  symbol: string;
  geckoId: string;
  priceUSD: number;
  lastFetched: number; // unix timestamp ms
}

// ─── API Route Types ──────────────────────────────────────────────────────────

/** Response shape from GET /api/registry?network=sepolia */
export interface RegistryApiResponse {
  network: Network;
  pairs: EnrichedPair[];
  fetchedAt: number;
}

/** Response shape from GET /api/tvs?network=sepolia */
export interface TVSApiResponse {
  network: Network;
  data: AggregatedTVS;
  fetchedAt: number;
}

/** Response shape from GET /api/volume?network=sepolia&wrapperAddress=0x... */
export interface VolumeApiResponse {
  network: Network;
  wrapperAddress: `0x${string}`;
  wrapEvents: WrapEvent[];
  unwrapEvents: UnwrapFinalizedEvent[];
  dailyVolume: DailyVolume[];
  fetchedAt: number;
}

/** Response shape from GET /api/prices */
export interface PricesApiResponse {
  prices: Record<string, number | null>; // symbol -> USD price
  fetchedAt: number;
}