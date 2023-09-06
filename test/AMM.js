const { expect } = require("chai");
const { ethers } = require("hardhat");

const tokens = (n) => {
  return ethers.parseUnits(n.toString(), "ether");
};

const ether = tokens;
const shares = ether;

describe("AMM", () => {
  let accounts, deployer, liquidityProvider, investor1, investor2;

  let token1, token2, amm;

  beforeEach(async () => {
    //Setup Accounts
    accounts = await ethers.getSigners();
    deployer = accounts[0];
    liquidityProvider = accounts[1];
    investor1 = accounts[2];
    investor2 = accounts[3];

    //Deploy Token contracts
    const Token = await ethers.getContractFactory("Token");
    token1 = await Token.deploy("GASton", "GSNT", "1000000");
    token2 = await Token.deploy("USD Token", "USD", "1000000");

    //Send tokens to liquidity provider
    let transaction = await token1
      .connect(deployer)
      .transfer(liquidityProvider.address, tokens(100000));
    await transaction.wait();

    transaction = await token2
      .connect(deployer)
      .transfer(liquidityProvider.address, tokens(100000));
    await transaction.wait();

    //Send token1 tokens to investor 1
    transaction = await token1
      .connect(deployer)
      .transfer(investor1.address, tokens(100000));
    await transaction.wait();

    //Send token2 tokens to investor 2
    transaction = await token2
      .connect(deployer)
      .transfer(investor2.address, tokens(100000));
    await transaction.wait();

    //Deploy AMM
    const AMM = await ethers.getContractFactory("AMM");
    amm = await AMM.deploy(token1.getAddress(), token2.getAddress());
  });

  describe("Deployment", () => {
    it("has an address", async () => {
      expect(await amm.address).to.not.equal(0x0);
    });

    it("returns token1 address", async () => {
      expect(await amm.token1()).to.equal(await token1.getAddress());
    });
    it("returns token2 address", async () => {
      expect(await amm.token2()).to.equal(await token2.getAddress());
    });
  });

  describe("Swapping tokens", () => {
    let amount, transaction, result, estimate, balance;

    it("facilitates swaps", async () => {
      //Deployer approves 100k tokens
      amount = tokens(100000);
      transaction = await token1
        .connect(deployer)
        .approve(amm.getAddress(), amount);
      await transaction.wait();

      transaction = await token2
        .connect(deployer)
        .approve(amm.getAddress(), amount);
      await transaction.wait();

      //Deployer adds liquidity
      transaction = await amm.connect(deployer).addLiquidity(amount, amount);
      await transaction.wait();

      //Checks AMM receives tokens
      expect(await token1.balanceOf(amm.getAddress())).to.equal(amount);
      expect(await token2.balanceOf(amm.getAddress())).to.equal(amount);

      //Checks balance token1 and token2 in AMM
      expect(await amm.token1Balance()).to.equal(amount);
      expect(await amm.token2Balance()).to.equal(amount);
      expect(await amm.K()).to.equal(
        (await amm.token1Balance()) * (await amm.token2Balance())
      );

      //Checks deployer has 100 shares
      expect(await amm.shares(deployer.getAddress())).to.equal(tokens(100));

      //Checks pool has 100 shares
      expect(await amm.totalShares()).to.equal(tokens(100));

      ///////////////////////////////////////////////////////////////////////////
      //LP adds more liquidity

      // LP approves 50k tokens
      amount = tokens(50000);
      transaction = await token1
        .connect(liquidityProvider)
        .approve(amm.getAddress(), amount);
      await transaction.wait();

      transaction = await token2
        .connect(liquidityProvider)
        .approve(amm.getAddress(), amount);
      await transaction.wait();

      //calculate token2 Deposit amount
      let token2Deposit = await amm.calculateToken2Deposit(amount);

      // LP adds liquidity
      transaction = await amm
        .connect(liquidityProvider)
        .addLiquidity(amount, token2Deposit);
      await transaction.wait();

      // LP Should have 50 shares
      expect(await amm.shares(liquidityProvider.address)).to.equal(tokens(50));

      //Checks deployer still has 100 shares
      expect(await amm.shares(deployer.address)).to.equal(tokens(100));

      //Checks total shares has increase to 150 shares
      expect(await amm.totalShares()).to.equal(tokens(150));

      ///////////////////////////////////////////////////////////////////////////
      // Investor1 swaps
      //

      //Check price before swapping
      console.log(
        `Price: ${(await amm.token2Balance()) / (await amm.token1Balance())}\n`
      );

      // Investor1 approves all tokens
      transaction = await token1
        .connect(investor1)
        .approve(amm.getAddress(), tokens(100000));
      await transaction.wait();

      //check investor 1 balance before swap
      balance = await token2.balanceOf(investor1.address);
      console.log(
        `Investor1 token2 balance before swap: ${ethers.formatEther(balance)}\n`
      );
      // Estimate amount of tokens investor1 will recieve after swapping token1: inclde slippage
      estimate = await amm.calculateToken1Swap(tokens(1));
      console.log(
        `Token2 amount investor1 will receive after swap: ${ethers.formatEther(
          estimate
        )}\n`
      );
      //Investor1 swaps 1 token1
      transaction = await amm.connect(investor1).swapToken1(tokens(1));
      result = await transaction.wait();

      //Check swap event
      await expect(transaction)
        .to.emit(amm, "Swap")
        .withArgs(
          await investor1.getAddress(),
          await token1.getAddress(),
          tokens(1),
          await token2.getAddress(),
          estimate,
          await amm.token1Balance(),
          await amm.token2Balance(),
          (
            await ethers.provider.getBlock(
              await ethers.provider.getBlockNumber()
            )
          ).timestamp
        );

      // Check investor1 balance after swap
      balance = await token2.balanceOf(investor1.address);
      console.log(
        `Investor1 token2 balance after swap: ${ethers.formatEther(balance)}\n`
      );
      expect(estimate).to.equal(balance);

      // Checks AMM token balances are in sync
      expect(await token1.balanceOf(amm.getAddress())).to.equal(
        await amm.token1Balance()
      );
      expect(await token2.balanceOf(amm.getAddress())).to.equal(
        await amm.token2Balance()
      );

      //Check price after swapping
      console.log(
        `Price: ${
          ethers.formatEther(await amm.token2Balance()) /
          ethers.formatEther(await amm.token1Balance())
        }\n`
      );

      ///////////////////////////////////////////////////////////////////////////
      // Investor1 swaps tokens again
      //

      //Checks again investor1, token2 balance before swap
      balance = await token2.balanceOf(investor1.address);
      console.log(
        `Investor1 token2 balance before swap: ${ethers.formatEther(balance)}\n`
      );
      // Estimate amount of tokens investor1 will recieve after swapping token1: inclde slippage
      estimate = await amm.calculateToken1Swap(tokens(1));
      console.log(
        `Token2 amount investor1 will receive after swap: ${ethers.formatEther(
          estimate
        )}\n`
      );
      //Investor1 swaps 1 token1
      transaction = await amm.connect(investor1).swapToken1(tokens(1));
      await transaction.wait();

      // Check investor1 balance after swap
      balance = await token2.balanceOf(investor1.address);
      console.log(
        `Investor1 token2 balance after swap: ${ethers.formatEther(balance)}\n`
      );

      // Checks AMM token balances are in sync
      expect(await token1.balanceOf(amm.getAddress())).to.equal(
        await amm.token1Balance()
      );
      expect(await token2.balanceOf(amm.getAddress())).to.equal(
        await amm.token2Balance()
      );

      //Check price after swapping again
      console.log(
        `Price: ${
          ethers.formatEther(await amm.token2Balance()) /
          ethers.formatEther(await amm.token1Balance())
        }\n`
      );

      ///////////////////////////////////////////////////////////////////////////
      // Investor1 Swaps Large Amount
      //

      //Checks again investor1, token2 balance before swap
      balance = await token2.balanceOf(investor1.address);
      console.log(
        `Investor1 token2 balance before swap: ${ethers.formatEther(balance)}\n`
      );
      // Estimate amount of tokens investor1 will recieve after swapping token1: inclde slippage
      estimate = await amm.calculateToken1Swap(tokens(100));
      console.log(
        `Token2 amount investor1 will receive after swap: ${ethers.formatEther(
          estimate
        )}\n`
      );

      //Investor1 swaps 50,000 token1
      transaction = await amm.connect(investor1).swapToken1(tokens(100));
      await transaction.wait();

      // Check investor1 balance after swap
      balance = await token2.balanceOf(investor1.address);
      console.log(
        `Investor1 token2 balance after swap: ${ethers.formatEther(balance)}\n`
      );

      // Checks AMM token balances are in sync
      expect(await token1.balanceOf(amm.getAddress())).to.equal(
        await amm.token1Balance()
      );
      expect(await token2.balanceOf(amm.getAddress())).to.equal(
        await amm.token2Balance()
      );

      //Check price after swapping again
      console.log(
        `Price: ${
          ethers.formatEther(await amm.token2Balance()) /
          ethers.formatEther(await amm.token1Balance())
        }\n`
      );

      ///////////////////////////////////////////////////////////////////////////
      // Investor2 swaps
      //

      //Investor2 approves all tokens
      transaction = await token2
        .connect(investor2)
        .approve(amm.getAddress(), tokens(100000));
      await transaction.wait();

      //Check investor2 Balance before swap
      balance = await token1.balanceOf(investor2.address);
      console.log(
        `Investor2 token1 balance before swap: ${ethers.formatEther(balance)}\n`
      );

      // Estimate amount of tokens investor2 will recieve after swapping token2: inclde slippage
      estimate = await amm.calculateToken2Swap(tokens(1));
      console.log(
        `Token1 amount investor2 will receive after swap: ${ethers.formatEther(
          estimate
        )}\n`
      );

      //Investor2 swaps 1 token2
      transaction = await amm.connect(investor2).swapToken2(tokens(1));
      await transaction.wait();

      //Check swap event
      await expect(transaction)
        .to.emit(amm, "Swap")
        .withArgs(
          await investor2.getAddress(),
          await token2.getAddress(),
          tokens(1),
          await token1.getAddress(),
          estimate,
          await amm.token1Balance(),
          await amm.token2Balance(),
          (
            await ethers.provider.getBlock(
              await ethers.provider.getBlockNumber()
            )
          ).timestamp
        );

      // Check investor2 balance after swap
      balance = await token1.balanceOf(investor2.address);
      console.log(
        `Investor2 token1 balance after swap: ${ethers.formatEther(balance)}\n`
      );
      expect(estimate).to.equal(balance);

      // Checks AMM token balances are in sync
      expect(await token1.balanceOf(amm.getAddress())).to.equal(
        await amm.token1Balance()
      );
      expect(await token2.balanceOf(amm.getAddress())).to.equal(
        await amm.token2Balance()
      );

      //Check price after swapping
      console.log(
        `Price: ${
          ethers.formatEther(await amm.token2Balance()) /
          ethers.formatEther(await amm.token1Balance())
        }\n`
      );

      ///////////////////////////////////////////////////////////////////////////
      // Removing Liquidity
      //
      console.log(
        `AMM Token1 Balance: ${ethers.formatEther(await amm.token1Balance())}\n`
      );
      console.log(
        `AMM Token2 Balance: ${ethers.formatEther(await amm.token2Balance())}\n`
      );

      //Check LP balance before removing tokens
      balance = await token1.balanceOf(liquidityProvider.address);
      console.log(
        `Liquidity Provider Token1 balance before removing funds:${ethers.formatEther(
          balance
        )}\n`
      );

      balance = await token2.balanceOf(liquidityProvider.address);
      console.log(
        `Liquidity Provider Token2 balance before removing funds:${ethers.formatEther(
          balance
        )}\n`
      );

      // LP removes tokens
      transaction = await amm
        .connect(liquidityProvider)
        .removeLiquidity(shares(50));
      await transaction.wait();

      //Check LP balance after removing tokens
      balance = await token1.balanceOf(liquidityProvider.address);
      console.log(
        `Liquidity Provider Token1 balance after removing funds:${ethers.formatEther(
          balance
        )}\n`
      );

      balance = await token2.balanceOf(liquidityProvider.address);
      console.log(
        `Liquidity Provider Token2 balance after removing funds:${ethers.formatEther(
          balance
        )}\n`
      );

      //LP should have 0 shares
      expect(await amm.shares(liquidityProvider.address)).to.equal(0);

      //Deployer should have 100 shares
      expect(await amm.shares(deployer.address)).to.equal(shares(100));

      //AMM pool total shares should be 100
      expect(await amm.totalShares()).to.equal(shares(100));

      // Check AMM balance after withdraw
      console.log(
        `AMM Token1 Balance: ${ethers.formatEther(await amm.token1Balance())}\n`
      );
      console.log(
        `AMM Token2 Balance: ${ethers.formatEther(await amm.token2Balance())}\n`
      );
    });
  });
});
