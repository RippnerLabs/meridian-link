import hre from "hardhat";
import * as fs from 'fs';
import * as path from 'path';
import bs58 from "bs58";
import { parseEther } from "viem";
// @ts-ignore
import * as snarkjs from "snarkjs";
import {
  generateReceiptProofProduction,
  generateLogProofProduction,
  hexToFieldElement, validateCircomConstraints,
  verifyMerkleProofKeccak
} from './merkle-proof-generator';

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
  const mintAmount = parseEther("1000000"); //10k
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
        { name: 'depositor', type: 'address', indexed: true },
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

  // Wait for finality (12 blocks for Ethereum mainnet, using 6 for local testing)
  const FINALITY_BLOCKS = 6;
  const depositBlockNumber = receipt.blockNumber;
  
  console.log(`\n🔄 Waiting for ${FINALITY_BLOCKS} blocks for finality...`);
  console.log(`Deposit block: ${depositBlockNumber}`);
  
  // Wait for finality blocks
  let currentBlock = await publicClient.getBlockNumber();
  while (currentBlock < depositBlockNumber + BigInt(FINALITY_BLOCKS)) {
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    currentBlock = await publicClient.getBlockNumber();
    console.log(`Current block: ${currentBlock}, waiting for: ${depositBlockNumber + BigInt(FINALITY_BLOCKS)}`);
  }
  
  console.log(`Finality reached at block ${currentBlock}`);
  
  // Fetch finalized block header and receipt details
  const finalizedBlock = await publicClient.getBlock({
    blockNumber: depositBlockNumber,
    includeTransactions: true
  });
  
  const finalizedReceipt = await publicClient.getTransactionReceipt({
    hash: receipt.transactionHash
  });
  
  const depositEvent = events[0];
  const circuitInputData = {
    // block data
    blockNumber: finalizedBlock.number.toString(),
    blockHash: finalizedBlock.hash,
    stateRoot: finalizedBlock.stateRoot,
    receiptsRoot: finalizedBlock.receiptsRoot,
    
    // tx data
    transactionHash: finalizedReceipt.transactionHash,
    transactionIndex: finalizedReceipt.transactionIndex.toString(),
    
    // deposit data from event
    depositor: depositEvent.args.depositor,
    sourceChainId: depositEvent.args.sourceChainId.toString(),
    destChainId: depositEvent.args.destChainId.toString(),
    destChainAddr: depositEvent.args.destChainAddr,
    destChainMintAddr: depositEvent.args.destChainMintAddr,
    tokenMint: depositEvent.args.tokenMint,
    amount: depositEvent.args.amount.toString(),
    timestamp: depositEvent.args.timestamp.toString(),
    depositId: depositEvent.args.depositId.toString(),
    
    // Log data
    logIndex: depositEvent.logIndex.toString(),
    logData: depositEvent.data,
    logTopics: depositEvent.topics
  };
  
  console.log('\n🔧 Circuit Input Data:');
  console.log(JSON.stringify(circuitInputData, null, 2));
  
  // Generate Merkle proof for receipt in block
  console.log('\n🌳 Generating Merkle proofs...');
  
  const receiptProofData = await generateReceiptProofProduction(
    publicClient,
    depositBlockNumber,
    Number(finalizedReceipt.transactionIndex)
  );
  
  console.log('Receipt proof generated:', {
    receiptHash: receiptProofData.receiptHash,
    proofLength: receiptProofData.proof.length,
    receiptsRoot: receiptProofData.receiptsRoot,
    blockHash: receiptProofData.blockHash
  });
  
  // Validate receipt proof
  const receiptValid = verifyMerkleProofKeccak(
    receiptProofData.receiptHash,
    receiptProofData.proof,
    receiptProofData.indices,
    receiptProofData.receiptsRoot
  );
  console.log(`Receipt proof validation: ${receiptValid ? '✅' : '❌'}`);
  
  // Generate Merkle proof for log in receipt
  const logProofData = generateLogProofProduction(
    finalizedReceipt,
    Number(depositEvent.logIndex)
  );
  
  console.log('Log proof generated:', {
    logHash: logProofData.logHash,
    proofLength: logProofData.proof.length,
    logsRoot: logProofData.logsRoot
  });
  
  // Validate log proof
  const logValid = verifyMerkleProofKeccak(
    logProofData.logHash,
    logProofData.proof,
    logProofData.indices,
    logProofData.logsRoot
  );
  console.log(`Log proof validation: ${receiptValid ? '✅' : '❌'}`);
  
  // Validate circom constraints
  const receiptConstraints = validateCircomConstraints(receiptProofData.proof, receiptProofData.indices, 16);
  const logConstraints = validateCircomConstraints(logProofData.proof, logProofData.indices, 8);
  
  console.log('Circom Constraint Validation:');
  console.log(`Receipt proof valid for circom: ${receiptConstraints.isValid ? '✅' : '❌'}`);
  if (!receiptConstraints.isValid) {
    console.log('Receipt issues:', receiptConstraints.issues);
  }
  
  console.log(`Log proof valid for circom: ${logConstraints.isValid ? '✅' : '❌'}`);
  if (!logConstraints.isValid) {
    console.log('Log issues:', logConstraints.issues);
  }
  
  // Generate random secret for nullifier
  const secret = BigInt('0x' + crypto.getRandomValues(new Uint8Array(32)).reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), ''));
  
  // Prepare circuit input for the production-ready circuit
  const ethDepositCircuitInput = {
    // Private inputs
    secret: secret.toString(),
    receiptMerkleProof: receiptConstraints.paddedProof.map(hexToFieldElement),
    receiptMerkleIndices: receiptConstraints.paddedIndices,
    logMerkleProof: logConstraints.paddedProof.map(hexToFieldElement),
    logMerkleIndices: logConstraints.paddedIndices,
    
    // Public inputs (converted to field elements)
    blockHash: hexToFieldElement(receiptProofData.blockHash),
    receiptsRoot: hexToFieldElement(receiptProofData.receiptsRoot),
    receiptHash: hexToFieldElement(receiptProofData.receiptHash),
    logHash: hexToFieldElement(logProofData.logHash),
    logsRoot: hexToFieldElement(logProofData.logsRoot),
    amount: (depositEvent.args.amount || 0n).toString(),
    sourceChainId: (depositEvent.args.sourceChainId || 0n).toString(),
    destChainId: (depositEvent.args.destChainId || 0n).toString(),
    destChainAddr: hexToFieldElement('0x' + Buffer.from(depositEvent.args.destChainAddr || '', 'utf8').toString('hex')),
    destChainMintAddr: hexToFieldElement('0x' + Buffer.from(depositEvent.args.destChainMintAddr || '', 'utf8').toString('hex')),
    tokenMint: hexToFieldElement(depositEvent.args.tokenMint || '0x0'),
    depositor: hexToFieldElement(depositEvent.args.depositor || '0x0'),
    timestamp: (depositEvent.args.timestamp || 0n).toString(),
    depositId: (depositEvent.args.depositId || 0n).toString()
  };
  
  console.log('\n🔧 ETH Deposit Circuit Input:');
  console.log(JSON.stringify(ethDepositCircuitInput, null, 2));
  
  // Save circuit input to file for testing
  const circuitInputPath = path.join(__dirname, '../../circom/ethDepositInput.json');
  fs.writeFileSync(circuitInputPath, JSON.stringify(ethDepositCircuitInput, null, 2));
  console.log(`💾 Circuit input saved to: ${circuitInputPath}`);
  
  console.log('\n✅ Ethereum deposit proof generation completed successfully!');
  console.log('📋 Summary:');
  console.log(`  - Block: ${depositBlockNumber}`);
  console.log(`  - Transaction: ${tx}`);
  console.log(`  - Receipt proof: ${receiptProofData.proof.length} levels`);
  console.log(`  - Log proof: ${logProofData.proof.length} levels`);
  console.log(`  - Amount: ${ethDepositCircuitInput.amount} tokens`);
  console.log(`  - Depositer: ${depositEvent.args.depositor}`);
  console.log(`  - Secret: ${secret.toString().slice(0, 20)}...`);
  const ethInputs = await createEthDepositProof();
  return {
    circuitInput: ethDepositCircuitInput,
    proofData: {
      receipt: receiptProofData,
      log: logProofData
    }
  };
}

async function createEthDepositProof(): Promise<any> {
  console.log('proof started');
  const circuitInputs = JSON.parse(fs.readFileSync(path.join(__dirname, '../../circom/ethDepositInput.json'), "utf8"));
  const {proof, publicSignals} = await snarkjs.groth16.fullProve(
      circuitInputs,
      "../circom/ethDepositProof_js/ethDepositProof.wasm",
      "../circom/ethDepositProof_js/1_0000.zkey",
  );
  
  return {proof, publicSignals}
}

// main()
depositEth()