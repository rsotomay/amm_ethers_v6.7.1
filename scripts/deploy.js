// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

async function main() {
  // Deploy Token 1
  const Gsnt = await hre.ethers.deployContract("Token", [
    "GASton Token",
    "GSNT",
    "1000000",
  ]);
  await Gsnt.waitForDeployment();
  console.log(`GASton Token Deployed to: ${Gsnt.target}\n`);

  // Deploy Token 2
  const Usd = await hre.ethers.deployContract("Token", [
    "USD Token",
    "USD",
    "1000000",
  ]);
  await Usd.waitForDeployment();
  console.log(`USD Token Deployed to: ${Usd.target}\n`);

  // Deploy AMM
  const AMM = await hre.ethers.deployContract("AMM", [Gsnt.target, Usd.target]);
  await AMM.waitForDeployment();
  console.log(`AMM Deployed to: ${AMM.target}\n`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
