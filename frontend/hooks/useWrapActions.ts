"use client";

import { useCallback, useState } from "react";
import {
  BaseError,
  ContractFunctionRevertedError,
  decodeEventLog,
} from "viem";
import { useAccount, useWriteContract } from "wagmi";
import {
  CUSDC_ADDRESS,
  CUSDC_UNWRAPPER_ADDRESS,
  SEPOLIA_CHAIN_ID,
  USDC,
} from "@/constants/addresses";
import {
  CUSDC_ABI,
  CUSDC_UNWRAPPER_ABI,
  ERC20_ABI,
} from "@/lib/contracts";
import { assertCurrentCusdcWrapper } from "@/lib/erc7984";
import { encryptAmount, publicDecryptHandle } from "@/lib/relayer";
import { getSourcePublicClient } from "@/lib/source-chains";

const GAS_LIMIT_BUFFER_BPS = 120n;
const GAS_LIMIT_BUFFER_DENOMINATOR = 100n;
const SEPOLIA_SAFE_GAS_CAP = 15_000_000n;
const UNWRAP_FALLBACK_GAS = 8_000_000n;
const FINALIZE_FALLBACK_GAS = 4_000_000n;

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

async function estimateBoundedGas(
  account: `0x${string}`,
  contractAddress: `0x${string}`,
  abi: typeof CUSDC_ABI | typeof CUSDC_UNWRAPPER_ABI,
  functionName: "wrap" | "swapConfidentialToERC20" | "finalizeSwap",
  args:
    | readonly [`0x${string}`, bigint]
    | readonly [`0x${string}`, `0x${string}`]
    | readonly [`0x${string}`, bigint, `0x${string}`],
) {
  const publicClient = getSourcePublicClient(SEPOLIA_CHAIN_ID);
  const gasEstimate = await publicClient.estimateContractGas({
    account,
    address: contractAddress,
    abi,
    functionName,
    args,
  });

  const buffered = withGasLimitBuffer(gasEstimate);
  return buffered > SEPOLIA_SAFE_GAS_CAP ? SEPOLIA_SAFE_GAS_CAP : buffered;
}

async function estimateSwapGas(
  account: `0x${string}`,
  args: readonly [`0x${string}`, `0x${string}`],
) {
  const publicClient = getSourcePublicClient(SEPOLIA_CHAIN_ID);

  try {
    const gasEstimate = await publicClient.estimateContractGas({
      account,
      address: CUSDC_UNWRAPPER_ADDRESS,
      abi: CUSDC_UNWRAPPER_ABI,
      functionName: "swapConfidentialToERC20",
      args,
    });

    const buffered = withGasLimitBuffer(gasEstimate);
    return buffered > SEPOLIA_SAFE_GAS_CAP ? SEPOLIA_SAFE_GAS_CAP : buffered;
  } catch {
    return UNWRAP_FALLBACK_GAS;
  }
}

async function estimateFinalizeGas(
  account: `0x${string}`,
  args: readonly [`0x${string}`, bigint, `0x${string}`],
) {
  const publicClient = getSourcePublicClient(SEPOLIA_CHAIN_ID);

  try {
    const gasEstimate = await publicClient.estimateContractGas({
      account,
      address: CUSDC_UNWRAPPER_ADDRESS,
      abi: CUSDC_UNWRAPPER_ABI,
      functionName: "finalizeSwap",
      args,
    });

    const buffered = withGasLimitBuffer(gasEstimate);
    return buffered > SEPOLIA_SAFE_GAS_CAP ? SEPOLIA_SAFE_GAS_CAP : buffered;
  } catch {
    return FINALIZE_FALLBACK_GAS;
  }
}

