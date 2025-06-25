import hre from "hardhat";
import { parseEther } from "viem";
import path from "path";
import * as fs from "fs";

const configDir = path.join(__dirname, "../../config")

export async function deploy() {
  const [deployer] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();

  console.log("deployer", deployer.account.address);
  console.log(
    "publicClient",
    await publicClient.getBalance({ address: deployer.account.address })
  );

  // deploy sol deposit verifier contract
  const verifier = await hre.viem.deployContract("SolDepositVerifier");
  console.log("verifier", verifier.address);

  // deploy solana evm bridge
  const bridge = await hre.viem.deployContract("SolanaEVMBridge", [
    verifier.address,
  ]);
  console.log("bridge", bridge.address);

  // deploy test token
  const totalSupply = 1000000n;
  const token = await hre.viem.deployContract("BridgeToken", [
    "BridgeToken",
    "BrTN",
    totalSupply,
  ]);
  console.log("token", token.address);

  // mint tokens to bridge contract
  const mintAmount = parseEther(`${totalSupply/2n}`); //1M
  await token.write.mint([bridge.address, mintAmount]);
  await token.write.mint([bridge.address, parseEther(`${totalSupply/4n}`)]);

  // Get token balances
  const userBalance = await token.read.balanceOf([deployer.account.address]);
  const bridgeBalance = await token.read.balanceOf([bridge.address]);

  console.log(`User token balance: ${userBalance}`);
  console.log(`Bridge token balance: ${bridgeBalance}`);

  // get second wallet address (only available on local networks)
  let secondWalletAddress = "";
  try {
    const [, secondWallet] = await hre.viem.getWalletClients();
    secondWalletAddress = secondWallet.account.address;
    console.log("secondWallet", secondWalletAddress);
  } catch (error) {
    console.log("Second wallet not available (likely on testnet/mainnet)");
  }

  const addressBook =  {
    verifierSmartContractAddress: verifier.address,
    bridgeSmartContractAddress: bridge.address,
    tokenSmartContractAddress: token.address,
    secondWalletAddress: secondWalletAddress,
    deployer: deployer.account.address
  }
  
  fs.writeFileSync(path.join(configDir, `${hre.network.name}_address_book.json`), JSON.stringify(addressBook, null, 2))
}

deploy()