import { ethers } from "ethers";
import { setProvider, setNetwork, setAccount } from "./reducers/provider";
import { setContracts, setSymbols, balancesLoaded } from "./reducers/tokens";
import {
  setContract,
  sharesLoaded,
  swapsLoaded,
  depositRequest,
  depositSuccess,
  depositFail,
  withdrawRequest,
  withdrawSuccess,
  withdrawFail,
  swapRequest,
  swapSuccess,
  swapFail,
} from "./reducers/amm";

// ABIs: Import contract ABIs here
import TOKEN_ABI from "../abis/Token.json";
// ABIs: Import contract ABIs here
import AMM_ABI from "../abis/AMM.json";
// Config: Import network config here
import config from "../config.json";

export const loadProvider = (dispatch) => {
  const provider = new ethers.BrowserProvider(window.ethereum);
  dispatch(setProvider(provider));

  return provider;
};

export const loadNetwork = async (provider, dispatch) => {
  const { chainId } = await provider.getNetwork();
  dispatch(setNetwork(chainId.toString()));

  return chainId;
};

export const loadAccount = async (dispatch) => {
  const accounts = await window.ethereum.request({
    method: "eth_requestAccounts",
  });
  const account = ethers.getAddress(accounts[0]);
  dispatch(setAccount(account));

  return account;
};

//---------------------------------------------------------------------------
//Load Contracts
export const loadTokens = async (provider, chainId, dispatch) => {
  const gsnt = new ethers.Contract(
    config[chainId].GASton.address,
    TOKEN_ABI,
    provider
  );
  const usd = new ethers.Contract(
    config[chainId].Usd.address,
    TOKEN_ABI,
    provider
  );
  dispatch(setContracts([gsnt, usd]));
  dispatch(setSymbols([await gsnt.symbol(), await usd.symbol()]));
};
export const loadAMM = async (provider, chainId, dispatch) => {
  const amm = new ethers.Contract(
    config[chainId].amm.address,
    AMM_ABI,
    provider
  );

  dispatch(setContract(amm));

  return amm;
};

//---------------------------------------------------------------------------
//Load Balances and Shares
export const loadBalances = async (amm, tokens, account, dispatch) => {
  const balance1 = await tokens[0].balanceOf(account);
  const balance2 = await tokens[1].balanceOf(account);

  dispatch(
    balancesLoaded([
      ethers.formatUnits(balance1.toString(), "ether"),
      ethers.formatUnits(balance2.toString(), "ether"),
    ])
  );
  const shares = await amm.shares(account);
  dispatch(sharesLoaded(ethers.formatUnits(shares.toString(), "ether")));
};

//---------------------------------------------------------------------------
//Add Liquidity

export const addLiquidity = async (provider, amm, tokens, amount, dispatch) => {
  try {
    dispatch(depositRequest());

    const signer = await provider.getSigner();
    let transaction;

    transaction = await tokens[0]
      .connect(signer)
      .approve(amm.getAddress(), amount[0]);
    await transaction.wait();

    transaction = await tokens[1]
      .connect(signer)
      .approve(amm.getAddress(), amount[1]);
    await transaction.wait();

    transaction = await amm.connect(signer).addLiquidity(amount[0], amount[1]);
    await transaction.wait();

    dispatch(depositSuccess(transaction.hash));
  } catch (error) {
    dispatch(depositFail());
  }
};

//---------------------------------------------------------------------------
//Remove Liquidity

export const removeLiquidity = async (provider, amm, shares, dispatch) => {
  try {
    dispatch(withdrawRequest());

    const signer = await provider.getSigner();

    let transaction = await amm.connect(signer).removeLiquidity(shares);
    await transaction.wait();

    dispatch(withdrawSuccess(transaction.hash));
  } catch (error) {
    dispatch(withdrawFail());
  }
};

//---------------------------------------------------------------------------
//Swap

export const swap = async (provider, amm, token, symbol, amount, dispatch) => {
  try {
    dispatch(swapRequest());

    let transaction;
    const signer = await provider.getSigner();

    transaction = await token.connect(signer).approve(amm.getAddress(), amount);
    await transaction.wait();

    if (symbol === "GSNT") {
      transaction = await amm.connect(signer).swapToken1(amount);
    } else {
      transaction = await amm.connect(signer).swapToken2(amount);
    }
    await transaction.wait();

    dispatch(swapSuccess(transaction.hash));
  } catch (error) {
    dispatch(swapFail());
  }
};

//---------------------------------------------------------------------------
//LOAD ALL SWAPS
export const loadAllSwaps = async (provider, amm, dispatch) => {
  const block = await provider.getBlockNumber();

  const swapStream = await amm.queryFilter("Swap", 0, block);
  // console.log(swapStream);
  const swaps = swapStream.map((event) => {
    return {
      hash: event.transactionHash,
      args: event.args,
    };
  });
  // console.log(swaps);
  // console.log(swaps[1].args);
  // const serializedSwaps = swaps.map((swap) => {
  //   const serializedArgs = Object.entries(swap.args).reduce(
  //     (acc, [key, value]) => {
  //       acc[key] = typeof value === "bigint" ? value : value;
  //       return acc;
  //     },
  //     {}
  //   );
  //   return {
  //     hash: swap.hash,
  //     args: serializedArgs,
  //   };
  // });

  // console.log(serializedSwaps);
  // dispatch(swapsLoaded(serializedSwaps));
  dispatch(swapsLoaded(swaps));
};
