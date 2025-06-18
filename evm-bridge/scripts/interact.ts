import hre from "hardhat";
import { parseEther, formatEther } from "viem";


async function main() {
  // Contract addresses from deployment
  const VERIFIER_ADDRESS = "0x5fbdb2315678afecb367f032d93f642f64180aa3";
  const BRIDGE_ADDRESS = "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512";
  const TOKEN_ADDRESS = "0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0";
  
  // Get clients
  const [deployer] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();
  
  // Get contract instances
  const bridge = await hre.viem.getContractAt("SolanaEVMBridge", BRIDGE_ADDRESS);
  const token = await hre.viem.getContractAt("TestToken", TOKEN_ADDRESS);
  
  console.log("🔍 Contract Status:");
  console.log("==================");
  console.log(`Bridge address: ${BRIDGE_ADDRESS}`);
  console.log(`Token address: ${TOKEN_ADDRESS}`);
  console.log(`Verifier address: ${VERIFIER_ADDRESS}`);
  
  // Check balances
  const bridgeBalance = await token.read.balanceOf([BRIDGE_ADDRESS]);
  const deployerBalance = await token.read.balanceOf([deployer.account.address]);
  
  console.log(`Bridge token balance: ${formatEther(bridgeBalance)} TUSDC`);
  console.log(`Deployer token balance: ${formatEther(deployerBalance)} TUSDC`);
  
  // Check bridge settings
  const minAmount = await bridge.read.minAmount();
  console.log(`Min withdrawal amount: ${minAmount.toString()}`);
  
  // Check if test state root is valid
  const testStateRoot = BigInt("0x" + Buffer.from("test_state_root").toString('hex').padStart(64, '0'));
  const isValidStateRoot = await bridge.read.isStateRootValid([testStateRoot]);
  console.log(`Test state root valid: ${isValidStateRoot}`);
  
  console.log("\n✅ Local blockchain is ready for testing!");
  console.log("\n📋 Network Info:");
  console.log("================");
  console.log(`Chain ID: ${await publicClient.getChainId()}`);
  console.log(`RPC URL: http://127.0.0.1:8545 (if using localhost network)`);
  console.log(`Latest block: ${await publicClient.getBlockNumber()}`);
  
  console.log("\n📝 Next Steps:");
  console.log("==============");
  console.log("1. The bridge contract is funded with 100,000 TUSDC tokens");
  console.log("2. You can now test withdrawal functionality");
  console.log("3. Use MetaMask with these settings:");
  console.log("   - Network Name: Hardhat Local");
  console.log("   - RPC URL: http://127.0.0.1:8545");
  console.log("   - Chain ID: 31337");
  console.log("   - Currency Symbol: ETH");
  console.log("\n4. Import the test token in MetaMask:");
  console.log(`   - Token Address: ${TOKEN_ADDRESS}`);
  console.log("   - Symbol: TUSDC");
  console.log("   - Decimals: 18");
}


main()
