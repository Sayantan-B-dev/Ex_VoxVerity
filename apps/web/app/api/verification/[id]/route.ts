import { NextResponse } from "next/server";
import { requireOrg, audit } from "@/lib/api-auth";

/** PATCH /api/verification/:id — { status: CONFIRMED|REJECTED|ESCALATED|EXPIRED, notes? } */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireOrg();
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  if (body.status) {
    patch.status = body.status;
    if (["CONFIRMED", "REJECTED", "ESCALATED", "EXPIRED"].includes(body.status)) {
      patch.resolved_at = new Date().toISOString();
    }
  }
  if (body.notes !== undefined) patch.notes = body.notes;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }
  const { error } = await ctx.supabase
    .from("verification_requests")
    .update(patch)
    .eq("id", id)
    .eq("organization_id", ctx.orgId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await audit(ctx.supabase, ctx.orgId, ctx.userId, "verification.update", "verification", id, patch);
  return NextResponse.json({ ok: true });
}
