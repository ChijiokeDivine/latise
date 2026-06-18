// hooks/useUnwrap.ts
// Location: latise/hooks/useUnwrap.ts
// Manages the complete two-step async unwrap flow.
// Step 1: unwrap() → emits UnwrapRequested
// Step 2: Poll for UnwrapFinalized (Zama relayer calls finalizeUnwrap automatically)
//
// Rules enforced here (from RULES.md):
//   W-3: Unwrap is async — NOT a single transaction.
//   U-1: Show clear pending state during pending_decrypt phase.
//   U-2: The Zama relayer calls finalizeUnwrap automatically.
//        Only call it manually if relayer times out.
//   U-3: Store pending unwrapRequestId in localStorage to survive page reload.
//   E-2: Wallet rejections silently reset state to "idle".
//
// IMPORTANT: The Zama SDK's useUnshield hook handles encryption + submission.
// This hook wraps that and adds the polling + localStorage persistence layer.

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { usePublicClient, useWalletClient } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { parseEventLogs } from "viem";
import { WRAPPER_ABI } from "../lib/abis/wrapper.abi";
import { parseContractError, isUserRejection } from "../lib/errors";
import {
  pollForUnwrapRequestId,
  pollForUnwrapFinalized,
} from "../lib/events";
import { pendingUnwrapKey, INTERVALS } from "../lib/constants";
import { useFHEBridgeContext } from "../providers/FHEBridgeProvider";
import type {
  Network,
  EnrichedPair,
  UnwrapState,
  UnwrapResult,
  PendingUnwrap,
} from "@/app/types";

interface UseUnwrapOptions {
  pair: EnrichedPair;
  network: Network;
  userAddress: `0x${string}`;
  onSuccess?: (result: UnwrapResult) => void;
  onError?: (message: string) => void;
}

interface UseUnwrapReturn {
  state: UnwrapState;
  errorMessage: string | null;
  unwrapTxHash: `0x${string}` | null;
  finalizedTxHash: `0x${string}` | null;
  unwrapRequestId: `0x${string}` | null;
  /** Elapsed ms since submitting — useful for progress display */
  elapsedMs: number;
  execute: (wrapperAmount: bigint) => Promise<void>;
  reset: () => void;
  /** Re-attaches polling to a pending unwrap from a previous session */
  resumePending: () => void;
}

