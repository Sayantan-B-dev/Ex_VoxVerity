import { NextResponse } from "next/server";
import { requireOrg, audit } from "@/lib/api-auth";

/** PATCH /api/incidents/:id — status/owner/summary. POST note via {note}. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireOrg();
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  if (body.status) patch.status = body.status;
  if (body.scope !== undefined) patch.scope = body.scope;
  if (body.summary !== undefined) patch.summary = body.summary;
  if (body.owner_name !== undefined) patch.owner_name = body.owner_name;
  if (body.risk_score !== undefined) patch.risk_score = body.risk_score;
  if (Object.keys(patch).length === 0 && !body.note) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }
  if (Object.keys(patch).length) {
    const { error } = await ctx.supabase.from("incidents").update(patch).eq("id", id).eq("organization_id", ctx.orgId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (body.note) {
    await ctx.supabase.from("incident_notes").insert({
      incident_id: id,
      organization_id: ctx.orgId,
      app_user_id: ctx.userId,
      author_name: ctx.email,
      body: body.note,
    });
  }
  await audit(ctx.supabase, ctx.orgId, ctx.userId, "incident.update", "incident", id, patch);
  return NextResponse.json({ ok: true });
}
