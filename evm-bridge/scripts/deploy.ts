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
    verifierSmartContractAddress: verifier.address.toString(),
    bridgeSmartContractAddress: bridge.address.toString(),
    tokenSmartContractAddress: token.address.toString(),
    secondWalletAddress: secondWalletAddress,
    deployer: deployer.account.address
  }
  
  fs.writeFileSync(path.join(configDir, `${hre.network.name}_address_book.json`), JSON.stringify(addressBook, null, 2))

  //  update web/.env.local with public NEXT_PUBLIC_* keys for the frontend
  const envPath = path.join(__dirname, "../../web/.env.local");

  const envUpdates: Record<string, string> = {
    NEXT_PUBLIC_ETH_VERIFIER_SMART_CONTRACT_ADDRESS: verifier.address.toString(),
    NEXT_PUBLIC_ETH_BRIDGE_SMART_CONTRACT_ADDRESS: bridge.address.toString(),
    NEXT_PUBLIC_ETH_TOKEN_SMART_CONTRACT_ADDRESS: token.address.toString(),
  };

  function updateEnvFile(filePath: string, updates: Record<string, string>) {
    let original = "";
    try {
      original = fs.readFileSync(filePath, { encoding: "utf8" });
    } catch (e) {
      // If file doesn't exist, we'll create it
      original = "";
    }

    const lines = original.length > 0 ? original.split(/\n/) : [];
    const seenKeys = new Set<string>();

    // Prepare a set for keys we need to ensure are present
    const requiredKeys = new Set(Object.keys(updates));

    const updatedLines = lines.map((line) => {
      // Leave pure comments or empty lines untouched
      const trimmed = line.trim();
      if (trimmed.length === 0 || trimmed.startsWith("#")) return line;

      // Basic .env KEY=VALUE parsing (preserve comments at end of line)
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!match) return line;

      const key = match[1];
      const valueAndMaybeComment = match[2];

      if (!(key in updates)) return line;

      seenKeys.add(key);
      requiredKeys.delete(key);

      // Try to preserve trailing inline comments
      let valuePart = valueAndMaybeComment;
      let commentPart = "";

      // Split off a trailing comment if present (best-effort, not a full parser)
      const commentIdx = valueAndMaybeComment.indexOf("#");
      if (commentIdx >= 0) {
        valuePart = valueAndMaybeComment.slice(0, commentIdx).trimEnd();
        commentPart = valueAndMaybeComment.slice(commentIdx);
      }

      const newValue = updates[key];
      return `${key}=${newValue}${commentPart ? ` ${commentPart}` : ""}`;
    });

    // Append any missing keys at the end, preserving file if it had content
    const trailing = Array.from(requiredKeys).map((key) => `${key}=${updates[key]}`);
    const resultLines = updatedLines.length > 0 ? [...updatedLines, ...trailing] : trailing;

    // Ensure file ends with a newline
    const finalContent = resultLines.join("\n").replace(/\n?$/, "\n");
    fs.writeFileSync(filePath, finalContent, { encoding: "utf8" });
    console.log("Updated:", filePath);
  }

  updateEnvFile(envPath, envUpdates);
}

deploy()