import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Skip type-checking during build (the IDE handles type errors; this just saves RAM)
  typescript: { ignoreBuildErrors: true },
  // Silence "webpack config without turbopack config" error in dev (Turbopack is used for dev)
  turbopack: {},
  // Keep heavy crypto/web3 packages out of the server bundle — they're browser-only
  serverExternalPackages: [
    "@zama-fhe/relayer-sdk",
    "@filoz/synapse-sdk",
    "viem",
  ],
  webpack(config, { isServer }) {
    // Enable async WebAssembly (required for tfhe / TKMS WASM modules)
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    // Prevent heavy packages from being bundled on the server
    if (isServer) {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : [config.externals]),
        "@zama-fhe/relayer-sdk",
        "@filoz/synapse-sdk",
      ];
    }

    return config;
  },
};

export default nextConfig;
