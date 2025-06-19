import hre from "hardhat";
import * as fs from 'fs';
import * as path from 'path';
import bs58 from "bs58";
import {parseEther, formatEther} from "viem";
// @ts-ignore
import * as snarkjs from "snarkjs";

const ADDRESS_BOOK = {
  Verfier: "",
  Bridge: "",
  Token: "",
}

async function deploy() {
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
  const mintAmount = parseEther("1000000"); //1M
  await token.write.mint([bridge.address, mintAmount]);

  // Get token balances
  const userBalance = await token.read.balanceOf([deployer.account.address]);
  const bridgeBalance = await token.read.balanceOf([bridge.address]);

  console.log(`User token balance: ${userBalance}`);
  console.log(`Bridge token balance: ${bridgeBalance}`);

  ADDRESS_BOOK.Verfier = verifier.address;
  ADDRESS_BOOK.Bridge = bridge.address;
  ADDRESS_BOOK.Token = token.address;
}

// Load record.json data
function loadRecordData() {
    const recordPath = path.join(__dirname, '../../record.json');
    const recordData = JSON.parse(fs.readFileSync(recordPath, 'utf8'));
    console.log("mint addr ", "0x"+Buffer.from(bs58.decode(recordData.dest_chain_mint_addr)).toString('hex'))
    return {
        owner: recordData.owner,
        sourceChainId: recordData.source_chain_id,
        destChainId: recordData.dest_chain_id,
        destChainAddr: "0x"+Buffer.from(bs58.decode(recordData.dest_chain_addr)).toString('hex'),
        destChainMintAddr: ADDRESS_BOOK.Token,
        mint: recordData.mint,
        amount: recordData.amount,
        timestamp: parseInt(recordData.timestamp, 16).toString(),
        depositId: recordData.deposit_id
    };
}

async function createProof(): Promise<any> {
    const circuitInputs = JSON.parse(fs.readFileSync(path.join(__dirname, '../../input.json'), "utf8"));
    const {proof, publicSignals} = await snarkjs.groth16.fullProve(
        circuitInputs,
        "../circom/solDepositProof_js/solDepositProof.wasm",
        "../circom/solDepositProof_js/1_0000.zkey",
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
    await deploy();

    const record = loadRecordData();

    const [deployer] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();

    const bridgeAddress = ADDRESS_BOOK.Bridge;
    const verifierAddress = ADDRESS_BOOK.Verfier;
    
    const bridge = await hre.viem.getContractAt("SolanaEVMBridge", bridgeAddress);
    const token = await hre.viem.getContractAt("BridgeToken", ADDRESS_BOOK.Token);
    const verifier = await hre.viem.getContractAt("SolDepositVerifier", verifierAddress);
    
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
        const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
        console.log("receipt", receipt);
        // sleep for 10 seconds
        await new Promise(resolve => setTimeout(resolve, 10000));
        // Get token balances
        const userBalance = await token.read.balanceOf([`0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199`]);
        const bridgeBalance = await token.read.balanceOf([bridgeAddress]);
        
        console.log(`  💰 User token balance: ${userBalance}`);
        console.log(`  🏦 Bridge token balance: ${bridgeBalance}`);
        
    } catch (error) {
        console.log(`  Error: ${error}`);
    }
}

async function depositEth() {
  await deploy();
  const [deployer] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();

  const bridge = await hre.viem.getContractAt('SolanaEVMBridge', ADDRESS_BOOK.Bridge);
  const token = await hre.viem.getContractAt('BridgeToken', ADDRESS_BOOK.Token);

  await token.write.mint([deployer.account.address, 10000n]); // Mint 100 tokens (decimals = 2)

  console.log('user token balance', await token.read.balanceOf([deployer.account.address]));

  // Approve the bridge contract to spend user's tokens
  const approveAmount = 1000n; // 10 tokens
  await token.write.approve([ADDRESS_BOOK.Bridge, approveAmount]);
  console.log('approved bridge to spend:', approveAmount);

  const tx = await bridge.write.deposit([
    31337,
    1,
    "7fD1uH15XByFTnGjDZr5tFQjxtaWBZUYpecXeesr1jom",
    "GQFkxJFQp5eY5zrkbyXK9EVuBezyuZBjrjzyg1u8RVwW",
    ADDRESS_BOOK.Token,
    1000n
  ]);

  const receipt = await publicClient.waitForTransactionReceipt({hash: tx});

  console.log('receipt', receipt);
  console.log('user balance', await token.read.balanceOf([deployer.account.address]));
  //  get  the events emmited from the tx 
  const events = await publicClient.getLogs({
    address: bridge.address,
    event: {
      type: 'event',
      name: 'EthDeposit',
      inputs: [
        { name: 'depositer', type: 'address', indexed: true },
        { name: 'sourceChainId', type: 'uint32', indexed: false },
        { name: 'destChainId', type: 'uint32', indexed: false },
        { name: 'destChainAddr', type: 'string', indexed: false },
        { name: 'destChainMintAddr', type: 'string', indexed: false },
        { name: 'tokenMint', type: 'address', indexed: false },
        { name: 'amount', type: 'uint256', indexed: false },
        { name: 'timestamp', type: 'uint256', indexed: false },
        { name: 'depositId', type: 'uint256', indexed: false }
      ]
    },
    fromBlock: receipt.blockNumber,
    toBlock: receipt.blockNumber
  });
  console.log('events', events);
}

// main()
depositEth()