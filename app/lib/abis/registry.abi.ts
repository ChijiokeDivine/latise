// lib/abis/registry.abi.ts
// Location: latise/lib/abis/registry.abi.ts
// ABI for the ConfidentialTokenWrappersRegistry contract.
// Source: https://docs.zama.org/protocol/protocol-apps/confidential-tokens/wrapper-registry
//
// Key functions used by this app:
//   getTokenConfidentialTokenPairs()      — fetch all pairs in one call
//   getTokenConfidentialTokenPairsLength()— total pair count
//   getConfidentialTokenAddress(erc20)    — lookup wrapper by underlying
//   getTokenAddress(wrapper)              — lookup underlying by wrapper
//   isConfidentialTokenValid(wrapper)     — check if wrapper is active

export const REGISTRY_ABI = [
  // ─── Read functions ────────────────────────────────────────────

  {
    name: "getTokenConfidentialTokenPairs",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "tokenAddress", type: "address" },
          { name: "confidentialTokenAddress", type: "address" },
          { name: "isValid", type: "bool" },
        ],
      },
    ],
  },

  {
    name: "getTokenConfidentialTokenPair",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "index", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "tokenAddress", type: "address" },
          { name: "confidentialTokenAddress", type: "address" },
          { name: "isValid", type: "bool" },
        ],
      },
    ],
  },

  {
    name: "getTokenConfidentialTokenPairsLength",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },

  {
    name: "getConfidentialTokenAddress",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "token", type: "address" }],
    outputs: [
      { name: "isValid", type: "bool" },
      { name: "confidentialToken", type: "address" },
    ],
  },

  {
    name: "getTokenAddress",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "confidentialToken", type: "address" }],
    outputs: [
      { name: "isValid", type: "bool" },
      { name: "token", type: "address" },
    ],
  },

  {
    name: "isConfidentialTokenValid",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "confidentialToken", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },

  // ─── Events ───────────────────────────────────────────────────

  {
    name: "ConfidentialTokenRegistered",
    type: "event",
    inputs: [
      { name: "token", type: "address", indexed: true },
      { name: "confidentialToken", type: "address", indexed: true },
    ],
  },

  {
    name: "ConfidentialTokenRevoked",
    type: "event",
    inputs: [
      { name: "token", type: "address", indexed: true },
      { name: "confidentialToken", type: "address", indexed: true },
    ],
  },

  // ─── Errors ───────────────────────────────────────────────────

  {
    name: "TokenZeroAddress",
    type: "error",
    inputs: [],
  },
  {
    name: "ConfidentialTokenZeroAddress",
    type: "error",
    inputs: [],
  },
  {
    name: "TokenAlreadyRegistered",
    type: "error",
    inputs: [],
  },
  {
    name: "ConfidentialTokenAlreadyRegistered",
    type: "error",
    inputs: [],
  },
] as const;