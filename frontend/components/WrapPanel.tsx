"use client";

import { useEffect, useRef, useState } from "react";
import { formatUnits, isAddress, parseUnits } from "viem";
import { useReadContract } from "wagmi";
import { SEPOLIA_CHAIN_ID, USDC } from "@/constants/addresses";
import { ERC20_ABI } from "@/lib/contracts";
import { useCUSDCBalance } from "@/hooks/useCUSDCBalance";
import { useWrapActions } from "@/hooks/useWrapActions";

function formatUSDC(amount: bigint) {
  return parseFloat(formatUnits(amount, 6)).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function WrapPanel({
  address,
  onUnwrapFinalized,
}: {
  address?: `0x${string}`;
  onUnwrapFinalized?: (payload: {
    owner: `0x${string}`;
    unwrapRequestId: `0x${string}`;
    amount: bigint;
    finalizeTxHash: `0x${string}`;
  }) => void;
}) {
  const [wrapAmount, setWrapAmount] = useState("");
  const [unwrapAmount, setUnwrapAmount] = useState("");
  const [lastRequestedUnwrapAmount, setLastRequestedUnwrapAmount] = useState<
    bigint | null
  >(null);
  const {
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
  } = useWrapActions();
  const {
    decryptedBalance,
    encryptedHandle,
    isDecrypting,
    decryptError,
    decrypt,
  } = useCUSDCBalance(address);
  const { data: sepoliaUsdc = 0n, isLoading } = useReadContract({
    address: USDC[SEPOLIA_CHAIN_ID],
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: SEPOLIA_CHAIN_ID,
    query: { enabled: !!address && isAddress(address) },
  });

  const parsedWrapAmount =
    wrapAmount && Number(wrapAmount) > 0 ? parseUnits(wrapAmount, 6) : 0n;
  const parsedUnwrapAmount =
    unwrapAmount && Number(unwrapAmount) > 0 ? parseUnits(unwrapAmount, 6) : 0n;
  const lastReportedFinalizeTxHash = useRef<`0x${string}` | null>(null);
  const canDecryptCUSDC =
    typeof encryptedHandle === "string" &&
    encryptedHandle !==
      "0x0000000000000000000000000000000000000000000000000000000000000000";

  useEffect(() => {
    if (
      !address ||
      !finalizeTxHash ||
      !lastFinalizedUnwrapRequestId ||
      !lastRequestedUnwrapAmount
    ) {
      return;
    }
    if (lastReportedFinalizeTxHash.current === finalizeTxHash) {
      return;
    }

    lastReportedFinalizeTxHash.current = finalizeTxHash;
    onUnwrapFinalized?.({
      owner: address,
      unwrapRequestId: lastFinalizedUnwrapRequestId,
      amount: lastRequestedUnwrapAmount,
      finalizeTxHash,
    });
  }, [
    address,
    finalizeTxHash,
    lastFinalizedUnwrapRequestId,
    lastRequestedUnwrapAmount,
    onUnwrapFinalized,
  ]);

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between px-1">
        <h2 className="font-headline text-[11px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
          Sepolia Conversion Engine
        </h2>
        <span className="text-[10px] text-primary/80">ERC-7984 active</span>
      </div>

      <div className="space-y-5 rounded-2xl border border-outline-variant/20 bg-surface-container-low p-5">
        <div className="rounded-xl border border-primary/30 bg-primary/8 p-3 text-sm text-on-surface-variant">
          Sepolia USDC in your wallet can be wrapped into confidential cUSDC
          here using the ERC-7984 wrapper. Unwrapping cUSDC back to plain USDC
          is asynchronous: first you request the unwrap, then you finalize the
          USDC release once the burnt confidential amount is publicly decrypted.
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-outline-variant/15 bg-surface-container p-3 text-on-surface-variant">
            Sepolia USDC balance:{" "}
            <span className="font-semibold text-on-surface">
              {isLoading ? "..." : `${formatUSDC(sepoliaUsdc)} USDC`}
            </span>
          </div>

          <div className="rounded-xl border border-outline-variant/15 bg-surface-container p-3 text-on-surface-variant">
            Sepolia cUSDC balance:{" "}
            {decryptedBalance !== null ? (
              <span className="font-semibold text-primary">
                {formatUSDC(decryptedBalance)} cUSDC
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <span className="font-semibold text-on-surface/40">
                  Encrypted
                </span>
                <button
                  onClick={decrypt}
                  disabled={isDecrypting || !canDecryptCUSDC}
                  className="rounded-full border border-primary/40 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary transition-colors hover:border-primary hover:bg-primary/10 disabled:opacity-50"
                >
                  {isDecrypting ? "Decrypting..." : "Decrypt"}
                </button>
              </span>
            )}
          </div>
        </div>

        {decryptError && <p className="text-xs text-error">{decryptError}</p>}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-outline-variant/15 bg-surface-container p-4">
            <p className="font-headline text-sm font-bold text-on-surface">
              Wrap USDC to cUSDC
            </p>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={wrapAmount}
              onChange={(e) => setWrapAmount(e.target.value)}
              className="w-full rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-on-surface outline-none transition focus:border-primary"
            />
            <button
              onClick={() => wrap(parsedWrapAmount)}
              disabled={
                parsedWrapAmount <= 0n ||
                parsedWrapAmount > sepoliaUsdc ||
                isWrapping
              }
              className="w-full rounded-full bg-gradient-to-r from-primary to-primary-container py-3 font-headline text-xs font-bold uppercase tracking-[0.15em] text-on-primary transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isWrapping ? "Wrapping..." : "Wrap to cUSDC"}
            </button>
          </div>

          <div className="space-y-3 rounded-xl border border-outline-variant/15 bg-surface-container p-4">
            <p className="font-headline text-sm font-bold text-on-surface">
              Unwrap cUSDC to USDC
            </p>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={unwrapAmount}
              onChange={(e) => setUnwrapAmount(e.target.value)}
              className="w-full rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-on-surface outline-none transition focus:border-primary"
            />
            <button
              onClick={() => {
                setLastRequestedUnwrapAmount(parsedUnwrapAmount);
                unwrap(parsedUnwrapAmount);
              }}
              disabled={
                parsedUnwrapAmount <= 0n ||
                isUnwrapping ||
                isFinalizingUnwrap ||
                !!pendingUnwrapRequestId
              }
              className="w-full rounded-full border border-outline/40 py-3 font-headline text-xs font-bold uppercase tracking-[0.15em] text-on-surface transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isUnwrapping ? "Requesting swap..." : "Request cUSDC -> USDC"}
            </button>

            {pendingUnwrapRequestId && (
              <button
                onClick={finalizeUnwrap}
                disabled={isFinalizingUnwrap}
                className="w-full rounded-full bg-gradient-to-r from-primary to-primary-container py-3 font-headline text-xs font-bold uppercase tracking-[0.15em] text-on-primary transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isFinalizingUnwrap ? "Finalizing..." : "Finalize USDC Release"}
              </button>
            )}
          </div>
        </div>

        {wrapTxHash && (
          <p className="text-sm text-primary">
            Wrap submitted.{" "}
            <a
              href={`https://sepolia.etherscan.io/tx/${wrapTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-primary/60 underline-offset-2"
            >
              View tx ↗
            </a>
          </p>
        )}

        {unwrapTxHash && (
          <p className="text-sm text-on-surface-variant">
            Unwrap requested. Once the public decryption proof is ready,
            finalize the USDC release.{" "}
            <a
              href={`https://sepolia.etherscan.io/tx/${unwrapTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-primary/60 underline-offset-2"
            >
              View tx ↗
            </a>
          </p>
        )}

        {pendingUnwrapRequestId && (
          <p className="text-xs text-on-surface-variant/80">
            Pending unwrap request ID: {pendingUnwrapRequestId}
          </p>
        )}

        {finalizeTxHash && (
          <p className="text-sm text-primary">
            USDC release finalized.{" "}
            <a
              href={`https://sepolia.etherscan.io/tx/${finalizeTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-primary/60 underline-offset-2"
            >
              View tx ↗
            </a>
          </p>
        )}

        {error && <p className="text-sm text-error">{error}</p>}
      </div>
    </section>
  );
}
