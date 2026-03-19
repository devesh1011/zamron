import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

type SepoliaDeployments = {
  network: string;
  chainId: number;
  ConfidentialUSDC: string;
  CUSDCUnwrapper?: string;
  CCTPFinalizer?: string;
  messageTransmitterV2?: string;
  tokenMessengerV2?: string;
  deployer?: string;
  timestamp?: string;
};

async function main() {
  const deploymentsPath = path.join(__dirname, "..", "deployments", "sepolia.json");
  if (!fs.existsSync(deploymentsPath)) {
    throw new Error("deployments/sepolia.json not found. Deploy Sepolia first.");
  }

  const deployments = JSON.parse(
    fs.readFileSync(deploymentsPath, "utf8"),
  ) as SepoliaDeployments;

  if (!deployments.ConfidentialUSDC) {
    throw new Error("ConfidentialUSDC address missing from deployments/sepolia.json");
  }

  const [deployer] = await ethers.getSigners();
  console.log("Deploying new CUSDCUnwrapper with:", deployer.address);
  console.log("Using existing ConfidentialUSDC:", deployments.ConfidentialUSDC);

  const CUSDCUnwrapper = await ethers.getContractFactory("CUSDCUnwrapper");
  const unwrapper = await CUSDCUnwrapper.deploy(deployments.ConfidentialUSDC);
  await unwrapper.waitForDeployment();

  const unwrapperAddress = await unwrapper.getAddress();
  console.log("CUSDCUnwrapper deployed at:", unwrapperAddress);

  const updatedDeployments: SepoliaDeployments = {
    ...deployments,
    CUSDCUnwrapper: unwrapperAddress,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(deploymentsPath, JSON.stringify(updatedDeployments, null, 2));
  console.log("Updated deployments/sepolia.json");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
