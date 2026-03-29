"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { Sidebar } from "@/components/Sidebar";
import { WrapPanel } from "@/components/WrapPanel";
import { useReceiptDrafts } from "@/lib/receipt-drafts-context";

const APP_VERSION = "filecoin-receipt-v1";

export default function OperationsPage() {
  const { address } = useAccount();
  const [mounted, setMounted] = useState(false);
  const { enqueueReceiptDraft } = useReceiptDrafts();

  useEffect(() => {
    setMounted(true);
  }, []);

  const hydratedAddress = mounted ? address : undefined;

  const handleUnwrapFinalized = useCallback(
    (payload: {
      owner: `0x${string}`;
      unwrapRequestId: `0x${string}`;
      amount: bigint;
      finalizeTxHash: `0x${string}`;
    }) => {
      enqueueReceiptDraft({
        id: `unwrap:${payload.unwrapRequestId}:${payload.finalizeTxHash}`,
        receipt: {
          version: 1,
          operation: "unwrap",
          owner: payload.owner,
          createdAt: Date.now(),
          appVersion: APP_VERSION,
          unwrapRequestId: payload.unwrapRequestId,
          finalizeTxHash: payload.finalizeTxHash,
          amount: payload.amount.toString(),
          status: "finalized",
        },
      });
    },
    [enqueueReceiptDraft],
  );

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="asymmetric-glow ml-64 min-h-screen px-6 pb-10 pt-28 md:px-10">
        <div className="mx-auto w-full max-w-5xl space-y-8 pb-8">
          <div className="space-y-1">
            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">
              Vault <span className="text-primary">Operations.</span>
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-on-surface-variant">
              Manage confidential liquidity on Sepolia by wrapping USDC into
              private cUSDC and finalizing asynchronous unwrap requests.
            </p>
          </div>

          {!mounted ? (
            <div className="rounded-2xl border border-outline-variant/20 bg-surface-container p-10 text-center text-on-surface-variant">
              Loading wallet state...
            </div>
          ) : !hydratedAddress ? (
            <div className="rounded-2xl border border-outline-variant/20 bg-surface-container p-10 text-center text-on-surface-variant">
              Connect your wallet to get started.
            </div>
          ) : (
            <WrapPanel
              address={address}
              onUnwrapFinalized={handleUnwrapFinalized}
            />
          )}
        </div>
      </main>
    </div>
  );
}
