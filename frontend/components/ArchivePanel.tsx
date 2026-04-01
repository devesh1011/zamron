"use client";

import { formatUnits } from "viem";
import type {
  ArchivedReceiptRecord,
  OperationReceipt,
  ReceiptDraft,
  RetrievedReceipt,
} from "@/lib/archive-types";
import { operationTypeToLabel } from "@/lib/archive-types";

function formatDate(timestamp: bigint) {
  return new Date(Number(timestamp) * 1000).toLocaleString();
}

function formatReceiptAmount(receipt: OperationReceipt) {
  return `${formatUnits(BigInt(receipt.amount), 6)} ${
    receipt.operation === "bridge" ? "USDC -> cUSDC" : "cUSDC"
  }`;
}

interface ArchivePanelProps {
  drafts: ReceiptDraft[];
  records: ArchivedReceiptRecord[];
  isLoadingRecords: boolean;
  isArchiving: boolean;
  archivePhase: string | null;
  retrievingId: bigint | null;
  archiveAvailable: boolean;
  error: string | null;
  loadError: string | null;
  lastFundingTxHash: `0x${string}` | null;
  lastRegistryTxHash: `0x${string}` | null;
  retrievedReceipt: RetrievedReceipt | null;
  onArchiveDraft: (draft: ReceiptDraft) => Promise<void>;
  onRetrieveRecord: (record: ArchivedReceiptRecord) => Promise<void>;
  onReloadRecords: () => void;
}

export function ArchivePanel({
  drafts,
  records,
  isLoadingRecords,
  isArchiving,
  archivePhase,
  retrievingId,
  archiveAvailable,
  error,
  loadError,
  lastFundingTxHash,
  lastRegistryTxHash,
  retrievedReceipt,
  onArchiveDraft,
  onRetrieveRecord,
  onReloadRecords,
}: ArchivePanelProps) {
  return (
    <section className="space-y-4">
      <h2 className="font-headline text-xl font-bold text-on-surface">
        Archive Operations
      </h2>

      <div className="space-y-5 rounded-2xl border border-outline-variant/20 bg-surface-container-low p-5">
        

        {!archiveAvailable && (
          <p className="text-sm text-tertiary">
            Filecoin archive registry is not configured yet. Deploy the
            Calibration registry and sync frontend env to activate archiving.
          </p>
        )}

        <div className="space-y-3">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">
            Ready to archive
          </h3>

          {drafts.length === 0 ? (
            <p className="text-sm text-on-surface-variant">
              Complete a bridge, private send, or unwrap finalize to generate a
              receipt draft here.
            </p>
          ) : (
            drafts.map((draft) => (
              <div
                key={draft.id}
                className="rounded-xl border border-outline-variant/20 bg-surface-container p-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
                      {draft.receipt.operation}
                    </p>
                    <p className="mt-1 font-headline text-lg font-semibold text-on-surface">
                      {formatReceiptAmount(draft.receipt)}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      Created{" "}
                      {new Date(draft.receipt.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <button
                    onClick={() => onArchiveDraft(draft)}
                    disabled={!archiveAvailable || isArchiving}
                    className="flex-shrink-0 rounded-full bg-gradient-to-r from-secondary to-secondary-container px-5 py-3 text-sm font-bold text-on-secondary transition-all hover:brightness-110 disabled:opacity-50"
                  >
                    {isArchiving ? "Archiving..." : "Archive to Filecoin"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {isArchiving && archivePhase && (
          <div className="rounded-xl border border-primary/35 bg-primary/10 p-3 text-sm text-primary">
            ⏳ {archivePhase}
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">
              Stored on Calibration
            </h3>
            <button
              onClick={onReloadRecords}
              disabled={isLoadingRecords}
              className="text-xs text-on-surface-variant transition-colors hover:text-primary disabled:opacity-50"
            >
              {isLoadingRecords ? "Loading..." : "↻ Reload"}
            </button>
          </div>

          {isLoadingRecords ? (
            <p className="text-sm text-on-surface-variant">
              Loading archived records...
            </p>
          ) : loadError ? (
            <p className="text-sm text-error">❌ Failed to load: {loadError}</p>
          ) : records.length === 0 ? (
            <p className="text-sm text-on-surface-variant">
              No archived receipts on Filecoin Calibration yet.
            </p>
          ) : (
            records.map((record) => (
              <div
                key={record.id.toString()}
                className="rounded-xl border border-outline-variant/20 bg-surface-container p-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0 space-y-1">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
                      {operationTypeToLabel(record.operationType)}
                    </p>
                    <p className="break-all text-sm text-on-surface">
                      Piece CID: {record.pieceCid}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      Data set #{record.dataSetId.toString()} •{" "}
                      {formatDate(record.createdAt)}
                    </p>
                  </div>

                  <button
                    onClick={() => onRetrieveRecord(record)}
                    disabled={retrievingId !== null}
                    className="inline-flex flex-shrink-0 items-center justify-center whitespace-nowrap rounded-[999px] border border-outline-variant/40 bg-surface-container-high px-6 py-3 text-sm font-bold text-on-surface transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-50"
                  >
                    {retrievingId === record.id
                      ? "Retrieving..."
                      : "Retrieve & Decrypt"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {lastFundingTxHash && (
          <p className="text-sm text-secondary">
            Filecoin funding tx submitted.{" "}
            <a
              href={`https://filecoin-testnet.blockscout.com/tx/${lastFundingTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-primary"
            >
              View tx ↗
            </a>
          </p>
        )}

        {lastRegistryTxHash && (
          <p className="text-sm text-success">
            Calibration registry updated.{" "}
            <a
              href={`https://filecoin-testnet.blockscout.com/tx/${lastRegistryTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-primary"
            >
              View tx ↗
            </a>
          </p>
        )}

        {retrievedReceipt && (
          <div className="rounded-xl border border-outline-variant/20 bg-surface-container p-4">
            <p className="text-sm font-semibold text-on-surface">
              Retrieved receipt from {retrievedReceipt.pieceCid}
            </p>
            <pre className="mt-3 overflow-x-auto rounded-lg bg-surface-container-high p-3 text-xs text-secondary">
              {JSON.stringify(retrievedReceipt.receipt, null, 2)}
            </pre>
          </div>
        )}

        {error && <p className="text-sm text-error">❌ {error}</p>}
      </div>
    </section>
  );
}
