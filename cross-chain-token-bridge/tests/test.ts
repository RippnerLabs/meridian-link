import fs from "fs";
import {Connection, PublicKey} from "@solana/web3.js";
import {createMint, getOrCreateAssociatedTokenAccount, mintTo, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID} from "@solana/spl-token";
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
  Rpc,
  sleep,
} from "@lightprotocol/stateless.js";
import { buildInputs } from "./utils";
import bs58 from "bs58";

const path = require("path");
const os = require("os");
require("dotenv").config();

const anchorWalletPath = path.join(os.homedir(), ".config/solana/id.json");
process.env.ANCHOR_WALLET = anchorWalletPath;

describe("test-anchor", () => {
  const program = anchor.workspace.CrossChainTokenBridge as Program<CrossChainTokenBridge>;
  const coder = new anchor.BorshCoder(idl as anchor.Idl);

  it("", async () => {
    let signer = new web3.Keypair();
    let rpc = createRpc(
      "http://127.0.0.1:8899",
      "http://127.0.0.1:8784",
      "http://127.0.0.1:3001",
      {
        commitment: "confirmed",
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
    const decimals = 9;
    const mint = await createMint(conn, signer, signer.publicKey, signer.publicKey, decimals);
    const ata = await getOrCreateAssociatedTokenAccount(conn, signer, mint, signer.publicKey);
    const amount = BigInt(1000) * BigInt(10**decimals);
    const mintSig = await mintTo(
      conn, signer, mint, ata.address,signer, amount
    );

    const depositRecordSeed = deriveAddressSeed(
      [
        new TextEncoder().encode("deposit"),
        signer.publicKey.toBytes(),
        bn(1).toArrayLike(Buffer, 'le', 16)
      ],
      new web3.PublicKey(program.idl.address)
    );
    const depositRecordAddress = deriveAddress(depositRecordSeed, addressTree);
    console.log("depositRecordAddress", depositRecordAddress);
    const dest_chain_id = 41312;
    const ethHex = "6a1c9fb72eff1b99b7f5708726eab5fb6b447821"; // lower-case, no 0x
    const dest_chain_addr = bs58.encode(Buffer.from(ethHex, "hex"));
    const dest_chain_mint_addr = dest_chain_addr; // same for mint addr
    await initTokenBridgeCall(rpc, program, signer, mint, dest_chain_id, dest_chain_mint_addr);
    await CreateDepositRecordCompressedAccount(
      rpc,
      addressTree,
      addressQueue,
      depositRecordAddress,
      program,
      outputMerkleTree,
      signer,
      mint,
      dest_chain_id,
      dest_chain_addr,
    )

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
  mint: PublicKey,
  dest_chain_id: number,
  dest_chain_mint_addr: string,
) {
  {
    let tx = await program.methods.initTokenBridge(dest_chain_id, dest_chain_mint_addr)
    .accounts(
      {
        signer:signer.publicKey,
        mint,
        tokenProgram: TOKEN_PROGRAM_ID
      }
    )
    .signers([signer])
    .transaction();
    tx.recentBlockhash = (await rpc.getRecentBlockhash()).blockhash;
    tx.sign(signer);
    const sig = await rpc.sendTransaction(tx, [signer]);
    console.log('token bridge initialised', sig);

    const address = PublicKey.findProgramAddressSync(
      [Buffer.from("token_bridge"), mint.toBuffer(), bn(dest_chain_id).toArrayLike(Buffer, 'le', 4)],
      program.programId
    )[0];
    await sleep(2000);
    let tokenBridgeAccount = await program.account.tokenBridge.fetch(address);
    console.log("tokenBridgeAccount", tokenBridgeAccount);
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
  destChainId: number,
  destChainAddr: string
) {
  {
    const proofRpcResult = await rpc.getValidityProofV0(
      [],
      [
        {
          tree: addressTree,
          queue: addressQueue,
          address: bn(address.toBytes()),
        }
      ]
    );

    const systemAccountConfig = SystemAccountMetaConfig.new(program.programId);
    console.log('systemAccountConfig', systemAccountConfig);
    let remainingAccounts = PackedAccounts.newWithSystemAccounts(systemAccountConfig);
    console.log('remainingAccounts', remainingAccounts);
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

    let tx = await program.methods
      .deposit(proof, packedAddressMerkleContext, outputMerkleTreeIndex, bn(100), destChainId, destChainAddr)
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
      console.log("compressed acc addr", bn(address.toBytes()));
    let depositRecordAccount = await rpc.getCompressedAccount(bn(address.toBytes()));
    console.log("depositRecordAccount", depositRecordAccount);

    const coder = new anchor.BorshCoder(idl as anchor.Idl);
      let depositRecord = coder.types.decode(
        "DepositRecordCompressedAccount",
        depositRecordAccount.data.data,
      )
 
      console.log("depositRecord account ", depositRecordAccount);
      console.log("des depositRecord ", depositRecord);
  
    const accProof = await rpc.getCompressedAccountProof(depositRecordAccount.hash);

    console.log("depositRecord accProof ", accProof);
    const circuitInputs = buildInputs(
      depositRecord,
      depositRecordAccount,
      accProof,
    );
    fs.writeFileSync("../circom/input.json", JSON.stringify(circuitInputs));
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