export function useWrapActions() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [isWrapping, setIsWrapping] = useState(false);
  const [isUnwrapping, setIsUnwrapping] = useState(false);
  const [isFinalizingUnwrap, setIsFinalizingUnwrap] = useState(false);
  const [wrapTxHash, setWrapTxHash] = useState<`0x${string}` | null>(null);
  const [unwrapTxHash, setUnwrapTxHash] = useState<`0x${string}` | null>(null);
  const [finalizeTxHash, setFinalizeTxHash] = useState<`0x${string}` | null>(null);
  const [pendingUnwrapRequestId, setPendingUnwrapRequestId] = useState<`0x${string}` | null>(null);
  const [lastFinalizedUnwrapRequestId, setLastFinalizedUnwrapRequestId] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wrap = useCallback(
    async (amount: bigint) => {
      if (!address || amount <= 0n) return;
      setIsWrapping(true);
      setError(null);
      setWrapTxHash(null);

      try {
        await assertCurrentCusdcWrapper();

        const publicClient = getSourcePublicClient(SEPOLIA_CHAIN_ID);
        const usdcAddress = USDC[SEPOLIA_CHAIN_ID];
        const allowance = (await publicClient.readContract({
          address: usdcAddress,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [address, CUSDC_ADDRESS],
        })) as bigint;

        if (allowance < amount) {
          if (allowance > 0n) {
            const resetApproveHash = await writeContractAsync({
              address: usdcAddress,
              abi: ERC20_ABI,
              functionName: "approve",
              args: [CUSDC_ADDRESS, 0n],
              chainId: SEPOLIA_CHAIN_ID,
            });

            const resetReceipt = await publicClient.waitForTransactionReceipt({
              hash: resetApproveHash,
            });

            if (resetReceipt.status !== "success") {
              throw new Error("USDC approval reset failed");
            }
          }

          const approveHash = await writeContractAsync({
            address: usdcAddress,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [CUSDC_ADDRESS, amount],
            chainId: SEPOLIA_CHAIN_ID,
          });

          const approveReceipt = await publicClient.waitForTransactionReceipt({
            hash: approveHash,
          });

          if (approveReceipt.status !== "success") {
            throw new Error("USDC approval failed");
          }
        }

        await publicClient.simulateContract({
          account: address,
          address: CUSDC_ADDRESS,
          abi: CUSDC_ABI,
          functionName: "wrap",
          args: [address, amount],
        });

        const gas = await estimateBoundedGas(
          address,
          CUSDC_ADDRESS,
          CUSDC_ABI,
          "wrap",
          [address, amount],
        );
        const hash = await writeContractAsync({
          address: CUSDC_ADDRESS,
          abi: CUSDC_ABI,
          functionName: "wrap",
          args: [address, amount],
          chainId: SEPOLIA_CHAIN_ID,
          gas,
        });

        setWrapTxHash(hash);
      } catch (err) {
        setError(formatContractError(err, "Wrap failed"));
      } finally {
        setIsWrapping(false);
      }
    },
    [address, writeContractAsync],
  );

  const unwrap = useCallback(
    async (amount: bigint) => {
      if (!address || amount <= 0n) return;
      setIsUnwrapping(true);
      setError(null);
      setUnwrapTxHash(null);
      setFinalizeTxHash(null);

      try {
        await assertCurrentCusdcWrapper();
        if (CUSDC_UNWRAPPER_ADDRESS === "0x") {
          throw new Error("cUSDC unwrapper is not deployed yet");
        }

        const publicClient = getSourcePublicClient(SEPOLIA_CHAIN_ID);
        const isOperator = (await publicClient.readContract({
          address: CUSDC_ADDRESS,
          abi: CUSDC_ABI,
          functionName: "isOperator",
          args: [address, CUSDC_UNWRAPPER_ADDRESS],
        })) as boolean;

        if (!isOperator) {
          const operatorUntil = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
          const operatorHash = await writeContractAsync({
            address: CUSDC_ADDRESS,
            abi: CUSDC_ABI,
            functionName: "setOperator",
            args: [CUSDC_UNWRAPPER_ADDRESS, operatorUntil],
            chainId: SEPOLIA_CHAIN_ID,
          });

          const operatorReceipt = await publicClient.waitForTransactionReceipt({
            hash: operatorHash,
          });

          if (operatorReceipt.status !== "success") {
            throw new Error("cUSDC operator approval failed");
          }
        }

        const { handle, proof } = await encryptAmount(
          amount,
          CUSDC_UNWRAPPER_ADDRESS,
          address,
        );
        const unwrapArgs = [toHex(handle), toHex(proof)] as const;
        const gas = await estimateSwapGas(
          address,
          unwrapArgs,
        );
        const hash = await writeContractAsync({
          address: CUSDC_UNWRAPPER_ADDRESS,
          abi: CUSDC_UNWRAPPER_ABI,
          functionName: "swapConfidentialToERC20",
          args: unwrapArgs,
          chainId: SEPOLIA_CHAIN_ID,
          gas,
        });

        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
        });

        if (receipt.status !== "success") {
          throw new Error("Unwrap request transaction failed");
        }

        let requestId: `0x${string}` | null = null;
        for (const log of receipt.logs) {
          try {
            const parsed = decodeEventLog({
              abi: CUSDC_UNWRAPPER_ABI,
              data: log.data,
              topics: log.topics,
            });

            if (parsed.eventName === "SwapRequested") {
              requestId = parsed.args.unwrapRequestId as `0x${string}`;
              break;
            }
          } catch {
            // ignore unrelated logs
          }
        }

        if (!requestId) {
          throw new Error("Unwrap request ID was not emitted by the swap helper.");
        }

        setUnwrapTxHash(hash);
        setPendingUnwrapRequestId(requestId);
      } catch (err) {
        setError(formatContractError(err, "Unwrap failed"));
      } finally {
        setIsUnwrapping(false);
      }
    },
    [address, writeContractAsync],
  );

  const finalizeUnwrap = useCallback(async () => {
    if (!address || !pendingUnwrapRequestId) return;
    setIsFinalizingUnwrap(true);
    setError(null);

    try {
      await assertCurrentCusdcWrapper();

      const { cleartextAmount, decryptionProof } = await publicDecryptHandle(
        pendingUnwrapRequestId,
      );

      const finalizeArgs = [
        pendingUnwrapRequestId,
        cleartextAmount,
        decryptionProof,
      ] as const;

      const gas = await estimateFinalizeGas(address, finalizeArgs);
      const hash = await writeContractAsync({
        address: CUSDC_UNWRAPPER_ADDRESS,
        abi: CUSDC_UNWRAPPER_ABI,
        functionName: "finalizeSwap",
        args: finalizeArgs,
        chainId: SEPOLIA_CHAIN_ID,
        gas,
      });

      const publicClient = getSourcePublicClient(SEPOLIA_CHAIN_ID);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status !== "success") {
        throw new Error("Finalize unwrap transaction failed");
      }

      setFinalizeTxHash(hash);
      setLastFinalizedUnwrapRequestId(pendingUnwrapRequestId);
      setPendingUnwrapRequestId(null);
    } catch (err) {
      setError(formatContractError(err, "Finalize unwrap failed"));
    } finally {
      setIsFinalizingUnwrap(false);
    }
  }, [address, pendingUnwrapRequestId, writeContractAsync]);

  return {
    wrap,
    unwrap,
    finalizeUnwrap,
    isWrapping,
    isUnwrapping,
    isFinalizingUnwrap,
    wrapTxHash,
    unwrapTxHash,
    finalizeTxHash,
    pendingUnwrapRequestId,
    lastFinalizedUnwrapRequestId,
    error,
  };
}
