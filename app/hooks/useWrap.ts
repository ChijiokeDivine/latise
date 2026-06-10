// hooks/useWrap.ts
// Location: latise/hooks/useWrap.ts
// Manages the complete wrap flow: ERC-20 approve → wrap().
// Implements the WrapState machine from types/index.ts.
//
// Rules enforced here (from RULES.md):
//   W-2: Always check allowance before approving — skip if already approved.
//   W-1: Amount conversion uses computeExpectedWrapAmount() from lib/wrapper.ts.
//   E-2: Wallet rejections silently reset state to "idle" — NOT an error.
//   Rule UX-6: Consumers must disable the submit button while state !== "idle".

"use client";

import { useState, useCallback } from "react";
import { usePublicClient, useWalletClient } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { parseEventLogs } from "viem";
import { ERC20_ABI } from "@/lib/abis/erc20.abi";
import { WRAPPER_ABI } from "@/lib/abis/wrapper.abi";
import { parseContractError, isUserRejection } from "@/lib/errors";
import { computeExpectedWrapAmount } from "@/lib/wrapper";
import type {
  Network,
  EnrichedPair,
  WrapState,
  WrapResult,
} from "@/app/types";

interface UseWrapOptions {
  pair: EnrichedPair;
  network: Network;
  /** Called when the wrap completes successfully */
  onSuccess?: (result: WrapResult) => void;
  /** Called when an error occurs (not wallet rejection) */
  onError?: (message: string) => void;
}

interface UseWrapReturn {
  state: WrapState;
  errorMessage: string | null;
  approveTxHash: `0x${string}` | null;
  wrapTxHash: `0x${string}` | null;
  /** Expected wrapper tokens out — computed from input amount */
  expectedOut: bigint | null;
  execute: (params: {
    underlyingAmount: bigint;
    toAddress: `0x${string}`;
  }) => Promise<void>;
  reset: () => void;
}

export function useWrap({
  pair,
  network,
  onSuccess,
  onError,
}: UseWrapOptions): UseWrapReturn {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const queryClient = useQueryClient();

  const [state, setState] = useState<WrapState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [approveTxHash, setApproveTxHash] = useState<`0x${string}` | null>(null);
  const [wrapTxHash, setWrapTxHash] = useState<`0x${string}` | null>(null);
  const [expectedOut, setExpectedOut] = useState<bigint | null>(null);

  const reset = useCallback(() => {
    setState("idle");
    setErrorMessage(null);
    setApproveTxHash(null);
    setWrapTxHash(null);
    setExpectedOut(null);
  }, []);

  const execute = useCallback(
    async ({
      underlyingAmount,
      toAddress,
    }: {
      underlyingAmount: bigint;
      toAddress: `0x${string}`;
    }) => {
      if (!walletClient || !publicClient) {
        setErrorMessage("Wallet not connected.");
        setState("error");
        return;
      }

      if (state !== "idle") return; // Prevent double-submit (Rule UX-6)

      setErrorMessage(null);

      // ── Compute expected output ─────────────────────────────────────────
      const { wrapperUnits } = computeExpectedWrapAmount(
        underlyingAmount,
        pair.rate
      );
      setExpectedOut(wrapperUnits);

      try {
        // ── Step 1: Check allowance ───────────────────────────────────────
        const [userAddress] = await walletClient.getAddresses();

        const currentAllowance = await publicClient.readContract({
          address: pair.tokenAddress,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [userAddress, pair.wrapperAddress],
        });

        // ── Step 2: Approve if needed ─────────────────────────────────────
        if ((currentAllowance as bigint) < underlyingAmount) {
          setState("approving");

          const approveHash = await walletClient.writeContract({
            address: pair.tokenAddress,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [pair.wrapperAddress, underlyingAmount],
          });

          setApproveTxHash(approveHash);

          // Wait for approve confirmation
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
          setState("approved");
        }

        // ── Step 3: Wrap ──────────────────────────────────────────────────
        setState("wrapping");

        const wrapHash = await walletClient.writeContract({
          address: pair.wrapperAddress,
          abi: WRAPPER_ABI,
          functionName: "wrap",
          args: [toAddress, underlyingAmount],
        });

        setWrapTxHash(wrapHash);

        // Wait for wrap confirmation
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: wrapHash,
        });

        // Parse Wrap event to get the actual rounded amount
        const logs = parseEventLogs({
          abi: WRAPPER_ABI,
          eventName: "Wrap",
          logs: receipt.logs,
        });
        const wrapEvent = logs[0];
        const roundedAmount = wrapEvent?.args?.roundedAmount ?? underlyingAmount;

        setState("done");

        // Invalidate balance queries so the UI refreshes
        queryClient.invalidateQueries({
          queryKey: ["balances", userAddress, pair.tokenAddress, network],
        });

        onSuccess?.({
          approveTxHash: approveTxHash ?? undefined,
          wrapTxHash: wrapHash,
          roundedAmount: roundedAmount as bigint,
        });
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
      queryClient,
      pair,
      network,
      state,
      approveTxHash,
      onSuccess,
      onError,
    ]
  );

  return {
    state,
    errorMessage,
    approveTxHash,
    wrapTxHash,
    expectedOut,
    execute,
    reset,
  };
}