"use client";

import { useCallback, useState } from "react";
import {
  encodeAbiParameters,
  encodeFunctionData,
  pad,
  toHex,
  type Address,
} from "viem";
import { useAccount, useSwitchChain } from "wagmi";
import {
  CCTP_DOMAIN,
  CCTP_FINALIZER_ADDRESS,
  SEPOLIA_CHAIN_ID,
  SEPOLIA_DOMAIN,
  SOURCE_CHAIN_IDS,
  TOKEN_MESSENGER_V2,
  USDC,
} from "@/constants/addresses";
import {
  CCTP_FINALIZER_ABI,
  ERC20_ABI,
  TOKEN_MESSENGER_V2_ABI,
} from "@/lib/contracts";
import {
  FAST_FINALITY_THRESHOLD,
  STANDARD_FINALITY_THRESHOLD,
  feeAmountFromBps,
  fetchBurnFeeBps,
} from "@/lib/cctp";
import { getSourcePublicClient } from "@/lib/source-chains";

const GAS_BUFFER_BPS = 125n;
const GAS_BUFFER_DENOMINATOR = 100n;
const GAS_LIMIT_BUFFER_BPS = 120n;
const GAS_LIMIT_BUFFER_DENOMINATOR = 100n;
const MIN_PRIORITY_FEE_PER_GAS = 1_000_000n;
const ARBITRUM_BASE_FEE_MULTIPLIER = 5n;
const ATTESTATION_POLL_INTERVAL_MS = 5_000;
const FAST_ATTESTATION_TIMEOUT_MS = 2 * 60_000;
const STANDARD_ATTESTATION_TIMEOUT_MS = 25 * 60_000;

export interface BridgeOp {
  chainId: number;
  amount: bigint;
}

export interface BridgeResult {
  chainId: number;
  amount?: bigint;
  burnTxHash?: `0x${string}`;
  finalizeTxHash?: `0x${string}`;
  nonce?: string;
  status:
    | "pending"
    | "switching"
    | "approving"
    | "burning"
    | "attesting"
    | "finalizing"
    | "wrapped"
    | "error";
  error?: string;
}

type GasOverrides =
  | {
      gasPrice: bigint;
    }
  | {
      maxFeePerGas: bigint;
      maxPriorityFeePerGas: bigint;
    };

function withGasBuffer(value: bigint) {
  return (value * GAS_BUFFER_BPS) / GAS_BUFFER_DENOMINATOR;
}

function withGasLimitBuffer(value: bigint) {
  return (value * GAS_LIMIT_BUFFER_BPS) / GAS_LIMIT_BUFFER_DENOMINATOR;
}

function formatError(error: any) {
  return error?.shortMessage ?? error?.message ?? "Bridge failed";
}

function assertSuccessfulReceipt(
  receipt: { status: string; transactionHash: `0x${string}` },
  label: string,
) {
  if (receipt.status !== "success") {
    throw new Error(`${label} transaction failed onchain: ${receipt.transactionHash}`);
  }
}

async function getGasOverrides(
  publicClient: ReturnType<typeof getSourcePublicClient>,
  chainId: number,
): Promise<GasOverrides | {}> {
  const [fees, latestBlock] = await Promise.all([
    publicClient.estimateFeesPerGas(),
    publicClient.getBlock(),
  ]);

  if (chainId === 421614 && latestBlock.baseFeePerGas) {
    const suggestedPriorityFee =
      fees.maxPriorityFeePerGas && fees.maxPriorityFeePerGas > 0n
        ? fees.maxPriorityFeePerGas
        : MIN_PRIORITY_FEE_PER_GAS;
    const maxPriorityFeePerGas =
      withGasBuffer(suggestedPriorityFee) > MIN_PRIORITY_FEE_PER_GAS
        ? withGasBuffer(suggestedPriorityFee)
        : MIN_PRIORITY_FEE_PER_GAS;

    const candidates = [
      latestBlock.baseFeePerGas * ARBITRUM_BASE_FEE_MULTIPLIER + maxPriorityFeePerGas,
    ];

    if (fees.maxFeePerGas && fees.maxFeePerGas > 0n) {
      candidates.push(withGasBuffer(fees.maxFeePerGas));
    }

    if (fees.gasPrice && fees.gasPrice > 0n) {
      candidates.push(withGasBuffer(fees.gasPrice) + maxPriorityFeePerGas);
    }

    return {
      maxPriorityFeePerGas,
      maxFeePerGas: candidates.reduce((max, value) => (value > max ? value : max), 0n),
    };
  }

  if (fees.maxFeePerGas && fees.maxPriorityFeePerGas) {
    const maxPriorityFeePerGas = withGasBuffer(fees.maxPriorityFeePerGas);
    const minRequiredMaxFeePerGas =
      (latestBlock.baseFeePerGas ?? 0n) * 2n + maxPriorityFeePerGas;
    const suggestedMaxFeePerGas = withGasBuffer(fees.maxFeePerGas);

    return {
      maxPriorityFeePerGas,
      maxFeePerGas:
        suggestedMaxFeePerGas > minRequiredMaxFeePerGas
          ? suggestedMaxFeePerGas
          : minRequiredMaxFeePerGas,
    };
  }

  if (fees.gasPrice) {
    return {
      gasPrice: withGasBuffer(fees.gasPrice),
    };
  }

  return {};
}

