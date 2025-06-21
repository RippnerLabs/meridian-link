export interface DepositRecord {
    owner: string;
    source_chain_id: number;
    dest_chain_id: number;
    dest_chain_addr: string;
    dest_chain_mint_addr: string;
    mint: string;
    amount: string;
    timestamp: string;
    deposit_id: string;
}

export interface CircuitInputs {
    // public
    stateRoot: string;
    amount: string;
    destChainId: string;
    destChainAddr: string;

    // private
    accountHash: string;
    leafIndex: string;
    merkleProof: string[];
    pathIndices: string[];
    owner: string;
    sourceChainId: string;
    mint: string;
    timestamp: string;
    depositId: string;
    dataHash: string;
}

export interface ProofResponse {
    a: string[];
    b: string[][];
    c: string[];
    publicSignals: string[];
} 