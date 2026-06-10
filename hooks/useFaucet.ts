// hooks/useFaucet.ts
// Location: latise/hooks/useFaucet.ts
// Handles minting mock ERC-20 tokens via the public mint() function.
// Sepolia only — the mock contracts have a publicly callable mint().
//
// Rules enforced (from RULES.md):
//   Faucet Rule 3: Call mint() on the UNDERLYING ERC-20, not the wrapper.
//   Faucet Rule 4: Mint amount = FAUCET_MINT_AMOUNT × 10^decimals.
//   E-2: Wallet rejections silently reset state.
//   Each token has its own independent state (Rule per-token state).

"use client";

import { useState, useCallback } from "react";
import { usePublicClient, useWalletClient } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { ERC20_ABI } from "@/lib/abis/erc20.abi";
import { FAUCET_MINT_AMOUNT } from "@/lib/constants";
import { parseContractError, isUserRejection } from "@/lib/errors";
import type { FaucetToken, FaucetState } from "@/types";

interface UseFaucetReturn {
  state: FaucetState;
  errorMessage: string | null;
  txHash: `0x${string}` | null;
  execute: (token: FaucetToken) => Promise<void>;
  reset: () => void;
}

/**
 * Returns a faucet hook instance for a single token.
 * Each token in the faucet grid should have its own instance.
 *
 * Usage:
 *   const faucet = useFaucet();
 *   <button onClick={() => faucet.execute(token)} disabled={faucet.state !== "idle"}>
 *     Mint
 *   </button>
 */
export function useFaucet(): UseFaucetReturn {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const queryClient = useQueryClient();

  const [state, setState] = useState<FaucetState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);

  const reset = useCallback(() => {
    setState("idle");
    setErrorMessage(null);
    setTxHash(null);
  }, []);

  const execute = useCallback(
    async (token: FaucetToken) => {
      if (!walletClient || !publicClient) {
        setErrorMessage("Wallet not connected.");
        setState("error");
        return;
      }

      if (state !== "idle") return;

      setErrorMessage(null);
      setState("minting");

      try {
        const [userAddress] = await walletClient.getAddresses();

        // Mint amount in smallest units: 1_000_000 × 10^decimals
        const mintAmount =
          FAUCET_MINT_AMOUNT * 10n ** BigInt(token.underlyingDecimals);

        const hash = await walletClient.writeContract({
          address: token.underlyingAddress,
          abi: ERC20_ABI,
          functionName: "mint",
          args: [userAddress, mintAmount],
        });

        setTxHash(hash);

        await publicClient.waitForTransactionReceipt({ hash });

        setState("done");

        // Invalidate any cached balance queries for this token
        queryClient.invalidateQueries({
          queryKey: ["balances", "underlying", userAddress],
        });
      } catch (err) {
        if (isUserRejection(err)) {
          setState("idle");
          return;
        }

        const parsed = parseContractError(err);
        setState("error");
        setErrorMessage(parsed.message);
      }
    },
    [walletClient, publicClient, queryClient, state]
  );

  return { state, errorMessage, txHash, execute, reset };
}