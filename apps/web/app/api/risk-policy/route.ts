import { NextResponse } from "next/server";
import { requireOrg, audit } from "@/lib/api-auth";

/** GET /api/risk-policy — active org policy. PATCH — update thresholds/weights. */
export async function GET() {
  const ctx = await requireOrg();
  if ("error" in ctx) return ctx.error;
  const { data } = await ctx.supabase
    .from("risk_policies")
    .select("*")
    .eq("organization_id", ctx.orgId)
    .eq("is_active", true)
    .limit(1)
    .single();
  return NextResponse.json({ policy: data });
}

export async function PATCH(req: Request) {
  const ctx = await requireOrg();
  if ("error" in ctx) return ctx.error;
  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  for (const k of ["thresholds", "weights", "verification_threshold", "auto_escalation", "sensitivity", "model_version", "band_actions", "name"]) {
    if (body[k] !== undefined) patch[k] = body[k];
  }
  if (!Object.keys(patch).length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  const { error } = await ctx.supabase.from("risk_policies").update(patch).eq("organization_id", ctx.orgId).eq("is_active", true);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await audit(ctx.supabase, ctx.orgId, ctx.userId, "policy.update", "risk_policy", null, patch);
  return NextResponse.json({ ok: true });
}
