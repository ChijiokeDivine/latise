// lib/errors.ts
// Location: latise/lib/errors.ts
// Converts raw contract errors, wallet rejections, and RPC errors into
// user-friendly messages.
//
// Rules enforced here (from RULES.md):
//   E-2: User wallet rejections (code 4001) are NOT errors — return isUserRejection: true.
//   E-3: Contract revert reasons are mapped to human-readable strings.

import { CONTRACT_ERRORS } from "@/lib/constants";
import type { ParsedContractError } from "@/types";

// ─── User rejection detection ─────────────────────────────────────────────────

const USER_REJECTION_SIGNATURES = [
  "user rejected",
  "user denied",
  "rejected the request",
  "cancelled",
  "action_rejected",
];

export function isUserRejection(err: unknown): boolean {
  if (!err) return false;

  const error = err as Record<string, unknown>;

  // EIP-1193 rejection code
  if (error.code === 4001) return true;
  if (error.code === "ACTION_REJECTED") return true;

  const message = String(error.message ?? "").toLowerCase();
  return USER_REJECTION_SIGNATURES.some((sig) => message.includes(sig));
}

// ─── Contract error parsing ───────────────────────────────────────────────────

/**
 * Extracts a custom error name from a viem/ethers revert error.
 * Returns null if no known custom error is found.
 */
function extractCustomErrorName(err: unknown): string | null {
  const error = err as Record<string, unknown>;

  // viem ContractFunctionRevertedError has `data.errorName`
  if (error.data && typeof error.data === "object") {
    const data = error.data as Record<string, unknown>;
    if (typeof data.errorName === "string") return data.errorName;
  }

  // Some viem errors have the error name in `cause.data.errorName`
  if (error.cause && typeof error.cause === "object") {
    const cause = error.cause as Record<string, unknown>;
    if (cause.data && typeof cause.data === "object") {
      const causeData = cause.data as Record<string, unknown>;
      if (typeof causeData.errorName === "string") return causeData.errorName;
    }
  }

  // Fallback: look for the error name in the message string
  const message = String(error.message ?? "");
  for (const errorName of Object.keys(CONTRACT_ERRORS)) {
    if (message.includes(errorName)) return errorName;
  }

  return null;
}

// ─── Main parse function ──────────────────────────────────────────────────────

/**
 * Parses any caught error from a contract interaction into a structured format.
 *
 * Usage:
 *   } catch (err) {
 *     const parsed = parseContractError(err);
 *     if (parsed.isUserRejection) { setState("idle"); return; }
 *     setState("error");
 *     setErrorMessage(parsed.message);
 *   }
 */
export function parseContractError(err: unknown): ParsedContractError {
  // User rejection — not a real error
  if (isUserRejection(err)) {
    return {
      code: "USER_REJECTED",
      message: "Transaction cancelled.",
      isUserRejection: true,
    };
  }

  // Known custom contract error
  const customErrorName = extractCustomErrorName(err);
  if (customErrorName && CONTRACT_ERRORS[customErrorName]) {
    return {
      code: customErrorName,
      message: CONTRACT_ERRORS[customErrorName],
      isUserRejection: false,
    };
  }

  // Insufficient funds
  const message = String((err as Record<string, unknown>).message ?? "");
  if (
    message.toLowerCase().includes("insufficient funds") ||
    message.toLowerCase().includes("insufficient balance")
  ) {
    return {
      code: "INSUFFICIENT_FUNDS",
      message: "Insufficient ETH balance to pay gas fees.",
      isUserRejection: false,
    };
  }

  // RPC / network errors
  if (
    message.toLowerCase().includes("network") ||
    message.toLowerCase().includes("rpc") ||
    message.toLowerCase().includes("fetch") ||
    message.toLowerCase().includes("timeout")
  ) {
    return {
      code: "NETWORK_ERROR",
      message:
        "Network error — please check your connection and try again.",
      isUserRejection: false,
    };
  }

  // Rate limit
  if (
    message.toLowerCase().includes("rate limit") ||
    message.toLowerCase().includes("429")
  ) {
    return {
      code: "RATE_LIMIT",
      message: "RPC rate limit hit — please wait a moment and try again.",
      isUserRejection: false,
    };
  }

  // Fallback
  return {
    code: "UNKNOWN",
    message: message || "An unexpected error occurred. Please try again.",
    isUserRejection: false,
  };
}