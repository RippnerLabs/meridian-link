import fs from "fs";
import {TOKEN_PROGRAM_ID} from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor";
import { CrossChainTokenBridge } from "../../sol-bridge/target/types/cross_chain_token_bridge";
import idl from "../../sol-bridge/target/idl/cross_chain_token_bridge.json";
import {
  bn,
  CompressedAccountWithMerkleContext,
  createRpc,
  defaultStaticAccountsStruct,
  deriveAddress,
  deriveAddressSeed,
  getDefaultAddressTreeInfo,
  LightSystemProgram,
  Rpc,
  sleep,
} from "@lightprotocol/stateless.js";
import path from "path";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";

// globals
const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const program = new anchor.Program(idl as CrossChainTokenBridge, provider);
const relayerKp = anchor.web3.Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(path.join(__dirname, "../relayer.json"), "utf8"))));
let initialised = false;
const rpc = createRpc(process.env.SOLANA_VALIDATOR_URL,process.env.SOLANA_COMPRESSION_API_ENDPOINT,process.env.SOLANA_PROVER_ENDPOINT);

async function init() {
  initialised = true;
}

export async function solanaWithdraw(proofProc: any, depositEvent: any) {
  const stateTreeInfos = await rpc.getStateTreeInfos();
  const outputMerkleTree = stateTreeInfos[0].tree;
  const defaultAddressTreeInfo = getDefaultAddressTreeInfo()
  const addressTree = defaultAddressTreeInfo.tree;
  const addressQueue = defaultAddressTreeInfo.queue;

  // process eth addresses
  depositEvent.tokenMint = bs58.encode(
    Buffer.from(depositEvent.tokenMint.replace("0x", ""), "hex")
  )
  depositEvent.depositor = bs58.encode(
  Buffer.from(depositEvent.depositor.replace("0x", ""), "hex")
  )

  // initWithdrawalProofAccount
  const withdrawalProofTx = await program.methods.initWithdrawalProofAccount(
    bn(depositEvent.depositId.toString()),
    proofProc.proofA,
    proofProc.proofB,
    proofProc.proofC,
    proofProc.publicSignals[0],
    proofProc.publicSignals[1],
  )
  .accounts({
    signer: relayerKp.publicKey
  })
  .signers([relayerKp])
  .transaction();

  withdrawalProofTx.recentBlockhash = (await rpc.getRecentBlockhash()).blockhash;
  withdrawalProofTx.sign(relayerKp);

  const sign = await rpc.sendTransaction(withdrawalProofTx, [relayerKp]);
  await rpc.confirmTransaction(sign);
  console.log("initWithdrawalProofAccount instr sign:", sign);

  // withdraw instruction
  const withdrawalRecordAccountSeed = deriveAddressSeed(
    [
      new TextEncoder().encode("withdrawal"),
      new anchor.web3.PublicKey(depositEvent.destChainAddr).toBytes(),
      proofProc.publicSignals[0]
    ],
    new anchor.web3.PublicKey(program.idl.address)
  );
  const withdrawalAccountAddress = deriveAddress(withdrawalRecordAccountSeed, addressTree);
  const proofRes = await rpc.getValidityProofV0(
    [],
    [
      {
        tree: addressTree,
        queue: addressQueue,
        address: bn(withdrawalAccountAddress.toBytes()),
      }
    ]
  );
  const systemAccountConfig = SystemAccountMetaConfig.new(program.programId);
  let remainingAccounts = PackedAccounts.newWithSystemAccounts(systemAccountConfig);
  const addressMerkleTreePubkeyIndex = remainingAccounts.insertOrGet(addressTree);
  const addressQueuePubkeyIndex = remainingAccounts.insertOrGet(addressQueue);
  const packedAddressMerkleContext = {
    rootIndex: proofRes.rootIndices[0],
    addressMerkleTreePubkeyIndex,
    addressQueuePubkeyIndex,
  }
  const outputMerkleTreeIndex = remainingAccounts.insertOrGet(outputMerkleTree);

  let proof = {
    0: proofRes.compressedProof
  }

  const computeBudgetIx = anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
    units: 1000000,
  });

  const link = `${depositEvent.sourceChainId}_${depositEvent.tokenMint}_${depositEvent.destChainId}_${depositEvent.destChainMintAddr}`;
  console.log('link', link);
  const linkHash = require('crypto').createHash('sha256')
  .update(link)
  .digest('hex')
  .slice(0, 16);
  console.log("linkHash", linkHash);
  let tx = await program.methods
  .withdraw(
    proof,
    packedAddressMerkleContext,
    outputMerkleTreeIndex,
    bn(depositEvent.amount.toString()),
    linkHash,
    Buffer.from(proofProc.publicSignals[0])
  )
  .accounts({
    relayer: relayerKp.publicKey,
    recipient: depositEvent.destChainAddr,
    mint: new anchor.web3.PublicKey(depositEvent.destChainMintAddr),
    tokenProgram: TOKEN_PROGRAM_ID
  })
  .preInstructions([computeBudgetIx])
  .remainingAccounts(remainingAccounts.toAccountMetas().remainingAccounts)
  .signers([relayerKp])
  .transaction();

  tx.recentBlockhash = (await rpc.getRecentBlockhash()).blockhash;
  tx.sign(relayerKp);

  const sig = await rpc.sendTransaction(tx, [relayerKp]);
  await rpc.confirmTransaction(sig, "finalized");

  const withdrawalRecordAccount = await rpc.getCompressedAccount(bn(withdrawalAccountAddress.toBytes()));
  const coder = new anchor.BorshCoder(idl as anchor.Idl);
  const withdrawalRecord = coder.types.decode(
    "WithdrawalRecordCompressedAccount",
    withdrawalRecordAccount.data.data,
  );

  return withdrawalRecord;
}

