import { 
    Rpc,
    getParsedEvents,
    getStateTreeInfoByPubkey,
    MerkleTree,
    bn,
    TreeType,
    MerkleContextWithMerkleProof,
    PublicTransactionEvent,
    TreeInfo,
    BN254,
    createRpc
} from '@lightprotocol/stateless.js';

import { PublicKey } from '@solana/web3.js';

import { Buffer } from 'buffer';
import fs from "fs";

console.log('Imports loaded successfully');

interface ProofData {
    hash: string;
    treeInfo: {
        queue: string;
        treeType: number;
        tree: string;
        cpiContext: string;
        nextTreeInfo: null;
    };
    leafIndex: number;
    merkleProof: string[];
    rootIndex: number;
    root: string;
    proveByIndex: number;
}

async function verifyProof(proofData: ProofData): Promise<boolean> {
    try {
        let rpc = createRpc(
            "http://127.0.0.1:8899",
            "http://127.0.0.1:8784",
            "http://0.0.0.0:3001",
            {
              commitment: "confirmed"
            },  
          );
        const events: PublicTransactionEvent[] = await getParsedEvents(
            rpc,
        ).then(events => events.reverse());
        console.log("events",events);
        const leavesByTree: Map<
            string,
            {
                leaves: number[][];
                leafIndices: number[];
                treeInfo: TreeInfo;
            }
        > = new Map();
        console.log("leavesByTree",leavesByTree);
        
        const cachedStateTreeInfos = await this.getStateTreeInfos();
        
        console.log("events",events);
        /// Assign leaves to their respective trees
        for (const event of events) {
            for (
                let index = 0;
                index < event.outputCompressedAccounts.length;
                index++
            ) {
                const hash = event.outputCompressedAccountHashes[index];
                const treeOrQueue =
                    event.pubkeyArray[
                        event.outputCompressedAccounts[index].merkleTreeIndex
                    ];

                const stateTreeInfo = getStateTreeInfoByPubkey(
                    cachedStateTreeInfos,
                    treeOrQueue,
                );

                if (!leavesByTree.has(stateTreeInfo.tree.toBase58())) {
                    leavesByTree.set(stateTreeInfo.tree.toBase58(), {
                        leaves: [],
                        leafIndices: [],
                        treeInfo: stateTreeInfo,
                    });
                }

                const treeData = leavesByTree.get(
                    stateTreeInfo.tree.toBase58(),
                );
                if (!treeData) {
                    throw new Error(
                        `Tree not found: ${stateTreeInfo.tree.toBase58()}`,
                    );
                }
                treeData.leaves.push(hash);
                treeData.leafIndices.push(event.outputLeafIndices[index]);
            }
        }

        const merkleProofsMap: Map<string, MerkleContextWithMerkleProof> =
            new Map();

        for (const [treeKey, { leaves, treeInfo }] of leavesByTree.entries()) {
            const tree = new PublicKey(treeKey);

            let merkleTree: MerkleTree | undefined;
            if (treeInfo.treeType === TreeType.StateV1) {
                merkleTree = new MerkleTree(
                    this.depth,
                    this.lightWasm,
                    leaves.map(leaf => bn(leaf).toString()),
                );
            } else if (treeInfo.treeType === TreeType.StateV2) {
                /// In V2 State trees, The Merkle tree stays empty until the
                /// first forester transaction. And since test-rpc is only used
                /// for non-forested tests, we must return a tree with
                /// zerovalues.
                merkleTree = new MerkleTree(32, this.lightWasm, []);
            } else {
                throw new Error(
                    `Invalid tree type: ${treeInfo.treeType} in test-rpc.ts`,
                );
            }

            for (let i = 0; i < [proofData.hash].length; i++) {
                const leafIndex = leaves.findIndex(leaf =>
                    bn(leaf).eq([proofData.hash][i]),
                );

                /// If leaf is part of current tree, return proof
                if (leafIndex !== -1) {
                    if (treeInfo.treeType === TreeType.StateV1) {
                        const pathElements =
                            merkleTree.path(leafIndex).pathElements;
                        const bnPathElements = pathElements.map(value =>
                            bn(value),
                        );
                        const root = bn(merkleTree.root());

                        const merkleProof: MerkleContextWithMerkleProof = {
                            hash: bn([proofData.hash][i].toArray('be', 32)),
                            treeInfo,
                            leafIndex,
                            merkleProof: bnPathElements,
                            proveByIndex: false,
                            rootIndex: leaves.length,
                            root,
                        };

                        merkleProofsMap.set([proofData.hash][i].toString(), merkleProof);
                    } else if (treeInfo.treeType === TreeType.StateV2) {
                        const pathElements = merkleTree._zeros.slice(0, -1);
                        const bnPathElements = pathElements.map(value =>
                            bn(value),
                        );
                        const root = bn(merkleTree.root());

                        /// get leafIndex from leavesByTree for the given hash
                        const leafIndex = leavesByTree
                            .get(tree.toBase58())!
                            .leafIndices.findIndex(index =>
                                [proofData.hash][i].eq(
                                    bn(
                                        leavesByTree.get(tree.toBase58())!
                                            .leaves[index],
                                    ),
                                ),
                            );

                        const merkleProof: MerkleContextWithMerkleProof = {
                            // Hash is 0 for proveByIndex trees in test-rpc.
                            hash: bn([proofData.hash][i].toArray('be', 32)),
                            // hash: bn(new Array(32).fill(0)),
                            treeInfo,
                            leafIndex,
                            merkleProof: bnPathElements,
                            proveByIndex: true,
                            // Root index is 0 for proveByIndex trees in
                            // test-rpc.
                            rootIndex: 0,
                            root,
                        };

                        merkleProofsMap.set([proofData.hash][i].toString(), merkleProof);
                    }
                }
            }
        }

        // Validate proofs
        merkleProofsMap.forEach((proof, index) => {
            if (proof.treeInfo.treeType === TreeType.StateV1) {
                const leafIndex = proof.leafIndex;
                const computedHash = leavesByTree.get(
                    proof.treeInfo.tree.toBase58(),
                )!.leaves[leafIndex];
                const hashArr = bn(computedHash);
                if (!hashArr.eq(proof.hash)) {
                    throw new Error(
                        `Mismatch at index ${index}: expected ${proof.hash.toString()}, got ${hashArr.toString()}`,
                    );
                }
            }
        });

        const proof = merkleProofsMap.get(proofData.hash);
        
        console.log('computed hash', proof);
        return true;        
    } catch (error) {
        console.error('Error verifying proof:', error);
        return false;
    }
}

async function main() {
    try {
        console.log('Script started successfully');
        console.log('Reading proof.json...');
        const data = fs.readFileSync("../proof.json", 'utf8');
        const proofData: ProofData = JSON.parse(data);
        
        const isValid = await verifyProof(proofData);
        
        if (isValid) {
            console.log('\n✅ Proof verification PASSED');
        } else {
            console.log('\n❌ Proof verification FAILED');
        }
        
    } catch (error) {
        console.error('Error in main function:', error);
    }
}

// Run the main function
main().catch(console.error);