async function sendContractTransaction({
  publicClient,
  chainId,
  account,
  contractAddress,
  abi,
  functionName,
  args,
  value = 0n,
}: {
  publicClient: ReturnType<typeof getSourcePublicClient>;
  chainId: number;
  account: Address;
  contractAddress: Address;
  abi: any;
  functionName: string;
  args: readonly unknown[];
  value?: bigint;
}): Promise<`0x${string}`> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("Wallet provider is not available");
  }

  const [gasEstimate, gasOverrides] = await Promise.all([
    publicClient.estimateContractGas({
      account,
      address: contractAddress,
      abi,
      functionName,
      args,
      value,
    }),
    getGasOverrides(publicClient, chainId),
  ]);

  const tx: Record<string, `0x${string}`> = {
    from: account,
    to: contractAddress,
    data: encodeFunctionData({
      abi,
      functionName,
      args,
    }),
    value: toHex(value),
    gas: toHex(withGasLimitBuffer(gasEstimate)),
  };

  if ("gasPrice" in gasOverrides) {
    tx.gasPrice = toHex(gasOverrides.gasPrice);
  } else if (
    "maxFeePerGas" in gasOverrides &&
    "maxPriorityFeePerGas" in gasOverrides
  ) {
    tx.maxFeePerGas = toHex(gasOverrides.maxFeePerGas);
    tx.maxPriorityFeePerGas = toHex(gasOverrides.maxPriorityFeePerGas);
  }

  return window.ethereum.request({
    method: "eth_sendTransaction",
    params: [tx],
  });
}

async function waitForAttestation(
  sourceDomain: number,
  burnTxHash: `0x${string}`,
  minFinalityThreshold: number,
) {
  const endpoint = `https://iris-api-sandbox.circle.com/v2/messages/${sourceDomain}?transactionHash=${burnTxHash}`;
  const timeoutMs =
    minFinalityThreshold >= STANDARD_FINALITY_THRESHOLD
      ? STANDARD_ATTESTATION_TIMEOUT_MS
      : FAST_ATTESTATION_TIMEOUT_MS;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const res = await fetch(endpoint);
    if (res.ok) {
      const data = await res.json();
      const msg = data?.messages?.[0];
      if (msg?.message && msg?.attestation) {
        return {
          message: msg.message as `0x${string}`,
          attestation: msg.attestation as `0x${string}`,
          nonce: msg.eventNonce?.toString() ?? undefined,
        };
      }
    }

    await new Promise((resolve) => setTimeout(resolve, ATTESTATION_POLL_INTERVAL_MS));
  }

  if (minFinalityThreshold >= STANDARD_FINALITY_THRESHOLD) {
    throw new Error(
      "Circle finalized attestation is still pending. Standard transfers on Base/Arbitrum/OP often take about 15-19 minutes; this app now waits up to 25 minutes before timing out.",
    );
  }

  throw new Error(
    "Circle fast attestation is still pending. Please try again in a moment.",
  );
}

function addressToBytes32(address: Address) {
  return pad(address, { size: 32 });
}

