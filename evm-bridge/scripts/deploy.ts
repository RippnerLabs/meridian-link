import hre from "hardhat";
import {parseEther, formatEther} from "viem";

async function main() {
  const [deployer] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();

  console.log("deployer", deployer.account.address);
  console.log("publicClient", await publicClient.getBalance({address: deployer.account.address}));

  // deploy sol deposit verifier contract
  const verifier = await hre.viem.deployContract("SolDepositVerifier");
  console.log("verifier", verifier.address);

  // deploy solana evm bridge
  const bridge = await hre.viem.deployContract("SolanaEVMBridge", [verifier.address]);
  console.log("bridge", bridge.address);

  // deploy test token
  const token = await hre.viem.deployContract("BridgeToken", ["BridgeToken", "BrTN", 1000000n]);
  console.log("token", token.address);

  // mint tokens to bridge contract
  const mintAmount = parseEther("10000"); //10k
  await token.write.mint([bridge.address, mintAmount]);
}

main()