# VoxVerity Blockchain Setup Guide

**Network:** Polygon Amoy Testnet
**Chain ID:** 80002
**Currency:** POL (not MATIC — Polygon updated this in 2025)
**Purpose:** Register evidence hashes on-chain for tamper-evident provenance

---

## Overview

The blockchain component stores **only SHA-256 hashes** of evidence manifests — never raw audio, embeddings, or personal data. This provides tamper-evident provenance for voice integrity analysis results.

**Important:** This is a testnet deployment only. Never use real funds or mainnet.

---

## Step 1: Install MetaMask

1. Open Chrome browser
2. Go to: https://metamask.io/
3. Click "Install MetaMask for Chrome"
4. Add the extension to Chrome
5. Create a new wallet OR use an existing **test wallet**

**Security:** For this project, use a separate test wallet. Do NOT use a wallet containing real funds.

---

## Step 2: Add Polygon Amoy Testnet

### Option A: Manual Setup (Recommended)

In MetaMask:
1. Click the network dropdown (top, where it says "Ethereum Mainnet")
2. Click "Add network" → "Add a network manually"
3. Enter these values:

```
Network Name:       Polygon Amoy Testnet
RPC URL:            https://rpc-amoy.polygon.technology/
Chain ID:           80002
Currency Symbol:    POL
Block Explorer URL: https://amoy.polygonscan.com/
```

4. Click "Save"
5. Switch MetaMask to **Polygon Amoy**

### Option B: Via Polygonscan (Easiest)

1. Go to: https://amoy.polygonscan.com/
2. Scroll to the bottom of the page
3. Click "Add Polygon Amoy Network" next to the MetaMask icon
4. Approve in MetaMask

### Option C: Via Chainlist

1. Go to: https://chainlist.org/
2. Search for "Polygon Amoy"
3. Click "Add to MetaMask"

### Troubleshooting

If MetaMask shows "Could not fetch chain ID":
- Make sure the RPC URL has a trailing `/`: `https://rpc-amoy.polygon.technology/`
- Try the Polygonscan method instead
- Try Chainlist

---

## Step 3: Get Free Test POL

You need test POL to pay for contract deployment transactions. It has **no real-world value**.

### Method 1: Polygon Official Faucet (Recommended)

1. Go to: https://faucet.polygon.technology/
2. Connect your MetaMask wallet
3. Select:
   - Network: **Amoy**
   - Wallet: Your `0x...` address
4. Click "Send POL" or "Claim"
5. Wait for POL to appear in your wallet

### Method 2: Alchemy Faucet

1. Go to: https://www.alchemy.com/faucets/polygon-amoy
2. Connect MetaMask (must be on Polygon Amoy network)
3. Enter your wallet address
4. Click "Send 0.1 POL"

**Note:** Alchemy may require your wallet to hold at least 0.001 ETH on Ethereum Mainnet. If you get this error, use Method 1 (Polygon faucet) instead.

### Method 3: Google Cloud Faucet

1. Go to: https://cloud.google.com/application/web3/faucet/polygon/amoy
2. Connect wallet and claim

### Verify Balance

1. Open MetaMask
2. Make sure you're on **Polygon Amoy** network
3. You should see POL balance (e.g., 0.1 POL)

---

## Step 4: Export Your Private Key

1. In MetaMask, click the three dots (⋮) next to your account
2. Click "Account details"
3. Click "Show private key"
4. Enter your MetaMask password
5. Copy the private key (starts with `0x...`)

**CRITICAL SECURITY:**
- NEVER share your private key with anyone
- NEVER commit it to GitHub or any repository
- NEVER paste it into websites (only into your local `.env.local`)
- Use a SEPARATE test wallet, not your main wallet

---

## Step 5: Install Project Dependencies

Open a terminal and run:

```bash
cd blockchain
npm install
```

This installs Hardhat and other dependencies.

---

## Step 6: Configure Environment Variables