class PackedAccounts {
  private preAccounts: anchor.web3.AccountMeta[] = [];
  private systemAccounts: anchor.web3.AccountMeta[] = [];
  private nextIndex: number = 0;
  private map: Map<anchor.web3.PublicKey, [number, anchor.web3.AccountMeta]> = new Map();

  static newWithSystemAccounts(
    config: SystemAccountMetaConfig,
  ): PackedAccounts {
    const instance = new PackedAccounts();
    instance.addSystemAccounts(config);
    return instance;
  }

  addSystemAccounts(config: SystemAccountMetaConfig): void {
    this.systemAccounts.push(...getLightSystemAccountMetas(config));
  }

  insertOrGet(pubkey: anchor.web3.PublicKey): number {
    return this.insertOrGetConfig(pubkey, false, true);
  }

  insertOrGetReadOnly(pubkey: anchor.web3.PublicKey): number {
    return this.insertOrGetConfig(pubkey, false, false);
  }

  insertOrGetConfig(pubkey: anchor.web3.PublicKey, isSigner: boolean, isWritable: boolean) {
    const entry = this.map.get(pubkey);
    if(entry) return entry[0];
    const index = this.nextIndex++;
    const meta: anchor.web3.AccountMeta = {pubkey, isSigner, isWritable};
    this.map.set(pubkey, [index,meta]);
    return index;
  }

  private hashSetAccountsToMetas(): anchor.web3.AccountMeta[] {
    const entries = Array.from(this.map.entries());
    entries.sort((a,b) => a[1][0] - b[1][0]);
    return entries.map(([, [,meta]]) => meta);
  }

  private getOffsets(): [number, number] {
    const systemStart = this.preAccounts.length;
    const packedStart = systemStart + this.systemAccounts.length;
    return [systemStart, packedStart];
  }

  toAccountMetas(): {
    remainingAccounts: anchor.web3.AccountMeta[];
    systemStart: number;
    packedStart: number;
  } {
    const packed = this.hashSetAccountsToMetas();
    const [systemStart, packedStart] = this.getOffsets();
    return {
      remainingAccounts: [
        ...this.preAccounts,
        ...this.systemAccounts,
        ...packed
      ],
      systemStart,
      packedStart
    }
  }
}

