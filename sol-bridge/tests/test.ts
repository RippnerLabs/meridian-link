import fs from "fs";
import {Connection, PublicKey} from "@solana/web3.js";
import {createMint, getAccount, getOrCreateAssociatedTokenAccount, mintTo, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID} from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor";
import { Program, web3 } from "@coral-xyz/anchor";
import { CrossChainTokenBridge } from "../target/types/cross_chain_token_bridge";
import idl from "../target/idl/cross_chain_token_bridge.json";
import {
  bn,
  CompressedAccountWithMerkleContext,
  createRpc,
  defaultStaticAccountsStruct,
  defaultTestStateTreeAccounts,
  deriveAddress,
  deriveAddressSeed,
  LightSystemProgram,
  padOutputStateMerkleTrees,
  Rpc,
  sleep,
} from "@lightprotocol/stateless.js";
import bs58 from "bs58";

const path = require("path");
const os = require("os");
require("dotenv").config();

const anchorWalletPath = path.join(os.homedir(), ".config/solana/id.json");
process.env.ANCHOR_WALLET = anchorWalletPath;

const withdrawalNullifier = [11,3,119,82,135,205,250,45,160,213,133,169,79,212,130,204,137,128,91,19,82,142,63,56,50,224,60,189,43,8,50,4];