Open `apps/web/.env.local` (or create it if it doesn't exist) and add:

```env
# Blockchain (Polygon Amoy Testnet)
BLOCKCHAIN_RPC_URL=https://rpc-amoy.polygon.technology
BLOCKCHAIN_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
VOICE_REGISTRY_ADDRESS=
CHAIN_ID=80002
```

Replace `0xYOUR_PRIVATE_KEY_HERE` with the private key you exported from MetaMask.

Leave `VOICE_REGISTRY_ADDRESS` empty for now — you'll fill it after deploying the contract.

**Example:**
```env
BLOCKCHAIN_RPC_URL=https://rpc-amoy.polygon.technology
BLOCKCHAIN_PRIVATE_KEY=0xabc123def456789...
VOICE_REGISTRY_ADDRESS=
CHAIN_ID=80002
```

---

## Step 7: Deploy the Smart Contract

From the `blockchain` directory, run:

```bash
npx hardhat run scripts/deploy.js --network amoy
```

You should see output like:

```
Deploying VoiceIntegrityRegistry...
VoiceIntegrityRegistry deployed to: 0x1234567890abcdef1234567890abcdef12345678
Network: amoy
Chain ID: 80002
Deployment info saved to: ./deployments/amoy.json
```

**Copy the contract address** (the `0x...` string).

If the deployment fails:
- Make sure you have POL in your wallet (Step 3)
- Make sure MetaMask is on Polygon Amoy network
- Check that your private key is correct in `.env.local`

---

## Step 8: Update Environment Variables

Open `apps/web/.env.local` and update `VOICE_REGISTRY_ADDRESS`:

```env
BLOCKCHAIN_RPC_URL=https://rpc-amoy.polygon.technology
BLOCKCHAIN_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
VOICE_REGISTRY_ADDRESS=0xYOUR_DEPLOYED_CONTRACT_ADDRESS
CHAIN_ID=80002
```

**Example:**
```env
BLOCKCHAIN_RPC_URL=https://rpc-amoy.polygon.technology
BLOCKCHAIN_PRIVATE_KEY=0xabc123def456789...
VOICE_REGISTRY_ADDRESS=0x1234567890abcdef1234567890abcdef12345678
CHAIN_ID=80002
```

---

## Step 9: Verify the Deployment

1. Go to: https://amoy.polygonscan.com/
2. Paste your `VOICE_REGISTRY_ADDRESS` into the search box
3. You should see:
   - Contract name: `VoiceIntegrityRegistry`
   - Creator: Your wallet address
   - Balance: 0 POL (contract doesn't hold funds)

---

## Step 10: Restart the Application

```bash
# From project root
npm run dev
```

The blockchain integration is now active. The app will register evidence hashes on Polygon Amoy when you create incidents.

---

## What the Contract Does

The `VoiceIntegrityRegistry` contract on Polygon Amoy:

| Function | Description |
|----------|-------------|
| `registerEvidence(hash, recordId, timestamp)` | Store an evidence hash on-chain |
| `getEvidence(recordId)` | Retrieve stored evidence details |
| `verifyEvidence(recordId, expectedHash)` | Verify hash matches expected value |
| `recordExists(recordId)` | Check if a record exists |

**What is stored on-chain:**
- SHA-256 hash of evidence manifest
- Record ID (e.g., `INC-12345678`)
- Timestamp
- Registrar address

**What is NEVER stored on-chain:**
- Raw audio
- Speaker embeddings
- Phone numbers
- Personal data
- API keys or secrets

---

## Contract Address Reference

After deployment, you can find your contract at:
```
https://amoy.polygonscan.com/address/0xYOUR_CONTRACT_ADDRESS
```

Example transaction:
```
https://amoy.polygonscan.com/tx/0xYOUR_TX_HASH
```

---

## Troubleshooting

### "Insufficient funds"
- You need test POL in your wallet
- Use the Polygon faucet: https://faucet.polygon.technology/

### "Nonce too high" or transaction errors
- Reset MetaMask account: Settings → Advanced → Reset account

### "Could not detect network"
- Make sure MetaMask is connected to Polygon Amoy
- Check the RPC URL has trailing `/`

### Contract deployment succeeds but address is wrong
- Check `blockchain/deployments/amoy.json` for the correct address

### App shows "Blockchain unavailable"
- Check `VOICE_REGISTRY_ADDRESS` is set in `.env.local`
- Restart the dev server after changing env vars

---

## Security Reminders

1. **Never use your main wallet** — create a separate test wallet
2. **Never share your private key** — it gives full control of your wallet
3. **Never commit `.env.local`** — it's in `.gitignore` for a reason
4. **Testnet only** — Polygon Amoy has no real value
5. **Hashes only** — the contract stores hashes, not sensitive data

---

## Quick Reference

| Item | Value |
|------|-------|
| Network | Polygon Amoy Testnet |
| Chain ID | 80002 |
| Currency | POL |
| RPC URL | https://rpc-amoy.polygon.technology/ |
| Block Explorer | https://amoy.polygonscan.com/ |
| Faucet | https://faucet.polygon.technology/ |
| Contract | VoiceIntegrityRegistry (Solidity 0.8.24) |