export function useBridge(onComplete?: () => Promise<unknown> | unknown) {
  const { address } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const [isBridging, setIsBridging] = useState(false);
  const [results, setResults] = useState<BridgeResult[]>([]);

  const updateResult = useCallback(
    (chainId: number, patch: Partial<BridgeResult>) => {
      setResults((current) =>
        current.map((result) =>
          result.chainId === chainId ? { ...result, ...patch } : result,
        ),
      );
    },
    [],
  );

  const bridge = useCallback(
    async (ops: BridgeOp[]) => {
      if (!address || typeof window === "undefined" || !window.ethereum) {
        return;
      }
      if (CCTP_FINALIZER_ADDRESS === "0x") {
        throw new Error("CCTP finalizer is not configured.");
      }

      const selectedOps = ops.filter(
        (op) =>
          SOURCE_CHAIN_IDS.includes(op.chainId as (typeof SOURCE_CHAIN_IDS)[number]) &&
          op.amount > 0n,
      );

      if (selectedOps.length === 0) {
        return;
      }

      setIsBridging(true);
      setResults(
        selectedOps.map((op) => ({
          chainId: op.chainId,
          amount: op.amount,
          status: "pending",
        })),
      );

      let activeChainId: number | null = null;

      try {
        for (const op of selectedOps) {
          const minFinalityThreshold = FAST_FINALITY_THRESHOLD;
          const chainId = op.chainId;
          activeChainId = chainId;
          const sourcePublicClient = getSourcePublicClient(chainId);
          const tokenMessenger = TOKEN_MESSENGER_V2[chainId];
          const usdcAddress = USDC[chainId];

          updateResult(chainId, { status: "switching", error: undefined });
          await switchChainAsync({ chainId });

          const feeBps = await fetchBurnFeeBps(chainId);
          const maxFee = feeAmountFromBps(op.amount, feeBps);
          const burnAmount = op.amount;
          const requiredAllowance = burnAmount;
          const allowance = (await sourcePublicClient.readContract({
            address: usdcAddress,
            abi: ERC20_ABI,
            functionName: "allowance",
            args: [address, tokenMessenger],
          })) as bigint;

          if (allowance < requiredAllowance) {
            updateResult(chainId, { status: "approving" });
            if (allowance > 0n) {
              const resetApproveTxHash = await sendContractTransaction({
                publicClient: sourcePublicClient,
                chainId,
                account: address,
                contractAddress: usdcAddress,
                abi: ERC20_ABI,
                functionName: "approve",
                args: [tokenMessenger, 0n],
              });

              const resetReceipt = await sourcePublicClient.waitForTransactionReceipt({
                hash: resetApproveTxHash,
              });
              assertSuccessfulReceipt(resetReceipt, "USDC allowance reset");
            }

            const approveTxHash = await sendContractTransaction({
              publicClient: sourcePublicClient,
              chainId,
              account: address,
              contractAddress: usdcAddress,
              abi: ERC20_ABI,
              functionName: "approve",
              args: [tokenMessenger, requiredAllowance],
            });

            const approveReceipt = await sourcePublicClient.waitForTransactionReceipt({
              hash: approveTxHash,
            });
            assertSuccessfulReceipt(approveReceipt, "USDC approval");
          }

          updateResult(chainId, { status: "burning" });
          const burnTxHash = await sendContractTransaction({
            publicClient: sourcePublicClient,
            chainId,
            account: address,
            contractAddress: tokenMessenger,
            abi: TOKEN_MESSENGER_V2_ABI,
            functionName: "depositForBurnWithHook",
            args: [
              burnAmount,
              SEPOLIA_DOMAIN,
              addressToBytes32(CCTP_FINALIZER_ADDRESS),
              usdcAddress,
              addressToBytes32(CCTP_FINALIZER_ADDRESS),
              maxFee,
              minFinalityThreshold,
              encodeAbiParameters([{ type: "address" }], [address]),
            ],
          });

          const burnReceipt = await sourcePublicClient.waitForTransactionReceipt({
            hash: burnTxHash,
          });
          assertSuccessfulReceipt(burnReceipt, "Circle burn");

          updateResult(chainId, {
            status: "attesting",
            burnTxHash,
          });

          const attestation = await waitForAttestation(
            CCTP_DOMAIN[chainId],
            burnTxHash,
            minFinalityThreshold,
          );
          updateResult(chainId, {
            status: "finalizing",
            nonce: attestation.nonce,
          });

          await switchChainAsync({ chainId: SEPOLIA_CHAIN_ID });
          const sepoliaPublicClient = getSourcePublicClient(SEPOLIA_CHAIN_ID);
          const finalizeTxHash = await sendContractTransaction({
            publicClient: sepoliaPublicClient,
            chainId: SEPOLIA_CHAIN_ID,
            account: address,
            contractAddress: CCTP_FINALIZER_ADDRESS,
            abi: CCTP_FINALIZER_ABI,
            functionName: "finalizeAndWrap",
            args: [attestation.message, attestation.attestation],
          });

          const finalizeReceipt = await sepoliaPublicClient.waitForTransactionReceipt({
            hash: finalizeTxHash,
          });
          assertSuccessfulReceipt(finalizeReceipt, "Sepolia finalize and wrap");

          updateResult(chainId, {
            status: "wrapped",
            finalizeTxHash,
          });
        }
      } catch (error: any) {
        if (activeChainId) {
          updateResult(activeChainId, {
            status: "error",
            error: formatError(error),
          });
        }
      } finally {
        try {
          await switchChainAsync({ chainId: SEPOLIA_CHAIN_ID });
        } catch {
        }

        setIsBridging(false);
        await onComplete?.();
      }
    },
    [address, onComplete, switchChainAsync, updateResult],
  );

  return {
    bridge,
    results,
    isBridging,
  };
}
