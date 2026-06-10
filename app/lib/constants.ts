// lib/constants.ts
// Location: latise/lib/constants.ts
// Single source of truth for all contract addresses, chain configs,
// token lists, and app-wide timing/limits.
// NEVER hardcode addresses anywhere else — always import from here.

import type { Network, NetworkConfig, FaucetToken } from "@/app/types";

// ─── Chain IDs ────────────────────────────────────────────────────────────────

export const CHAIN_IDS = {
  sepolia: 11155111,
  mainnet: 1,
} as const;

// ─── Registry Contract Addresses ─────────────────────────────────────────────
// Source: https://docs.zama.org/protocol/protocol-apps/addresses

export const REGISTRY_ADDRESS: Record<Network, `0x${string}`> = {
  sepolia: "0x2f0750Bbb0A246059d80e94c454586a7F27a128e",
  mainnet: "0xeb5015fF021DB115aCe010f23F55C2591059bBA0",
};

// ─── Network Configs ──────────────────────────────────────────────────────────

export const NETWORK_CONFIGS: Record<Network, NetworkConfig> = {
  sepolia: {
    chainId: CHAIN_IDS.sepolia,
    name: "Sepolia Testnet",
    registryAddress: REGISTRY_ADDRESS.sepolia,
    rpcUrl: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ?? "",
    relayerProxyUrl:
      process.env.NEXT_PUBLIC_RELAYER_URL_SEPOLIA ??
      "http://localhost:3000/api/relayer/11155111",
    etherscanBaseUrl: "https://sepolia.etherscan.io",
    blockTime: 12, // seconds
    isTestnet: true,
  },
  mainnet: {
    chainId: CHAIN_IDS.mainnet,
    name: "Ethereum Mainnet",
    registryAddress: REGISTRY_ADDRESS.mainnet,
    rpcUrl: process.env.NEXT_PUBLIC_MAINNET_RPC_URL ?? "",
    relayerProxyUrl:
      process.env.NEXT_PUBLIC_RELAYER_URL_MAINNET ??
      "http://localhost:3000/api/relayer/1",
    etherscanBaseUrl: "https://etherscan.io",
    blockTime: 12,
    isTestnet: false,
  },
};

// ─── Sepolia Mock Wrappers ────────────────────────────────────────────────────
// These tokens have a public mint() on their underlying ERC-20.
// Used by the Faucet page. Sepolia only.

export const SEPOLIA_MOCK_TOKENS: FaucetToken[] = [
  {
    name: "Confidential USDC (Mock)",
    symbol: "cUSDCMock",
    underlyingSymbol: "USDCMock",
    wrapperAddress: "0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639",
    underlyingAddress: "0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF",
    underlyingDecimals: 6,
  },
  {
    name: "Confidential USDT (Mock)",
    symbol: "cUSDTMock",
    underlyingSymbol: "USDTMock",
    wrapperAddress: "0x4E7B06D78965594eB5EF5414c357ca21E1554491",
    underlyingAddress: "0xa7dA08FafDC9097Cc0E7D4f113A61e31d7e8e9b0",
    underlyingDecimals: 6,
  },
  {
    name: "Confidential WETH (Mock)",
    symbol: "cWETHMock",
    underlyingSymbol: "WETHMock",
    wrapperAddress: "0x46208622DA27d91db4f0393733C8BA082ed83158",
    underlyingAddress: "0xff54739b16576FA5402F211D0b938469Ab9A5f3F",
    underlyingDecimals: 18,
  },
  {
    name: "Confidential BRON (Mock)",
    symbol: "cBRONMock",
    underlyingSymbol: "BRONMock",
    wrapperAddress: "0xaa5612FA27c927a0c7961f5AEFEE5ba3A0F9C891",
    underlyingAddress: "0xFf021fB13cA64e5354c62c954b949a88cfDEb25E",
    underlyingDecimals: 18,
  },
  {
    name: "Confidential ZAMA (Mock)",
    symbol: "cZAMAMock",
    underlyingSymbol: "ZAMAMock",
    wrapperAddress: "0xf2D628d2598aF4eAF94CB76a437Ff86CA78FfbFB",
    underlyingAddress: "0x75355a85c6FB9df5f0C80FF54e8747EEe9a0BF57",
    underlyingDecimals: 18,
  },
  {
    name: "Confidential tGBP (Mock)",
    symbol: "ctGBPMock",
    underlyingSymbol: "tGBPMock",
    wrapperAddress: "0xfCE5c7069c5525eF6c8C2b2E35A745bA20a2F7CC",
    underlyingAddress: "0x93c931278A2aad1916783F952f94276eA5111442",
    underlyingDecimals: 18,
  },
  {
    name: "Confidential XAUt (Mock)",
    symbol: "cXAUtMock",
    underlyingSymbol: "XAUtMock",
    wrapperAddress: "0xe4FcF848739845BC81Dee1d5352cf3844F0a60C7",
    underlyingAddress: "0x24377AE4AA0C45ecEe71225007f17c5D423dd940",
    underlyingDecimals: 6,
  },
];

// ─── Mainnet Wrappers ─────────────────────────────────────────────────────────
// Real tokens — no public mint. Used for reference / address lookups.

