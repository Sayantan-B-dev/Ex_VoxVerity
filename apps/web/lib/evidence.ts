import { createHash } from "crypto";
import { audit } from "@/lib/api-auth";
import { createServiceClient } from "@/lib/db";
import {
  registerEvidenceOnChain,
  BLOCKCHAIN_NETWORK,
  BLOCKCHAIN_CHAIN_ID,
} from "@/lib/blockchain";

/** Narrowed requireOrg result (the success branch with supabase). */
export type OrgCtx = {
  supabase: ReturnType<typeof createServiceClient>;
  userId: string;
  email: string;
  orgId: string;
};

/**
 * Close the call row and create its evidence fingerprint (hash + on-chain).
 * Fail-soft: any step that fails just stops; it must not break the request.
 */
export async function finalizeCallEvidence(ctx: OrgCtx, callId: string) {
  const { data: call } = await ctx.supabase
    .from("calls")
    .select("id, organization_id, risk_score, risk_severity, caller_display, started_at")
    .eq("id", callId)
    .single();
  if (!call) return;

  await ctx.supabase
    .from("calls")
    .update({ status: "completed", ended_at: new Date().toISOString() })
    .eq("id", callId);

  const manifest = {
    call_id: call.id,
    risk_score: call.risk_score ?? 0,
    risk_severity: call.risk_severity ?? "LOW",
    created_by: ctx.email,
    created_at: new Date().toISOString(),
    model_versions: { risk_engine: "v1.0.0", aasist_l: "v1.0", ecapa_tdnn: "v1.0" },
  };
  const evidence_hash = createHash("sha256").update(JSON.stringify(manifest)).digest("hex");
  const { data: evidence } = await ctx.supabase
    .from("evidence_records")
    .insert({
      organization_id: call.organization_id,
      call_id: call.id,
      manifest,
      evidence_hash,
      hash_algorithm: "SHA-256",
      blockchain_network: BLOCKCHAIN_NETWORK,
      caller_display: call.caller_display ?? null,
    })
    .select("id, evidence_hash")
    .single();
  if (!evidence) return;

  const chain = await registerEvidenceOnChain(evidence.evidence_hash, evidence.id, new Date());
  const chainStatus = chain.ok ? "confirmed" : chain.status;
  if (chain.ok) {
    await ctx.supabase.from("blockchain_registrations").insert({
      organization_id: call.organization_id,
      evidence_id: evidence.id,
      network: BLOCKCHAIN_NETWORK,
      chain_id: BLOCKCHAIN_CHAIN_ID,
      contract_address: chain.contract_address,
      tx_hash: chain.tx_hash,
      block_number: chain.block_number ?? null,
      status: "confirmed",
    });
    await ctx.supabase
      .from("evidence_records")
      .update({ blockchain_tx: chain.tx_hash, verified: true })
      .eq("id", evidence.id);
  } else {
    await ctx.supabase.from("blockchain_registrations").insert({
      organization_id: call.organization_id,
      evidence_id: evidence.id,
      network: BLOCKCHAIN_NETWORK,
      chain_id: BLOCKCHAIN_CHAIN_ID,
      status: chain.status,
    });
  }

  await audit(ctx.supabase, ctx.orgId, ctx.userId, "evidence.auto_register", "call", call.id, {
    evidence_id: evidence.id,
    blockchain: chainStatus,
  });
}