// app/lib/constants.ts
// Location: latise/app/lib/constants.ts

import type { Network, NetworkConfig, FaucetToken } from "@/app/types";

export const CHAIN_IDS = {
  sepolia: 11155111,
  mainnet: 1,
} as const;

export const REGISTRY_ADDRESS: Record<Network, `0x${string}`> = {
  sepolia: "0x2f0750Bbb0A246059d80e94c454586a7F27a128e",
  mainnet: "0xeb5015fF021DB115aCe010f23F55C2591059bBA0",
};

export const NETWORK_CONFIGS: Record<Network, NetworkConfig> = {
  sepolia: {
    chainId: CHAIN_IDS.sepolia,
    name: "Sepolia Testnet",
    registryAddress: REGISTRY_ADDRESS.sepolia,
    rpcUrl: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ?? "",
    relayerProxyUrl:
      process.env.NEXT_PUBLIC_RELAYER_URL_SEPOLIA ??
      "https://relayer.testnet.zama.ai",
    etherscanBaseUrl: "https://sepolia.etherscan.io",
    blockTime: 12,
    isTestnet: true,
  },
  mainnet: {
    chainId: CHAIN_IDS.mainnet,
    name: "Ethereum Mainnet",
    registryAddress: REGISTRY_ADDRESS.mainnet,
    rpcUrl: process.env.NEXT_PUBLIC_MAINNET_RPC_URL ?? "",
    relayerProxyUrl:
      process.env.NEXT_PUBLIC_RELAYER_URL_MAINNET ??
      "https://relayer.testnet.zama.ai",
    etherscanBaseUrl: "https://etherscan.io",
    blockTime: 12,
    isTestnet: false,
  },
};

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
] as const;

export const COINGECKO_IDS: Record<string, string | null> = {
  USDC: "usd-coin",
  USDCMock: "usd-coin",
  USDT: "tether",
  USDTMock: "tether",
  WETH: "weth",
  WETHMock: "weth",
  ZAMA: null,
  ZAMAMock: null,
  BRON: null,
  BRONMock: null,
  tGBP: "tether-gbp",
  tGBPMock: "tether-gbp",
  XAUt: "tether-gold",
  XAUtMock: "tether-gold",
};

export const FAUCET_MINT_AMOUNT = 1_000_000n;

export const INTERVALS = {
  // Registry pairs rarely change — cache aggressively
  REGISTRY_REFRESH_MS: 5 * 60 * 1000,      // 5 min
  // Wrapper metadata (rate, decimals) never changes
  METADATA_REFRESH_MS: 10 * 60 * 1000,     // 10 min
  // Balances need to be somewhat fresh
  BALANCE_REFRESH_MS: 30_000,              // 30 sec
  // Unwrap polling — keep short
  UNWRAP_POLL_MS: 5_000,                   // 5 sec (was 3s — save CUs)
  UNWRAP_POLL_TIMEOUT_MS: 180_000,         // 3 min (was 2 min)
  // Events are expensive — cache them hard
  VOLUME_CACHE_MS: 10 * 60 * 1000,        // 10 min
  // Prices: 2 min is plenty
  PRICE_CACHE_MS: 2 * 60 * 1000,          // 2 min
} as const;

// ── Block ranges ──────────────────────────────────────────────────────────────
// Alchemy's getLogs limit is 2000 blocks per call on free tier.
// We use 1500 to stay safely under.
// For 7-day lookback: ~50,400 blocks — we paginate automatically.
// BUT: 50,400 / 1500 = 33 RPC calls per wrapper × 7 wrappers = 231 calls.
// That blows the Alchemy budget instantly.
//
// FIX: Default to 3 days (~21,600 blocks), page size 2000.
// 21,600 / 2000 = ~11 pages × 7 wrappers = 77 calls — still a lot.
// For transactions page we further reduce to 1 day (~7,200 blocks).

export const BLOCKS_PER_3_DAYS = 21_600n;
export const BLOCKS_PER_1_DAY = 7_200n;
export const ALCHEMY_MAX_BLOCK_RANGE = 2_000n; // Safe for Alchemy free tier

/** @deprecated Use ALCHEMY_MAX_BLOCK_RANGE */
export const INFURA_MAX_BLOCK_RANGE = ALCHEMY_MAX_BLOCK_RANGE;
/** @deprecated Use BLOCKS_PER_3_DAYS */
export const BLOCKS_PER_7_DAYS = BLOCKS_PER_3_DAYS;

export const CONTRACT_ERRORS: Record<string, string> = {
  TokenZeroAddress: "Invalid token address.",
  ConfidentialTokenZeroAddress: "Invalid wrapper address.",
  RevokedConfidentialToken: "This wrapper has been revoked and cannot be used.",
  TransferAmountExceedsBalance: "Insufficient balance.",
  InsufficientAllowance: "Please approve this amount before wrapping.",
  ExcessiveInputAmount: "Amount exceeds the wrapper's maximum input limit.",
  AmountTooSmall: "Amount is too small — minimum 1 underlying token unit.",
  UnsupportedAccount:
    "This account has never interacted with the wrapper. Please wrap first.",
};

export function pendingUnwrapKey(
  chainId: number,
  wrapperAddress: string,
  userAddress: string
): string {
  return `pendingUnwrap:${chainId}:${wrapperAddress.toLowerCase()}:${userAddress.toLowerCase()}`;
}

export function etherscanTx(hash: string, network: Network): string {
  return `${NETWORK_CONFIGS[network].etherscanBaseUrl}/tx/${hash}`;
}

export function etherscanAddress(address: string, network: Network): string {
  return `${NETWORK_CONFIGS[network].etherscanBaseUrl}/address/${address}`;
}

export function truncateAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function parseNetworkParam(param: string | undefined): Network {
  if (param === "mainnet") return "mainnet";
  return "sepolia";
}