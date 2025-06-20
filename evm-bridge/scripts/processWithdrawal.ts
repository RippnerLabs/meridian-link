import hre from "hardhat";
import path from "path";
import * as fs from "fs";
import bs58 from "bs58";
// @ts-ignore
import * as snarkjs from "snarkjs";

const integrationTestsDir = path.join(__dirname, "../../integration-tests");

function loadRecordData() {
    const recordPath = path.join(integrationTestsDir, 'record.json');
    const recordData = JSON.parse(fs.readFileSync(recordPath, 'utf8'));
    return {
        owner: recordData.owner,
        sourceChainId: recordData.source_chain_id,
        destChainId: recordData.dest_chain_id,
        destChainAddr: "0x"+Buffer.from(bs58.decode(recordData.dest_chain_addr)).toString('hex') as any,
        destChainMintAddr: "0x"+Buffer.from(bs58.decode(recordData.dest_chain_mint_addr)).toString('hex') as any,
        mint: recordData.mint,
        amount: recordData.amount,
        timestamp: parseInt(recordData.timestamp, 16).toString(),
        depositId: recordData.deposit_id
    };
}

async function createProof(): Promise<any> {
    const circuitInputs = JSON.parse(fs.readFileSync(path.join(integrationTestsDir, 'input.json'), "utf8"));
    const {proof, publicSignals} = await snarkjs.groth16.fullProve(
        circuitInputs,
        path.join(integrationTestsDir, "../circom/solDepositProof_js/solDepositProof.wasm"),
        path.join(integrationTestsDir, "../circom/solDepositProof_js/1_0000.zkey"),
    );
    const calldataBlob = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);

    const argv = calldataBlob
    .replace(/["[\]\s]/g, "")
    .split(",")
    .map((x: string | number | bigint | boolean) => BigInt(x).toString());

    const a = [argv[0], argv[1]];
    const b = [
      [argv[2], argv[3]],
      [argv[4], argv[5]],
    ];
    const c = [argv[6], argv[7]];
    const Input = [];

    for (let i = 8; i < argv.length; i++) {
      Input.push(argv[i]);
    }

    return { a, b, c, Input }
}

async function main() {
    const [deployer] = await hre.viem.getWalletClients();
    
    // Check if addressBook exists
    const addressBookPath = path.join(integrationTestsDir, 'addressBook.json');
    if (!fs.existsSync(addressBookPath)) {
        console.error('addressBook.json not found. Please run deploy.ts first or use the combined-test.ts script.');
        process.exit(1);
    }
    
    const addressBook = JSON.parse(fs.readFileSync(addressBookPath, 'utf8'));
    const record = loadRecordData();
    const publicClient = await hre.viem.getPublicClient();
    const bridgeAddress = addressBook.bridgeSmartContractAddress;
    const bridge = await hre.viem.getContractAt("SolanaEVMBridge", bridgeAddress);
    const token = await hre.viem.getContractAt("BridgeToken", addressBook.tokenSmartContractAddress);

    // Check if contract exists by trying to read the token name
    try {
        const tokenName = await token.read.name();
        console.log(`Found token contract: ${tokenName} at ${addressBook.tokenSmartContractAddress}`);
    } catch (error) {
        console.error('Token contract not found or not deployed. Please ensure contracts are deployed first.');
        console.error('Run: npx hardhat run scripts/deploy.ts --network localhost');
        process.exit(1);
    }

    await token.write.mint([deployer.account.address, 20000n]);
    console.log('User token balance after mint:', await token.read.balanceOf([deployer.account.address]));

    const approveAmount = 20000n; // 200 tokens
    await token.write.approve([bridgeAddress, approveAmount]);
  
    const proof = await createProof();
    try {
        const tx = await bridge.write.processWithdrawal([
            {
                owner: record.owner,
                sourceChainId: record.sourceChainId,
                destChainId: record.destChainId,
                destChainAddr: record.destChainAddr,
                destChainMintAddr: record.destChainMintAddr,
                mint: record.mint,
                amount: record.amount,
                timestamp: record.timestamp,
                depositId: record.depositId
            },
            {
                a: proof.a,
                b: proof.b,
                c: proof.c,
                publicSignals: proof.Input
            }
        ]);
        
        console.log(`Transaction hash: ${tx}`);
        const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
        console.log("receipt", receipt);
        // sleep for 10 seconds
        await new Promise(resolve => setTimeout(resolve, 10000));
        // Get token balances
        const userBalance = await token.read.balanceOf([addressBook.secondWalletAddress]);
        const bridgeBalance = await token.read.balanceOf([bridgeAddress]);
        
        console.log(`User token balance: ${userBalance}`);
        console.log(`Bridge token balance: ${bridgeBalance}`);
        process.exit(0);
    } catch (error) {
        console.log(`  Error: ${error}`);
    }
}

main()