describe("test-anchor", () => {
  const program = anchor.workspace.CrossChainTokenBridge as Program<CrossChainTokenBridge>;

  it("", async () => {
    let signer = new web3.Keypair();
    let rpc = createRpc(
      "http://127.0.0.1:8899",
      "http://127.0.0.1:8784",
      "http://0.0.0.0:3001",
      {
        commitment: "confirmed"
      },  
    );
    let lamports = web3.LAMPORTS_PER_SOL;
    await rpc.requestAirdrop(signer.publicKey, lamports);
    await sleep(2000);

    const outputMerkleTree = defaultTestStateTreeAccounts().merkleTree;
    const addressTree = defaultTestStateTreeAccounts().addressTree;
    const addressQueue = defaultTestStateTreeAccounts().addressQueue;

    const counterSeed = new TextEncoder().encode("counter");
    const seed = deriveAddressSeed(
      [counterSeed, signer.publicKey.toBytes()],
      new web3.PublicKey(program.idl.address),
    );
    const address = deriveAddress(seed, addressTree);
    await initInstructionCall(rpc, program,signer);

    const conn = new Connection("http://localhost:8899", "confirmed");
    const decimals = 2;
    const mint = await createMint(conn, signer, signer.publicKey, signer.publicKey, decimals);
    const ata = await getOrCreateAssociatedTokenAccount(conn, signer, mint, signer.publicKey);
    const amount = BigInt(1000) * BigInt(10**decimals);
    const mintSig = await mintTo(
      conn, signer, mint, ata.address,signer, amount
    );
    await depositToTokenVault(rpc, signer, program, mint);

    // BridgeState PDA to read current deposit_count
    const bridgeStatePda = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("bridge_state")],
      program.programId,
    )[0];

    // Fetch current deposit_count (0 if just initialised)
    const bridgeStateAccount: any = await program.account.bridgeState.fetchNullable(bridgeStatePda);
    const currentDepositCount = bridgeStateAccount ? BigInt(bridgeStateAccount.depositCount.toString()) : BigInt(0);
    const nextDepositCount = currentDepositCount + BigInt(1);
    // Convert the deposit count to a 16-byte buffer in little-endian format
    // This is needed because the Solana program expects a u128 (128-bit) value
    // represented as bytes for the deposit record seed derivation
    const depositCountBytes = Buffer.alloc(16);
    
    // Split the 128-bit number into two 64-bit parts since JavaScript
    // can only handle 64-bit integers natively
    const twoPow64 = BigInt(1) << BigInt(64); // 2^64
    const low = nextDepositCount % twoPow64;   // Lower 64 bits
    const high = nextDepositCount / twoPow64;  // Upper 64 bits
    
    // Write both 64-bit parts to the buffer in little-endian format
    // Bytes 0-7: lower 64 bits, Bytes 8-15: upper 64 bits
    depositCountBytes.writeBigUInt64LE(low, 0);
    depositCountBytes.writeBigUInt64LE(high, 8);

    const depositRecordSeed = deriveAddressSeed(
      [
        new TextEncoder().encode("deposit"),
        signer.publicKey.toBytes(),
        depositCountBytes,
      ],
      program.programId,
    );
    const depositRecordAddress = deriveAddress(depositRecordSeed, addressTree);
    console.log("depositRecordAddress", depositRecordAddress);
    const dest_chain_id = 31337; // from hardhat config
    const dest_chain_addr = bs58.encode(Buffer.from(
      process.env.DEST_CHAIN_ADDR || "8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199",
      "hex")); // no 0x prefix hex
    const dest_chain_mint_addr = bs58.encode(Buffer.from(
      process.env.DEST_CHAIN_MINT_ADDR || "610178da211fef7d417bc0e6fed39f05609ad788",
      "hex"
    ));
    const SOLANA_CHAIN_ID = 1;
    await initTokenBridgeCall(rpc, program, signer, dest_chain_id, dest_chain_mint_addr, SOLANA_CHAIN_ID, mint.toString());

    await initTokenBridgeCall(rpc, program, signer, SOLANA_CHAIN_ID, mint.toString(), dest_chain_id, dest_chain_mint_addr);

    await CreateDepositRecordCompressedAccount(
      rpc,
      addressTree,
      addressQueue,
      depositRecordAddress,
      program,
      outputMerkleTree,
      signer,
      mint,
      SOLANA_CHAIN_ID,
      mint.toString(),
      dest_chain_id,
      dest_chain_mint_addr,
      dest_chain_addr,
    );

    const withdrawKp = anchor.web3.Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(path.join(__dirname, "../../keys/signer.json"), "utf8"))));
    const withdrawalRecordSeed = deriveAddressSeed(
      [
        new TextEncoder().encode("withdrawal"),
        withdrawKp.publicKey.toBytes(),
        Buffer.from(withdrawalNullifier),
      ],
      new web3.PublicKey(program.idl.address)
    )
    const withdrawalRecordAddress = deriveAddress(withdrawalRecordSeed, addressTree);
    console.log("withdrawalRecordAddress", withdrawalRecordAddress);

    // await CreateWithdrawalRecordCompressedAccount(
    //   rpc,
    //   addressTree,
    //   addressQueue,
    //   withdrawalRecordAddress,
    //   program,
    //   outputMerkleTree,
    //   signer,
    //   mint,
    //   dest_chain_id,
    //   dest_chain_mint_addr,
    //   SOLANA_CHAIN_ID,
    //   mint.toString(),
    // );
    // Create counter compressed account.
    // await CreateCounterCompressedAccount(
    //   rpc,
    //   addressTree,
    //   addressQueue,
    //   address,
    //   program,
    //   outputMerkleTree,
    //   signer,
    // );
    // // Wait for indexer to catch up.
    // await sleep(2000);

    // let counterAccount = await rpc.getCompressedAccount(bn(address.toBytes()));

    // let counter = coder.types.decode(
    //   "CounterCompressedAccount",
    //   counterAccount.data.data,
    // );
    // console.log("counter account ", counterAccount);
    // console.log("des counter ", counter);

    // await incrementCounterCompressedAccount(
    //   rpc,
    //   counter.counter,
    //   counterAccount,
    //   program,
    //   outputMerkleTree,
    //   signer,
    // );

    // // Wait for indexer to catch up.
    // await sleep(2000);

    // counterAccount = await rpc.getCompressedAccount(bn(address.toBytes()));
    // counter = coder.types.decode(
    //   "CounterCompressedAccount",
    //   counterAccount.data.data,
    // );
    // console.log("counter account ", counterAccount);
    // console.log("des counter ", counter);

    // await deleteCounterCompressedAccount(
    //   rpc,
    //   counter.counter,
    //   counterAccount,
    //   program,
    //   outputMerkleTree,
    //   signer,
    // );

    // // Wait for indexer to catch up.
    // await sleep(2000);

    // const deletedCounterAccount = await rpc.getCompressedAccount(
    //   bn(address.toBytes())
    // );
    // console.log("deletedCounterAccount ", deletedCounterAccount);
  });
});

async function initInstructionCall(
  rpc: Rpc,
  program: anchor.Program<CrossChainTokenBridge>,
  signer: anchor.web3.Signer,
) {
  let tx = await program.methods.init()
  .accounts({
    signer: signer.publicKey,
  })
  .signers([signer])
  .transaction();
  tx.recentBlockhash = (await rpc.getRecentBlockhash()).blockhash;
  tx.sign(signer);

  const sig = await rpc.sendTransaction(tx, [signer]);
  await rpc.confirmTransaction(sig);
  console.log("Created bridge state account");
}

