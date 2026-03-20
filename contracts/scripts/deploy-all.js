const { execFileSync } = require("child_process");
const path = require("path");

const contractsDir = path.resolve(__dirname, "..");
const frontendDir = path.resolve(contractsDir, "..", "frontend");

function run(command, args, cwd) {
  console.log(`\n> ${command} ${args.join(" ")}`);
  execFileSync(command, args, {
    cwd,
    stdio: "inherit",
  });
}

function main() {
  run("npx", ["hardhat", "run", "scripts/deploy-sepolia.ts", "--network", "sepolia"], contractsDir);
  run("node", ["scripts/sync-deployments.js"], frontendDir);

  console.log("\nDeployment complete.");
  console.log("Frontend env updated at frontend/.env.local");
}

try {
  main();
} catch (error) {
  console.error("\nDeployment failed.");
  process.exitCode = 1;
}
