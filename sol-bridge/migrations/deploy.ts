// Migrations are an early feature. Currently, they're nothing more than this
// single deploy script that's invoked from the CLI, injecting a provider
// configured from the workspace's Anchor.toml.
import dotenv from "dotenv";
import * as anchor from "@coral-xyz/anchor";
import path from "path";
dotenv.config({
  path: path.join(__dirname, "../../relayer-ts/.env.local")
})
import { Connection, Keypair } from "@solana/web3.js";
import fs from "fs";
import {
  createAssociatedTokenAccount,
  createMint,
  mintTo,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import idl from "../target/idl/cross_chain_token_bridge.json";
import { CrossChainTokenBridge } from "../target/types/cross_chain_token_bridge"
import { createRpc } from "@lightprotocol/stateless.js";
import { BN } from "bn.js";
import addressBook from "../../config/localhost_address_book.json";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";

function toBigInt(amount: number | bigint): bigint {
  return typeof amount === "bigint" ? amount : BigInt(amount);
}

async function main() {
  const signer = Keypair.fromSecretKey(
    new Uint8Array(
      JSON.parse(
        fs.readFileSync(path.join(__dirname, "../../keys/signer.json"), "utf8")
      )
    )
  );

  const connection = new Connection(process.env.SOLANA_VALIDATOR_URL, {
    commitment: "confirmed",
  });

  const decimals = 2;

  const mintPubkey = await createMint(
    connection,
    signer,
    signer.publicKey,
    signer.publicKey,
    decimals,
    undefined,
    { commitment: "confirmed", skipPreflight: true }
  );

  console.log("Created mint:", mintPubkey.toBase58());

  const ata = await createAssociatedTokenAccount(
    connection,
    signer,
    mintPubkey,
    signer.publicKey,
    { commitment: "confirmed", skipPreflight: true }
  );

  const mintAmount = toBigInt(1_000_000 * 10 ** decimals);
  await mintTo(
    connection,
    signer,
    mintPubkey,
    ata,
    signer,
    mintAmount,
    [],
    { commitment: "confirmed", skipPreflight: true }
  );

  console.log(
    `Minted ${(1_000_000).toLocaleString()} tokens to ${ata.toBase58()}`
  );

  fs.writeFileSync(
    path.join(
      __dirname,
      `../../config/${process.env.RUNTIME}_solana_address.json`
    ),
    JSON.stringify({ bridgeTokenAddress: mintPubkey.toString() })
  );

  // 1 - We've the Bridge token mint on solana now


  // override ANCHOR_WALLET env
  process.env.ANCHOR_WALLET = path.join(__dirname, "../../keys/signer.json");
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider)
  const program = new anchor.Program(idl as CrossChainTokenBridge, provider);
  const rpc = createRpc(process.env.SOLANA_VALIDATOR_URL,process.env.SOLANA_COMPRESSION_API_ENDPOINT,process.env.SOLANA_PROVER_ENDPOINT);
  const depositToVaultTx = await program.methods.depositToVault(new BN(mintAmount))
  .accounts({
    signer: signer.publicKey,
    mint: mintPubkey,
    tokenProgram: TOKEN_PROGRAM_ID
  })
  .signers([signer])
  .transaction();

  depositToVaultTx.recentBlockhash = (await rpc.getRecentBlockhash()).blockhash;
  const sign = await rpc.sendTransaction(depositToVaultTx, [signer]);
  await rpc.confirmTransaction(sign);

  // 2 - by here sol bridge has enough tokens to withdraw to the users

  const initBridgeStatePdaTx = await program.methods.init()
  .accounts({
    signer: signer.publicKey
  })
  .signers([signer])
  .transaction();
  initBridgeStatePdaTx.recentBlockhash = (await rpc.getRecentBlockhash()).blockhash;
  const sign2 = await rpc.sendTransaction(initBridgeStatePdaTx, [signer]);
  await rpc.confirmTransaction(sign2);

  // 3 - by here token bridge is initialised
  const toBs58 = x => bs58.encode(Buffer.from(x.replace("0x", ""), "hex"));
  const CHAIN_IDS = [
    {mintAddr: mintPubkey, chaindId: 1},
    {mintAddr: toBs58(addressBook.tokenSmartContractAddress), chaindId: 31337},
    {mintAddr: toBs58(addressBook.tokenSmartContractAddress), chaindId: 11155111},
  ]
  
  for (let i = 0; i < CHAIN_IDS.length; i++) {
    for (let j = 0; j < CHAIN_IDS.length; j++) {
      if (i === j) continue;
      const link = `${CHAIN_IDS[i].chaindId}_${CHAIN_IDS[i].mintAddr}_${CHAIN_IDS[j].chaindId}_${CHAIN_IDS[j].mintAddr}`;
      console.log('link',link);
      const linkHash = await require('crypto').createHash('sha256')
      .update(link)
      .digest('hex')
      .slice(0, 16);
      
      console.log('link',linkHash);
      const initTokenBridgeTx = await program.methods.initTokenBridge(
        CHAIN_IDS[i].chaindId,
        CHAIN_IDS[i].mintAddr.toString(),
        CHAIN_IDS[j].chaindId,
        CHAIN_IDS[j].mintAddr.toString(),
        linkHash
      )
      .accounts({
        signer: signer.publicKey
      })
      .signers([signer])
      .transaction();
      
      initTokenBridgeTx.recentBlockhash = (await rpc.getRecentBlockhash()).blockhash;
      const bridgeSign = await rpc.sendTransaction(initTokenBridgeTx, [signer]);
      await rpc.confirmTransaction(bridgeSign);
      
      console.log(`Initialized token bridge from chain ${CHAIN_IDS[i].chaindId} to ${CHAIN_IDS[j].chaindId}`);
    }
  }

};

main();