async function initTokenBridgeCall(
  rpc: Rpc,
  program: anchor.Program<CrossChainTokenBridge>,
  signer: anchor.web3.Signer,
  source_chain: number,
  source_chain_mint_addr: string,
  dest_chain_id: number,
  dest_chain_mint_addr: string,
) {
  {
    const linkHash = require('crypto').createHash('sha256').update(`${source_chain}_${source_chain_mint_addr}_${dest_chain_id}_${dest_chain_mint_addr}`).digest('hex').slice(0, 16);
    console.log("initTokenBridgeCall called", linkHash)
    let tx = await program.methods.initTokenBridge(
      source_chain,
      source_chain_mint_addr,
      dest_chain_id,
      dest_chain_mint_addr,
      linkHash,
    )
    .accounts(
      {
        signer:signer.publicKey,
      }
    )
    .signers([signer])
    .transaction();
    tx.recentBlockhash = (await rpc.getRecentBlockhash()).blockhash;
    tx.sign(signer);
    const sig = await rpc.sendTransaction(tx, [signer]);
    console.log('token bridge initialised', sig);

    const address = PublicKey.findProgramAddressSync(
      [
        Buffer.from("tb"),
        linkHash
      ],
      program.programId
    )[0];
    await sleep(2000);
    let tokenBridgeAccount = await program.account.tokenBridge.fetch(address);
    console.log("tokenBridgeAccount", tokenBridgeAccount);
  }
}

async function depositToTokenVault(
  rpc: Rpc,
  signer: anchor.web3.Keypair,
  program: anchor.Program<CrossChainTokenBridge>,
  mint: PublicKey,
) {
  {
    const tx = await program.methods
    .depositToVault(bn(50 * 10 ** 2))
    .accounts({
      signer: signer.publicKey,
      mint: mint,
      tokenProgram: TOKEN_PROGRAM_ID
    })
    .signers([signer])
    .transaction();

    tx.recentBlockhash = (await rpc.getRecentBlockhash()).blockhash;
    const sig = await rpc.sendTransaction(tx, [signer]);
    await rpc.confirmTransaction(sig, "finalized");
    console.log("depositToTokenVault sig:", sig);
  }
}

async function CreateDepositRecordCompressedAccount(
  rpc: Rpc,
  addressTree: anchor.web3.PublicKey,
  addressQueue: anchor.web3.PublicKey,
  address: anchor.web3.PublicKey,
  program: anchor.Program<CrossChainTokenBridge>,
  outputMerkleTree: anchor.web3.PublicKey,
  signer: anchor.web3.Keypair,
  mint: PublicKey,
  source_chain: number,
  source_chain_mint_addr: string,
  dest_chain_id: number,
  dest_chain_mint_addr: string,
  dest_chain_addr: string,
) {
  {
    let  proofRpcResult;
    try {
      const proofRpcResult1 = await rpc.getValidityProofV0(
        [],
        [
          {
            tree: addressTree,
            queue: addressQueue,
            address: bn(address.toBytes()),
          }
        ]
      );
      proofRpcResult = proofRpcResult1;
    } catch (err) {
      console.log("err", JSON.stringify(err, null, 2));
      throw new Error(err);
    }
    
    const systemAccountConfig = SystemAccountMetaConfig.new(program.programId);
    let remainingAccounts = PackedAccounts.newWithSystemAccounts(systemAccountConfig);
    const addressMerkleTreePubkeyIndex = remainingAccounts.insertOrGet(addressTree);
    const addressQueuePubkeyIndex = remainingAccounts.insertOrGet(addressQueue);
    const packedAddressMerkleContext = {
      rootIndex: proofRpcResult.rootIndices[0],
      addressMerkleTreePubkeyIndex,
      addressQueuePubkeyIndex,
    };
    const outputMerkleTreeIndex = remainingAccounts.insertOrGet(outputMerkleTree);
    let proof = {
      0: proofRpcResult.compressedProof,
    }
    const computeBudgeIx = web3.ComputeBudgetProgram.setComputeUnitLimit({
      units: 1_000_000,
    });

    const linkHash = require('crypto').createHash('sha256').update(`${source_chain}_${source_chain_mint_addr}_${dest_chain_id}_${dest_chain_mint_addr}`).digest('hex').slice(0, 16);
    
    let tx = await program.methods
      .deposit(proof, packedAddressMerkleContext, outputMerkleTreeIndex, bn(100 * 10 ** 2), linkHash, dest_chain_addr)
      .accounts({
        signer: signer.publicKey,
        mint: mint,
        tokenProgram: TOKEN_PROGRAM_ID
      })
      .preInstructions([computeBudgeIx])
      .remainingAccounts(remainingAccounts.toAccountMetas().remainingAccounts)
      .signers([signer])
      .transaction();

    tx.recentBlockhash = (await rpc.getRecentBlockhash()).blockhash;
    tx.sign(signer);

    const sig = await rpc.sendTransaction(tx, [signer]);
    await rpc.confirmTransaction(sig, "finalized");
    console.log("created deposit record", sig);

    await sleep(4000);
      console.log("compressed acc addr", address.toString());
    let depositRecordAccount = await rpc.getCompressedAccount(bn(address.toBytes()));
    console.log("depositRecordAccount", depositRecordAccount);

    const coder = new anchor.BorshCoder(idl as anchor.Idl);
    let depositRecord = coder.types.decode(
        "DepositRecordCompressedAccount",
        depositRecordAccount.data.data,
      )
 
    // console.log("des depositRecord ", depositRecord);
    const accProof = await rpc.getCompressedAccountProof(depositRecordAccount.hash);

    const integrationTestsDir = path.join(__dirname, "../../config");
    // Convert BN amount to decimal string before writing to record.json
    const recordForJson = {
      ...depositRecord,
      amount: depositRecord.amount.toString(),
      timestamp: depositRecord.timestamp.toString(),
      deposit_id: depositRecord.deposit_id.toString(),
    };
    fs.writeFileSync(path.join(integrationTestsDir, "sol_deposit_record.json"), JSON.stringify(recordForJson));
    fs.writeFileSync(path.join(integrationTestsDir, "sol_deposit_proof.json"), JSON.stringify(accProof));
    fs.writeFileSync(path.join(integrationTestsDir, "sol_deposit_account.json"), JSON.stringify(depositRecordAccount));
  }
}

