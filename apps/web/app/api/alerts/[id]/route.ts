import { NextResponse } from "next/server";
import { requireOrg, audit } from "@/lib/api-auth";

/** PATCH /api/alerts/:id - acknowledge / escalate. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireOrg();
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  if (body.acknowledged === true) {
    patch.acknowledged = true;
    patch.acknowledged_at = new Date().toISOString();
    patch.status = "Acknowledged";
  } else if (body.status) {
    patch.status = body.status;
    if (body.status === "Acknowledged") {
      patch.acknowledged = true;
      patch.acknowledged_at = new Date().toISOString();
    }
  }
  if (body.incident_id !== undefined) patch.incident_id = body.incident_id;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }
  const { data, error } = await ctx.supabase
    .from("alerts")
    .update(patch)
    .eq("id", id)
    .eq("organization_id", ctx.orgId)
    .select("id, status, acknowledged")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await audit(ctx.supabase, ctx.orgId, ctx.userId, "alert_acknowledged", "alert", id, patch);
  return NextResponse.json({ ok: true, alert: data });
}
