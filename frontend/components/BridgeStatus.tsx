"use client";

import { CHAIN_NAME } from "@/constants/addresses";
import { type BridgeResult } from "@/hooks/useBridge";

const statusLabel: Record<string, string> = {
  pending: "⏳ Pending",
  switching: "↔️ Switching chain...",
  approving: "✍️ Approving USDC...",
  burning: "🔥 Burning USDC with CCTP...",
  attesting: "🛰️ Waiting for Circle attestation...",
  finalizing: "🪄 Finalizing on Sepolia...",
  wrapped: "✅ Wrapped to cUSDC",
  error: "❌ Failed",
};

export function BridgeStatus({ results }: { results: BridgeResult[] }) {
  if (results.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-white">Bridge Status</h2>

      <div className="space-y-2">
        {results.map((r) => {
          return (
            <div
              key={r.chainId}
              className="space-y-2 rounded-xl border border-gray-700 bg-gray-900 p-4"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-300">
                  {CHAIN_NAME[r.chainId] ?? `Chain ${r.chainId}`}
                </span>

                <span className="text-sm">
                  {statusLabel[r.status] ?? r.status}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs">
                {r.burnTxHash && (
                  <a
                    href={getExplorerLink(r.chainId, r.burnTxHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-400 hover:underline"
                  >
                    Burn tx ↗
                  </a>
                )}

                {r.finalizeTxHash && (
                  <a
                    href={`https://sepolia.etherscan.io/tx/${r.finalizeTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-400 hover:underline"
                  >
                    Finalize tx ↗
                  </a>
                )}

                {r.nonce && <span className="text-gray-500">Nonce: {r.nonce}</span>}
              </div>

              {r.error && (
                <span className="text-xs text-red-400">{r.error}</span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
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
