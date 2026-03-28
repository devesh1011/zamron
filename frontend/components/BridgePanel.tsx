"use client";

import { useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { CCTP_FINALIZER_ADDRESS, SOURCE_CHAIN_IDS } from "@/constants/addresses";
import { useBridgeFee } from "@/hooks/useBridgeFee";
import { type BridgeOp } from "@/hooks/useBridge";
import { getSourceChainName } from "@/lib/source-chains";

interface BridgePanelProps {
  address?: `0x${string}`;
  balances: Record<number, bigint>;
  onBridge: (ops: BridgeOp[]) => Promise<void>;
  isBridging: boolean;
  isLoading: boolean;
}

export function BridgePanel({
  address,
  balances,
  onBridge,
  isBridging,
  isLoading,
}: BridgePanelProps) {
  const [amounts, setAmounts] = useState<Record<number, string>>({});
  const [bridgeError, setBridgeError] = useState<string | null>(null);
  const fees = useBridgeFee(amounts);

  const setAmount = (chainId: number, value: string) => {
    setAmounts((current) => ({ ...current, [chainId]: value }));
  };

  const setMax = (chainId: number) => {
    setAmount(chainId, formatUnits(balances[chainId] ?? 0n, 6));
  };

  const totalToReceive = SOURCE_CHAIN_IDS.reduce((sum, chainId) => {
    const raw = amounts[chainId];
    if (!raw || Number.isNaN(Number(raw)) || Number(raw) <= 0) {
      return sum;
    }
    const amount = parseUnits(raw, 6);
    const fee = fees[chainId] ?? 0n;
    return sum + (amount > fee ? amount - fee : 0n);
  }, 0n);

  const totalEstimatedFee = SOURCE_CHAIN_IDS.reduce((sum, chainId) => {
    return sum + (fees[chainId] ?? 0n);
  }, 0n);

  const totalBurnAmount = SOURCE_CHAIN_IDS.reduce((sum, chainId) => {
    const raw = amounts[chainId];
    if (!raw || Number.isNaN(Number(raw)) || Number(raw) <= 0) {
      return sum;
    }

    return sum + parseUnits(raw, 6);
  }, 0n);

  const handleBridge = async () => {
    setBridgeError(null);

    const ops: BridgeOp[] = [];
    if (CCTP_FINALIZER_ADDRESS === "0x") {
      setBridgeError("Sepolia CCTP finalizer is not configured. Redeploy and sync frontend env first.");
      return;
    }

    for (const chainId of SOURCE_CHAIN_IDS) {
      const raw = amounts[chainId];
      if (!raw || Number.isNaN(Number(raw)) || Number(raw) <= 0) {
        continue;
      }

      const amount = parseUnits(raw, 6);
      const requiredBalance = amount;
      if (requiredBalance > (balances[chainId] ?? 0n)) {
        setBridgeError(
          `${getSourceChainName(chainId)} needs ${formatUnits(
            requiredBalance,
            6,
          )} USDC, but only has ${formatUnits(
            balances[chainId] ?? 0n,
            6,
          )} available.`,
        );
        return;
      }

      ops.push({ chainId, amount });
    }

    if (ops.length > 0) {
      try {
        await onBridge(ops);
      } catch (error: any) {
        setBridgeError(error?.message ?? "Bridge failed");
      }
    }
  };

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-white">Bridge &amp; Wrap</h2>

      <div className="space-y-3">
        {SOURCE_CHAIN_IDS.map((chainId) => {
          const balance = balances[chainId] ?? 0n;
          const hasBalance = balance > 0n;
          const rawFee = fees[chainId] ?? 0n;

          return (
            <div
              key={chainId}
              className="space-y-3 rounded-xl border border-gray-700 bg-gray-900 p-4"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-400">{getSourceChainName(chainId)}</p>
                  <p className="text-lg font-semibold text-white">
                    {isLoading ? "..." : `${formatUnits(balance, 6)} USDC`}
                  </p>
                  <p className="text-xs text-gray-500">
                    {rawFee > 0n
                      ? `Estimated Circle fast-transfer fee: ~${formatUnits(rawFee, 6)} USDC`
                      : "Enter an amount to estimate the Circle fast-transfer fee"}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={hasBalance ? "0.00" : "No USDC"}
                    value={amounts[chainId] ?? ""}
                    onChange={(event) => setAmount(chainId, event.target.value)}
                    disabled={!hasBalance}
                    className="w-40 rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white outline-none focus:border-indigo-500 disabled:opacity-50"
                  />
                  <button
                    onClick={() => setMax(chainId)}
                    disabled={!hasBalance}
                    className="rounded-lg bg-gray-700 px-3 py-2 text-sm text-gray-300 hover:bg-gray-600 disabled:opacity-50"
                  >
                    Max
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {bridgeError && <p className="text-sm text-red-400">{bridgeError}</p>}

      <div className="flex items-center justify-between rounded-xl bg-gray-800 p-4">
        <div>
          <p className="text-sm text-gray-400">You will receive</p>
          <p className="text-lg font-semibold text-indigo-400">
            {formatUnits(totalToReceive, 6)} cUSDC
          </p>
          <p className="text-xs text-gray-500">
            {totalEstimatedFee > 0n
              ? `Total USDC burned: ${formatUnits(totalBurnAmount, 6)} (${formatUnits(totalEstimatedFee, 6)} estimated Circle fee; the remainder wraps to cUSDC)`
              : "MetaMask will ask you to approve and burn USDC on each selected chain, then finalize on Sepolia."}
          </p>
        </div>

        <button
          onClick={handleBridge}
          disabled={isBridging || totalToReceive === 0n || !address}
          className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isBridging ? "Bridging..." : "Bridge with CCTP"}
        </button>
      </div>
    </section>
  );
}
