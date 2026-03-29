"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { Sidebar } from "@/components/Sidebar";
import { TransferPanel } from "@/components/TransferPanel";
import { useReceiptDrafts } from "@/lib/receipt-drafts-context";

const APP_VERSION = "filecoin-receipt-v1";

export default function SendPage() {
  const { address } = useAccount();
  const [mounted, setMounted] = useState(false);
  const { enqueueReceiptDraft } = useReceiptDrafts();

  useEffect(() => {
    setMounted(true);
  }, []);

  const hydratedAddress = mounted ? address : undefined;

  const handleTransferSuccess = useCallback(
    (payload: {
      sender: `0x${string}`;
      recipient: `0x${string}`;
      amount: bigint;
      txHash: `0x${string}`;
    }) => {
      enqueueReceiptDraft({
        id: `send:${payload.txHash}`,
        receipt: {
          version: 1,
          operation: "send",
          owner: payload.sender,
          createdAt: Date.now(),
          appVersion: APP_VERSION,
          sender: payload.sender,
          recipient: payload.recipient,
          txHash: payload.txHash,
          amount: payload.amount.toString(),
          status: "sent",
        },
      });
    },
    [enqueueReceiptDraft],
  );

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="asymmetric-glow ml-64 min-h-screen px-6 pb-10 pt-28 md:px-10">
        <div className="mx-auto flex w-full max-w-2xl flex-col space-y-6 pb-8">
          <div className="mt-2 space-y-1">
            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">
              Send <span className="text-primary">Confidentially.</span>
            </h1>
            <p className="max-w-lg text-sm leading-relaxed text-on-surface-variant">
              Dispatch cUSDC through encrypted rails. Amounts are encrypted in
              your browser before any onchain transaction is submitted.
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
            <TransferPanel
              address={address}
              onTransferSuccess={handleTransferSuccess}
            />
          )}
        </div>
      </main>
    </div>
  );
}
