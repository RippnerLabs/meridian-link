import { NextRequest, NextResponse } from 'next/server';
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { getAccount, getAssociatedTokenAddress, getMint, TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction, createMintToInstruction } from '@solana/spl-token';
import * as fs from 'fs';
import * as path from 'path';

type FaucetRequest = {
  recipient: string;
  mint: string;
  amount?: number; // human units, default 100
};

function readSignerFromKeys(): Keypair {
  const projectRoot = process.cwd(); // points to web/
  const signerPath = path.resolve(projectRoot,  '..', 'keys', 'signer.json');
  const secret = JSON.parse(fs.readFileSync(signerPath, 'utf8')) as number[];
  return Keypair.fromSecretKey(new Uint8Array(secret));
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as FaucetRequest;
    if (!body?.recipient || !body?.mint) {
      return NextResponse.json({ error: 'recipient and mint are required' }, { status: 400 });
    }

    const rpc = process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT || 'http://127.0.0.1:8899';
    const connection = new Connection(rpc, 'confirmed');
    const signer = readSignerFromKeys();

    const recipientPk = new PublicKey(body.recipient);
    const mintPk = new PublicKey(body.mint);

    // Resolve ATA
    const ata = await getAssociatedTokenAddress(mintPk, recipientPk, false, TOKEN_PROGRAM_ID);

    // Ensure ATA exists
    let ataExists = true;
    try {
      await getAccount(connection, ata, undefined, TOKEN_PROGRAM_ID);
    } catch (_) {
      ataExists = false;
    }

    const mintInfo = await getMint(connection, mintPk);
    const decimals = mintInfo.decimals ?? 0;
    const amountHuman = typeof body.amount === 'number' && body.amount > 0 ? body.amount : 100; // default 100
    const amount = BigInt(Math.trunc(amountHuman)) * (10n ** BigInt(decimals));

    const tx = new Transaction();
    if (!ataExists) {
      tx.add(createAssociatedTokenAccountInstruction(
        signer.publicKey,
        ata,
        recipientPk,
        mintPk,
        TOKEN_PROGRAM_ID,
      ));
    }

    // Mint to ATA – requires mint authority to be the signer
    tx.add(createMintToInstruction(
      mintPk,
      ata,
      signer.publicKey,
      Number(amount),
    ));

    tx.feePayer = signer.publicKey;
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;

    tx.sign(signer);
    const sig = await sendAndConfirmTransaction(connection, tx, [signer], { commitment: 'confirmed' });

    return NextResponse.json({ ok: true, signature: sig, ata: ata.toBase58() });
  } catch (err: any) {
    console.error('[FAUCET_SOLANA_ERROR]', err);
    return NextResponse.json({ error: err?.message || 'failed' }, { status: 500 });
  }
}


