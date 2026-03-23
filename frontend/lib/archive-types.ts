"use client";

export type ArchiveOperation = "bridge" | "send" | "unwrap";

export interface ReceiptBase {
  version: 1;
  operation: ArchiveOperation;
  owner: `0x${string}`;
  createdAt: number;
  appVersion: string;
}

export interface BridgeReceipt extends ReceiptBase {
  operation: "bridge";
  sourceChainId: number;
  burnTxHash: `0x${string}`;
  finalizeTxHash?: `0x${string}`;
  nonce?: string;
  amount: string;
  status: "wrapped";
}

export interface PrivateSendReceipt extends ReceiptBase {
  operation: "send";
  sender: `0x${string}`;
  recipient: `0x${string}`;
  txHash: `0x${string}`;
  amount: string;
  status: "sent";
}

export interface UnwrapReceipt extends ReceiptBase {
  operation: "unwrap";
  unwrapRequestId: `0x${string}`;
  finalizeTxHash: `0x${string}`;
  amount: string;
  status: "finalized";
}

export type OperationReceipt = BridgeReceipt | PrivateSendReceipt | UnwrapReceipt;

export interface ReceiptDraft {
  id: string;
  receipt: OperationReceipt;
}

export interface ArchivedReceiptRecord {
  id: bigint;
  owner: `0x${string}`;
  operationType: number;
  pieceCid: string;
  dataSetId: bigint;
  receiptHash: `0x${string}`;
  createdAt: bigint;
}

export interface RetrievedReceipt {
  pieceCid: string;
  receipt: OperationReceipt;
}

export function operationTypeToNumber(operation: ArchiveOperation) {
  switch (operation) {
    case "bridge":
      return 0;
    case "send":
      return 1;
    case "unwrap":
      return 2;
  }
}

export function operationTypeToLabel(operationType: number) {
  switch (operationType) {
    case 0:
      return "Bridge";
    case 1:
      return "Private Send";
    case 2:
      return "Unwrap";
    default:
      return `Operation ${operationType}`;
  }
}