async function CreateWithdrawalRecordCompressedAccount(
  rpc:Rpc,
  addressTree: anchor.web3.PublicKey,
  addressQueue: anchor.web3.PublicKey,
  address: anchor.web3.PublicKey,
  program: anchor.Program<CrossChainTokenBridge>,
  outputMerkleTree: anchor.web3.PublicKey,
  signer: anchor.web3.Keypair,
  mint: PublicKey,
  source_chain: number,
  source_chain_mint_addr: string,
  dest_chain_id: number,
  dest_chain_mint_addr: string,
) {
  {    
    // create withdrawalProof account and write the data into that account
    const withdrawalProofTx = await program.methods.initWithdrawalProofAccount(
      bn(2),
      [14,58,244,221,122,68,66,81,213,157,63,61,7,190,118,65,192,146,144,180,155,55,213,242,31,230,7,79,51,113,237,169,44,205,233,37,188,227,130,185,222,44,198,182,102,234,116,74,16,151,178,93,26,55,87,92,176,81,238,23,165,142,209,226],
      [
        29, 228, 78, 154, 16, 24, 136, 0, 188, 126, 229, 20, 31, 194, 17, 160,
        253, 155, 78, 80, 91, 86, 24, 143, 104, 190, 237, 89, 159, 96, 108, 20,
        17, 105, 151, 153, 180, 40, 3, 122, 6, 6, 96, 121, 76, 21, 164, 49, 171,
        151, 154, 49, 112, 89, 132, 205, 150, 111, 119, 28, 8, 9, 4, 160, 0, 15,
        4, 58, 220, 188, 189, 143, 75, 171, 181, 8, 244, 237, 255, 228, 31, 255,
        248, 187, 170, 208, 237, 155, 11, 54, 239, 104, 123, 184, 177, 15, 23,
        252, 94, 41, 34, 188, 219, 220, 139, 127, 198, 61, 184, 94, 165, 146, 124,
        223, 46, 70, 47, 214, 223, 90, 199, 211, 45, 249, 195, 219, 124, 159
      ],
      [
        5, 41, 227, 187, 40, 74, 192, 30, 223, 107, 115, 187, 177, 209, 57, 201,
        113, 19, 103, 129, 144, 182, 119, 147, 215, 161, 216, 125, 67, 65, 226,
        94, 29, 97, 209, 152, 187, 206, 57, 209, 247, 198, 56, 91, 63, 153, 126,
        149, 235, 186, 238, 198, 95, 85, 199, 231, 59, 143, 94, 71, 196, 174, 124,
        211
      ],
      withdrawalNullifier,
      [10,176,51,106,94,59,78,39,15,155,59,130,38,103,174,242,118,76,148,79,204,137,57,87,102,125,171,241,60,92,147,48]
    )
    .accounts({
      signer: signer.publicKey,
    })
    .signers([signer])
    .transaction();

    withdrawalProofTx.recentBlockhash = (await rpc.getRecentBlockhash()).blockhash;
    withdrawalProofTx.sign(signer);

    const sig1 = await rpc.sendTransaction(withdrawalProofTx, [signer]);
    await rpc.confirmTransaction(sig1, "finalized");
    console.log("created withdrawal proof", sig1);

    const withdrawKp = anchor.web3.Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(path.join(__dirname, "../../keys/signer.json"), "utf8"))));

    // get the balance of mint tokens for withdrawKp
    const withdrawKpAta = await getOrCreateAssociatedTokenAccount(
      new Connection("http://localhost:8899", "confirmed"),
      withdrawKp,
      mint,
      withdrawKp.publicKey
    );
    const withdrawKpBalance = await getAccount(
      new Connection("http://localhost:8899", "confirmed"),
      withdrawKpAta.address
    );
    console.log("withdrawKp token balance before withdrawal:", withdrawKpBalance.amount.toString());

    const proofRpcResult = await rpc.getValidityProofV0(
      [],
      [
        {
          tree: addressTree,
          queue: addressQueue,
          address: bn(address.toBytes())
        }
      ]
    );

    const systemAccountConfig = SystemAccountMetaConfig.new(program.programId);
    let remainingAccounts = PackedAccounts.newWithSystemAccounts(systemAccountConfig);
    const addressMerkleTreePubkeyIndex = remainingAccounts.insertOrGet(addressTree);
    const addressQueuePubkeyIndex = remainingAccounts.insertOrGet(addressQueue);
    const packedAddressMerkleContext = {
      rootIndex: proofRpcResult.rootIndices[0],
      addressMerkleTreePubkeyIndex,
      addressQueuePubkeyIndex
    };
    const outputMerkleTreeIndex = remainingAccounts.insertOrGet(outputMerkleTree);
    let proof = {
      0: proofRpcResult.compressedProof,
    }
    console.log(1)

    const linkHash = require('crypto').createHash('sha256').update(`${source_chain}_${source_chain_mint_addr}_${dest_chain_id}_${dest_chain_mint_addr}`).digest('hex').slice(0, 16);
    console.log(3)

    const computeBudgetIx = web3.ComputeBudgetProgram.setComputeUnitLimit({
      units: 1_000_000,
    });
    const tx = await program.methods
    .withdraw(
      proof,
      packedAddressMerkleContext,
      outputMerkleTreeIndex,
      bn(50 * 10*2),
      linkHash,
      withdrawalNullifier,
    )
    .accounts({
      relayer: signer.publicKey,
      recipient: withdrawKp.publicKey,
      mint: mint,
      tokenProgram: TOKEN_PROGRAM_ID
    })
    .preInstructions([computeBudgetIx])
    .remainingAccounts(remainingAccounts.toAccountMetas().remainingAccounts)
    .signers([signer])
    .transaction();
    console.log(4)

    tx.recentBlockhash = (await rpc.getRecentBlockhash()).blockhash;
    tx.sign(signer);

    const sig = await rpc.sendTransaction(tx, [signer]);
    await rpc.confirmTransaction(sig, "finalized");
    console.log("created withdraw record", sig);

    await sleep(4000);
    console.log("compressed acc addr", address.toString());
  let withdrawalRecordAccount = await rpc.getCompressedAccount(bn(address.toBytes()));
  console.log("withdrawalRecordAccount", withdrawalRecordAccount);

  const coder = new anchor.BorshCoder(idl as anchor.Idl);
  let depositRecord = coder.types.decode(
    "WithdrawalRecordCompressedAccount",
      withdrawalRecordAccount.data.data,
    )

  // console.log("depositRecord account ", depositRecordAccount);
  // console.log("des depositRecord ", depositRecord);
  const accProof = await rpc.getCompressedAccountProof(withdrawalRecordAccount.hash);

  const integrationTestsDir = path.join(__dirname, "../../integration-tests");
  // Convert BN amount to decimal string before writing to record.json
  const recordForJson = {
    ...depositRecord,
    amount: depositRecord.amount.toString(),
    timestamp: depositRecord.timestamp.toString(),
  };
  fs.writeFileSync(path.join(integrationTestsDir, "withdrawal_record.json"), JSON.stringify(recordForJson));
  fs.writeFileSync(path.join(integrationTestsDir, "withdrawal_proof.json"), JSON.stringify(accProof));
  fs.writeFileSync(path.join(integrationTestsDir, "withdrawal_account.json"), JSON.stringify(withdrawalRecordAccount));


  const withdrawKpAta2 = await getOrCreateAssociatedTokenAccount(
    new Connection("http://localhost:8899", "confirmed"),
    withdrawKp,
    mint,
    withdrawKp.publicKey
  );
  const withdrawKpBalance2 = await getAccount(
    new Connection("http://localhost:8899", "confirmed"),
    withdrawKpAta2.address
  );
  console.log("withdrawKp token balance after withdrawal:", withdrawKpBalance2.amount.toString(), mint.toString());

  }
}

