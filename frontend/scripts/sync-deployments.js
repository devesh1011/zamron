const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const deploymentsDir = path.resolve(root, "..", "contracts", "deployments");
const outputPath = path.join(root, ".env.local");

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const raw = fs.readFileSync(filePath, "utf8");
  return Object.fromEntries(
    raw
      .split(/\r?\n/)
      .filter((line) => line && !line.trim().startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");
        if (index === -1) {
          return [line.trim(), ""];
        }

        return [line.slice(0, index), line.slice(index + 1)];
      }),
  );
}

function readDeployment(filename) {
  const filePath = path.join(deploymentsDir, filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing deployment file: ${filePath}`);
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

const sepolia = readDeployment("sepolia.json");
const calibrationPath = path.join(deploymentsDir, "calibration.json");
const calibration = fs.existsSync(calibrationPath)
  ? JSON.parse(fs.readFileSync(calibrationPath, "utf8"))
  : null;
const currentEnv = parseEnvFile(outputPath);

if (!sepolia.ConfidentialUSDC || !sepolia.CCTPFinalizer || !sepolia.CUSDCUnwrapper) {
  throw new Error(
    "deployments/sepolia.json does not contain the expected Sepolia confidential-token deployment fields. Redeploy Sepolia first.",
  );
}

const lines = [
  `NEXT_PUBLIC_CUSDC_ADDRESS=${sepolia.ConfidentialUSDC}`,
  `NEXT_PUBLIC_CUSDC_UNWRAPPER_ADDRESS=${sepolia.CUSDCUnwrapper}`,
  `NEXT_PUBLIC_CCTP_FINALIZER_ADDRESS=${sepolia.CCTPFinalizer}`,
  `NEXT_PUBLIC_ARCHIVE_REGISTRY_ADDRESS=${
    calibration?.BridgeArchiveRegistry ??
    currentEnv.NEXT_PUBLIC_ARCHIVE_REGISTRY_ADDRESS ??
    ""
  }`,
  `NEXT_PUBLIC_SEPOLIA_RPC_URL=${
    currentEnv.NEXT_PUBLIC_SEPOLIA_RPC_URL ?? "https://1rpc.io/sepolia"
  }`,
  `NEXT_PUBLIC_FILECOIN_CALIBRATION_RPC_URL=${
    currentEnv.NEXT_PUBLIC_FILECOIN_CALIBRATION_RPC_URL ??
    "https://api.calibration.node.glif.io/rpc/v1"
  }`,
  `NEXT_PUBLIC_INFURA_KEY=${currentEnv.NEXT_PUBLIC_INFURA_KEY ?? ""}`,
];

fs.writeFileSync(outputPath, `${lines.join("\n")}\n`);
console.log(`Wrote ${outputPath}`);
