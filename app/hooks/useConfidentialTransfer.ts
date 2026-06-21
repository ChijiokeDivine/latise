"use client";

import { useState, useCallback } from "react";
import { useFHEBridgeContext } from "../providers/FHEBridgeProvider";
import { parseContractError, isUserRejection } from "../lib/errors";
import { etherscanTx } from "../lib/constants";
import type { Network, EnrichedPair } from "../types";

export type TransferState =
  | "idle"
  | "encrypting"
  | "submitting"
  | "done"
  | "error";

interface UseConfidentialTransferOptions {
  pair: EnrichedPair;
  network: Network;
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

interface UseConfidentialTransferReturn {
  state: TransferState;
  errorMessage: string | null;
  transferTxHash: `0x${string}` | null;
  execute: (params: {
    to: `0x${string}`;
    amount: bigint;
  }) => Promise<void>;
  reset: () => void;
}

export function useConfidentialTransfer({
  pair,
  network,
  onSuccess,
  onError,
}: UseConfidentialTransferOptions): UseConfidentialTransferReturn {
  const { confidentialTransfer, isReady } = useFHEBridgeContext();

  const [state, setState] = useState<TransferState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [transferTxHash, setTransferTxHash] = useState<`0x${string}` | null>(
    null
  );

  const reset = useCallback(() => {
    setState("idle");
    setErrorMessage(null);
    setTransferTxHash(null);
  }, []);

  const execute = useCallback(
    async ({ to, amount }: { to: `0x${string}`; amount: bigint }) => {
      if (!isReady) {
        setErrorMessage("FHE Bridge not ready yet. Please try again in a moment.");
        setState("error");
        return;
      }

      if (state !== "idle") return;

      setErrorMessage(null);

      try {
        setState("encrypting");

        await confidentialTransfer({
          tokenAddress: pair.wrapperAddress as `0x${string}`,
          to,
          amount,
          onTransferSubmitted: (txHash) => {
            setTransferTxHash(txHash);
            setState("submitting");
          },
        });

        setState("done");
        onSuccess?.();
      } catch (error) {
        if (isUserRejection(error)) {
          setState("idle");
          setErrorMessage(null);
          return;
        }

        const parsed = parseContractError(error);
        setState("error");
        setErrorMessage(parsed.message);
        onError?.(parsed.message);
      }
    },
    [confidentialTransfer, isReady, state, pair, onSuccess, onError]
  );

  return {
    state,
    errorMessage,
    transferTxHash,
    execute,
    reset,
  };
}
