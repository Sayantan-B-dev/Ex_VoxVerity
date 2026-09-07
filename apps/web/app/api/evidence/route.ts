import { NextResponse } from "next/server";
import crypto from "crypto";
import { requireOrg, audit } from "@/lib/api-auth";

/** GET /api/evidence — list. POST — package evidence (canonical manifest + SHA-256). */
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
  await audit(ctx.supabase, ctx.orgId, ctx.userId, "evidence.register", "evidence", data.id, { hash_algorithm: "SHA-256" });
  return NextResponse.json({ ok: true, id: data.id, evidence_hash: data.evidence_hash, manifest }, { status: 201 });
}
