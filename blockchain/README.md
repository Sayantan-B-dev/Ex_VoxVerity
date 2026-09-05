# VoxVerity Blockchain Evidence Registry

On-chain evidence registry for tamper-evident voice integrity proofs.

## Contract: VoiceIntegrityRegistry

Stores SHA-256 evidence hashes on Polygon Amoy testnet (Chain ID: 80002).
**Never stores raw audio, embeddings, or personal data on-chain.**

### Functions

- `registerEvidence(hash, recordId, timestamp)` — Register an evidence hash
- `getEvidence(recordId)` — Get stored evidence details
- `verifyEvidence(recordId, expectedHash)` — Verify hash matches
- `recordExists(recordId)` — Check if record exists

## Setup

```bash
cd blockchain
npm install
```

## Compile

```bash
npx hardhat compile
```

## Test

```bash
npx hardhat test
```

## Deploy (Local)

```bash
npx hardhat node  # Terminal 1
npx hardhat run scripts/deploy.js --network localhost  # Terminal 2
```

## Deploy (Polygon Amoy)

1. Get test MATIC from [Polygon Amoy Faucet](https://www.alchemy.com/faucets/polygon-amoy)
2. Set environment variables:
   ```
   BLOCKCHAIN_RPC_URL=https://rpc-amoy.polygon.technology
   BLOCKCHAIN_PRIVATE_KEY=your-private-key
   ```
3. Deploy:
   ```bash
   npx hardhat run scripts/deploy.js --network amoy
   ```

## Security Notes

- Use testnet only for prototype
- Never commit private keys
- Evidence hash is SHA-256 of canonical JSON manifest
- Same inputs always produce same hash (deterministic)
