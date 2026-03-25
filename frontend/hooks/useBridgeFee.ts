"use client";

import { useEffect, useState } from "react";
import { parseUnits } from "viem";
import { SOURCE_CHAIN_IDS } from "@/constants/addresses";
import { feeAmountFromBps, fetchBurnFeeBps } from "@/lib/cctp";

export function useBridgeFee(amounts: Record<number, string>) {
  const [fees, setFees] = useState<Record<number, bigint>>({});

  useEffect(() => {
    let cancelled = false;

    async function loadFees() {
      const entries = await Promise.all(
        SOURCE_CHAIN_IDS.map(async (chainId) => {
          const rawAmount = amounts[chainId];
          if (!rawAmount || Number.isNaN(Number(rawAmount)) || Number(rawAmount) <= 0) {
            return [chainId, 0n] as const;
          }

          try {
            const amount = parseUnits(rawAmount, 6);
            const feeBps = await fetchBurnFeeBps(chainId);
            return [chainId, feeAmountFromBps(amount, feeBps)] as const;
          } catch {
            return [chainId, 0n] as const;
          }
        }),
      );

      if (!cancelled) {
        setFees(Object.fromEntries(entries));
      }
    }

    void loadFees();

    return () => {
      cancelled = true;
    };
  }, [amounts]);

  return fees;
}
