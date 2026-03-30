"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { ArchivePanel } from "@/components/ArchivePanel";
import { Sidebar } from "@/components/Sidebar";
import { useFilecoinArchive } from "@/hooks/useFilecoinArchive";
import type { ReceiptDraft } from "@/lib/archive-types";
import { useReceiptDrafts } from "@/lib/receipt-drafts-context";

export default function EncryptedReceiptsPage() {
  const { address } = useAccount();
  const [mounted, setMounted] = useState(false);
  const { receiptDrafts, removeReceiptDraft } = useReceiptDrafts();
  const {
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
    archiveAvailable,
    archiveReceipt,
    retrieveReceipt,
    reloadRecords,
  } = useFilecoinArchive();

  useEffect(() => {
    setMounted(true);
  }, []);

  const hydratedAddress = mounted ? address : undefined;

  const handleArchiveDraft = useCallback(
    async (draft: ReceiptDraft) => {
      try {
        await archiveReceipt(draft.receipt);
        removeReceiptDraft(draft.id);
      } catch {
        // archiveError state is managed by the hook
      }
    },
    [archiveReceipt, removeReceiptDraft],
  );

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="asymmetric-glow ml-64 min-h-screen px-6 pb-10 pt-28 md:px-10">
        <div className="mx-auto flex w-full max-w-2xl flex-col space-y-6 pb-8">
          <div className="mt-2 space-y-1">
            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">
              Encrypted <span className="text-primary">Receipts.</span>
            </h1>
            <p className="max-w-lg text-sm leading-relaxed text-on-surface-variant">
              Seal operation receipts to Filecoin with encrypted metadata, then
              retrieve and decrypt them whenever proof is required.
            </p>
          </div>

          {!mounted ? (
            <div className="py-20 text-center text-on-surface-variant">
              Loading wallet state...
            </div>
          ) : !hydratedAddress ? (
            <div className="py-20 text-center text-on-surface-variant">
              Connect your wallet to get started.
            </div>
          ) : (
            <ArchivePanel
              drafts={receiptDrafts}
              records={records}
              isLoadingRecords={isLoadingRecords}
              isArchiving={isArchiving}
              archivePhase={archivePhase}
              retrievingId={retrievingId}
              archiveAvailable={archiveAvailable}
              error={archiveError}
              loadError={loadError}
              lastFundingTxHash={lastFundingTxHash}
              lastRegistryTxHash={lastRegistryTxHash}
              retrievedReceipt={retrievedReceipt}
              onArchiveDraft={handleArchiveDraft}
              onRetrieveRecord={retrieveReceipt}
              onReloadRecords={reloadRecords}
            />
          )}
        </div>
      </main>
    </div>
  );
}
