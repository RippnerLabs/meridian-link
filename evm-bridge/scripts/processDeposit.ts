import hre from "hardhat";
import addressBook from "../../integration-tests/addressBook.json";

async function main() {
    const [deployer,] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();

    const bridge = await hre.viem.getContractAt("SolanaEVMBridge", addressBook.bridgeSmartContractAddress as `0x${string}`);
    const token = await hre.viem.getContractAt("BridgeToken", addressBook.tokenSmartContractAddress as `0x${string}`);

    let deployerBalance = await token.read.balanceOf([deployer.account.address]);
    console.log("deployerBalance", deployerBalance);
    let bridgeBalance = await token.read.balanceOf([addressBook.bridgeSmartContractAddress as `0x${string}`]);
    console.log("bridgeBalance", bridgeBalance);

    const depositAmount = 100n;
    const deployerApprove = await token.write.approve([
        addressBook.bridgeSmartContractAddress as `0x${string}`,
        depositAmount
    ]);
    await publicClient.waitForTransactionReceipt({hash: deployerApprove});

    const tx = await bridge.write.deposit([
        31337,
        1,
        "7fD1uH15XByFTnGjDZr5tFQjxtaWBZUYpecXeesr1jom",
        "7fD1uH15XByFTnGjDZr5tFQjxtaWBZUYpecXeesr1jom",
        addressBook.tokenSmartContractAddress as `0x${string}`,
        depositAmount
    ]);
    const receipt = await publicClient.waitForTransactionReceipt({hash:tx});
    console.log("receipt", receipt);

    deployerBalance = await token.read.balanceOf([deployer.account.address]);
    console.log("deployerBalance", deployerBalance);
    bridgeBalance = await token.read.balanceOf([addressBook.bridgeSmartContractAddress as `0x${string}`]);
    console.log("bridgeBalance", bridgeBalance);

}
main()