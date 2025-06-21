import hre from "hardhat";
import { parseEther } from "viem";
import path from "path";
import * as fs from "fs";

const integrationTestsDir = path.join(__dirname, "../../integration-tests");

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
  const token = await hre.viem.deployContract("BridgeToken", [
    "BridgeToken",
    "BrTN",
    1000000n,
  ]);
  console.log("token", token.address);

  // mint tokens to bridge contract
  const mintAmount = parseEther("100000000"); //1M
  await token.write.mint([bridge.address, mintAmount]);

  // Get token balances
  const userBalance = await token.read.balanceOf([deployer.account.address]);
  const bridgeBalance = await token.read.balanceOf([bridge.address]);

  console.log(`User token balance: ${userBalance}`);
  console.log(`Bridge token balance: ${bridgeBalance}`);

  // get second wallet address from hardhat
  const [, secondWallet] = await hre.viem.getWalletClients();
  console.log("secondWallet", secondWallet.account.address);

  const addressBook =  {
    verifierSmartContractAddress: verifier.address,
    bridgeSmartContractAddress: bridge.address,
    tokenSmartContractAddress: token.address,
    secondWalletAddress: secondWallet.account.address,
  }

  fs.writeFileSync(path.join(integrationTestsDir, "addressBook.json"), JSON.stringify(addressBook, null, 2));
}

deploy()