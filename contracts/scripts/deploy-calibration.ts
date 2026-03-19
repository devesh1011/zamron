import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying to Filecoin Calibration with:", deployer.address);

  const BridgeArchiveRegistry = await ethers.getContractFactory("BridgeArchiveRegistry");
  const registry = await BridgeArchiveRegistry.deploy();
  await registry.waitForDeployment();

  const registryAddress = await registry.getAddress();
  console.log("BridgeArchiveRegistry deployed at:", registryAddress);

  const deployments = {
    network: "filecoinCalibration",
    chainId: 314159,
    BridgeArchiveRegistry: registryAddress,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
  };

  const outDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(
    path.join(outDir, "calibration.json"),
    JSON.stringify(deployments, null, 2),
  );

  console.log("Addresses saved to deployments/calibration.json");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
