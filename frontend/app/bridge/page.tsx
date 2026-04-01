"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { useAccount } from "wagmi";
import { Sidebar } from "@/components/Sidebar";
import {
  CCTP_FINALIZER_ADDRESS,
  SOURCE_CHAIN_IDS,
} from "@/constants/addresses";
import { useBridgeFee } from "@/hooks/useBridgeFee";
import { useBridge } from "@/hooks/useBridge";
import { useMultichainBalances } from "@/hooks/useMultichainBalances";
import { useReceiptDrafts } from "@/lib/receipt-drafts-context";
import { getSourceChainName } from "@/lib/source-chains";

const APP_VERSION = "filecoin-receipt-v1";

const BRIDGE_STATUS_PROGRESS: Record<string, number> = {
  pending: 5,
  switching: 10,
  approving: 25,
  burning: 45,
  attesting: 75,
  finalizing: 90,
  wrapped: 100,
  error: 100,
};

const BRIDGE_STATUS_LABEL: Record<string, string> = {
  pending: "Preparing transfer",
  switching: "Switching chain",
  approving: "Approving USDC",
  burning: "Burning via CCTP",
  attesting: "Waiting attestation",
  finalizing: "Finalizing on Sepolia",
  wrapped: "Completed",
  error: "Failed",
};

