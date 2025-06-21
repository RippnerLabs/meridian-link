# Relayer TypeScript Server

A TypeScript Node.js server that generates zero-knowledge proofs for cross-chain token bridge operations using Light Protocol compressed accounts.

## Features

- **REST API endpoint** to generate proofs from compressed account addresses
- **Automatic data retrieval** from Light Protocol RPC
- **Borsh decoding** of deposit records from compressed accounts
- **Circuit input generation** using the same logic as the reference TypeScript script
- **ZK proof generation** using snarkjs and Groth16

## Installation

```bash
# Navigate to the relayer-ts directory
cd relayer-ts

# Install dependencies
npm install

# Build the TypeScript code
npm run build
```

## Usage

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

## API Endpoints

### Generate Proof
**POST** `/api/generate-proof`

Generates a zero-knowledge proof for a given compressed account address.

#### Request Body
```json
{
  "address": "1fMzqc3bq9CXdAECyPGw2mtSFq5QGCLTiDSk6KWqHam"
}
```

#### Response
```json
{
  "success": true,
  "proof": {
    "a": ["...", "..."],
    "b": [["...", "..."], ["...", "..."]],
    "c": ["...", "..."],
    "Input": ["...", "...", "..."]
  },
  "circuitInputs": {
    "stateRoot": "...",
    "amount": "10000",
    "destChainId": "31337",
    "destChainAddr": "...",
    "accountHash": "...",
    "leafIndex": "...",
    "merkleProof": ["...", "..."],
    "pathIndices": ["...", "..."],
    "owner": "...",
    "sourceChainId": "1",
    "mint": "...",
    "timestamp": "...",
    "depositId": "...",
    "dataHash": "..."
  }
}
```

### Health Check
**GET** `/health`

Returns server status.

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Example Usage

```bash
# Health check
curl http://localhost:3006/health

# Generate proof
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"address":"1fMzqc3bq9CXdAECyPGw2mtSFq5QGCLTiDSk6KWqHam"}' \
  http://localhost:3006/api/generate-proof
```

## Configuration

The server runs on port 3006 by default. You can change this by setting the `PORT` environment variable:

```bash
PORT=8080 npm start
```

## Dependencies

- **express**: Web framework
- **@lightprotocol/stateless.js**: Light Protocol RPC client
- **snarkjs**: Zero-knowledge proof generation
- **borsh**: Binary serialization format for decoding account data
- **@solana/web3.js**: Solana blockchain utilities

## Circuit Files

The server expects the following circuit files to be present:
- `../circom/solDepositProof_js/solDepositProof.wasm`
- `../circom/solDepositProof_js/1_0000.zkey`

Make sure these files are built and available relative to the server's directory.

## Error Handling

The server includes comprehensive error handling for:
- Missing or invalid addresses
- RPC connection issues
- Borsh decoding failures
- Circuit proof generation errors

All errors are returned with appropriate HTTP status codes and descriptive error messages. 