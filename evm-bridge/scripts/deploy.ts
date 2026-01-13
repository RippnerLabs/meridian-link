import hre from "hardhat";
import { parseEther, createWalletClient, createPublicClient, http, formatEther, encodeDeployData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia, hardhat } from "viem/chains";
import path from "path";
import * as fs from "fs";

const configDir = path.join(__dirname, "../../config")

// Get the appropriate chain config based on network
function getChainConfig() {
  const networkName = hre.network.name;
  if (networkName === "sepolia") {
    return { chain: sepolia, transport: http(process.env.SEPOLIA_URL) };
  }
  return { chain: hardhat, transport: http("http://127.0.0.1:8545") };
}

export async function deploy() {
  const networkName = hre.network.name;
  const isRemoteNetwork = networkName === "sepolia";
  
  let deployer: any;
  let publicClient: any;
  let deployerAddress: `0x${string}`;

  if (isRemoteNetwork) {
    // For remote networks (Sepolia), create a local account to sign transactions
    const privateKey = process.env.ETH_BRIDGE_DEPLOYER_PRIVKEY as `0x${string}`;
    if (!privateKey) {
      throw new Error("ETH_BRIDGE_DEPLOYER_PRIVKEY not set in environment");
    }
    
    const account = privateKeyToAccount(privateKey);
    const { chain, transport } = getChainConfig();
    
    deployer = createWalletClient({
      account,
      chain,
      transport,
    });
    
    publicClient = createPublicClient({
      chain,
      transport,
    });
    
    deployerAddress = account.address;
  } else {
    // For local networks, use hardhat's built-in wallet clients
    [deployer] = await hre.viem.getWalletClients();
    publicClient = await hre.viem.getPublicClient();
    deployerAddress = deployer.account.address;
  }

  console.log("Network:", networkName);
  console.log("Deployer:", deployerAddress);
  
  const balance = await publicClient.getBalance({ address: deployerAddress });
  console.log("Balance:", formatEther(balance), "ETH");

  if (balance === 0n) {
    throw new Error("Deployer account has no ETH. Please fund the account first.");
  }

  // Deploy using the appropriate method
  async function deployContractWithSigner(contractName: string, args: any[] = []) {
    if (isRemoteNetwork) {
      // For remote networks, compile and deploy manually
      const artifact = await hre.artifacts.readArtifact(contractName);
      
      // Encode constructor arguments
      const deployData = encodeDeployData({
        abi: artifact.abi,
        bytecode: artifact.bytecode as `0x${string}`,
        args,
      });

      // Estimate gas for deployment
      const gasEstimate = await publicClient.estimateGas({
        account: deployerAddress,
        data: deployData,
      });

      // Add 20% buffer to gas estimate
      const gasLimit = (gasEstimate * 120n) / 100n;

      // Send deployment transaction
      const hash = await deployer.sendTransaction({
        data: deployData,
        gas: gasLimit,
      });

      console.log(`Deploying ${contractName}... tx: ${hash}`);

      // Wait for transaction receipt
      const receipt = await publicClient.waitForTransactionReceipt({ 
        hash,
        confirmations: 2, // Wait for 2 confirmations on testnet
      });
      
      if (!receipt.contractAddress) {
        throw new Error(`Failed to deploy ${contractName}`);
      }

      console.log(`${contractName} deployed at: ${receipt.contractAddress}`);

      // Return a contract instance
      return await hre.viem.getContractAt(contractName, receipt.contractAddress);
    } else {
      // For local networks, use hardhat-viem
      return await hre.viem.deployContract(contractName, args);
    }
  }

  // deploy sol deposit verifier contract
  console.log("\nDeploying SolDepositVerifier...");
  const verifier = await deployContractWithSigner("SolDepositVerifier");
  console.log("Verifier:", verifier.address);

  // deploy solana evm bridge
  console.log("\nDeploying SolanaEVMBridge...");
  const bridge = await deployContractWithSigner("SolanaEVMBridge", [verifier.address]);
  console.log("Bridge:", bridge.address);

  // deploy test token
  console.log("\nDeploying BridgeToken...");
  const totalSupply = 1000000n;
  const token = await deployContractWithSigner("BridgeToken", [
    "BridgeToken",
    "BrTN",
    totalSupply,
  ]);
  console.log("Token:", token.address);

  // mint tokens to bridge contract
  console.log("\nMinting tokens to bridge...");
  const mintAmount = parseEther(`${totalSupply/2n}`);
  
  if (isRemoteNetwork) {
    // For remote networks, mint using the wallet client
    const hash1 = await deployer.writeContract({
      address: token.address,
      abi: token.abi,
      functionName: "mint",
      args: [bridge.address, mintAmount],
    });
    console.log("Minting 500k tokens... tx:", hash1);
    await publicClient.waitForTransactionReceipt({ hash: hash1, confirmations: 2 });
    
    const hash2 = await deployer.writeContract({
      address: token.address,
      abi: token.abi,
      functionName: "mint",
      args: [bridge.address, parseEther(`${totalSupply/4n}`)],
    });
    console.log("Minting 250k tokens... tx:", hash2);
    await publicClient.waitForTransactionReceipt({ hash: hash2, confirmations: 2 });
  } else {
    await token.write.mint([bridge.address, mintAmount]);
    await token.write.mint([bridge.address, parseEther(`${totalSupply/4n}`)]);
  }

  // Get token balances
  const userBalance = await token.read.balanceOf([deployerAddress]) as bigint;
  const bridgeBalance = await token.read.balanceOf([bridge.address]) as bigint;

  console.log(`\nToken Balances:`);
  console.log(`User token balance: ${formatEther(userBalance)} BrTN`);
  console.log(`Bridge token balance: ${formatEther(bridgeBalance)} BrTN`);

  // get second wallet address (only available on local networks)
  let secondWalletAddress = "";
  if (!isRemoteNetwork) {
    try {
      const [, secondWallet] = await hre.viem.getWalletClients();
      secondWalletAddress = secondWallet.account.address;
      console.log("secondWallet", secondWalletAddress);
    } catch (error) {
      console.log("Second wallet not available");
    }
  }

  const addressBook = {
    verifierSmartContractAddress: verifier.address.toString(),
    bridgeSmartContractAddress: bridge.address.toString(),
    tokenSmartContractAddress: token.address.toString(),
    secondWalletAddress: secondWalletAddress,
    deployer: deployerAddress,
    network: networkName,
    chainId: isRemoteNetwork ? 11155111 : 31337,
  }
  
  // Ensure config directory exists
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  fs.writeFileSync(path.join(configDir, `${hre.network.name}_address_book.json`), JSON.stringify(addressBook, null, 2))
  console.log(`\nAddress book saved to: ${path.join(configDir, `${hre.network.name}_address_book.json`)}`);

  //  update web/.env.local with public NEXT_PUBLIC_* keys for the frontend
  const envPath = isRemoteNetwork 
    ? path.join(__dirname, "../../web/.env.test")
    : path.join(__dirname, "../../web/.env.local");

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

  console.log("\nDeployment complete!");
  console.log("\nSummary:");
  console.log(`   Network: ${networkName}`);
  console.log(`   Verifier: ${verifier.address}`);
  console.log(`   Bridge: ${bridge.address}`);
  console.log(`   Token: ${token.address}`);
}

deploy().catch((error) => {
  console.error("Deployment failed:", error);
  process.exit(1);
});
