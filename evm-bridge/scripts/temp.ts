import hre from "hardhat";
import path from "path";
import * as fs from "fs";

export async function Test() {
  const [deployer] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();

  // transfer 10 eth to 0xAA8db4913EBb2B3d8bf8234B771a1b967c26FD00
  const transferAmount = BigInt("10000000000000000000"); // 10 eth
  const hash = await deployer.sendTransaction({
    to: "0xAA8db4913EBb2B3d8bf8234B771a1b967c26FD00",
    value: transferAmount
  });
  const receipt = await publicClient.waitForTransactionReceipt({hash});
  console.log("receipt", receipt);
  console.log("transferAmount", transferAmount);
  console.log("hash", hash);
  console.log("deployer", deployer.account.address);
  console.log("publicClient", await publicClient.getBalance({address: deployer.account.address}));
  console.log("receipt", receipt);
  console.log("transferAmount", transferAmount);
  console.log("hash", hash);
  console.log("deployer", deployer.account.address);
  console.log("publicClient", await publicClient.getBalance({address: deployer.account.address}));
}

Test()