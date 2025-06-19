import { keccak256, encodePacked, toHex } from 'viem';
import { RLP } from '@ethereumjs/rlp';

// Helper function to compute Merkle root from leaves using Keccak256 (Ethereum standard)
export function computeMerkleRootKeccak(leaves: string[]): string {
  if (leaves.length === 0) return '0x0000000000000000000000000000000000000000000000000000000000000000';
  if (leaves.length === 1) return leaves[0];
  
  let currentLevel = leaves;
  
  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];
    
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
      const combined = keccak256(encodePacked(['bytes32', 'bytes32'], [left as `0x${string}`, right as `0x${string}`]));
      nextLevel.push(combined);
    }
    
    currentLevel = nextLevel;
  }
  
  return currentLevel[0];
}

export function generateMerkleProofKeccak(leaves: string[], leafIndex: number): {
  proof: string[];
  indices: number[];
  root: string;
} {
  if (leafIndex >= leaves.length) {
    throw new Error('Leaf index out of bounds');
  }
  
  const proof: string[] = [];
  const indices: number[] = [];
  let currentLevel = leaves;
  let currentIndex = leafIndex;
  
  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];
    
    // Determine sibling index
    const siblingIndex = currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1;
    
    // Add sibling to proof if it exists
    if (siblingIndex < currentLevel.length) {
      proof.push(currentLevel[siblingIndex]);
      indices.push(currentIndex % 2); // 0 if current is left, 1 if current is right
    } else {
      // If no sibling, use the current node itself (for odd number of leaves)
      proof.push(currentLevel[currentIndex]);
      indices.push(0);
    }
    
    // Build next level
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
      const combined = keccak256(encodePacked(['bytes32', 'bytes32'], [left as `0x${string}`, right as `0x${string}`]));
      nextLevel.push(combined);
    }
    
    currentLevel = nextLevel;
    currentIndex = Math.floor(currentIndex / 2);
  }
  
  const root = currentLevel[0];
  return { proof, indices, root };
}

// Verify Merkle proof using Keccak256
export function verifyMerkleProofKeccak(
  leaf: string,
  proof: string[],
  indices: number[],
  expectedRoot: string
): boolean {
  let currentHash = leaf;
  
  for (let i = 0; i < proof.length; i++) {
    const proofElement = proof[i];
    const isLeftChild = indices[i] === 0;
    
    if (isLeftChild) {
      // Current hash is left child
      currentHash = keccak256(encodePacked(['bytes32', 'bytes32'], [currentHash as `0x${string}`, proofElement as `0x${string}`]));
    } else {
      // Current hash is right child  
      currentHash = keccak256(encodePacked(['bytes32', 'bytes32'], [proofElement as `0x${string}`, currentHash as `0x${string}`]));
    }
  }
  
  return currentHash === expectedRoot;
}

export function hashReceiptProduction(receipt: any): string {
  // eth receipt hashing using RLP
  const receiptData = [
    receipt.status ? '0x1' : '0x0',
    `0x${receipt.gasUsed.toString(16)}`,
    receipt.logsBloom,
    receipt.logs.map((log: any) => [
      log.address,
      log.topics,
      log.data
    ])
  ];
  
  const rlpEncoded = RLP.encode(receiptData);
  const rlpHex = '0x' + Buffer.from(rlpEncoded).toString('hex');
  return keccak256(rlpHex as `0x${string}`);
}

// Production-ready log hashing
export function hashLogProduction(log: any): string {
  const logData = [
    log.address,
    log.topics,
    log.data
  ];
  
  const rlpEncoded = RLP.encode(logData);
  const rlpHex = '0x' + Buffer.from(rlpEncoded).toString('hex');
  return keccak256(rlpHex as `0x${string}`);
}