export function useUnwrap({
  pair,
  network,
  userAddress,
  onSuccess,
  onError,
}: UseUnwrapOptions): UseUnwrapReturn {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const queryClient = useQueryClient();
  const { unshield, isReady } = useFHEBridgeContext();

  const [state, setState] = useState<UnwrapState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [unwrapTxHash, setUnwrapTxHash] = useState<`0x${string}` | null>(null);
  const [finalizedTxHash, setFinalizedTxHash] = useState<`0x${string}` | null>(null);
  const [unwrapRequestId, setUnwrapRequestId] = useState<`0x${string}` | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // ── localStorage key for this pair + user ─────────────────────────────────
  const chainId = network === "sepolia" ? 11155111 : 1;
  const lsKey = pendingUnwrapKey(chainId, pair.wrapperAddress, userAddress);

  // ── Elapsed timer ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (state !== "pending_decrypt") {
      setElapsedMs(0);
      return;
    }

    const timer = setInterval(() => {
      setElapsedMs(Date.now() - startTimeRef.current);
    }, 1000);

    return () => clearInterval(timer);
  }, [state]);

  // ── Polling cleanup on unmount ────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // ── Poll for finalization ─────────────────────────────────────────────────
  const startPolling = useCallback(
    (requestId: `0x${string}`, fromBlock: bigint) => {
      setState("pending_decrypt");
      startTimeRef.current = Date.now();

      // Timeout guard
      const timeoutId = setTimeout(() => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        setState("timeout");
        setErrorMessage(
          "The decryption is taking longer than expected. Your funds are safe — check back in a few minutes."
        );
      }, INTERVALS.UNWRAP_POLL_TIMEOUT_MS);

      pollingRef.current = setInterval(async () => {
        try {
          const result = await pollForUnwrapFinalized(
            pair.wrapperAddress,
            requestId,
            fromBlock,
            network
          );

          if (result) {
            clearInterval(pollingRef.current!);
            clearTimeout(timeoutId);
            pollingRef.current = null;

            setFinalizedTxHash(result.txHash);
            setState("done");

            // Clear localStorage
            try { localStorage.removeItem(lsKey); } catch {}

            // Invalidate balance queries
            queryClient.invalidateQueries({
              queryKey: ["balances", userAddress, pair.tokenAddress, network],
            });

            onSuccess?.({
              unwrapTxHash: unwrapTxHash ?? ("0x" as `0x${string}`),
              unwrapRequestId: requestId,
              finalizedTxHash: result.txHash,
              cleartextAmount: result.cleartextAmount,
            });
          }
        } catch (err) {
          // Log but keep polling — transient RPC errors are common
          console.warn("[useUnwrap] Poll error:", err);
        }
      }, INTERVALS.UNWRAP_POLL_MS);
    },
    [pair, network, userAddress, lsKey, unwrapTxHash, onSuccess, queryClient]
  );

  // ── Resume a pending unwrap from localStorage ─────────────────────────────
  const resumePending = useCallback(() => {
    try {
      const raw = localStorage.getItem(lsKey);
      if (!raw) return;

      const pending: PendingUnwrap = JSON.parse(raw);
      setUnwrapTxHash(pending.unwrapTxHash);
      setUnwrapRequestId(pending.unwrapRequestId);
      startPolling(pending.unwrapRequestId, pending.fromBlock);
    } catch {
      // Corrupt localStorage entry — ignore
    }
  }, [lsKey, startPolling]);

  // ── Main execute function ─────────────────────────────────────────────────
  const execute = useCallback(
    async (wrapperAmount: bigint) => {
      if (!walletClient || !publicClient) {
        setErrorMessage("Wallet not connected.");
        setState("error");
        return;
      }

      if (!isReady) {
        setErrorMessage("FHE Bridge not ready yet. Please try again in a moment.");
        setState("error");
        return;
      }

      if (state !== "idle") return; // Prevent double-submit

      setErrorMessage(null);

      try {
        // ── Step 1: SDK encrypts and submits unwrap tx (via bridge) ─────────
        setState("decrypting");

        let unwrapTxHashFromCallback: `0x${string}` | undefined;

        await unshield({
          tokenAddress: pair.wrapperAddress as `0x${string}`,
          amount: wrapperAmount,
          onUnwrapSubmitted: (txHash) => {
            unwrapTxHashFromCallback = txHash as `0x${string}`;
            setUnwrapTxHash(unwrapTxHashFromCallback);
            setState("submitting");
          },
        });

        if (!unwrapTxHashFromCallback) {
          throw new Error("Failed to get unwrap transaction hash");
        }

        const txHash = unwrapTxHashFromCallback;

        // ── Step 2: Get transaction receipt to get blockNumber ───────────
        const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
        const fromBlock = receipt.blockNumber ?? 0n;

        let requestId: `0x${string}` | null = null;

        // First try parsing directly from receipt logs
        try {
          const logs = parseEventLogs({
            abi: WRAPPER_ABI,
            eventName: "UnwrapRequested",
            logs: await publicClient.getTransactionReceipt({ hash: txHash }).then(r => r.logs),
          });
          if (logs[0]?.args?.unwrapRequestId) {
            requestId = logs[0].args.unwrapRequestId as `0x${string}`;
          }
        } catch {
          // Parsing failed — fall back to getLogs
        }

        // Fallback: query getLogs for the specific tx
        if (!requestId) {
          requestId = await pollForUnwrapRequestId(
            pair.wrapperAddress,
            fromBlock,
            txHash,
            network
          );
        }

        if (!requestId) {
          throw new Error(
            "Could not find UnwrapRequested event. The transaction may still be processing."
          );
        }

        setUnwrapRequestId(requestId);

        // ── Step 3: Persist to localStorage (Rule U-3) ──────────────────
        const pendingData: PendingUnwrap = {
          unwrapRequestId: requestId,
          wrapperAddress: pair.wrapperAddress,
          userAddress,
          chainId,
          unwrapTxHash: txHash,
          submittedAt: Date.now(),
          fromBlock,
        };

        try {
          localStorage.setItem(lsKey, JSON.stringify(pendingData, (_, v) =>
            typeof v === "bigint" ? v.toString() : v
          ));
        } catch {
          // localStorage may be unavailable in some contexts — not fatal
        }

        // ── Step 4: Start polling for UnwrapFinalized ────────────────────
        startPolling(requestId, fromBlock);
      } catch (err) {
        // Rule E-2: Wallet rejections silently reset
        if (isUserRejection(err)) {
          setState("idle");
          setErrorMessage(null);
          return;
        }

        const parsed = parseContractError(err);
        setState("error");
        setErrorMessage(parsed.message);
        onError?.(parsed.message);
      }
    },
    [
      walletClient,
      publicClient,
      isReady,
      state,
      unshield,
      pair,
      network,
      userAddress,
      chainId,
      lsKey,
      startPolling,
      onError,
    ]
  );

  const reset = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setState("idle");
    setErrorMessage(null);
    setUnwrapTxHash(null);
    setFinalizedTxHash(null);
    setUnwrapRequestId(null);
    setElapsedMs(0);
  }, []);

  return {
    state,
    errorMessage,
    unwrapTxHash,
    finalizedTxHash,
    unwrapRequestId,
    elapsedMs,
    execute,
    reset,
    resumePending,
  };
}