pragma circom 2.2.2;

include "node_modules/@jayanth-kumar-morem/indexed-merkle-tree/circom/IMTInsertion.circom";
include "node_modules/@jayanth-kumar-morem/indexed-merkle-tree/circom/IMTNonMembership.circom";
include "node_modules/circomlib/circuits/poseidon.circom";

template EthDepositProof(depthI) {
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
    signal input depositId;
    signal input nullifier;
    
    // imt membership inputs
    // query = nullifier hash from poseidon
    signal input pre_val;
    signal input pre_next;
    signal input path[depthI];
    signal input dirs[depthI];
    signal input old_root;
    
    
    component poseidon = Poseidon(9);
    poseidon.inputs[0] <== depositor;
    poseidon.inputs[1] <== sourceChainId;
    poseidon.inputs[2] <== destChainId;
    poseidon.inputs[3] <== destChainAddr;
    poseidon.inputs[4] <== destChainMintAddr;
    poseidon.inputs[5] <== tokenMint;
    poseidon.inputs[6] <== amount;
    poseidon.inputs[7] <== timestamp;
    poseidon.inputs[8] <== depositId;
    
    signal output nullifierComputed <== poseidon.out;
    
    nullifierComputed === nullifier;
    
    signal query <== nullifierComputed;

    // outputs
    signal output new_root <== IMTInsertion(depthI)(
        query,
        pre_val,
        pre_next,
        path,
        dirs,
        old_root
    );
}

component main = EthDepositProof(32);