// lib/abis/wrapper.abi.ts
// Location: latise/lib/abis/wrapper.abi.ts
// ABI for the ERC-7984 ConfidentialWrapper contract.
// Source: https://docs.zama.org/protocol/protocol-apps/confidential-tokens/confidential-wrapper
//
// CRITICAL RULES (from RULES.md):
//   W-1: rate() is the decimal conversion factor. 1 cToken = rate() underlying units.
//   W-2: wrap() requires a prior ERC-20 approve() for at least `amount`.
//   W-3: Unwrap is a two-step async flow — see lib/wrapper.ts and hooks/useUnwrap.ts.
//   W-5: nonConfidentialTotalSupply() is your TVS source — NOT encrypted.
//   W-6: balanceOf() returns euint64 — NEVER read directly, always use Zama SDK.

export const WRAPPER_ABI = [
  // ─── Read: metadata ────────────────────────────────────────────

  {
    name: "name",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "symbol",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },

  // ─── Read: rate & supply ───────────────────────────────────────

  {
    // Conversion factor: 1 cToken = rate() underlying token units.
    // Example: WETH (18 decimals) wrapper has rate = 10^12 because
    // wrapper decimals max out at 6.
    name: "rate",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    // The underlying ERC-20 balance held by this wrapper contract.
    // NOT encrypted — readable with standard readContract.
    // Use this for TVS calculation: divide by rate() for wrapper units.
    name: "nonConfidentialTotalSupply",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    // Encrypted total supply — euint64 handle.
    // Do NOT try to decode this with viem. Use Zama SDK only.
    name: "confidentialTotalSupply",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bytes32" }], // euint64 handle on-chain
  },

  // ─── Read: balances ────────────────────────────────────────────

  {
    // Returns the encrypted balance for an address — euint64 handle.
    // RULE W-6: NEVER decode this directly. Always use Zama SDK.
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "bytes32" }], // euint64 handle
  },

  // ─── Read: underlying token address ───────────────────────────

  {
    name: "underlying",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },

  // ─── Write: wrap ───────────────────────────────────────────────

  {
    // Wraps `amount` underlying tokens into confidential cTokens.
    // RULE W-2: Caller must have approved this contract for at least `amount`
    // on the underlying ERC-20 before calling wrap().
    // Emits: Wrap(address indexed to, uint256 roundedAmount, euint64 encryptedWrappedAmount)
    name: "wrap",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" }, // in underlying token units
    ],
    outputs: [],
  },

  // ─── Write: unwrap (Step 1 of 2) ──────────────────────────────

  {
    // Step 1 of the two-step unwrap. Submits an encrypted unwrap request.
    // The Zama relayer decrypts asynchronously, then calls finalizeUnwrap().
    // Emits: UnwrapRequested(bytes32 indexed unwrapRequestId, address indexed from, ...)
    name: "unwrap",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "encryptedAmount", type: "bytes32" }, // euint64 handle from SDK
      { name: "inputProof", type: "bytes" },         // proof from SDK
    ],
    outputs: [],
  },

  // ─── Write: finalizeUnwrap (Step 2 of 2) ──────────────────────

  {
    // Step 2 of the two-step unwrap. Called by the Zama relayer (or the user
    // if relayer times out) with the decryption proof.
    // Emits: UnwrapFinalized(address indexed receiver, bytes32 indexed unwrapRequestId, ...)
    name: "finalizeUnwrap",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "unwrapRequestId", type: "bytes32" },
      { name: "clearAmount", type: "uint64" },       // decrypted amount
      { name: "decryptionProof", type: "bytes" },    // proof from Zama KMS
    ],
    outputs: [],
  },

  // ─── Write: confidential transfer ─────────────────────────────

  {
    name: "confidentialTransfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "encryptedAmount", type: "bytes32" },
      { name: "inputProof", type: "bytes" },
    ],
    outputs: [],
  },
  {
    name: "confidentialTransferFrom",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "encryptedAmount", type: "bytes32" },
      { name: "inputProof", type: "bytes" },
    ],
    outputs: [],
  },

  // ─── Events ───────────────────────────────────────────────────

  {
    name: "Wrap",
    type: "event",
    inputs: [
      { name: "to", type: "address", indexed: true },
      // Actual underlying amount wrapped (after rate rounding)
      { name: "roundedAmount", type: "uint256", indexed: false },
      // Encrypted amount credited — euint64 handle, not a number
      { name: "encryptedWrappedAmount", type: "bytes32", indexed: false },
    ],
  },
  {
    name: "UnwrapRequested",
    type: "event",
    inputs: [
      { name: "unwrapRequestId", type: "bytes32", indexed: true },
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: false },
      // Encrypted amount — euint64 handle
      { name: "encryptedAmount", type: "bytes32", indexed: false },
    ],
  },
  {
    name: "UnwrapFinalized",
    type: "event",
    inputs: [
      { name: "receiver", type: "address", indexed: true },
      { name: "unwrapRequestId", type: "bytes32", indexed: true },
      // Encrypted amount — euint64 handle
      { name: "encryptedAmount", type: "bytes32", indexed: false },
      // Plaintext amount returned to user
      { name: "cleartextAmount", type: "uint64", indexed: false },
    ],
  },
  {
    name: "ConfidentialTransfer",
    type: "event",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "encryptedAmount", type: "bytes32", indexed: false },
    ],
  },

  // ─── Errors ───────────────────────────────────────────────────

  { name: "RevokedConfidentialToken", type: "error", inputs: [] },
  { name: "AmountTooSmall", type: "error", inputs: [] },
  { name: "ExcessiveInputAmount", type: "error", inputs: [] },
  { name: "UnsupportedAccount", type: "error", inputs: [] },
  { name: "InvalidUnwrapRequestId", type: "error", inputs: [] },
  { name: "UnwrapAlreadyFinalized", type: "error", inputs: [] },
] as const;