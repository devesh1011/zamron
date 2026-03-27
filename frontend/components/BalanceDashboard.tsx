"use client";

import { formatUnits } from "viem";
import { SOURCE_CHAIN_IDS } from "@/constants/addresses";
import { useCUSDCBalance } from "@/hooks/useCUSDCBalance";
import { getSourceChainName } from "@/lib/source-chains";

function formatUSDC(amount: bigint) {
  return parseFloat(formatUnits(amount, 6)).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function BalanceDashboard({
  address,
  balances,
  isLoading,
}: {
  address?: `0x${string}`;
  balances: Record<number, bigint>;
  isLoading: boolean;
}) {
  const {
    decryptedBalance,
    encryptedHandle,
    isDecrypting,
    decryptError,
    decrypt,
  } = useCUSDCBalance(address);

  const canDecrypt =
    typeof encryptedHandle === "string" &&
    encryptedHandle !==
      "0x0000000000000000000000000000000000000000000000000000000000000000";

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between px-1">
        <h2 className="font-headline text-[11px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
          Vault Balances
        </h2>
        <span className="text-[10px] text-primary/80">Live multi-chain</span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SOURCE_CHAIN_IDS.map((chainId) => (
          <div
            key={chainId}
            className="rounded-xl border border-outline-variant/15 bg-surface-container p-4"
          >
            <p className="text-[11px] font-bold text-on-surface-variant">
              {getSourceChainName(chainId)}
            </p>
            <p className="mt-2 font-headline text-2xl font-extrabold text-on-surface">
              {isLoading
                ? "..."
                : `${formatUSDC(balances[chainId] ?? 0n)} USDC`}
            </p>
          </div>
        ))}

        <div className="rounded-xl border border-primary/35 bg-surface-container p-4">
          <p className="text-[11px] font-bold text-on-surface-variant">
            Ethereum Sepolia
          </p>
          {decryptedBalance !== null ? (
            <p className="mt-2 font-headline text-2xl font-extrabold text-primary">
              {formatUSDC(decryptedBalance)} cUSDC
            </p>
          ) : (
            <div className="mt-2 flex items-center gap-2">
              <p className="font-headline text-2xl font-extrabold text-on-surface/40">
                Encrypted
              </p>
              <button
                onClick={decrypt}
                disabled={isDecrypting || !canDecrypt}
                className="ml-auto rounded-full border border-primary/40 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary transition-colors hover:border-primary hover:bg-primary/10 disabled:opacity-50"
              >
                {isDecrypting ? "Decrypting..." : "Decrypt"}
              </button>
            </div>
          )}
          {decryptError && (
            <p className="mt-2 text-xs text-error">{decryptError}</p>
          )}
        </div>
      </div>
    </section>
  );
}
