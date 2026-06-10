// lib/format.ts
// Location: latise/lib/format.ts
// Utility functions for formatting numbers, token amounts, addresses, and dates
// for display in the UI. All functions are pure — no side effects.

/**
 * Converts a BigInt token amount to a human-readable string.
 * e.g. formatTokenUnits(1_500_000n, 6) => "1.500000"
 *      formatTokenUnits(1_500_000_000_000_000_000n, 18) => "1.500000000000000000"
 *
 * @param amount - raw amount in smallest token units
 * @param decimals - number of decimal places for this token
 * @param displayDecimals - how many decimal places to show (default: all)
 */
export function formatTokenUnits(
  amount: bigint,
  decimals: number,
  displayDecimals?: number
): string {
  if (decimals === 0) return amount.toString();

  const divisor = 10n ** BigInt(decimals);
  const intPart = amount / divisor;
  const fracPart = amount % divisor;

  // Pad fractional part with leading zeros
  const fracStr = fracPart.toString().padStart(decimals, "0");
  const truncated =
    displayDecimals !== undefined
      ? fracStr.slice(0, displayDecimals)
      : fracStr;

  // Strip trailing zeros unless displayDecimals is specified
  const cleaned =
    displayDecimals !== undefined ? truncated : truncated.replace(/0+$/, "");

  if (!cleaned) return intPart.toLocaleString();

  return `${intPart.toLocaleString()}.${cleaned}`;
}

/**
 * Formats a token amount for compact display (e.g. "1.23M", "456.78K").
 * Used in TVS metric cards.
 */
export function formatCompact(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(2)}K`;
  }
  return value.toFixed(2);
}

/**
 * Formats a USD value with $ prefix and two decimal places.
 * Returns "N/A" if value is null (unknown price).
 */
export function formatUSD(value: number | null): string {
  if (value === null) return "N/A";
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(2)}K`;
  }
  return `$${value.toFixed(2)}`;
}

/**
 * Truncates an Ethereum address for display: 0x1234...5678
 */
export function truncateAddress(address: string, chars = 4): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 2 + chars)}...${address.slice(-chars)}`;
}

/**
 * Converts a block number to an approximate human-readable age.
 * e.g. "~2 hours ago"
 */
export function blockAgeLabel(
  blockNumber: bigint,
  latestBlock: bigint,
  blockTimeSeconds: number
): string {
  const blockDiff = Number(latestBlock - blockNumber);
  const seconds = blockDiff * blockTimeSeconds;

  if (seconds < 60) return "< 1 min ago";
  if (seconds < 3600) return `~${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `~${Math.floor(seconds / 3600)} hr ago`;
  return `~${Math.floor(seconds / 86400)} days ago`;
}

/**
 * Formats a unix timestamp (ms) as a short date string.
 * e.g. 1718000000000 => "Jun 10, 2026"
 */
export function formatDate(timestampMs: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestampMs));
}

/**
 * Parses a human-readable float string into BigInt token units.
 * e.g. parseTokenInput("1.5", 6) => 1_500_000n
 * Truncates — does NOT round.
 *
 * @param value - user input string (e.g. "1.5", "100", ".25")
 * @param decimals - token decimals
 */
export function parseTokenInput(value: string, decimals: number): bigint {
  if (!value || value.trim() === "" || value === ".") return 0n;

  // Remove commas (user may type "1,000")
  const clean = value.replace(/,/g, "").trim();

  const [intPart = "0", fracPart = ""] = clean.split(".");
  const truncatedFrac = fracPart.slice(0, decimals).padEnd(decimals, "0");
  const combined = `${intPart === "" ? "0" : intPart}${truncatedFrac}`;

  try {
    return BigInt(combined.replace(/^0+(?=\d)/, "") || "0");
  } catch {
    return 0n;
  }
}

/**
 * Validates a token amount input string.
 * Returns an error message or null if valid.
 */
export function validateTokenInput(
  value: string,
  decimals: number,
  maxAmount: bigint
): string | null {
  if (!value || value.trim() === "") return "Amount is required.";

  const amount = parseTokenInput(value, decimals);

  if (amount === 0n) return "Amount must be greater than zero.";
  if (amount > maxAmount) return "Amount exceeds your balance.";

  return null;
}