async function CreateCounterCompressedAccount(
  rpc: Rpc,
  addressTree: anchor.web3.PublicKey,
  addressQueue: anchor.web3.PublicKey,
  address: anchor.web3.PublicKey,
  program: anchor.Program<CrossChainTokenBridge>,
  outputMerkleTree: anchor.web3.PublicKey,
  signer: anchor.web3.Keypair,
) {
  {
    const proofRpcResult = await rpc.getValidityProofV0(
      [],
      [
        {
          tree: addressTree,
          queue: addressQueue,
          address: bn(address.toBytes()),
        },
      ],
    );
    const systemAccountConfig = SystemAccountMetaConfig.new(program.programId);
    let remainingAccounts =
      PackedAccounts.newWithSystemAccounts(systemAccountConfig);

    const addressMerkleTreePubkeyIndex =
      remainingAccounts.insertOrGet(addressTree);
    const addressQueuePubkeyIndex = remainingAccounts.insertOrGet(addressQueue);
    const packedAddreesMerkleContext = {
      rootIndex: proofRpcResult.rootIndices[0],
      addressMerkleTreePubkeyIndex,
      addressQueuePubkeyIndex,
    };

    const outputMerkleTreeIndex =
      remainingAccounts.insertOrGet(outputMerkleTree);

    let proof = {
      0: proofRpcResult.compressedProof,
    };

    const computeBudgetIx = web3.ComputeBudgetProgram.setComputeUnitLimit({
      units: 1000000,
    });

    let tx = await program.methods
      .create(proof, packedAddreesMerkleContext, outputMerkleTreeIndex)
      .accounts({
        signer: signer.publicKey,
      })
      .preInstructions([computeBudgetIx])
      .remainingAccounts(remainingAccounts.toAccountMetas().remainingAccounts)
      .signers([signer])
      .transaction();

      tx.recentBlockhash = (await rpc.getRecentBlockhash()).blockhash;
      tx.sign(signer);

      const sig = await rpc.sendTransaction(tx, [signer]);
      await rpc.confirmTransaction(sig);
      console.log("Created counter compressed account ", sig);
  }
}

