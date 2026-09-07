import "server-only";
import { JsonRpcProvider, Wallet, Contract, type TransactionReceipt } from "ethers";

/**
 * Server-only blockchain client for the VoiceIntegrityRegistry contract
 * (blockchain/contracts/VoiceIntegrityRegistry.sol). The private key lives
 * only in server env — never in client bundles.
 *
 * Env: BLOCKCHAIN_RPC_URL, BLOCKCHAIN_PRIVATE_KEY, VOICE_REGISTRY_ADDRESS.
 * All calls are fail-soft: when the chain is not configured they return
 * { ok: false, status: "not_configured" } instead of throwing, so the web app
 * keeps working on a dev machine without a wallet.
 */

export const BLOCKCHAIN_NETWORK = "polygon-amoy";
export const BLOCKCHAIN_CHAIN_ID = 80002;

const ABI = [
  "function registerEvidence(bytes32 evidenceHash, bytes32 recordId, uint64 createdAt) external",
  "function getEvidence(bytes32 recordId) external view returns (bytes32 evidenceHash, uint64 createdAt, address registrar)",
  "function verifyEvidence(bytes32 recordId, bytes32 expectedHash) external view returns (bool valid)",
  "function recordExists(bytes32 recordId) external view returns (bool)",
  "event EvidenceRegistered(bytes32 indexed recordId, bytes32 evidenceHash, uint64 createdAt, address registrar)",
];

interface ChainConfig {
  rpcUrl?: string;
  privateKey?: string;
  contractAddress?: string;
}

function config(): ChainConfig {
  return {
    rpcUrl: process.env.BLOCKCHAIN_RPC_URL,
    privateKey: process.env.BLOCKCHAIN_PRIVATE_KEY,
    contractAddress: process.env.VOICE_REGISTRY_ADDRESS,
  };
}

function isConfigured(cfg: ChainConfig): boolean {
  return Boolean(cfg.rpcUrl && cfg.privateKey && cfg.contractAddress);
}

export type BlockchainResult =
  | { ok: true; tx_hash: string; block_number: number | null; contract_address: string; network: string }
  | { ok: false; status: string; message: string };

/** Convert a hex/UUID string to the bytes32 the contract expects. */
export function toBytes32(value: string): string {
  const hex = value.replace(/^0x/, "").replace(/-/g, "");
  return `0x${hex.padStart(64, "0").slice(0, 64)}`;
}

/**
 * Register an evidence hash on-chain. Returns the tx hash, or a fail-soft
 * error when the chain is not configured / the RPC is unreachable.
 */
export async function registerEvidenceOnChain(
  evidenceHash: string,
  recordId: string,
  createdAt: Date
): Promise<BlockchainResult> {
  const cfg = config();
  if (!isConfigured(cfg)) {
    return { ok: false, status: "not_configured", message: "BLOCKCHAIN_RPC_URL / BLOCKCHAIN_PRIVATE_KEY / VOICE_REGISTRY_ADDRESS not set" };
  }
  try {
    // staticNetwork: true skips network detection so an unreachable RPC fails
    // fast instead of retrying forever (the "failed to detect network" spam).
    const provider = new JsonRpcProvider(cfg.rpcUrl, undefined, { staticNetwork: true });
    const wallet = new Wallet(cfg.privateKey!, provider);
    const contract = new Contract(cfg.contractAddress!, ABI, wallet);
    const createdAtUnix = Math.floor(createdAt.getTime() / 1000);
    const tx = await contract.registerEvidence(
      toBytes32(evidenceHash),
      toBytes32(recordId),
      createdAtUnix
    );
    const receipt: TransactionReceipt | null = await tx.wait();
    return {
      ok: true,
      tx_hash: tx.hash,
      block_number: receipt?.blockNumber ?? null,
      contract_address: cfg.contractAddress!,
      network: BLOCKCHAIN_NETWORK,
    };
  } catch (e) {
    return {
      ok: false,
      status: "failed",
      message: e instanceof Error ? e.message : "On-chain registration failed",
    };
  }
}

/**
 * Verify an evidence hash against the chain (read-only). Fail-soft.
 */
export async function verifyEvidenceOnChain(
  recordId: string,
  expectedHash: string
): Promise<{ ok: boolean; status: string; valid?: boolean; message?: string }> {
  const cfg = config();
  if (!isConfigured(cfg)) {
    return { ok: false, status: "not_configured", message: "Blockchain not configured" };
  }
  try {
    const provider = new JsonRpcProvider(cfg.rpcUrl, undefined, { staticNetwork: true });
    const contract = new Contract(cfg.contractAddress!, ABI, provider);
    const valid = await contract.verifyEvidence(toBytes32(recordId), toBytes32(expectedHash));
    return { ok: true, status: "verified", valid: Boolean(valid) };
  } catch (e) {
    return {
      ok: false,
      status: "failed",
      message: e instanceof Error ? e.message : "On-chain verification failed",
    };
  }
}