export async function generateReceiptProofProduction(
  publicClient: any,
  blockNumber: bigint,
  transactionIndex: number
): Promise<{
  receiptHash: string;
  proof: string[];
  indices: number[];
  receiptsRoot: string;
  blockHash: string;
  blockHeader: any;
}> {
  const block = await publicClient.getBlock({
    blockNumber,
    includeTransactions: true
  });
  
  const receipts = [];
  for (const tx of block.transactions) {
    const receipt = await publicClient.getTransactionReceipt({ hash: tx.hash });
    receipts.push(receipt);
  }
  
  const receiptHashes = receipts.map(hashReceiptProduction);
  
  const { proof, indices, root } = generateMerkleProofKeccak(receiptHashes, transactionIndex);
  
  return {
    receiptHash: receiptHashes[transactionIndex],
    proof,
    indices,
    receiptsRoot: root,
    blockHash: block.hash!,
    blockHeader: {
      parentHash: block.parentHash,
      sha3Uncles: block.sha3Uncles,
      miner: block.miner,
      stateRoot: block.stateRoot,
      transactionsRoot: block.transactionsRoot,
      receiptsRoot: block.receiptsRoot,
      logsBloom: block.logsBloom,
      difficulty: block.difficulty?.toString(),
      number: block.number?.toString(),
      gasLimit: block.gasLimit?.toString(),
      gasUsed: block.gasUsed?.toString(),
      timestamp: block.timestamp?.toString(),
      extraData: block.extraData,
      mixHash: block.mixHash,
      nonce: block.nonce
    }
  };
}

// Generate log Merkle proof from receipt (production version)
export function generateLogProofProduction(
  receipt: any,
  logIndex: number
): {
  logHash: string;
  proof: string[];
  indices: number[];
  logsRoot: string;
} {
  // Hash all logs in the receipt using production method
  const logHashes = receipt.logs.map(hashLogProduction);
  
  // Generate Merkle proof using Keccak256
  const { proof, indices, root } = generateMerkleProofKeccak(logHashes, logIndex);
  
  return {
    logHash: logHashes[logIndex],
    proof,
    indices,
    logsRoot: root
  };
}

// Validate that Merkle proof is within circom constraints
export function validateCircomConstraints(
  proof: string[],
  indices: number[],
  maxLevels: number = 32
): {
  isValid: boolean;
  issues: string[];
  paddedProof: string[];
  paddedIndices: number[];
} {
  const issues: string[] = [];
  
  // Check proof length
  if (proof.length > maxLevels) {
    issues.push(`Proof length ${proof.length} exceeds maximum ${maxLevels} levels`);
  }
  
  // Check if all proof elements are valid hex
  for (let i = 0; i < proof.length; i++) {
    if (!proof[i].startsWith('0x') || proof[i].length !== 66) {
      issues.push(`Invalid proof element at index ${i}: ${proof[i]}`);
    }
  }
  
  // Check indices are binary
  for (let i = 0; i < indices.length; i++) {
    if (indices[i] !== 0 && indices[i] !== 1) {
      issues.push(`Invalid index at position ${i}: ${indices[i]} (must be 0 or 1)`);
    }
  }
  
  // Check proof and indices have same length
  if (proof.length !== indices.length) {
    issues.push(`Proof length ${proof.length} doesn't match indices length ${indices.length}`);
  }
  
  // Pad arrays to required length
  const paddedProof = padProofArray(proof, maxLevels);
  const paddedIndices = padIndicesArray(indices, maxLevels);
  
  return {
    isValid: issues.length === 0,
    issues,
    paddedProof,
    paddedIndices
  };
}

// Legacy functions for backward compatibility
export const computeMerkleRoot = computeMerkleRootKeccak;
export const generateMerkleProof = generateMerkleProofKeccak;
export const hashReceipt = hashReceiptProduction;
export const hashLog = hashLogProduction;
export const generateReceiptProof = generateReceiptProofProduction;
export const generateLogProof = generateLogProofProduction;

// Convert hex string to field element (for circom)
export function hexToFieldElement(hex: string): string {
  // Remove 0x prefix and convert to BigInt, then to string
  const bigIntValue = BigInt(hex);
  return bigIntValue.toString();
}

// Pad proof arrays to required length for circom
export function padProofArray(proof: string[], requiredLength: number): string[] {
  const padded = [...proof];
  while (padded.length < requiredLength) {
    padded.push('0x0000000000000000000000000000000000000000000000000000000000000000');
  }
  return padded.slice(0, requiredLength);
}

export function padIndicesArray(indices: number[], requiredLength: number): number[] {
  const padded = [...indices];
  while (padded.length < requiredLength) {
    padded.push(0);
  }
  return padded.slice(0, requiredLength);
} 