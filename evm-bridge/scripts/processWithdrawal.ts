import hre from "hardhat";
import * as fs from 'fs';
import * as path from 'path';
import bs58 from "bs58";
// Interface matching the contract structs
interface DepositRecord {
    owner: string;
    sourceChainId: number;
    destChainId: number;
    destChainAddr: string;
    destChainMintAddr: string;
    mint: string;
    amount: string;
    timestamp: string;
    depositId: string;
}

// Load record.json data
function loadRecordData() {
    const recordPath = path.join(__dirname, '../../record.json');
    const recordData = JSON.parse(fs.readFileSync(recordPath, 'utf8'));
    return {
        owner: recordData.owner,
        sourceChainId: recordData.source_chain_id,
        destChainId: recordData.dest_chain_id,
        destChainAddr: "0x"+Buffer.from(bs58.decode(recordData.dest_chain_addr)).toString('hex'),
        destChainMintAddr: "0x"+Buffer.from(bs58.decode(recordData.dest_chain_mint_addr)).toString("hex"),
        mint: recordData.mint,
        amount: recordData.amount,
        timestamp: parseInt(recordData.timestamp, 16).toString(),
        depositId: recordData.deposit_id
    };
}

// @ts-ignore
import * as snarkjs from "snarkjs";

async function createProof(): Promise<any> {
    const circuitInputs = JSON.parse(fs.readFileSync(path.join(__dirname, '../../input.json'), "utf8"));
    const {proof, publicSignals} = await snarkjs.groth16.fullProve(
        circuitInputs,
        "../circom/solDepositProof_js/solDepositProof.wasm",
        "../circom/solDepositProof_js/1_0000.zkey",
    );
    console.log("Proof:", JSON.stringify(proof, null, 2));
    console.log("public signals:", publicSignals);
    
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
    const record = loadRecordData();

    const [deployer] = await hre.viem.getWalletClients();
    console.log(`\n👤 Using account: ${deployer.account.address}`);
    const publicClient = await hre.viem.getPublicClient();

    const bridgeAddress = process.env.BRIDGE_CONTRACT_ADDRESS || "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512";
    const verifierAddress = process.env.VERIFIER_CONTRACT_ADDRESS || "0x5fbdb2315678afecb367f032d93f642f64180aa3";
    
    const bridge = await hre.viem.getContractAt("SolanaEVMBridge", `0xe7f1725e7734ce288f8367e1bb143e90bb3f0512`);
    console.log("bridge", bridge);

    const verifier = await hre.viem.getContractAt("SolDepositVerifier", `0x5fbdb2315678afecb367f032d93f642f64180aa3`);
    
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
        
        console.log(`  📝 Transaction hash: ${tx}`);
        console.log("  ⏳ Waiting for confirmation...");
        
        const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
        console.log(`✅ Withdrawal processed in block ${receipt.blockNumber}`);
        
        // Parse logs to find the WithdrawalProcessed event
        const logs = await publicClient.getLogs({
            address: bridgeAddress,
            fromBlock: receipt.blockNumber,
            toBlock: receipt.blockNumber,
        });
        
        console.log("\n🎉 Transaction successful!");
        console.log(`Block: ${receipt.blockNumber}`);
        console.log(`Gas used: ${receipt.gasUsed}`);
        console.log(`Transaction fee: ${receipt.effectiveGasPrice * receipt.gasUsed} wei`);
        
        if (logs.length > 0) {
            console.log(`Events emitted: ${logs.length}`);
        }
        

        console.log(`  ✅ Withdrawal processed in block ${receipt.blockNumber}`);
        
        // Find the WithdrawalProcessed event
        const event = receipt.events?.find(e => e.event === 'WithdrawalProcessed');
        if (event) {
            console.log("\n🎉 Withdrawal Details:");
            console.log(`  Recipient: ${event.args?.recipient}`);
            console.log(`  Amount: ${event.args?.amount}`);
            console.log(`  Token Contract: ${event.args?.tokenContract}`);
            console.log(`  Nullifier: ${event.args?.nullifier}`);
        }
        
    } catch (error) {
        console.log(`  Error: ${error}`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 