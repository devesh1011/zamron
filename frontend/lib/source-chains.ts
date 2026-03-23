"use client";

import { createPublicClient, http } from "viem";
import {
  arbitrumSepolia,
  baseSepolia,
  filecoinCalibration,
  sepolia,
  optimismSepolia,
  type Chain,
} from "viem/chains";
import {
  CHAIN_NAME,
  FILECOIN_CALIBRATION_RPC_URL,
} from "@/constants/addresses";

const SOURCE_CHAIN_CONFIG = {
  84532: {
    chain: baseSepolia,
    rpcUrl: "https://sepolia.base.org",
  },
  421614: {
    chain: arbitrumSepolia,
    rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
  },
  11155420: {
    chain: optimismSepolia,
    rpcUrl: "https://sepolia.optimism.io",
  },
  11155111: {
    chain: sepolia,
    rpcUrl: "https://1rpc.io/sepolia",
  },
  314159: {
    chain: filecoinCalibration,
    rpcUrl: FILECOIN_CALIBRATION_RPC_URL,
  },
} as const satisfies Record<number, { chain: Chain; rpcUrl: string }>;

const publicClients = {
  84532: createPublicClient({
    chain: SOURCE_CHAIN_CONFIG[84532].chain,
    transport: http(SOURCE_CHAIN_CONFIG[84532].rpcUrl),
  }),
  421614: createPublicClient({
    chain: SOURCE_CHAIN_CONFIG[421614].chain,
    transport: http(SOURCE_CHAIN_CONFIG[421614].rpcUrl),
  }),
  11155420: createPublicClient({
    chain: SOURCE_CHAIN_CONFIG[11155420].chain,
    transport: http(SOURCE_CHAIN_CONFIG[11155420].rpcUrl),
  }),
  11155111: createPublicClient({
    chain: SOURCE_CHAIN_CONFIG[11155111].chain,
    transport: http(SOURCE_CHAIN_CONFIG[11155111].rpcUrl),
  }),
  314159: createPublicClient({
    chain: SOURCE_CHAIN_CONFIG[314159].chain,
    transport: http(SOURCE_CHAIN_CONFIG[314159].rpcUrl),
  }),
};

export function getSourcePublicClient(chainId: number) {
  const client =
    publicClients[chainId as keyof typeof publicClients];

  if (!client) {
    throw new Error(`Unsupported source chain ${chainId}`);
  }

  return client;
}

export function getSourceChainName(chainId: number) {
  return CHAIN_NAME[chainId] ?? `Chain ${chainId}`;
}
