"use client";

import { useEffect, useState } from "react";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";
import { SOURCE_CHAIN_IDS } from "@/constants/addresses";
import { useCUSDCBalance } from "@/hooks/useCUSDCBalance";
import { useMultichainBalances } from "@/hooks/useMultichainBalances";
import { getSourceChainName } from "@/lib/source-chains";

function formatUSDC(amount: bigint) {
  return parseFloat(formatUnits(amount, 6)).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function Sidebar() {
  const [mounted, setMounted] = useState(false);
  const { address } = useAccount();
  const { balances, isLoading } = useMultichainBalances(address);
  const {
    decryptedBalance,
    encryptedHandle,
    isDecrypting,
    decryptError,
    decrypt,
  } = useCUSDCBalance(address);

  useEffect(() => {
    setMounted(true);
  }, []);

  const hydratedAddress = mounted ? address : undefined;

  const canDecrypt =
    typeof encryptedHandle === "string" &&
    encryptedHandle !==
      "0x0000000000000000000000000000000000000000000000000000000000000000";

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 shrink-0 flex-col border-r border-outline-variant/30 bg-surface-container-lowest">
      <div className="p-6 pt-7">
        <h1 className="font-headline text-xl font-bold tracking-tighter text-primary">
          Zamron
        </h1>
        <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
          Private everything
        </p>
      </div>

      <div className="mt-2 flex-1 px-4">
        <div className="mt-2">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
            Wallet Balances
          </p>

          <div className="space-y-4">
            {SOURCE_CHAIN_IDS.map((chainId) => (
              <div key={chainId} className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/20 bg-surface-container-highest text-primary">
                  <span className="material-symbols-outlined text-sm">
                    layers
                  </span>
                </div>
                <div>
                  <p className="text-sm font-bold text-on-surface">
                    {getSourceChainName(chainId)}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    {!hydratedAddress
                      ? "Connect wallet"
                      : isLoading
                        ? "Loading..."
                        : `${formatUSDC(balances[chainId] ?? 0n)} USDC`}
                  </p>
                </div>
              </div>
            ))}

            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/20 bg-surface-container-highest text-primary">
                <span className="material-symbols-outlined text-sm">
                  shield
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-on-surface">
                  Ethereum Sepolia
                </p>
                <p className="text-xs text-on-surface-variant">
                  {decryptedBalance !== null
                    ? `${formatUSDC(decryptedBalance)} cUSDC`
                    : hydratedAddress
                      ? "Encrypted cUSDC"
                      : "Connect wallet"}
                </p>
              </div>
              {hydratedAddress && canDecrypt && (
                <button
                  onClick={decrypt}
                  disabled={isDecrypting}
                  title={decryptedBalance !== null ? "Balance decrypted" : "Decrypt balance"}
                  className="flex-shrink-0 text-on-surface-variant transition-colors hover:text-primary disabled:opacity-50"
                >
                  {isDecrypting ? (
                    <span className="material-symbols-outlined text-base animate-pulse">
                      progress_activity
                    </span>
                  ) : decryptedBalance !== null ? (
                    <span className="material-symbols-outlined text-base text-primary">
                      visibility
                    </span>
                  ) : (
                    <span className="material-symbols-outlined text-base">
                      visibility_off
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>

          {decryptError && (
            <p className="mt-4 text-[10px] text-error">{decryptError}</p>
          )}
        </div>
      </div>

      <div className="border-t border-outline-variant/30 p-4">
        <div className="mb-4 flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
          <span className="text-[9px] font-bold uppercase text-on-surface-variant">
            Network Operational
          </span>
        </div>
        <div className="flex items-center justify-between px-1 text-on-surface-variant">
          <span className="material-symbols-outlined cursor-pointer text-sm hover:text-primary">
            settings
          </span>
          <span className="material-symbols-outlined cursor-pointer text-sm hover:text-primary">
            help
          </span>
          <span className="material-symbols-outlined cursor-pointer text-sm hover:text-primary">
            shield
          </span>
        </div>
      </div>
    </aside>
  );
}
