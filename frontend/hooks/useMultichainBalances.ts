"use client";

import { useReadContracts } from "wagmi";
import { USDC, SOURCE_CHAIN_IDS } from "@/constants/addresses";
import { ERC20_ABI } from "@/lib/contracts";


export function useMultichainBalances(userAddress?: `0x${string}`) {
  const contracts = SOURCE_CHAIN_IDS.map((chainId) => ({
    address: USDC[chainId],
    abi: ERC20_ABI,
    functionName: "balanceOf" as const,
    args: [userAddress!] as readonly [`0x${string}`],
    chainId,
  }));

  const { data, isLoading, refetch } = useReadContracts({
    contracts,
    query: { enabled: !!userAddress },
  });

  const balances: Record<number, bigint> = {};
  SOURCE_CHAIN_IDS.forEach((chainId, i) => {
    const result = data?.[i];
    balances[chainId] = result?.status === "success" ? (result.result as bigint) : 0n;
  });

  return { balances, isLoading, refetch };
}
