import { NextResponse } from "next/server";
import { requireOrg, audit } from "@/lib/api-auth";

/**
 * POST /api/blockchain/verify — verify evidence hash (local recompute) and
 * optionally query the AI-service evidence endpoint. Body: { evidence_id }.
 */
export async function POST(req: Request) {
  const ctx = await requireOrg();
  if ("error" in ctx) return ctx.error;
  const body = await req.json().catch(() => ({}));
  if (!body.evidence_id) return NextResponse.json({ error: "evidence_id required" }, { status: 400 });
  const { data: rec, error } = await ctx.supabase
    .from("evidence_records")
    .select("id, manifest, evidence_hash, hash_algorithm, blockchain_tx, blockchain_network, verified")
    .eq("id", body.evidence_id)
    .eq("organization_id", ctx.orgId)
    .single();
  if (error || !rec) return NextResponse.json({ error: "Evidence not found" }, { status: 404 });

  const { default: crypto } = await import("crypto");
  const recomputed = crypto.createHash("sha256").update(JSON.stringify(rec.manifest)).digest("hex");
  const verified = recomputed === rec.evidence_hash;
  await ctx.supabase.from("evidence_records").update({ verified }).eq("id", rec.id);
  await audit(ctx.supabase, ctx.orgId, ctx.userId, "evidence.verify", "evidence", rec.id, { verified });

  // Chain status from env (contract address / rpc) — informational.
  return NextResponse.json({
    ok: true,
    verified,
    evidence_hash: rec.evidence_hash,
    recomputed,
    blockchain_tx: rec.blockchain_tx,
    network: rec.blockchain_network ?? "Polygon Amoy",
    contract: process.env.VOICE_REGISTRY_ADDRESS ?? null,
  });
}
