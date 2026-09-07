import { NextResponse } from "next/server";
import crypto from "crypto";
import { requireOrg, audit } from "@/lib/api-auth";
import {
  registerEvidenceOnChain,
  BLOCKCHAIN_NETWORK,
  BLOCKCHAIN_CHAIN_ID,
} from "@/lib/blockchain";

/** GET /api/evidence - list. POST - package evidence (canonical manifest + SHA-256). */
export async function GET() {
  const ctx = await requireOrg();
  if ("error" in ctx) return ctx.error;
  const { data, error } = await ctx.supabase
    .from("evidence_records")
    .select("id, call_id, evidence_hash, hash_algorithm, blockchain_tx, blockchain_network, verified, created_at, caller_display")
    .eq("organization_id", ctx.orgId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ records: data });
}

export async function POST(req: Request) {
  const ctx = await requireOrg();
  if ("error" in ctx) return ctx.error;
  const body = await req.json().catch(() => ({}));
  if (!body.call_id) return NextResponse.json({ error: "call_id required" }, { status: 400 });
  const manifest = {
    call_id: body.call_id,
    incident_id: body.incident_id ?? null,
    risk_score: body.risk_score ?? 0,
    created_by: ctx.email,
    created_at: new Date().toISOString(),
    model_versions: { risk_engine: "v3.2" },
  };
  const evidence_hash = crypto.createHash("sha256").update(JSON.stringify(manifest)).digest("hex");
  const { data, error } = await ctx.supabase
    .from("evidence_records")
    .insert({
      organization_id: ctx.orgId,
      call_id: body.call_id,
      incident_id: body.incident_id ?? null,
      manifest,
      evidence_hash,
      hash_algorithm: "SHA-256",
      blockchain_network: "Polygon Amoy",
      caller_display: body.caller_display ?? null,
    })
    .select("id, evidence_hash")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // ── On-chain fingerprint registration (auto-triggered) ──────────────────
  // Hash is registered on the VoiceIntegrityRegistry contract when the chain
  // is configured; otherwise the record is kept with tx=NULL (pending wiring).
  const chain = await registerEvidenceOnChain(data.evidence_hash, data.id, new Date());
  if (chain.ok) {
    await ctx.supabase.from("blockchain_registrations").insert({
      organization_id: ctx.orgId,
      evidence_id: data.id,
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
      .eq("id", data.id);
    await audit(ctx.supabase, ctx.orgId, ctx.userId, "blockchain.register", "evidence", data.id, {
      tx_hash: chain.tx_hash,
      contract: chain.contract_address,
    });
  } else {
    // Not configured or failed - record the attempt so it's visible.
    await ctx.supabase.from("blockchain_registrations").insert({
      organization_id: ctx.orgId,
      evidence_id: data.id,
      network: BLOCKCHAIN_NETWORK,
      chain_id: BLOCKCHAIN_CHAIN_ID,
      status: chain.status,
    });
  }

  await audit(ctx.supabase, ctx.orgId, ctx.userId, "evidence.register", "evidence", data.id, { hash_algorithm: "SHA-256" });
  return NextResponse.json(
    {
      ok: true,
      id: data.id,
      evidence_hash: data.evidence_hash,
      manifest,
      blockchain: chain,
    },
    { status: 201 }
  );
}
