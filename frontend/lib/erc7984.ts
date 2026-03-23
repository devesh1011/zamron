"use client";

import {
  CUSDC_ADDRESS,
  SEPOLIA_CHAIN_ID,
  USDC,
} from "@/constants/addresses";
import { CUSDC_ABI } from "@/lib/contracts";
import { getSourcePublicClient } from "@/lib/source-chains";

export async function assertCurrentCusdcWrapper() {
  if (CUSDC_ADDRESS === "0x") {
    throw new Error("cUSDC is not deployed yet");
  }

  const publicClient = getSourcePublicClient(SEPOLIA_CHAIN_ID);

  try {
    const underlying = (await publicClient.readContract({
      address: CUSDC_ADDRESS,
      abi: CUSDC_ABI,
      functionName: "underlying",
    })) as `0x${string}`;

    if (underlying.toLowerCase() !== USDC[SEPOLIA_CHAIN_ID].toLowerCase()) {
      throw new Error("Unexpected underlying token");
    }
  } catch {
    throw new Error(
      "Legacy cUSDC deployment detected. Redeploy Sepolia and sync frontend env before using confidential actions.",
    );
  }
}
