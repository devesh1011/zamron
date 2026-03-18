import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying to Sepolia with:", deployer.address);

  // 1. Deploy ConfidentialUSDC
  const ConfidentialUSDC = await ethers.getContractFactory("ConfidentialUSDC");
  const cUSDC = await ConfidentialUSDC.deploy("Confidential USDC", "cUSDC", "");
  await cUSDC.waitForDeployment();
  const cUSDCAddress = await cUSDC.getAddress();
  console.log("ConfidentialUSDC deployed at:", cUSDCAddress);

  // 2. Deploy cUSDC unwrapper / swap helper
  const CUSDCUnwrapper = await ethers.getContractFactory("CUSDCUnwrapper");
  const unwrapper = await CUSDCUnwrapper.deploy(cUSDCAddress);
  await unwrapper.waitForDeployment();
  const unwrapperAddress = await unwrapper.getAddress();
  console.log("CUSDCUnwrapper deployed at:", unwrapperAddress);

  // 3. Deploy CCTP finalizer
  const MESSAGE_TRANSMITTER_V2_SEPOLIA = "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275";
  const TOKEN_MESSENGER_V2 = "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA";
  const CCTPFinalizer = await ethers.getContractFactory("CCTPFinalizer");
  const finalizer = await CCTPFinalizer.deploy(
    MESSAGE_TRANSMITTER_V2_SEPOLIA,
    cUSDCAddress,
  );
  await finalizer.waitForDeployment();
  const finalizerAddress = await finalizer.getAddress();
  console.log("CCTPFinalizer deployed at:", finalizerAddress);

  // 4. Allow source TokenMessengerV2 senders for Base/Arbitrum/OP testnet domains
  const sourceDomains = [6, 3, 2];
  for (const domain of sourceDomains) {
    const tx = await finalizer.setRemoteTokenMessenger(domain, TOKEN_MESSENGER_V2);
    await tx.wait();
    console.log(`Allowed source domain ${domain} -> ${TOKEN_MESSENGER_V2}`);
  }

  // 5. Persist addresses
  const deployments = {
    network: "sepolia",
    chainId: 11155111,
    ConfidentialUSDC: cUSDCAddress,
    CUSDCUnwrapper: unwrapperAddress,
    CCTPFinalizer: finalizerAddress,
    messageTransmitterV2: MESSAGE_TRANSMITTER_V2_SEPOLIA,
    tokenMessengerV2: TOKEN_MESSENGER_V2,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
  };

  const outDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, "sepolia.json"),
    JSON.stringify(deployments, null, 2)
  );
  console.log("Addresses saved to deployments/sepolia.json");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
