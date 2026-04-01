"use client";

import { useEffect, useRef, useState } from "react";
import { parseUnits, isAddress } from "viem";
import { usePrivateTransfer } from "@/hooks/usePrivateTransfer";

export function TransferPanel({
  address,
  onTransferSuccess,
}: {
  address?: `0x${string}`;
  onTransferSuccess?: (payload: {
    sender: `0x${string}`;
    recipient: `0x${string}`;
    amount: bigint;
    txHash: `0x${string}`;
  }) => void;
}) {
  const { transfer, isTransferring, txHash, error } = usePrivateTransfer();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const lastReportedTxHash = useRef<`0x${string}` | null>(null);

  const handleSend = async () => {
    if (!isAddress(recipient)) return;
    const parsed = parseUnits(amount, 6);
    if (parsed <= 0n) return;
    await transfer(recipient as `0x${string}`, parsed);
  };

  const isValid = isAddress(recipient) && Number(amount) > 0 && address;

  useEffect(() => {
    if (!address || !txHash || !isAddress(recipient) || Number(amount) <= 0) {
      return;
    }
    if (lastReportedTxHash.current === txHash) {
      return;
    }

    lastReportedTxHash.current = txHash;
    onTransferSuccess?.({
      sender: address,
      recipient: recipient as `0x${string}`,
      amount: parseUnits(amount, 6),
      txHash,
    });
  }, [address, amount, onTransferSuccess, recipient, txHash]);

  return (
    <section className="space-y-4">
      <h2 className="font-headline text-xl font-bold text-on-surface">
        Private Send Console
      </h2>

      <div className="space-y-4 rounded-2xl border border-outline-variant/20 bg-surface-container-low p-5">
        

        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
            Recipient
          </label>
          <input
            type="text"
            placeholder="0x..."
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className="w-full rounded-xl border border-outline-variant/30 bg-surface-container px-3 py-2.5 text-on-surface outline-none transition focus:border-primary"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
            Amount (cUSDC)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-xl border border-outline-variant/30 bg-surface-container px-3 py-2.5 text-on-surface outline-none transition focus:border-primary"
          />
        </div>

        <button
          onClick={handleSend}
          disabled={!isValid || isTransferring}
          className="bridge-btn-glow w-full rounded-full bg-gradient-to-r from-primary to-primary-container py-3 font-headline text-sm font-extrabold uppercase tracking-wide text-on-primary transition-all hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isTransferring ? "Encrypting & Sending..." : "Send Privately"}
        </button>

        {txHash && (
          <p className="text-sm text-success">
            ✅ Sent — recipient can now decrypt their balance.{" "}
            <a
              href={`https://sepolia.etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-primary"
            >
              View tx ↗
            </a>
          </p>
        )}

        {error && <p className="text-sm text-error">❌ {error}</p>}
      </div>
    </section>
  );
}
