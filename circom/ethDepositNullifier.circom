pragma circom 2.2.2;

include "node_modules/circomlib/circuits/poseidon.circom";

template DepositNullifier() {
    // inputs
    // eth deposit event
    signal input depositor;
    signal input sourceChainId;
    signal input destChainId;
    signal input destChainAddr;
    signal input destChainMintAddr;
    signal input tokenMint;
    signal input amount;
    signal input timestamp;
    signal input despositId;
    
    // outputs
    signal output nullifier;
    
    component poseidon = Poseidon(9);
    poseidon.inputs[0] <== depositor;
    poseidon.inputs[1] <== sourceChainId;
    poseidon.inputs[2] <== destChainId;
    poseidon.inputs[3] <== destChainAddr;
    poseidon.inputs[4] <== destChainMintAddr;
    poseidon.inputs[5] <== tokenMint;
    poseidon.inputs[6] <== amount;
    poseidon.inputs[7] <== timestamp;
    poseidon.inputs[8] <== despositId;
    
    nullifier <== poseidon.out;
}

component main = DepositNullifier();