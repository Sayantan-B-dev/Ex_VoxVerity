const hre = require("hardhat");

async function main() {
  console.log("Deploying VoiceIntegrityRegistry...");

  const Registry = await hre.ethers.getContractFactory("VoiceIntegrityRegistry");
  const registry = await Registry.deploy();

  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log(`VoiceIntegrityRegistry deployed to: ${address}`);
  console.log(`Network: ${hre.network.name}`);
  console.log(`Chain ID: ${hre.network.config.chainId}`);

  // Save deployment info
  const fs = require("fs");
  const deploymentInfo = {
    contractAddress: address,
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    deployedAt: new Date().toISOString(),
    deployer: (await hre.ethers.getSigners())[0].address,
  };

  const deploymentPath = `./deployments/${hre.network.name}.json`;
  fs.mkdirSync("./deployments", { recursive: true });
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`Deployment info saved to: ${deploymentPath}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
