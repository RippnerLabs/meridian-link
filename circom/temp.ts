import { poseidon9 } from "poseidon-lite";
import * as fs from "fs";
import bs58 from "bs58"

async function main() {
  const nullifier = poseidon9([
    BigInt("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"),
    BigInt("31337"),
    BigInt("1"),
    BigInt("0x" + Buffer.from(bs58.decode("7fD1uH15XByFTnGjDZr5tFQjxtaWBZUYpecXeesr1jom")).toString("hex")),
    BigInt("0x" + Buffer.from(bs58.decode("7fD1uH15XByFTnGjDZr5tFQjxtaWBZUYpecXeesr1jom")).toString("hex")),
    BigInt("0x322813Fd9A801c5507c9de605d63CEA4f2CE6c44"),
    BigInt("100"),
    BigInt("1750519384"),
    BigInt("2"),
  ]);
  console.log("nullifier", nullifier);
  const inputs = {
    depositor:BigInt("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266").toString(),
    sourceChainId:BigInt("31337").toString(),
    destChainId:BigInt("1").toString(),
    destChainAddr:BigInt("0x" + Buffer.from(bs58.decode("7fD1uH15XByFTnGjDZr5tFQjxtaWBZUYpecXeesr1jom")).toString("hex")).toString(),
    destChainMintAddr:BigInt("0x" + Buffer.from(bs58.decode("7fD1uH15XByFTnGjDZr5tFQjxtaWBZUYpecXeesr1jom")).toString("hex")).toString(),
    tokenMint:BigInt("0x322813Fd9A801c5507c9de605d63CEA4f2CE6c44").toString(),
    amount:BigInt("100").toString(),
    timestamp:BigInt("1750519384").toString(),
    despositId:BigInt("2").toString(),
  }
  fs.writeFileSync("ethDepositNullifierCircuitInput.json", JSON.stringify(inputs, null,2));
}

main()