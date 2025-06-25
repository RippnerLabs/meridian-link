import { createMint } from "@solana/spl-token";
import { Connection } from "@solana/web3.js";

async function main() {
    const conn = new Connection("http://localhost:8899", "confirmed");
    const decimals = 2;
    const mint = createMint(conn, )
}