async function incrementCounterCompressedAccount(
  rpc: Rpc,
  counterValue: anchor.BN,
  counterAccount: CompressedAccountWithMerkleContext,
  program: anchor.Program<CrossChainTokenBridge>,
  outputMerkleTree: anchor.web3.PublicKey,
  signer: anchor.web3.Keypair,
) {
  {
    const proofRpcResult = await rpc.getValidityProofV0(
      [
        {
          hash: counterAccount.hash,
          tree: counterAccount.treeInfo.tree,
          queue: counterAccount.treeInfo.queue,
        },
      ],
      [],
    );
    const systemAccountConfig = SystemAccountMetaConfig.new(program.programId);
    let remainingAccounts =
      PackedAccounts.newWithSystemAccounts(systemAccountConfig);

    const merkleTreePubkeyIndex = remainingAccounts.insertOrGet(
      counterAccount.treeInfo.tree,
    );
    const queuePubkeyIndex = remainingAccounts.insertOrGet(
      counterAccount.treeInfo.queue,
    );
    const outputMerkleTreeIndex =
      remainingAccounts.insertOrGet(outputMerkleTree);

    const compressedAccountMeta = {
      merkleContext: {
        merkleTreePubkeyIndex,
        queuePubkeyIndex,
        leafIndex: counterAccount.leafIndex,
        proveByIndex: false,
      },
      rootIndex: proofRpcResult.rootIndices[0],
      outputMerkleTreeIndex,
      address: counterAccount.address,
    };

    let proof = {
      0: proofRpcResult.compressedProof,
    };
    const computeBudgetIx = web3.ComputeBudgetProgram.setComputeUnitLimit({
      units: 1000000,
    });
    let tx = await program.methods
      .increment(proof, counterValue, compressedAccountMeta)
      .accounts({
        signer: signer.publicKey,
      })
      .preInstructions([computeBudgetIx])
      .remainingAccounts(remainingAccounts.toAccountMetas().remainingAccounts)
      .signers([signer])
      .transaction();
    tx.recentBlockhash = (await rpc.getRecentBlockhash()).blockhash;
    tx.sign(signer);

    const sig = await rpc.sendTransaction(tx, [signer]);
    await rpc.confirmTransaction(sig);
    console.log("Incremented counter compressed account ", sig);
  }
}

