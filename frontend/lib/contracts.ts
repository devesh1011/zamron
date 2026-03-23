import {
  ARCHIVE_REGISTRY_ADDRESS,
  CUSDC_ADDRESS,
  CUSDC_UNWRAPPER_ADDRESS,
  CCTP_FINALIZER_ADDRESS,
} from "@/constants/addresses";

export const ERC20_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const CUSDC_ABI = [
  {
    inputs: [
      { name: "holder", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "isOperator",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "operator", type: "address" },
      { name: "until", type: "uint48" },
    ],
    name: "setOperator",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "confidentialBalanceOf",
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "underlying",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "rate",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "encryptedAmount", type: "bytes32" },
      { name: "inputProof", type: "bytes" },
    ],
    name: "confidentialTransfer",
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "wrap",
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export const CUSDC_UNWRAPPER_ABI = [
  {
    inputs: [
      { name: "encryptedAmount", type: "bytes32" },
      { name: "inputProof", type: "bytes" },
    ],
    name: "swapConfidentialToERC20",
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "unwrapRequestId", type: "bytes32" },
      { name: "cleartextAmount", type: "uint64" },
      { name: "decryptionProof", type: "bytes" },
    ],
    name: "finalizeSwap",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "user", type: "address" },
      { indexed: true, name: "unwrapRequestId", type: "bytes32" },
    ],
    name: "SwapRequested",
    type: "event",
  },
] as const;

export const TOKEN_MESSENGER_V2_ABI = [
  {
    inputs: [{ name: "amount", type: "uint256" }],
    name: "getMinFeeAmount",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "destinationDomain", type: "uint32" },
      { name: "mintRecipient", type: "bytes32" },
      { name: "burnToken", type: "address" },
      { name: "destinationCaller", type: "bytes32" },
      { name: "maxFee", type: "uint256" },
      { name: "minFinalityThreshold", type: "uint32" },
      { name: "hookData", type: "bytes" },
    ],
    name: "depositForBurnWithHook",
    outputs: [{ name: "nonce", type: "uint64" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "nonce", type: "uint64" },
      { indexed: true, name: "burnToken", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: true, name: "depositor", type: "address" },
      { indexed: false, name: "mintRecipient", type: "bytes32" },
      { indexed: false, name: "destinationDomain", type: "uint32" },
      { indexed: false, name: "destinationTokenMessenger", type: "bytes32" },
      { indexed: false, name: "destinationCaller", type: "bytes32" },
      { indexed: false, name: "maxFee", type: "uint256" },
      { indexed: false, name: "minFinalityThreshold", type: "uint32" },
    ],
    name: "DepositForBurn",
    type: "event",
  },
] as const;

export const CCTP_FINALIZER_ABI = [
  {
    inputs: [
      { name: "message", type: "bytes" },
      { name: "attestation", type: "bytes" },
    ],
    name: "finalizeAndWrap",
    outputs: [
      { name: "user", type: "address" },
      { name: "wrappedAmount", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export const ARCHIVE_REGISTRY_ABI = [
  {
    inputs: [
      { name: "operationType", type: "uint8" },
      { name: "pieceCid", type: "string" },
      { name: "dataSetId", type: "uint256" },
      { name: "receiptHash", type: "bytes32" },
    ],
    name: "saveRecord",
    outputs: [{ name: "id", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "owner", type: "address" }],
    name: "getRecordsByOwner",
    outputs: [
      {
        components: [
          { name: "id", type: "uint256" },
          { name: "owner", type: "address" },
          { name: "operationType", type: "uint8" },
          { name: "pieceCid", type: "string" },
          { name: "dataSetId", type: "uint256" },
          { name: "receiptHash", type: "bytes32" },
          { name: "createdAt", type: "uint256" },
        ],
        name: "records",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "id", type: "uint256" },
      { indexed: true, name: "owner", type: "address" },
      { indexed: true, name: "operationType", type: "uint8" },
      { indexed: false, name: "pieceCid", type: "string" },
      { indexed: false, name: "dataSetId", type: "uint256" },
      { indexed: false, name: "receiptHash", type: "bytes32" },
    ],
    name: "RecordSaved",
    type: "event",
  },
] as const;

export {
  ARCHIVE_REGISTRY_ADDRESS,
  CUSDC_ADDRESS,
  CUSDC_UNWRAPPER_ADDRESS,
  CCTP_FINALIZER_ADDRESS,
};
