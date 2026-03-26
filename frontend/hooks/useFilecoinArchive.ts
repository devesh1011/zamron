"use client";

import { useCallback, useEffect, useState } from "react";
import { encodeFunctionData, toHex } from "viem";
import { useAccount, useChainId, useSignMessage } from "wagmi";
import {
  ARCHIVE_REGISTRY_ADDRESS,
  FILECOIN_CALIBRATION_CHAIN_ID,
  FILECOIN_CALIBRATION_RPC_URL,
} from "@/constants/addresses";
import type {
  ArchivedReceiptRecord,
  OperationReceipt,
  RetrievedReceipt,
} from "@/lib/archive-types";
import { operationTypeToNumber } from "@/lib/archive-types";
import { ARCHIVE_REGISTRY_ABI } from "@/lib/contracts";
import { uploadReceiptToFilecoin, downloadReceiptFromFilecoin } from "@/lib/filecoin";
import { decryptReceipt, encryptReceipt, requestArchiveSignature } from "@/lib/receipt-encryption";
import { getSourcePublicClient } from "@/lib/source-chains";

export function useFilecoinArchive() {
  const { address } = useAccount();
  const activeChainId = useChainId();
  const { signMessageAsync } = useSignMessage();
  const [records, setRecords] = useState<ArchivedReceiptRecord[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [archivePhase, setArchivePhase] = useState<string | null>(null);
  const [retrievingId, setRetrievingId] = useState<bigint | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [lastFundingTxHash, setLastFundingTxHash] = useState<`0x${string}` | null>(null);
  const [lastRegistryTxHash, setLastRegistryTxHash] = useState<`0x${string}` | null>(null);
  const [retrievedReceipt, setRetrievedReceipt] = useState<RetrievedReceipt | null>(null);
  const [archiveSignature, setArchiveSignature] = useState<`0x${string}` | null>(null);

  const loadRecords = useCallback(async (forAddress?: `0x${string}`) => {
    const owner = forAddress ?? address;
    if (!owner || ARCHIVE_REGISTRY_ADDRESS === "0x") {
      setRecords([]);
      return;
    }

    setIsLoadingRecords(true);
    setLoadError(null);
    try {
      const publicClient = getSourcePublicClient(FILECOIN_CALIBRATION_CHAIN_ID);
      const response = await publicClient.readContract({
        address: ARCHIVE_REGISTRY_ADDRESS,
        abi: ARCHIVE_REGISTRY_ABI,
        functionName: "getRecordsByOwner",
        args: [owner],
      });

      const result = response as ArchivedReceiptRecord[];
      console.log("[ArchiveRegistry] getRecordsByOwner(", owner, ") =>", result);
      setRecords(result);
    } catch (error: any) {
      console.error("[ArchiveRegistry] loadRecords error:", error);
      setLoadError(error?.message ?? "Failed to load archived receipts.");
    } finally {
      setIsLoadingRecords(false);
    }
  }, [address]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  const switchChainViaProvider = useCallback(async (chainId: number) => {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("MetaMask is required for Filecoin archive actions.");
    }
    const chainHex = `0x${chainId.toString(16)}`;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainHex }],
      });
    } catch (err: any) {
      // 4902 = chain not yet added to MetaMask
      if (err?.code === 4902 && chainId === FILECOIN_CALIBRATION_CHAIN_ID) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: chainHex,
              chainName: "Filecoin Calibration",
              nativeCurrency: { name: "tFIL", symbol: "tFIL", decimals: 18 },
              rpcUrls: [FILECOIN_CALIBRATION_RPC_URL],
              blockExplorerUrls: ["https://calibration.filfox.info/en"],
            },
          ],
        });
      } else {
        throw err;
      }
    }
  }, []);

  const waitForWalletChain = useCallback(async (chainId: number) => {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("MetaMask is required for Filecoin archive actions.");
    }

    const expectedHex = `0x${chainId.toString(16)}`.toLowerCase();
    const deadline = Date.now() + 15_000;

    while (Date.now() < deadline) {
      const currentChainId = (await window.ethereum.request({
        method: "eth_chainId",
      })) as string;

      if (currentChainId.toLowerCase() === expectedHex) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    throw new Error(
      `MetaMask did not switch to chain ${chainId}. Please switch networks and try again.`,
    );
  }, []);

  const ensureArchiveSignature = useCallback(async () => {
    if (archiveSignature) {
      return archiveSignature;
    }

    const signature = await requestArchiveSignature((message) =>
      signMessageAsync({ message }),
    );
    setArchiveSignature(signature);
    return signature;
  }, [archiveSignature, signMessageAsync]);

  const archiveReceipt = useCallback(
    async (receipt: OperationReceipt) => {
      if (!address) {
        throw new Error("Connect MetaMask before archiving receipts.");
      }
      if (ARCHIVE_REGISTRY_ADDRESS === "0x") {
        throw new Error("Archive registry is not configured yet. Deploy on Filecoin Calibration first.");
      }

      setIsArchiving(true);
      setArchivePhase("Switching to Filecoin Calibration...");
      setArchiveError(null);
      setLastFundingTxHash(null);
      setLastRegistryTxHash(null);

      const previousChainId = activeChainId;

      try {
        await switchChainViaProvider(FILECOIN_CALIBRATION_CHAIN_ID);
        await waitForWalletChain(FILECOIN_CALIBRATION_CHAIN_ID);

        // Get the actual account MetaMask is using on Calibration — it may differ from
        // the wagmi address if the user has multiple accounts or MetaMask switched accounts.
        const accounts = (await window.ethereum!.request({ method: "eth_accounts" })) as string[];
        const effectiveAddress = (accounts[0] as `0x${string}`) ?? address;
        console.log("[ArchiveRegistry] wagmi address:", address, "MetaMask active:", effectiveAddress);

        setArchivePhase("Signing encryption key...");
        const signature = await ensureArchiveSignature();
        setArchivePhase("Encrypting receipt...");
        const { payload, receiptHash } = await encryptReceipt(receipt, signature);
        setArchivePhase("Uploading to Filecoin...");
        const upload = await uploadReceiptToFilecoin(effectiveAddress, payload, {
          onFundingTx: (hash) => {
            setLastFundingTxHash(hash);
            setArchivePhase("Funding storage payment... (confirm in MetaMask)");
          },
        });

        setArchivePhase("Writing to Calibration registry...");
        console.log("[ArchiveRegistry] saveRecord args:", {
          operationType: operationTypeToNumber(receipt.operation),
          pieceCid: upload.pieceCid,
          dataSetId: upload.dataSetId.toString(),
          receiptHash,
          from: effectiveAddress,
          contract: ARCHIVE_REGISTRY_ADDRESS,
        });
        const publicClient = getSourcePublicClient(FILECOIN_CALIBRATION_CHAIN_ID);
        const gas = await publicClient.estimateContractGas({
          account: effectiveAddress,
          address: ARCHIVE_REGISTRY_ADDRESS,
          abi: ARCHIVE_REGISTRY_ABI,
          functionName: "saveRecord",
          args: [
            operationTypeToNumber(receipt.operation),
            upload.pieceCid,
            upload.dataSetId,
            receiptHash,
          ],
        });
        console.log("[ArchiveRegistry] estimated gas:", gas.toString());
        const txHash = (await window.ethereum!.request({
          method: "eth_sendTransaction",
          params: [
            {
              from: effectiveAddress,
              to: ARCHIVE_REGISTRY_ADDRESS,
              data: encodeFunctionData({
                abi: ARCHIVE_REGISTRY_ABI,
                functionName: "saveRecord",
                args: [
                  operationTypeToNumber(receipt.operation),
                  upload.pieceCid,
                  upload.dataSetId,
                  receiptHash,
                ],
              }),
              gas: toHex(gas),
            },
          ],
        })) as `0x${string}`;
        console.log("[ArchiveRegistry] saveRecord tx submitted:", txHash);
        const txReceipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
        console.log("[ArchiveRegistry] saveRecord tx confirmed. Status:", txReceipt.status, "Block:", txReceipt.blockNumber.toString());
        if (txReceipt.status === "reverted") {
          throw new Error(`Registry saveRecord transaction reverted (tx: ${txHash}). Check contract args.`);
        }
        setLastRegistryTxHash(txHash);
        setArchivePhase("Waiting for RPC sync...");
        // Give the Calibration RPC node a few seconds to reflect the new state
        await new Promise((resolve) => setTimeout(resolve, 4000));
        setArchivePhase("Done!");
        await loadRecords(effectiveAddress);
      } catch (error: any) {
        setArchiveError(error?.message ?? "Failed to archive receipt.");
        setArchivePhase(null);
        throw error;
      } finally {
        if (previousChainId && previousChainId !== FILECOIN_CALIBRATION_CHAIN_ID) {
          try {
            await switchChainViaProvider(previousChainId);
            await waitForWalletChain(previousChainId);
          } catch {
          }
        }
        setIsArchiving(false);
      }
    },
    [
      activeChainId,
      address,
      ensureArchiveSignature,
      loadRecords,
      switchChainViaProvider,
      waitForWalletChain,
    ],
  );

  const retrieveReceipt = useCallback(
    async (record: ArchivedReceiptRecord) => {
      if (!address) {
        throw new Error("Connect MetaMask before retrieving archived receipts.");
      }

      setRetrievingId(record.id);
      setArchiveError(null);

      try {
        const signature = await ensureArchiveSignature();
        const payload = await downloadReceiptFromFilecoin(address, record.pieceCid, record.dataSetId);
        const receipt = await decryptReceipt(payload, signature);
        setRetrievedReceipt({
          pieceCid: record.pieceCid,
          receipt,
        });
      } catch (error: any) {
        setArchiveError(error?.message ?? "Failed to retrieve archived receipt.");
      } finally {
        setRetrievingId(null);
      }
    },
    [address, ensureArchiveSignature],
  );

  return {
    records,
    isLoadingRecords,
    loadError,
    isArchiving,
    archivePhase,
    retrievingId,
    archiveError,
    lastFundingTxHash,
    lastRegistryTxHash,
    retrievedReceipt,
    archiveAvailable: ARCHIVE_REGISTRY_ADDRESS !== "0x",
    archiveReceipt,
    retrieveReceipt,
    reloadRecords: () => loadRecords(),
  };
}