async function deleteCounterCompressedAccount(
  rpc: Rpc,
  counterValue: anchor.BN,
  counterAccount: CompressedAccountWithMerkleContext,
  program: anchor.Program<CrossChainTokenBridge>,
  outputMerkleTree: anchor.web3.PublicKey,
  signer: anchor.web3.Keypair,
) {
  {
    const proofRpcResult = await rpc.getValidityProofV0(
      [
        {
          hash: counterAccount.hash,
          tree: counterAccount.treeInfo.tree,
          queue: counterAccount.treeInfo.queue,
        },
      ],
      [],
    );
    const systemAccountConfig = SystemAccountMetaConfig.new(program.programId);
    let remainingAccounts =
      PackedAccounts.newWithSystemAccounts(systemAccountConfig);

    const merkleTreePubkeyIndex = remainingAccounts.insertOrGet(
      counterAccount.treeInfo.tree,
    );
    const queuePubkeyIndex = remainingAccounts.insertOrGet(
      counterAccount.treeInfo.queue,
    );
    const outputMerkleTreeIndex =
      remainingAccounts.insertOrGet(outputMerkleTree);

    const compressedAccountMeta = {
      merkleContext: {
        merkleTreePubkeyIndex,
        queuePubkeyIndex,
        leafIndex: counterAccount.leafIndex,
        proveByIndex: false,
      },
      rootIndex: proofRpcResult.rootIndices[0],
      outputMerkleTreeIndex,
      address: counterAccount.address,
    };

    let proof = {
      0: proofRpcResult.compressedProof,
    };
    const computeBudgetIx = web3.ComputeBudgetProgram.setComputeUnitLimit({
      units: 1000000,
    });
    let tx = await program.methods
      .delete(proof, counterValue, compressedAccountMeta)
      .accounts({
        signer: signer.publicKey,
      })
      .preInstructions([computeBudgetIx])
      .remainingAccounts(remainingAccounts.toAccountMetas().remainingAccounts)
      .signers([signer])
      .transaction();
    tx.recentBlockhash = (await rpc.getRecentBlockhash()).blockhash;
    tx.sign(signer);

    const sig = await rpc.sendTransaction(tx, [signer]);
    await rpc.confirmTransaction(sig);
    console.log("Deleted counter compressed account ", sig);
  }
}

class PackedAccounts {
  private preAccounts: web3.AccountMeta[] = [];
  private systemAccounts: web3.AccountMeta[] = [];
  private nextIndex: number = 0;
  private map: Map<web3.PublicKey, [number, web3.AccountMeta]> = new Map();

  static newWithSystemAccounts(
    config: SystemAccountMetaConfig,
  ): PackedAccounts {
    const instance = new PackedAccounts();
    instance.addSystemAccounts(config);
    return instance;
  }

  addPreAccountsSigner(pubkey: web3.PublicKey): void {
    this.preAccounts.push({ pubkey, isSigner: true, isWritable: false });
  }

  addPreAccountsSignerMut(pubkey: web3.PublicKey): void {
    this.preAccounts.push({ pubkey, isSigner: true, isWritable: true });
  }

  addPreAccountsMeta(accountMeta: web3.AccountMeta): void {
    this.preAccounts.push(accountMeta);
  }

  addSystemAccounts(config: SystemAccountMetaConfig): void {
    this.systemAccounts.push(...getLightSystemAccountMetas(config));
  }

  insertOrGet(pubkey: web3.PublicKey): number {
    return this.insertOrGetConfig(pubkey, false, true);
  }

  insertOrGetReadOnly(pubkey: web3.PublicKey): number {
    return this.insertOrGetConfig(pubkey, false, false);
  }

  insertOrGetConfig(
    pubkey: web3.PublicKey,
    isSigner: boolean,
    isWritable: boolean,
  ): number {
    const entry = this.map.get(pubkey);
    if (entry) {
      return entry[0];
    }
    const index = this.nextIndex++;
    const meta: web3.AccountMeta = { pubkey, isSigner, isWritable };
    this.map.set(pubkey, [index, meta]);
    return index;
  }

  private hashSetAccountsToMetas(): web3.AccountMeta[] {
    const entries = Array.from(this.map.entries());
    entries.sort((a, b) => a[1][0] - b[1][0]);
    return entries.map(([, [, meta]]) => meta);
  }

  private getOffsets(): [number, number] {
    const systemStart = this.preAccounts.length;
    const packedStart = systemStart + this.systemAccounts.length;
    return [systemStart, packedStart];
  }

