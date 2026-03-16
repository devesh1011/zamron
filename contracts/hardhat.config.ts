import fs from "fs";
import path from "path";
import { HardhatUserConfig, vars } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";

function loadEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const env: Record<string, string> = {};
  const content = fs.readFileSync(filePath, "utf8");

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    env[key] = value.replace(/^['"]|['"]$/g, "");
  }

  return env;
}

const fileEnv = loadEnvFile(path.join(__dirname, ".env"));

function getEnv(name: string, fallback: string) {
  return process.env[name] || fileEnv[name] || vars.get(name, fallback);
}

function getAccounts() {
  const rawPrivateKey = getEnv("PRIVATE_KEY", "").trim();
  if (!rawPrivateKey) {
    return [];
  }

  return [rawPrivateKey.startsWith("0x") ? rawPrivateKey : `0x${rawPrivateKey}`];
}

const ACCOUNTS = getAccounts();
const SEPOLIA_RPC_URL = getEnv(
  "SEPOLIA_RPC_URL",
  "https://1rpc.io/sepolia"
);
const BASE_SEPOLIA_RPC_URL = getEnv(
  "BASE_SEPOLIA_RPC_URL",
  "https://sepolia.base.org"
);
const ARBITRUM_SEPOLIA_RPC_URL = getEnv(
  "ARBITRUM_SEPOLIA_RPC_URL",
  "https://sepolia-rollup.arbitrum.io/rpc"
);
const OPTIMISM_SEPOLIA_RPC_URL = getEnv(
  "OPTIMISM_SEPOLIA_RPC_URL",
  "https://sepolia.optimism.io"
);
const FILECOIN_CALIBRATION_RPC_URL = getEnv(
  "FILECOIN_CALIBRATION_RPC_URL",
  "https://api.calibration.node.glif.io/rpc/v1"
);

const ETHERSCAN_API_KEY = getEnv("ETHERSCAN_API_KEY", "");

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.27",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
  networks: {
    hardhat: { chainId: 31337 },

    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: ACCOUNTS,
      chainId: 11155111,
    },

    baseSepolia: {
      url: BASE_SEPOLIA_RPC_URL,
      accounts: ACCOUNTS,
      chainId: 84532,
    },
    arbitrumSepolia: {
      url: ARBITRUM_SEPOLIA_RPC_URL,
      accounts: ACCOUNTS,
      chainId: 421614,
    },
    optimismSepolia: {
      url: OPTIMISM_SEPOLIA_RPC_URL,
      accounts: ACCOUNTS,
      chainId: 11155420,
    },
    filecoinCalibration: {
      url: FILECOIN_CALIBRATION_RPC_URL,
      accounts: ACCOUNTS,
      chainId: 314159,
    },
  },
};

export default config;
