"use client";

import { WagmiProvider, createConfig, http } from "wagmi";
import { metaMask } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  baseSepolia,
  arbitrumSepolia,
  optimismSepolia,
  sepolia,
  filecoinCalibration,
} from "wagmi/chains";
import { type ReactNode } from "react";
import { FILECOIN_CALIBRATION_RPC_URL } from "@/constants/addresses";
import { ReceiptDraftsProvider } from "@/lib/receipt-drafts-context";
import { Toaster } from "sonner";

const chains = [baseSepolia, arbitrumSepolia, optimismSepolia, sepolia, filecoinCalibration] as const;

const transports = {
  [baseSepolia.id]: http("https://sepolia.base.org"),
  [arbitrumSepolia.id]: http("https://sepolia-rollup.arbitrum.io/rpc"),
  [optimismSepolia.id]: http("https://sepolia.optimism.io"),
  [sepolia.id]: http(
    process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ??
      (process.env.NEXT_PUBLIC_INFURA_KEY
        ? `https://sepolia.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_KEY}`
        : "https://1rpc.io/sepolia")
  ),
  [filecoinCalibration.id]: http(FILECOIN_CALIBRATION_RPC_URL),
};

const config = createConfig({
  chains,
  multiInjectedProviderDiscovery: false,
  connectors: [
    metaMask({
      dappMetadata: {
        name: "cUSDC Bridge",
        url: "http://localhost:3000",
      },
    }),
  ],
  transports,
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ReceiptDraftsProvider>{children}</ReceiptDraftsProvider>
        <Toaster position="bottom-right" richColors />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