  toAccountMetas(): {
    remainingAccounts: web3.AccountMeta[];
    systemStart: number;
    packedStart: number;
  } {
    const packed = this.hashSetAccountsToMetas();
    const [systemStart, packedStart] = this.getOffsets();
    return {
      remainingAccounts: [
        ...this.preAccounts,
        ...this.systemAccounts,
        ...packed,
      ],
      systemStart,
      packedStart,
    };
  }
}

class SystemAccountMetaConfig {
  selfProgram: web3.PublicKey;
  cpiContext?: web3.PublicKey;
  solCompressionRecipient?: web3.PublicKey;
  solPoolPda?: web3.PublicKey;

  private constructor(
    selfProgram: web3.PublicKey,
    cpiContext?: web3.PublicKey,
    solCompressionRecipient?: web3.PublicKey,
    solPoolPda?: web3.PublicKey,
  ) {
    this.selfProgram = selfProgram;
    this.cpiContext = cpiContext;
    this.solCompressionRecipient = solCompressionRecipient;
    this.solPoolPda = solPoolPda;
  }

  static new(selfProgram: web3.PublicKey): SystemAccountMetaConfig {
    return new SystemAccountMetaConfig(selfProgram);
  }

  static newWithCpiContext(
    selfProgram: web3.PublicKey,
    cpiContext: web3.PublicKey,
  ): SystemAccountMetaConfig {
    return new SystemAccountMetaConfig(selfProgram, cpiContext);
  }
}

function getLightSystemAccountMetas(
  config: SystemAccountMetaConfig,
): web3.AccountMeta[] {
  let signerSeed = new TextEncoder().encode("cpi_authority");
  const cpiSigner = web3.PublicKey.findProgramAddressSync(
    [signerSeed],
    config.selfProgram,
  )[0];
  const defaults = SystemAccountPubkeys.default();
  const metas: web3.AccountMeta[] = [
    { pubkey: defaults.lightSystemProgram, isSigner: false, isWritable: false },
    { pubkey: cpiSigner, isSigner: false, isWritable: false },
    {
      pubkey: defaults.registeredProgramPda,
      isSigner: false,
      isWritable: false,
    },
    { pubkey: defaults.noopProgram, isSigner: false, isWritable: false },
    {
      pubkey: defaults.accountCompressionAuthority,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: defaults.accountCompressionProgram,
      isSigner: false,
      isWritable: false,
    },
    { pubkey: config.selfProgram, isSigner: false, isWritable: false },
  ];
  if (config.solPoolPda) {
    metas.push({
      pubkey: config.solPoolPda,
      isSigner: false,
      isWritable: true,
    });
  }
  if (config.solCompressionRecipient) {
    metas.push({
      pubkey: config.solCompressionRecipient,
      isSigner: false,
      isWritable: true,
    });
  }
  metas.push({
    pubkey: defaults.systemProgram,
    isSigner: false,
    isWritable: false,
  });
  if (config.cpiContext) {
    metas.push({
      pubkey: config.cpiContext,
      isSigner: false,
      isWritable: true,
    });
  }
  return metas;
}

class SystemAccountPubkeys {
  lightSystemProgram: web3.PublicKey;
  systemProgram: web3.PublicKey;
  accountCompressionProgram: web3.PublicKey;
  accountCompressionAuthority: web3.PublicKey;
  registeredProgramPda: web3.PublicKey;
  noopProgram: web3.PublicKey;
  solPoolPda: web3.PublicKey;

  private constructor(
    lightSystemProgram: web3.PublicKey,
    systemProgram: web3.PublicKey,
    accountCompressionProgram: web3.PublicKey,
    accountCompressionAuthority: web3.PublicKey,
    registeredProgramPda: web3.PublicKey,
    noopProgram: web3.PublicKey,
    solPoolPda: web3.PublicKey,
  ) {
    this.lightSystemProgram = lightSystemProgram;
    this.systemProgram = systemProgram;
    this.accountCompressionProgram = accountCompressionProgram;
    this.accountCompressionAuthority = accountCompressionAuthority;
    this.registeredProgramPda = registeredProgramPda;
    this.noopProgram = noopProgram;
    this.solPoolPda = solPoolPda;
  }

  static default(): SystemAccountPubkeys {
    return new SystemAccountPubkeys(
      LightSystemProgram.programId,
      web3.PublicKey.default,
      defaultStaticAccountsStruct().accountCompressionProgram,
      defaultStaticAccountsStruct().accountCompressionAuthority,
      defaultStaticAccountsStruct().registeredProgramPda,
      defaultStaticAccountsStruct().noopProgram,
      web3.PublicKey.default,
    );
  }
}
