import { run } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const deploymentsPath = path.join(__dirname, "..", "deployments", "sepolia.json");
  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));

  console.log("Verifying ConfidentialUSDC...");
  await run("verify:verify", {
    address: deployments.ConfidentialUSDC,
    constructorArguments: ["Confidential USDC", "cUSDC", ""],
    contract: "contracts/ConfidentialUSDC.sol:ConfidentialUSDC",
  });

  console.log("Verifying CUSDCUnwrapper...");
  await run("verify:verify", {
    address: deployments.CUSDCUnwrapper,
    constructorArguments: [deployments.ConfidentialUSDC],
    contract: "contracts/CUSDCUnwrapper.sol:CUSDCUnwrapper",
  });

  console.log("Verifying CCTPFinalizer...");
  await run("verify:verify", {
    address: deployments.CCTPFinalizer,
    constructorArguments: [deployments.messageTransmitterV2, deployments.ConfidentialUSDC],
    contract: "contracts/CCTPFinalizer.sol:CCTPFinalizer",
  });

  console.log("All contracts verified!");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
