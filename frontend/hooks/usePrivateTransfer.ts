"use client";

import { useState, useCallback } from "react";
import { BaseError, ContractFunctionRevertedError } from "viem";
import { useWriteContract, useAccount } from "wagmi";
import { CUSDC_ADDRESS, SEPOLIA_CHAIN_ID } from "@/constants/addresses";
import { CUSDC_ABI } from "@/lib/contracts";
import { assertCurrentCusdcWrapper } from "@/lib/erc7984";
import { encryptAmount } from "@/lib/relayer";
import { getSourcePublicClient } from "@/lib/source-chains";

const GAS_LIMIT_BUFFER_BPS = 120n;
const GAS_LIMIT_BUFFER_DENOMINATOR = 100n;
const SEPOLIA_SAFE_GAS_CAP = 15_000_000n;
const PRIVATE_TRANSFER_FALLBACK_GAS = 8_000_000n;

function toHex(buf: Uint8Array): `0x${string}` {
  return `0x${Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")}`;
}

function withGasLimitBuffer(value: bigint) {
  return (value * GAS_LIMIT_BUFFER_BPS) / GAS_LIMIT_BUFFER_DENOMINATOR;
}

function formatContractError(error: unknown, fallback: string) {
  if (error instanceof BaseError) {
    const revertError = error.walk(
      (err) => err instanceof ContractFunctionRevertedError,
    );

    if (revertError instanceof ContractFunctionRevertedError) {
      if (revertError.reason) {
        return revertError.reason;
      }
      if (revertError.signature) {
        return `Contract reverted with signature ${revertError.signature}`;
      }
    }

    return error.shortMessage || fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

async function estimateTransferGas(
  account: `0x${string}`,
  args: readonly [`0x${string}`, `0x${string}`, `0x${string}`],
) {
  const publicClient = getSourcePublicClient(SEPOLIA_CHAIN_ID);
  try {
    const gasEstimate = await publicClient.estimateContractGas({
      account,
      address: CUSDC_ADDRESS,
      abi: CUSDC_ABI,
      functionName: "confidentialTransfer",
      args,
    });

    const buffered = withGasLimitBuffer(gasEstimate);
    return buffered > SEPOLIA_SAFE_GAS_CAP ? SEPOLIA_SAFE_GAS_CAP : buffered;
  } catch {
    return PRIVATE_TRANSFER_FALLBACK_GAS;
  }
}

export function usePrivateTransfer() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [isTransferring, setIsTransferring] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);

  const transfer = useCallback(
    async (to: `0x${string}`, amount: bigint) => {
      if (!address) return;
      setIsTransferring(true);
      setError(null);
      setTxHash(null);

      try {
        await assertCurrentCusdcWrapper();

        const { handle, proof } = await encryptAmount(
          amount,
          CUSDC_ADDRESS,
          address
        );
        const publicClient = getSourcePublicClient(SEPOLIA_CHAIN_ID);
        const transferArgs = [to, toHex(handle), toHex(proof)] as const;
        const gas = await estimateTransferGas(address, transferArgs);

        const hash = await writeContractAsync({
          address: CUSDC_ADDRESS,
          abi: CUSDC_ABI,
          functionName: "confidentialTransfer",
          args: transferArgs,
          chainId: SEPOLIA_CHAIN_ID,
          gas,
        });

        setTxHash(hash);
      } catch (err) {
        setError(formatContractError(err, "Transfer failed"));
      } finally {
        setIsTransferring(false);
      }
    },
    [address, writeContractAsync]
  );

  return { transfer, isTransferring, txHash, error };
}
