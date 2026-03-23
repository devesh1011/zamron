export const SEPOLIA_CHAIN_ID = 11155111;
export const FILECOIN_CALIBRATION_CHAIN_ID = 314159;
export const SEPOLIA_DOMAIN = 0;

export const USDC: Record<number, `0x${string}`> = {
  84532: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // Base Sepolia
  421614: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d", // Arbitrum Sepolia
  11155420: "0x5fd84259d66Cd46123540766Be93DFE6D43130D7", // OP Sepolia
  11155111: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // Ethereum Sepolia
};

export const CCTP_DOMAIN: Record<number, number> = {
  84532: 6,
  421614: 3,
  11155420: 2,
  11155111: 0,
};

export const TOKEN_MESSENGER_V2: Record<number, `0x${string}`> = {
  84532: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
  421614: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
  11155420: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
  11155111: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
};

export const MESSAGE_TRANSMITTER_V2: Record<number, `0x${string}`> = {
  11155111: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
};

export const CUSDC_ADDRESS: `0x${string}` =
  (process.env.NEXT_PUBLIC_CUSDC_ADDRESS as `0x${string}`) ?? "0x";

export const CUSDC_UNWRAPPER_ADDRESS: `0x${string}` =
  (process.env.NEXT_PUBLIC_CUSDC_UNWRAPPER_ADDRESS as `0x${string}`) ?? "0x";

export const CCTP_FINALIZER_ADDRESS: `0x${string}` =
  (process.env.NEXT_PUBLIC_CCTP_FINALIZER_ADDRESS as `0x${string}`) ?? "0x";

export const ARCHIVE_REGISTRY_ADDRESS: `0x${string}` =
  (process.env.NEXT_PUBLIC_ARCHIVE_REGISTRY_ADDRESS as `0x${string}`) ?? "0x";

export const SOURCE_CHAIN_IDS = [84532, 421614, 11155420] as const;

export const CHAIN_NAME: Record<number, string> = {
  84532: "Base Sepolia",
  421614: "Arbitrum Sepolia",
  11155420: "OP Sepolia",
  11155111: "Ethereum Sepolia",
  314159: "Filecoin Calibration",
};

export const SEPOLIA_RPC_URL =
  process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ??
  (process.env.NEXT_PUBLIC_INFURA_KEY
    ? `https://sepolia.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_KEY}`
    : "https://1rpc.io/sepolia");

export const FILECOIN_CALIBRATION_RPC_URL =
  process.env.NEXT_PUBLIC_FILECOIN_CALIBRATION_RPC_URL ??
  "https://api.calibration.node.glif.io/rpc/v1";