function getLightSystemAccountMetas(
  config: SystemAccountMetaConfig
): anchor.web3.AccountMeta[] {
  let signerSeed = new TextEncoder().encode("cpi_authority");
  const cpiSigner = anchor.web3.PublicKey.findProgramAddressSync(
    [signerSeed],
    config.selfProgram
  )[0];
  const defaults = SystemAccountPubkeys.default();
  const metas: anchor.web3.AccountMeta[] = [
    {pubkey: defaults.lightSystemProgram, isSigner: false, isWritable: false},
    {pubkey: cpiSigner, isSigner: false, isWritable: false},
    {pubkey: defaults.registeredProgramPda, isSigner: false, isWritable: false},
    {pubkey: defaults.noopProgram, isSigner: false, isWritable: false},
    {pubkey: defaults.accountCompressionAuthority, isSigner: false, isWritable: false},
    {pubkey: defaults.accountCompressionProgram, isSigner: false, isWritable: false},
    {pubkey: config.selfProgram, isSigner: false, isWritable: false},
  ];

  if(config.solPoolPda) {
    metas.push({
      pubkey: config.solPoolPda,
      isSigner: false,
      isWritable: true,
    })
  };

  if(config.solCompressionRecipient) {
    metas.push({
      pubkey: config.solCompressionRecipient,
      isSigner: false,
      isWritable: true
    })
  }

  metas.push({
    pubkey: defaults.systemProgram,
    isSigner: false,
    isWritable: false,
  });

  if(config.cpiContext) {
    metas.push({
      pubkey: config.cpiContext,
      isSigner: false,
      isWritable: true,
    })
  }
  return metas;
}

class SystemAccountPubkeys {
  lightSystemProgram: anchor.web3.PublicKey;
  systemProgram: anchor.web3.PublicKey;
  accountCompressionProgram: anchor.web3.PublicKey;
  accountCompressionAuthority: anchor.web3.PublicKey;
  registeredProgramPda: anchor.web3.PublicKey;
  noopProgram: anchor.web3.PublicKey;
  solPoolPda: anchor.web3.PublicKey;

  private constructor(
    lightSystemProgram: anchor.web3.PublicKey,
    systemProgram: anchor.web3.PublicKey,
    accountCompressionProgram: anchor.web3.PublicKey,
    accountCompressionAuthority: anchor.web3.PublicKey,
    registeredProgramPda: anchor.web3.PublicKey,
    noopProgram: anchor.web3.PublicKey,
    solPoolPda: anchor.web3.PublicKey,
  ) {
    this.lightSystemProgram=lightSystemProgram;
    this.systemProgram=systemProgram;
    this.accountCompressionProgram=accountCompressionProgram;
    this.accountCompressionAuthority=accountCompressionAuthority;
    this.registeredProgramPda=registeredProgramPda;
    this.noopProgram=noopProgram;
    this.solPoolPda=solPoolPda;
  }

  static default(): SystemAccountPubkeys {
    return new SystemAccountPubkeys(
      LightSystemProgram.programId,
      anchor.web3.PublicKey.default,
      defaultStaticAccountsStruct().accountCompressionProgram,
      defaultStaticAccountsStruct().accountCompressionAuthority,
      defaultStaticAccountsStruct().registeredProgramPda,
      defaultStaticAccountsStruct().noopProgram,
      anchor.web3.PublicKey.default,
    )
  }

}

class SystemAccountMetaConfig {
  selfProgram: anchor.web3.PublicKey;
  cpiContext?: anchor.web3.PublicKey;
  solCompressionRecipient?: anchor.web3.PublicKey;
  solPoolPda?: anchor.web3.PublicKey;
  
  private constructor(
    selfProgram: anchor.web3.PublicKey,
    cpiContext?: anchor.web3.PublicKey,
    solCompressionRecipient?: anchor.web3.PublicKey,
    solPoolPda?: anchor.web3.PublicKey,
  ) {
    this.selfProgram = selfProgram;
    this.cpiContext = cpiContext;
    this.solCompressionRecipient = solCompressionRecipient;
    this.solPoolPda = solPoolPda;
  }

  static new(selfProgram: anchor.web3.PublicKey): SystemAccountMetaConfig {
    return new SystemAccountMetaConfig(selfProgram);
  }

  static newWithCpiContext(
    selfProgram: anchor.web3.PublicKey,
    cpiContext: anchor.web3.PublicKey,
  ): SystemAccountMetaConfig {
    return new SystemAccountMetaConfig(selfProgram, cpiContext);
  }
}