import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import BridgeToken from '@/contracts/BridgeToken.json';

type FaucetEthRequest = {
  recipient: string;
  token?: string; // defaults to env
  amount?: number; // human units, default 100
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as FaucetEthRequest;
    const recipient = body?.recipient;
    const tokenAddress = (body?.token || process.env.NEXT_PUBLIC_ETH_TOKEN_SMART_CONTRACT_ADDRESS || '') as `0x${string}`;
    if (!recipient || !tokenAddress) {
      return NextResponse.json({ error: 'recipient and token are required' }, { status: 400 });
    }

    const rpc = process.env.ETHEREUM_NODE_URL || process.env.NEXT_PUBLIC_HARDHAT_URL || 'http://127.0.0.1:8545';
    const priv = process.env.ETH_TOKEN_OWNER_PRIVKEY;
    if (!priv) return NextResponse.json({ error: 'ETH_TOKEN_OWNER_PRIVKEY not set' }, { status: 500 });

    const provider = new ethers.JsonRpcProvider(rpc);
    const signer = new ethers.Wallet(priv, provider);
    const contract = new ethers.Contract(tokenAddress, (BridgeToken as any).abi, signer);

    const [decimals] = await Promise.all([
      contract.decimals(),
    ]);

    const amountHuman = typeof body.amount === 'number' && body.amount > 0 ? body.amount : 100;
    const amount = ethers.parseUnits(String(amountHuman), Number(decimals));

    const tx = await contract.mint(recipient as `0x${string}`, amount);
    const receipt = await tx.wait();

    return NextResponse.json({ ok: true, hash: receipt?.hash });
  } catch (err: any) {
    console.error('[FAUCET_ETH_ERROR]', err);
    return NextResponse.json({ error: err?.message || 'failed' }, { status: 500 });
  }
}


