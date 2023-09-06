const hre = require("hardhat");
const config = require("../src/config.json");
const { ethers } = require("hardhat");

const tokens = (n) => {
  return ethers.parseUnits(n.toString(), "ether");
};

const ether = tokens;
const shares = ether;

async function main() {
  // Fetch Accounts
  console.log(`Fetching accounts & network \n`);
  const accounts = await ethers.getSigners();
  const deployer = accounts[0];
  const investor1 = accounts[1];
  const investor2 = accounts[2];
  const investor3 = accounts[3];
  const investor4 = accounts[4];

  //Fetch network
  const { chainId } = await ethers.provider.getNetwork();
  console.log(`Fetching token and transferring to accounts...\n`);

  //Fetch GASton Token
  const gsnt = await ethers.getContractAt(
    "Token",
    config[chainId].GASton.address
  );
  console.log(`GASton Token fetch: ${await gsnt.getAddress()}\n`);

  //Fetch Usd Token
  const usd = await ethers.getContractAt("Token", config[chainId].Usd.address);
  console.log(`USD Token fetch: ${await usd.getAddress()}\n`);

  //Fetch AMM Token
  const amm = await ethers.getContractAt("AMM", config[chainId].amm.address);
  console.log(`AMM fetch: ${await amm.getAddress()}\n`);

  ///////////////////////////////////////////////////////////////////////////////
  // Distribute Tokens to Investors
  //

  let transaction;

  //Send gsnt tokens to investor 1
  transaction = await gsnt
    .connect(deployer)
    .transfer(investor1.address, tokens(10));
  await transaction.wait();

  //Send usd tokens to investor 2
  transaction = await usd
    .connect(deployer)
    .transfer(investor2.address, tokens(10));
  await transaction.wait();

  //Send gsnt tokens to investor 3
  transaction = await gsnt
    .connect(deployer)
    .transfer(investor3.address, tokens(10));
  await transaction.wait();

  //Send usd tokens to investor 4
  transaction = await usd
    .connect(deployer)
    .transfer(investor4.address, tokens(10));
  await transaction.wait();

  ///////////////////////////////////////////////////////////////////////////////
  // Adding liquidity
  //

  let amount = tokens(100);

  //Deployer approves gsnt tokens
  transaction = await gsnt
    .connect(deployer)
    .approve(await amm.getAddress(), amount);
  await transaction.wait();

  //Deployer approves usd tokens
  transaction = await usd
    .connect(deployer)
    .approve(await amm.getAddress(), amount);
  await transaction.wait();

  // Deployer adds liquidity
  console.log(`Adding Liquidity...\n`);

  transaction = await amm.connect(deployer).addLiquidity(amount, amount);
  await transaction.wait();

  ///////////////////////////////////////////////////////////////////////////////
  // Investor1 Swaps: Gsnt --> USD
  //
  console.log(`Investor1 Swaps...\n`);

  //Investor1 approves gsnt tokens
  transaction = await gsnt
    .connect(investor1)
    .approve(await amm.getAddress(), tokens(10));
  await transaction.wait();

  //Investor1 swaps
  transaction = await amm.connect(investor1).swapToken1(tokens(1));
  await transaction.wait();

  ///////////////////////////////////////////////////////////////////////////////
  // Investor2 Swaps: USD --> Gsnt
  //

  console.log(`Investor2 Swaps...\n`);

  //Investor2 approves usd tokens
  transaction = await usd
    .connect(investor2)
    .approve(await amm.getAddress(), tokens(10));
  await transaction.wait();

  //Investor1 swaps
  transaction = await amm.connect(investor2).swapToken2(tokens(1));
  await transaction.wait();

  ///////////////////////////////////////////////////////////////////////////////
  // Investor3 Swaps: Gsnt --> USD
  //

  console.log(`Investor3 Swaps...\n`);

  //Investor3 approves gsnt tokens
  transaction = await gsnt
    .connect(investor3)
    .approve(await amm.getAddress(), tokens(10));
  await transaction.wait();

  //Investor3 swaps
  transaction = await amm.connect(investor3).swapToken1(tokens(10));
  await transaction.wait();

  ///////////////////////////////////////////////////////////////////////////////
  // Investor4 Swaps: USD --> Gsnt
  //

  console.log(`Investor4 Swaps...\n`);

  //Investor4 approves usd tokens
  transaction = await usd
    .connect(investor4)
    .approve(await amm.getAddress(), tokens(10));
  await transaction.wait();

  //Investor4 swaps 5 tokens
  transaction = await amm.connect(investor4).swapToken2(tokens(5));
  await transaction.wait();

  console.log(`Finished.\n`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
