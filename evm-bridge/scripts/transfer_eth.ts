import hre from "hardhat";

const DEPLOYER = {
    PUBKEY: "0xdD2FD4581271e230360230F9337D5c0430Bf44C0",
    PRIVKEY: "0xde9be858da4a475276426320d5e9262ecfc3ba460bfac56360bfa6c4c28b4ee0"
}

async function trasnfer(to: any, deployer: any, publicClient: any) {
    const deployerBalance = await publicClient.getBalance({address: deployer.account.address});
    console.log("deployerBalance:", deployerBalance);

    const transferAmount = BigInt("10000000000000000000"); // 10 eth

    const hash = await deployer.sendTransaction({
        to,
        value: transferAmount
    });

    const receipt = await publicClient.waitForTransactionReceipt({hash});
    const receiverBalance = await publicClient.getBalance({address: to});
    console.log("receiverBalance:", receiverBalance);
}

async function main() {
    const [deployer,] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();
    await trasnfer(DEPLOYER.PUBKEY, deployer, publicClient);
}
main()