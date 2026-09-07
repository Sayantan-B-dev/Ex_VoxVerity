import { NextResponse } from "next/server";
import { requireOrg, audit } from "@/lib/api-auth";

/** GET /api/incidents — list. POST — create incident from alert/call. */
export async function GET() {
  const ctx = await requireOrg();
  if ("error" in ctx) return ctx.error;
  const { data, error } = await ctx.supabase
    .from("incidents")
    .select("id, status, scope, risk_score, risk_severity, created_at, owner_name, summary")
    .eq("organization_id", ctx.orgId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ incidents: data });
}

export async function POST(req: Request) {
  const ctx = await requireOrg();
  if ("error" in ctx) return ctx.error;
  const body = await req.json().catch(() => ({}));
  const { data, error } = await ctx.supabase
    .from("incidents")
    .insert({
      organization_id: ctx.orgId,
      status: body.status ?? "OPEN",
      scope: body.scope ?? "Investigation",
      summary: body.summary ?? "",
      risk_score: body.risk_score ?? 0,
      risk_severity: body.risk_severity ?? "MEDIUM",
      owner_id: ctx.userId,
      owner_name: body.owner_name ?? null,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (body.alert_id) {
    await ctx.supabase.from("alerts").update({ incident_id: data.id }).eq("id", body.alert_id).eq("organization_id", ctx.orgId);
  }
  await audit(ctx.supabase, ctx.orgId, ctx.userId, "incident_opened", "incident", data.id, { scope: body.scope ?? "" });
  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}
