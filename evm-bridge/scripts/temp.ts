import hre from "hardhat";
import path from "path";
import * as fs from "fs";

export async function Test() {
  const [deployer] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();

  const addressBookPath = path.join(
    __dirname,
    "../../config",
    `${hre.network.name}_address_book.json`
  );
  const addressBook = JSON.parse(fs.readFileSync(addressBookPath, "utf-8"));
  const tokenAddress = addressBook.tokenSmartContractAddress as `0x${string}`;

  const code = await publicClient.getBytecode({ address: tokenAddress });
  if (!code) {
    console.error("No contract code found at token address on", hre.network.name);
    console.error("Address from address book:", tokenAddress);
    console.error("Hint: re-run deploy or update address book for this network.");
    process.exit(1);
  }

  const brtn = await hre.viem.getContractAt("BridgeToken", tokenAddress);

  const tokenBalance = await brtn.read.balanceOf([deployer.account.address]);
  console.log("network:", hre.network.name);
  console.log("token:", tokenAddress);
  console.log("user:", deployer.account.address);
  console.log("tokenBalance:", tokenBalance);
}

Test()