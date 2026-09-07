import { NextResponse } from "next/server";
import { requireOrg, audit } from "@/lib/api-auth";

/** GET /api/verification — list. POST — create request. PATCH /:id — resolve. */
export async function GET() {
  const ctx = await requireOrg();
  if ("error" in ctx) return ctx.error;
  const { data, error } = await ctx.supabase
    .from("verification_requests")
    .select("id, call_id, status, method, notes, created_at, resolved_at")
    .eq("organization_id", ctx.orgId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ requests: data });
}

export async function POST(req: Request) {
  const ctx = await requireOrg();
  if ("error" in ctx) return ctx.error;
  const body = await req.json().catch(() => ({}));
  const { data, error } = await ctx.supabase
    .from("verification_requests")
    .insert({
      organization_id: ctx.orgId,
      call_id: body.call_id ?? null,
      incident_id: body.incident_id ?? null,
      method: body.method ?? "Human Review",
      notes: body.notes ?? "",
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await audit(ctx.supabase, ctx.orgId, ctx.userId, "verification.requested", "verification", data.id, {});
  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}