export const MAINNET_WRAPPERS = [
  {
    symbol: "cUSDC",
    underlyingSymbol: "USDC",
    wrapperAddress: "0xe978F22157048E5DB8E5d07971376e86671672B2" as `0x${string}`,
    underlyingAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as `0x${string}`,
  },
  {
    symbol: "cUSDT",
    underlyingSymbol: "USDT",
    wrapperAddress: "0xAe0207C757Aa2B4019Ad96edD0092ddc63EF0c50" as `0x${string}`,
    underlyingAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7" as `0x${string}`,
  },
  {
    symbol: "cWETH",
    underlyingSymbol: "WETH",
    wrapperAddress: "0xda9396b82634Ea99243cE51258B6A5Ae512D4893" as `0x${string}`,
    underlyingAddress: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" as `0x${string}`,
  },
  {
    symbol: "cBRON",
    underlyingSymbol: "BRON",
    wrapperAddress: "0x85dE671c3bec1aDeD752c3Cea943521181C826bc" as `0x${string}`,
    underlyingAddress: "" as `0x${string}`,
  },
  {
    symbol: "cZAMA",
    underlyingSymbol: "ZAMA",
    wrapperAddress: "0x80CB147Fd86dC6dEe3Eee7e4Cee33d1397d98071" as `0x${string}`,
    underlyingAddress: "0xA12CC123ba206d4031D1c7f6223D1C2Ec249f4f3" as `0x${string}`,
  },
  {
    symbol: "ctGBP",
    underlyingSymbol: "tGBP",
    wrapperAddress: "0xa873750ccBafD5ec7Dd13bfD5237d7129832eDD9" as `0x${string}`,
    underlyingAddress: "" as `0x${string}`,
  },
  {
    symbol: "cXAUt",
    underlyingSymbol: "XAUt",
    wrapperAddress: "0x73cc9aF9d6BEFdb3c3fAf8a5E8c05Cb95FdaEEf1" as `0x${string}`,
    underlyingAddress: "" as `0x${string}`,
  },
] as const;

// ─── CoinGecko Price IDs ──────────────────────────────────────────────────────
// Maps underlying token symbol -> CoinGecko coin ID.
// Tokens not listed on CoinGecko are mapped to null — show token units only,
// never show $0 for an unknown price.

export const COINGECKO_IDS: Record<string, string | null> = {
  USDC: "usd-coin",
  USDCMock: "usd-coin",
  USDT: "tether",
  USDTMock: "tether",
  WETH: "weth",
  WETHMock: "weth",
  ZAMA: null,       // may not be listed — handle gracefully
  ZAMAMock: null,
  BRON: null,
  BRONMock: null,
  tGBP: "tether-gbp",
  tGBPMock: "tether-gbp",
  XAUt: "tether-gold",
  XAUtMock: "tether-gold",
};

// ─── Faucet ───────────────────────────────────────────────────────────────────

/**
 * Amount to mint per faucet call.
 * 1,000,000 in token display units — multiply by 10^decimals when calling mint().
 */
export const FAUCET_MINT_AMOUNT = 1_000_000n;

// ─── Polling / Refresh Intervals ─────────────────────────────────────────────

export const INTERVALS = {
  /** How often to refetch the registry pair list (ms) */
  REGISTRY_REFRESH_MS: 60_000,
  /** How often to refetch TVS data (ms) */
  TVS_REFRESH_MS: 30_000,
  /** How often to refetch balances (ms) */
  BALANCE_REFRESH_MS: 15_000,
  /** How often to poll for UnwrapRequested event during pending_decrypt (ms) */
  UNWRAP_POLL_MS: 3_000,
  /** Give up waiting for UnwrapFinalized after this many ms */
  UNWRAP_POLL_TIMEOUT_MS: 120_000,
  /** How long to cache volume/event data (ms) */
  VOLUME_CACHE_MS: 300_000,
  /** How long to cache token prices (ms) */
  PRICE_CACHE_MS: 60_000,
} as const;

// ─── Event Log Block Ranges ───────────────────────────────────────────────────

/**
 * Approximate number of blocks covering 7 days.
 * 12s per block => 7 * 24 * 3600 / 12 = 50400 blocks.
 * Infura limits getLogs to 10,000 blocks per call — pagination is handled
 * in lib/events.ts.
 */
export const BLOCKS_PER_7_DAYS = 50_400n;
export const INFURA_MAX_BLOCK_RANGE = 10_000n;

// ─── Error Message Map ────────────────────────────────────────────────────────
// Maps Solidity custom error names to user-facing messages.

export const CONTRACT_ERRORS: Record<string, string> = {
  TokenZeroAddress: "Invalid token address.",
  ConfidentialTokenZeroAddress: "Invalid wrapper address.",
  RevokedConfidentialToken:
    "This wrapper has been revoked and cannot be used.",
  TransferAmountExceedsBalance: "Insufficient balance.",
  InsufficientAllowance:
    "Please approve this amount before wrapping.",
  ExcessiveInputAmount:
    "Amount exceeds the wrapper's maximum input limit.",
  AmountTooSmall:
    "Amount is too small — minimum 1 underlying token unit.",
  UnsupportedAccount:
    "This account has never interacted with the wrapper. Please wrap first.",
};

// ─── localStorage Keys ────────────────────────────────────────────────────────

/** Returns the localStorage key for a pending unwrap operation */
export function pendingUnwrapKey(
  chainId: number,
  wrapperAddress: string,
  userAddress: string
): string {
  return `pendingUnwrap:${chainId}:${wrapperAddress.toLowerCase()}:${userAddress.toLowerCase()}`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the Etherscan URL for a transaction */
export function etherscanTx(hash: string, network: Network): string {
  return `${NETWORK_CONFIGS[network].etherscanBaseUrl}/tx/${hash}`;
}

/** Returns the Etherscan URL for an address */
export function etherscanAddress(address: string, network: Network): string {
  return `${NETWORK_CONFIGS[network].etherscanBaseUrl}/address/${address}`;
}

/** Truncates an Ethereum address for display: 0x1234...5678 */
export function truncateAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/** Resolves network string from URL param — defaults to "sepolia" */
export function parseNetworkParam(param: string | undefined): Network {
  if (param === "mainnet") return "mainnet";
  return "sepolia";
}