export default function BridgePage() {
  const { address } = useAccount();
  const [mounted, setMounted] = useState(false);
  const [amounts, setAmounts] = useState<Record<number, string>>({});
  const [bridgeError, setBridgeError] = useState<string | null>(null);
  const {
    balances,
    isLoading: balancesLoading,
    refetch,
  } = useMultichainBalances(address);
  const { bridge, results, isBridging } = useBridge(refetch);
  const fees = useBridgeFee(amounts);
  const { enqueueReceiptDraft } = useReceiptDrafts();
  const seenBridgeDraftIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!address) {
      seenBridgeDraftIds.current.clear();
      return;
    }

    for (const result of results) {
      if (
        result.status !== "wrapped" ||
        !result.burnTxHash ||
        !result.finalizeTxHash ||
        result.amount === undefined
      ) {
        continue;
      }

      const draftId = `bridge:${result.chainId}:${result.burnTxHash}`;
      if (seenBridgeDraftIds.current.has(draftId)) continue;
      seenBridgeDraftIds.current.add(draftId);

      enqueueReceiptDraft({
        id: draftId,
        receipt: {
          version: 1,
          operation: "bridge",
          owner: address,
          createdAt: Date.now(),
          appVersion: APP_VERSION,
          sourceChainId: result.chainId,
          burnTxHash: result.burnTxHash,
          finalizeTxHash: result.finalizeTxHash,
          nonce: result.nonce,
          amount: result.amount.toString(),
          status: "wrapped",
        },
      });
    }
  }, [address, enqueueReceiptDraft, results]);

  const hydratedAddress = mounted ? address : undefined;
  const totalToReceive = useMemo(() => {
    return SOURCE_CHAIN_IDS.reduce((sum, chainId) => {
      const raw = amounts[chainId];
      if (!raw || Number.isNaN(Number(raw)) || Number(raw) <= 0) {
        return sum;
      }

      const amount = parseUnits(raw, 6);
      const fee = fees[chainId] ?? 0n;
      return sum + (amount > fee ? amount - fee : 0n);
    }, 0n);
  }, [amounts, fees]);

  const activeResult = useMemo(() => {
    if (results.length === 0) return null;
    const inFlight = results.find(
      (result) => result.status !== "wrapped" && result.status !== "error",
    );
    return inFlight ?? results[results.length - 1];
  }, [results]);

  const showRightStatusPanel = results.length > 0;

  const setAmount = (chainId: number, value: string) => {
    setAmounts((current) => ({ ...current, [chainId]: value }));
  };

  const setMax = (chainId: number) => {
    setAmount(chainId, formatUnits(balances[chainId] ?? 0n, 6));
  };

  const handleBridge = async () => {
    setBridgeError(null);

    if (CCTP_FINALIZER_ADDRESS === "0x") {
      setBridgeError(
        "Sepolia CCTP finalizer is not configured. Redeploy and sync frontend env first.",
      );
      return;
    }

    const ops = [] as { chainId: number; amount: bigint }[];
    for (const chainId of SOURCE_CHAIN_IDS) {
      const raw = amounts[chainId];
      if (!raw || Number.isNaN(Number(raw)) || Number(raw) <= 0) continue;

      const amount = parseUnits(raw, 6);
      const balance = balances[chainId] ?? 0n;
      if (amount > balance) {
        setBridgeError(
          `${getSourceChainName(chainId)} needs ${formatUnits(amount, 6)} USDC, but only has ${formatUnits(balance, 6)} available.`,
        );
        return;
      }

      ops.push({ chainId, amount });
    }

    if (ops.length === 0) {
      setBridgeError("Enter an amount on at least one chain to bridge.");
      return;
    }

    try {
      await bridge(ops);
    } catch (error: any) {
      setBridgeError(error?.message ?? "Bridge failed");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="ml-64 flex min-h-screen">
        <main className="asymmetric-glow min-h-screen flex-1 px-6 pb-10 pt-28 md:px-10">
          <div className="mx-auto flex w-full max-w-2xl flex-col space-y-6 pb-8">
            <div className="mt-2 space-y-1">
              <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">
                Bridge <span className="text-primary">Privately.</span>
              </h1>
              <p className="max-w-lg text-sm leading-relaxed text-on-surface-variant">
                Unify your liquidity.
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
              <>
                <section className="space-y-2">
                  <div className="flex items-end justify-between px-1">
                    <h3 className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">
                      Input Sources
                    </h3>
                    <span className="text-[9px] text-primary/80">
                      Auto-scan active
                    </span>
                  </div>

                  <div className="space-y-2">
                    {SOURCE_CHAIN_IDS.map((chainId) => {
                      const balance = balances[chainId] ?? 0n;
                      const hasBalance = balance > 0n;
                      const fee = fees[chainId] ?? 0n;

                      return (
                        <div
                          key={chainId}
                          className="cursor-pointer rounded-xl border border-outline-variant/10 bg-surface-container p-3.5 transition-all hover:border-primary/20"
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container-high text-on-surface-variant">
                              <span className="material-symbols-outlined text-lg">
                                layers
                              </span>
                            </div>

                            <div className="flex-1">
                              <p className="font-headline text-xl font-bold text-on-surface">
                                {getSourceChainName(chainId)}
                              </p>
                              <p className="text-[10px] text-on-surface-variant">
                                {fee > 0n
                                  ? `Estimated fee: ~${formatUnits(fee, 6)} USDC`
                                  : "zamron fast transfer"}
                              </p>
                            </div>

                            <div className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder={hasBalance ? "0" : "No USDC"}
                                  value={amounts[chainId] ?? ""}
                                  onChange={(event) =>
                                    setAmount(chainId, event.target.value)
                                  }
                                  disabled={!hasBalance || isBridging}
                                  className="w-24 rounded border border-outline-variant/30 bg-surface-container-low px-2 py-1 text-right font-headline text-lg font-medium text-on-surface outline-none transition focus:border-primary disabled:opacity-50"
                                />
                                <button
                                  onClick={() => setMax(chainId)}
                                  disabled={!hasBalance || isBridging}
                                  className="rounded bg-surface-container-highest px-2 py-0.5 text-[9px] font-bold text-on-surface-variant transition-colors hover:text-primary disabled:opacity-50"
                                >
                                  MAX
                                </button>
                              </div>
                              <p className="mt-0.5 text-[10px] text-on-surface-variant">
                                {balancesLoading
                                  ? "Loading..."
                                  : `Available: ${formatUnits(balance, 6)} USDC`}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <div className="relative z-10 -my-3 flex justify-center">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant bg-surface-container-highest shadow-lg">
                    <span className="material-symbols-outlined text-sm text-primary">
                      expand_more
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="px-1 text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Total Receive
                  </h3>
                  <div className="relative overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-lowest py-6 text-center">
                    <h2 className="mb-2 font-headline text-5xl font-extrabold text-on-surface">
                      {formatUnits(totalToReceive, 6)} cUSDC
                    </h2>
                    <div className="space-y-0.5">
                      <p className="font-headline text-xs font-bold text-on-surface-variant">
                        Confidential USD Coin
                      </p>
                      
                    </div>
                  </div>
                </div>

                {bridgeError && (
                  <p className="text-sm text-error">{bridgeError}</p>
                )}

                <div className="flex justify-center">
                  <button
                    onClick={handleBridge}
                    disabled={
                      isBridging || !hydratedAddress || totalToReceive === 0n
                    }
                    className="bridge-btn-glow flex w-full max-w-md items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary-container py-4 font-headline text-base font-extrabold text-on-primary transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-lg">
                      bolt
                    </span>
                    {isBridging ? "BRIDGING..." : "BRIDGE WITH ZAMRON"}
                  </button>
                </div>
              </>
            )}
          </div>
        </main>

        {showRightStatusPanel && activeResult && (
          <aside className="w-80 shrink-0 overflow-y-auto border-l border-outline-variant p-6 pt-44">
            <div className="glass-panel space-y-5 rounded-2xl p-5">
              <div className="flex items-center justify-between border-b border-outline-variant/10 pb-3">
                <h4 className="text-[9px] font-bold uppercase tracking-widest text-on-surface">
                  Live Bridge Status
                </h4>
                <span className="material-symbols-outlined text-base text-primary">
                  sync_alt
                </span>
              </div>

              <div className="flex items-center justify-between text-[10px] font-bold">
                <span className="text-on-surface-variant">
                  {getSourceChainName(activeResult.chainId)}
                </span>
                <span className="material-symbols-outlined text-xs text-primary">
                  arrow_forward
                </span>
                <span className="text-on-surface">cUSDC Vault</span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[9px] font-bold uppercase tracking-tighter">
                  <span className="text-on-surface-variant">
                    {BRIDGE_STATUS_LABEL[activeResult.status] ??
                      activeResult.status}
                  </span>
                  <span className="text-primary">
                    {BRIDGE_STATUS_PROGRESS[activeResult.status] ?? 0}%
                  </span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-surface-container">
                  <div
                    className="h-full rounded-full bg-primary shadow-[0_0_8px_var(--primary)]"
                    style={{
                      width: `${BRIDGE_STATUS_PROGRESS[activeResult.status] ?? 0}%`,
                    }}
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex justify-between text-[9px]">
                  <span className="font-bold uppercase text-on-surface-variant">
                    Burn TX
                  </span>
                  {activeResult.burnTxHash ? (
                    <a
                      href={getExplorerLink(
                        activeResult.chainId,
                        activeResult.burnTxHash,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cursor-pointer font-mono text-primary hover:underline"
                    >
                      {shortHash(activeResult.burnTxHash)}
                    </a>
                  ) : (
                    <span className="italic text-on-surface-variant">
                      Pending...
                    </span>
                  )}
                </div>

                <div className="flex justify-between text-[9px]">
                  <span className="font-bold uppercase text-on-surface-variant">
                    Finalize TX
                  </span>
                  {activeResult.finalizeTxHash ? (
                    <a
                      href={`https://sepolia.etherscan.io/tx/${activeResult.finalizeTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cursor-pointer font-mono text-primary hover:underline"
                    >
                      {shortHash(activeResult.finalizeTxHash)}
                    </a>
                  ) : (
                    <span className="italic text-on-surface-variant">
                      Pending...
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-3">
                <p className="mb-1 text-[8px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Nonce Hash
                </p>
                <p className="break-all font-mono text-[8px] leading-tight text-on-surface/60">
                  {activeResult.nonce ?? "Awaiting attestation nonce..."}
                </p>
              </div>

              {activeResult.error && (
                <p className="text-xs text-error">{activeResult.error}</p>
              )}
            </div>

            <div className="mt-6 space-y-3 px-2 opacity-40">
             
              <div className="flex gap-1.5">
                <div className="h-0.5 flex-1 rounded bg-surface-container-highest" />
                <div className="h-0.5 flex-1 rounded bg-surface-container-highest" />
                <div className="h-0.5 flex-1 rounded bg-surface-container-highest" />
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function shortHash(value: string) {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function getExplorerLink(chainId: number, txHash: string) {
  if (chainId === 84532) {
    return `https://base-sepolia.blockscout.com/tx/${txHash}`;
  }
  if (chainId === 421614) {
    return `https://sepolia.arbiscan.io/tx/${txHash}`;
  }
  if (chainId === 11155420) {
    return `https://sepolia-optimism.etherscan.io/tx/${txHash}`;
  }
  return "#";
}
