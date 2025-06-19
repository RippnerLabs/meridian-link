import { keccak256, encodePacked, toHex } from 'viem';
import {
  computeMerkleRoot,
  generateMerkleProof,
  hashReceipt,
  hashLog,
  hexToFieldElement,
  padProofArray,
  padIndicesArray
} from './merkle-proof-generator';

// Test data structure
interface TestLeaf {
  id: string;
  hash: string;
}

// Create test leaves for Merkle tree
function createTestLeaves(count: number): TestLeaf[] {
  const leaves: TestLeaf[] = [];
  for (let i = 0; i < count; i++) {
    const data = `test_leaf_${i}`;
    const hash = keccak256(encodePacked(['string'], [data]));
    leaves.push({ id: data, hash });
  }
  return leaves;
}

// Verify Merkle proof manually
function verifyMerkleProof(
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

// Test Merkle proof generation and verification
async function testMerkleProofGeneration() {
  console.log('🧪 Testing Merkle Proof Generation and Verification');
  console.log('=' .repeat(60));
  
  // Test 1: Small tree (4 leaves)
  console.log('\n📊 Test 1: Small Merkle Tree (4 leaves)');
  const smallLeaves = createTestLeaves(4);
  const smallHashes = smallLeaves.map(l => l.hash);
  const smallRoot = computeMerkleRoot(smallHashes);
  
  console.log('Leaves:', smallLeaves.map(l => l.id));
  console.log('Root:', smallRoot);
  
  // Test proof for each leaf
  let allSmallProofsValid = true;
  for (let i = 0; i < smallLeaves.length; i++) {
    const { proof, indices } = generateMerkleProof(smallHashes, i);
    const isValid = verifyMerkleProof(smallHashes[i], proof, indices, smallRoot);
    
    console.log(`  Leaf ${i} (${smallLeaves[i].id}):`);
    console.log(`    Proof length: ${proof.length}`);
    console.log(`    Indices: [${indices.join(', ')}]`);
    console.log(`    Valid: ${isValid ? '✅' : '❌'}`);
    
    if (!isValid) allSmallProofsValid = false;
  }
  
  console.log(`\n📋 Small tree test result: ${allSmallProofsValid ? '✅ PASSED' : '❌ FAILED'}`);
  
  // Test 2: Medium tree (16 leaves)
  console.log('\n📊 Test 2: Medium Merkle Tree (16 leaves)');
  const mediumLeaves = createTestLeaves(16);
  const mediumHashes = mediumLeaves.map(l => l.hash);
  const mediumRoot = computeMerkleRoot(mediumHashes);
  
  console.log('Root:', mediumRoot);
  
  // Test proof for a few specific leaves
  const testIndices = [0, 5, 10, 15];
  let allMediumProofsValid = true;
  
  for (const i of testIndices) {
    const { proof, indices } = generateMerkleProof(mediumHashes, i);
    const isValid = verifyMerkleProof(mediumHashes[i], proof, indices, mediumRoot);
    
    console.log(`  Leaf ${i} (${mediumLeaves[i].id}):`);
    console.log(`    Proof length: ${proof.length}`);
    console.log(`    Indices: [${indices.join(', ')}]`);
    console.log(`    Valid: ${isValid ? '✅' : '❌'}`);
    
    if (!isValid) allMediumProofsValid = false;
  }
  
  console.log(`\n📋 Medium tree test result: ${allMediumProofsValid ? '✅ PASSED' : '❌ FAILED'}`);
  
  // Test 3: Edge cases
  console.log('\n📊 Test 3: Edge Cases');
  
  // Single leaf
  const singleLeaf = createTestLeaves(1);
  const singleRoot = computeMerkleRoot([singleLeaf[0].hash]);
  console.log(`Single leaf root: ${singleRoot}`);
  console.log(`Single leaf matches: ${singleRoot === singleLeaf[0].hash ? '✅' : '❌'}`);
  
  // Odd number of leaves
  const oddLeaves = createTestLeaves(7);
  const oddHashes = oddLeaves.map(l => l.hash);
  const oddRoot = computeMerkleRoot(oddHashes);
  
  const { proof: oddProof, indices: oddIndices } = generateMerkleProof(oddHashes, 6); // Last leaf
  const oddValid = verifyMerkleProof(oddHashes[6], oddProof, oddIndices, oddRoot);
  console.log(`Odd number of leaves (7) - last leaf valid: ${oddValid ? '✅' : '❌'}`);
  
  // Test 4: Production-like scenario with transaction receipts
  console.log('\n📊 Test 4: Production-like Receipt Tree');
  
  // Simulate transaction receipts
  const mockReceipts = [];
  for (let i = 0; i < 8; i++) {
    mockReceipts.push({
      status: 1,
      gasUsed: BigInt(21000 + i * 1000),
      logsBloom: '0x' + '0'.repeat(512),
      logs: [
        {
          address: `0x${'1'.repeat(40)}`,
          topics: [`0x${'a'.repeat(64)}`],
          data: `0x${'b'.repeat(64)}`
        }
      ]
    });
  }
  
  const receiptHashes = mockReceipts.map(hashReceipt);
  const receiptRoot = computeMerkleRoot(receiptHashes);
  
  // Test proof for receipt at index 3
  const receiptIndex = 3;
  const { proof: receiptProof, indices: receiptIndices } = generateMerkleProof(receiptHashes, receiptIndex);
  const receiptValid = verifyMerkleProof(receiptHashes[receiptIndex], receiptProof, receiptIndices, receiptRoot);
  
  console.log(`Receipt tree root: ${receiptRoot.slice(0, 20)}...`);
  console.log(`Receipt ${receiptIndex} proof valid: ${receiptValid ? '✅' : '❌'}`);
  console.log(`Receipt proof length: ${receiptProof.length}`);
  
  // Test 5: Circom compatibility test
  console.log('\n📊 Test 5: Circom Compatibility');
  
  // Test with field element conversion
  const circuitLeaves = createTestLeaves(8);
  const circuitHashes = circuitLeaves.map(l => l.hash);
  const circuitRoot = computeMerkleRoot(circuitHashes);
  
  const testIndex = 5;
  const { proof: circuitProof, indices: circuitIndices } = generateMerkleProof(circuitHashes, testIndex);
  
  // Convert to field elements (for circom)
  const circuitRootField = hexToFieldElement(circuitRoot);
  const circuitLeafField = hexToFieldElement(circuitHashes[testIndex]);
  const circuitProofFields = circuitProof.map(hexToFieldElement);
  
  console.log('Circom-compatible data:');
  console.log(`  Root (field): ${circuitRootField}`);
  console.log(`  Leaf (field): ${circuitLeafField}`);
  console.log(`  Proof length: ${circuitProofFields.length}`);
  console.log(`  Indices: [${circuitIndices.join(', ')}]`);
  
  // Verify the field element conversion is reversible
  const reversedRoot = '0x' + BigInt(circuitRootField).toString(16).padStart(64, '0');
  const reversedLeaf = '0x' + BigInt(circuitLeafField).toString(16).padStart(64, '0');
  
  console.log(`  Conversion reversible: ${reversedRoot === circuitRoot && reversedLeaf === circuitHashes[testIndex] ? '✅' : '❌'}`);
  
  // Test padding for fixed-size arrays (circom requirement)
  const paddedProof = padProofArray(circuitProof, 32);
  const paddedIndices = padIndicesArray(circuitIndices, 32);
  
  console.log(`  Padded proof length: ${paddedProof.length}`);
  console.log(`  Padded indices length: ${paddedIndices.length}`);
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('🎯 MERKLE VERIFICATION TEST SUMMARY');
  console.log('='.repeat(60));
  
  const allTestsPassed = allSmallProofsValid && allMediumProofsValid && oddValid && receiptValid;
  console.log(`Overall result: ${allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  if (allTestsPassed) {
    console.log('\n✨ Merkle proof generation and verification is working correctly!');
    console.log('   Ready to implement in circom circuit.');
  } else {
    console.log('\n⚠️  Issues detected in Merkle proof implementation.');
    console.log('   Fix these before proceeding to circom implementation.');
  }
  
  return allTestsPassed;
}

// Run the tests
if (require.main === module) {
  testMerkleProofGeneration()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test failed with error:', error);
      process.exit(1);
    });
}

export { testMerkleProofGeneration, verifyMerkleProof }; 