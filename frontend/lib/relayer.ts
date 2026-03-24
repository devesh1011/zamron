"use client";

import type { FhevmInstance } from "@zama-fhe/relayer-sdk/web";
import { getAddress } from "viem";
import { SEPOLIA_RPC_URL } from "@/constants/addresses";

let instancePromise: Promise<FhevmInstance> | null = null;

export async function getRelayerInstance(): Promise<FhevmInstance> {
  if (!instancePromise) {
    instancePromise = (async () => {
      if (typeof window === "undefined") {
        throw new Error("Relayer SDK is only available in the browser");
      }

      const { createInstance, initSDK, SepoliaConfig } = await import(
        "@zama-fhe/relayer-sdk/web"
      );

      await initSDK();

      return createInstance({
        ...SepoliaConfig,
        network: SEPOLIA_RPC_URL,
      });
    })();
  }

  return instancePromise;
}

export async function encryptAmount(
  amount: bigint,
  contractAddress: string,
  userAddress: string
) {
  const instance = await getRelayerInstance();
  const input = instance.createEncryptedInput(
    getAddress(contractAddress),
    getAddress(userAddress),
  );
  input.add64(amount);

  const encrypted = await input.encrypt();
  return {
    handle: encrypted.handles[0],
    proof: encrypted.inputProof,
  };
}

export async function publicDecryptHandle(handle: `0x${string}`) {
  const instance = await getRelayerInstance();
  const result = await instance.publicDecrypt([handle], {
    timeout: 30_000,
  });

  const clearValue =
    result.clearValues[handle] ??
    result.clearValues[handle.toLowerCase() as `0x${string}`] ??
    result.clearValues[handle.toUpperCase() as `0x${string}`];

  if (typeof clearValue !== "bigint") {
    throw new Error("Relayer returned no cleartext amount for the unwrap request.");
  }

  return {
    cleartextAmount: clearValue,
    decryptionProof: result.decryptionProof,
  };
}
